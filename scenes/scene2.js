// scenes/scene2.js — корни / дерево

import { state }         from '../src/state.js';
import { SCREENS }       from '../src/constants.js';
import { showMsgIn, showLoading, hideLoading, showError, CURSOR_DEF, CURSOR_PTR, setCursor } from '../src/utils.js';
import { leaveMain, resumeMain } from './main.js';
import { getSelectedItem, addItem, removeItem, makeItem, getItemSlot } from '../src/inventory.js';
import { getZoneMsg }    from '../src/zone-msgs.js';
import { renderHotbar }  from '../src/hotbar.js';
import { SaveManager }   from '../src/save.js';
import { AudioSystem }   from '../src/audio.js';
import { trackZoneClick, trackEmptyClick, trackSpotClick } from '../src/achievements.js';
import { BARE_ROCK_MSGS, ACTIVATED_ROCK_MSGS, JAR_ON_ROCK_MSGS,
         ROCK1_REFLECT, ROCK2_REFLECT } from '../src/dialogue.js';
import { waitImg, coverRect, hitZone as _hitZone } from '../src/scene-base.js';

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('scene2');
S.jarPickedUp  = S.jarPickedUp  ?? false;
S.rockStates   = S.rockStates   ?? { rock1: false, rock2: false, rock3: false };

// Авто-сейв флагов сцены — вызывается после каждой мутации S, чтобы
// прогресс не терялся при F5/reload/крэше внутри сцены (иначе состояние
// записывается только в closeSceneScene2 и при перезагрузке откатывается).
function _saveS() { SaveManager.setScene('scene2', S); }

// ── DOM ────────────────────────────────────────────────────────────────────
let el, canvas, ctx, msgEl;
let W = 0, H = 0;
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── BG image dims ─────────────────────────────────────────────────────────
const BG_W = 1376, BG_H = 768;

// ── Bottle (jar) sprite ────────────────────────────────────────────────────
const bottleImg = new Image();
bottleImg.src = 'assets/items/bottle.png';

// Координаты всех спрайтов получены автоматическим pixel-diff между референсами:
//   1ststatebottle.jpeg (initial)  — bg + bottle + неактивные камни
//   nobottle.jpeg       (= tree.png) — bg без bottle, камни неактивны
//   rocks_3states.jpeg  (activated) — bg + 3 светящихся рун
// Спрайты вырезаны диффом и имеют прозрачные пиксели там, где они совпадают
// с bg; значит рисуются бесшовно — ни одного пикселя сдвига.
const BOT_PX = 287, BOT_PY = 320, BOT_PW = 102, BOT_PH = 119;

// ── Rock sprites (glowing symbols, shown when activated) ──────────────────
const rock1Img = new Image(); rock1Img.src = 'assets/items/rock1.png';
const rock2Img = new Image(); rock2Img.src = 'assets/items/rock2.png';
const rock3Img = new Image(); rock3Img.src = 'assets/items/rock3.png';

// Pixel-perfect bbox каждого спрайта в bg (1376×768) — точка к точке:
const ROCK_DRAW = {
  rock1: { fx:  204/BG_W, fy: 558/BG_H, fw: 299/BG_W, fh: 179/BG_H },
  rock2: { fx:  814/BG_W, fy: 330/BG_H, fw: 192/BG_W, fh: 143/BG_H },
  rock3: { fx: 1185/BG_W, fy: 444/BG_H, fw: 191/BG_W, fh: 223/BG_H },
};

// ── Zones (click-areas совпадают с DRAW, чтобы тапать точно по камню) ────
const ZONES = {
  rock1:  ROCK_DRAW.rock1,
  rock2:  ROCK_DRAW.rock2,
  rock3:  ROCK_DRAW.rock3,
  bottle: { fx: BOT_PX / BG_W, fy: BOT_PY / BG_H,
            fw: BOT_PW / BG_W, fh: BOT_PH / BG_H },
};

// ── object-fit: cover math ────────────────────────────────────────────────
// Логика вынесена в src/scene-base.js (coverRect + hitZone). Здесь только
// подгонка под локальные имена.
function bgRect() { return coverRect(W, H, BG_W, BG_H, 'center'); }

function hitZone(cx, cy) {
  const R = bgRect();
  for (const [name, z] of Object.entries(ZONES)) {
    if (name === 'bottle' && S.jarPickedUp) continue;
    if (_hitZone(cx, cy, z, R)) return name;
  }
  return null;
}

// ── Rock click counters ────────────────────────────────────────────────────
const rockClicks = { rock1: 0, rock2: 0, rock3: 0 };

// ── Rock activation animation ─────────────────────────────────────────────
// При активации (любым предметом) запускается 4-секундная анимация:
//   • спрайт камня плавно появляется (БЕЗ мерцания — чистый fade-in)
//   • вокруг разлетаются 80+ светящихся частиц: разные оттенки жёлтого
//     и белого, разный размер, плавно уносятся в стороны с лёгкой
//     гравитацией, каждая с 3-слойным glow-рендером
//   • через 4 секунды показывается финальное сообщение
const ACTIVATION_DUR = 4000;      // ms
const _activating = {};           // { rockName: { t0, particles, msg } }

// Палитра — 4 тёплых золотых тона, взяты из спрайтов активированных камней.
// Было 10 цветов (от чистого белого до бронзы) — выглядело пёстро,
// как фейерверк. Теперь всё в узкой жёлто-золотой гамме, одна семья оттенков.
const _PARTICLE_COLORS = [
  '#fff4b0',   // светлый тёплый
  '#ffe080',   // ядро
  '#ffc848',   // насыщенный золотой
  '#ffa820',   // тёплый янтарный акцент
];

// ── Ambient orbital particles (светятся над каждым активированным камнем) ──
const _ambientParticles = {};   // { rockName: [particles] }

function _spawnAmbientParticles() {
  // Пыль в воздухе: частицы плавно поднимаются вверх над камнем,
  // покачиваясь в стороны, и гаснут по мере подъёма.
  const N = 60;
  const arr = [];
  for (let i = 0; i < N; i++) {
    arr.push({
      fx:        0.05 + Math.random() * 0.90,   // горизонтальная позиция (доля ширины камня)
      fy:        Math.random() * 1.1,            // вертикальная (0=верх, 1=низ, <0=выше камня)
      vy:        -(0.0007 + Math.random() * 0.0020),  // скорость подъёма (доля высоты/кадр)
      swayAmp:   0.006 + Math.random() * 0.018,  // амплитуда покачивания
      swayFreq:  0.006 + Math.random() * 0.014,
      swayPhase: Math.random() * Math.PI * 2,
      phase:     Math.random() * Math.PI * 2,
      phaseRate: 0.008 + Math.random() * 0.018,
      sz:        2 + Math.floor(Math.random() * 3),   // 2, 3 или 4 px
      col:       _PARTICLE_COLORS[Math.floor(Math.random() * _PARTICLE_COLORS.length)],
    });
  }
  return arr;
}

function _spawnActivationParticles() {
  const arr = [];
  // 60 штук, плавный восход вверх с лёгким боковым покачиванием —
  // не фейерверк (разлёт во все стороны), а «пыль-искра, поднимающаяся
  // от камня к небу». Скорости маленькие, гравитация отрицательная.
  for (let i = 0; i < 60; i++) {
    arr.push({
      // Стартуем по всей площадке камня — не из центра, чтобы не выглядело
      // как точечный взрыв
      x:  0.15 + Math.random() * 0.70,
      y:  0.55 + Math.random() * 0.35,   // нижняя половина
      // Лёгкий вертикальный подъём + мягкое боковое покачивание
      vx: (Math.random() - 0.5) * 0.35,
      vy: -(0.25 + Math.random() * 0.35),
      // Sway для плавного колыхания траектории
      swayAmp:   0.008 + Math.random() * 0.014,
      swayFreq:  0.025 + Math.random() * 0.03,
      swayPhase: Math.random() * Math.PI * 2,
      life: 0,
      ttl: 120 + Math.random() * 120,     // 120..240 кадров — дольше видны
      sz:  1 + Math.floor(Math.random() * 3),
      col: _PARTICLE_COLORS[Math.floor(Math.random() * _PARTICLE_COLORS.length)],
    });
  }
  return arr;
}
// Сколько камней активировано — нужно для reflection после 1-го и 2-го.
function _activatedCount() {
  return Object.values(S.rockStates).filter(Boolean).length;
}

// Показать массив story-сообщений подряд через cascade onDismiss.
// Каждое само закрывается по dur, и следующая строка появляется после.
function _showReflectionSequence(msgs, startDelay = 1200) {
  setTimeout(() => {
    if (state.activeScreen !== SCREENS.SCENE2) return;
    let i = 0;
    const next = () => {
      if (i >= msgs.length || state.activeScreen !== SCREENS.SCENE2) return;
      const txt = msgs[i++];
      showMsgIn(msgEl, txt, {
        story: true,
        dur:   4200,
        onDismiss: next,
      });
    };
    next();
  }, startDelay);
}

function _activateRock(zone, msg) {
  if (S.rockStates[zone]) return;
  S.rockStates[zone] = true;
  _saveS();

  const n = _activatedCount();

  const entry = {
    t0:        performance.now(),
    particles: _spawnActivationParticles(),
    msg,
    timer:     null,
  };
  entry.timer = setTimeout(() => {
    entry.timer = null;
    delete _activating[zone];
    if (state.activeScreen !== SCREENS.SCENE2) return;

    // Складываем активационное сообщение и reflection в один chain —
    // теперь всё идёт через showMsgIn(story) с onDismiss, без отдельных
    // setTimeout и без риска, что обычный msg перекроет начало reflection.
    // Раньше между msg и reflection был 3.6с зазор — всё работало, но
    // отдельный msg (не story) и параллельные таймеры были хрупкими.
    const chain = [msg];
    if      (n === 1) chain.push(...ROCK1_REFLECT);
    else if (n === 2) chain.push(...ROCK2_REFLECT);
    _showReflectionSequence(chain, 0);
  }, ACTIVATION_DUR);
  _activating[zone] = entry;
}

// Сбросить все pending-таймеры и анимации активации при закрытии сцены —
// иначе при выходе в main и возврате пользователь увидит мигание осколков
// старой анимации (камень-то уже сохранился как активный).
function _cancelActivations() {
  for (const zone of Object.keys(_activating)) {
    if (_activating[zone].timer) clearTimeout(_activating[zone].timer);
    delete _activating[zone];
  }
}

// ── Jar pickup ─────────────────────────────────────────────────────────────
function pickUpJar() {
  if (S.jarPickedUp) return;
  if (state.selectedSlot >= 0) { showMsg('Руки заняты.'); return; }
  S.jarPickedUp = true;
  _saveS();
  addItem(makeItem('jar'));
  AudioSystem.playPickup();
  renderHotbar();
  showMsg('Ты подобрал стеклянную банку. Она пустая.');
}

// ── interactItem ───────────────────────────────────────────────────────────
function interactItem(itemId, zone) {
  const item = getSelectedItem();
  const isRock = zone === 'rock1' || zone === 'rock2' || zone === 'rock3';

  // jar (empty) on rock
  if (itemId === 'jar' && isRock && !item.glowing && !item.released && !item.hasWater && item.caught === 0) {
    showMsg(JAR_ON_ROCK_MSGS[rockClicks[zone] % JAR_ON_ROCK_MSGS.length]);
    rockClicks[zone]++;
    return;
  }

  // jar_open or jar with hasWater → rock
  if ((itemId === 'jar_open' || (itemId === 'jar' && item.hasWater)) && isRock) {
    if (S.rockStates[zone]) { showMsg('Этот камень уже принял воду. Другой ждёт.'); return; }
    const slot = state.inventory.findIndex(i => i?.id === itemId && i === item);
    removeItem(slot >= 0 ? slot : getItemSlot(itemId));
    renderHotbar();
    AudioSystem.playRock();
    _activateRock(zone, 'Вода впитывается в камень. Банка трескается от холода — и рассыпается.');
    return;
  }

  // dirt on rock
  if (itemId === 'dirt' && isRock) {
    if (S.rockStates[zone]) { showMsg('Камень уже принял что нужно.'); return; }
    removeItem(getItemSlot('dirt'));
    renderHotbar();
    AudioSystem.playRock();
    _activateRock(zone, 'Земля ложится на камень. Что-то меняется.');
    return;
  }

  // glowstick on rock — НЕ активирует камень (раньше активировала, это было
  // багом). Светящаяся палка нужна для другого — показать что-то невидимое
  // в ухе Будды. Здесь — просто флейвор через getZoneMsg (см. zone-msgs.js
  // ключ 'glowstick:rock').

  // stick on bottle zone (light from jar)
  if (itemId === 'stick' && zone === 'bottle') {
    const jarSlot = state.inventory.findIndex(i => i?.id === 'jar' || i?.id === 'jar_open');
    if (jarSlot < 0) { showMsg('Тут нечем светить.'); return; }
    const jar = state.inventory[jarSlot];
    if (!jar.glowing && !jar.released && jar.caught === 0 && !jar.hasWater) {
      showMsg('В банке ничего нет. Нечем светить.'); return;
    }
    const stickSlot = getItemSlot('stick');
    state.inventory[stickSlot] = makeItem('glowstick');
    state.inventory[jarSlot]   = makeItem('jar_open');
    state.selectedSlot = -1;
    renderHotbar();
    AudioSystem.playItemInteract();
    showMsg('Палка коснулась банки — и впитала весь свет. Банка снова пустая.');
    return;
  }

  // Zone flavor
  const msg = getZoneMsg(itemId, zone, item);
  if (msg) showMsg(msg);
}

// ── zoneClick ──────────────────────────────────────────────────────────────
function zoneClick(zone) {
  trackZoneClick(zone);

  if (zone === 'bottle') { pickUpJar(); return; }

  if (zone === 'rock1' || zone === 'rock2' || zone === 'rock3') {
    AudioSystem.playRock();
    rockClicks[zone] = (rockClicks[zone] ?? 0) + 1;
    const msgs = S.rockStates[zone] ? ACTIVATED_ROCK_MSGS : BARE_ROCK_MSGS;
    showMsg(msgs[rockClicks[zone] % msgs.length]);
    return;
  }
}

// ── onTap ──────────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== SCREENS.SCENE2) return;
  trackSpotClick(cx, cy, 'scene2');
  const item = getSelectedItem();
  const zone = hitZone(cx, cy);

  if (item && zone) { interactItem(item.id, zone); return; }
  if (zone)         { zoneClick(zone); return; }
  trackEmptyClick();
}

// ── Keyboard ───────────────────────────────────────────────────────────────
function _onKey(e) {
  if (state.activeScreen !== SCREENS.SCENE2) return;
  if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') pickUpJar();
}

// ── Animation ──────────────────────────────────────────────────────────────
let animId = null;

function animate() {
  if (state.activeScreen !== SCREENS.SCENE2) { animId = null; return; }
  ctx.clearRect(0, 0, W, H);

  // Фактический видимый прямоугольник bg (с учётом object-fit:cover)
  const R = bgRect();

  // Bottle sprite
  if (!S.jarPickedUp && bottleImg.complete && bottleImg.naturalWidth) {
    const bx = R.x + (BOT_PX / BG_W) * R.w;
    const by = R.y + (BOT_PY / BG_H) * R.h;
    const bw = (BOT_PW / BG_W) * R.w;
    const bh = (BOT_PH / BG_H) * R.h;
    ctx.drawImage(bottleImg, bx, by, bw, bh);
  }

  // Rock sprites (когда активированы) — светящиеся символы на плитах
  const rockImgs = { rock1: rock1Img, rock2: rock2Img, rock3: rock3Img };
  const now = performance.now();
  for (const [rock, done] of Object.entries(S.rockStates)) {
    if (!done) continue;
    const img = rockImgs[rock];
    if (!(img.complete && img.naturalWidth)) continue;
    const d = ROCK_DRAW[rock];
    const rx = R.x + d.fx * R.w, ry = R.y + d.fy * R.h;
    const rw = d.fw * R.w,       rh = d.fh * R.h;
    const act = _activating[rock];
    let pulse;
    if (act) {
      // Во время активации — ТОЛЬКО плавное появление, без мерцания.
      // Спрайт проявляется за ~900мс и остаётся полным до конца активации.
      const age = now - act.t0;
      pulse = Math.min(1, age / 900);
    } else {
      pulse = 1;
    }
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.drawImage(img, rx, ry, rw, rh);
    ctx.restore();

    // Светящиеся частицы во время активации — 3-слойный glow рендер:
    //   1) внешний halo (большой, прозрачный)
    //   2) средний mid (чуть плотнее)
    //   3) яркое core-ядро (полный цвет частицы)
    // Вместе дают эффект мягкого свечения без shadowBlur (оно тяжёлое на 80+).
    if (act) {
      const age = now - act.t0;
      // Плавное глобальное затухание на последних 800мс
      const globalFade = age < 3200 ? 1 : Math.max(0, 1 - (age - 3200) / 800);
      for (const p of act.particles) {
        p.life++;
        if (p.life > p.ttl) continue;
        // Движение: плавный восход без гравитации + боковое покачивание.
        // Без fireworks-разлёта — частицы спокойно поднимаются вверх,
        // слегка колышась в стороны (как тёплая пыль от костра).
        p.swayPhase += p.swayFreq;
        p.vx *= 0.994;
        p.vy *= 0.994;
        p.x += p.vx / rw + Math.sin(p.swayPhase) * p.swayAmp;
        p.y += p.vy / rh;
        const lifeFrac = p.life / p.ttl;
        // Плавная alpha-кривая: быстрый appear, долгий fade-out
        const lifeAlpha = lifeFrac < 0.15
          ? lifeFrac / 0.15
          : 1 - (lifeFrac - 0.15) / 0.85;
        const a = lifeAlpha * globalFade;
        if (a <= 0) continue;
        const px = Math.round(rx + p.x * rw);
        const py = Math.round(ry + p.y * rh);
        const s  = p.sz;
        ctx.fillStyle = p.col;
        // halo — широкое мягкое свечение
        ctx.globalAlpha = a * 0.18;
        ctx.fillRect(px - s * 2, py - s * 2, s * 5, s * 5);
        // mid — средний ореол
        ctx.globalAlpha = a * 0.45;
        ctx.fillRect(px - s, py - s, s * 3, s * 3);
        // core — яркий пиксель
        ctx.globalAlpha = a;
        ctx.fillRect(px, py, s, s);
      }
      ctx.globalAlpha = 1;
    }

    // ── Пыль в воздухе над активированным камнем (вертикальный дрейф) ──────
    if (!_ambientParticles[rock]) _ambientParticles[rock] = _spawnAmbientParticles();
    for (const p of _ambientParticles[rock]) {
      // Движение
      p.fy        += p.vy;
      p.swayPhase += p.swayFreq;
      p.phase     += p.phaseRate;
      const sway   = Math.sin(p.swayPhase) * p.swayAmp;

      // Респавн: улетела выше камня на 80% его высоты → вернуть к низу
      if (p.fy < -0.80) {
        p.fy        = 0.85 + Math.random() * 0.40;
        p.fx        = 0.05 + Math.random() * 0.90;
        p.swayPhase = Math.random() * Math.PI * 2;
      }

      // Alpha: максимум в теле камня, гаснет над ним
      const fadeFrac = p.fy < 0
        ? Math.max(0, 1 + p.fy / 0.80)
        : Math.min(1, 1 - p.fy * 0.25);
      const br = fadeFrac * (0.42 + 0.58 * (0.5 + 0.5 * Math.sin(p.phase)));
      if (br <= 0.01) continue;

      const ppx = Math.round(rx + (p.fx + sway) * rw);
      const ppy = Math.round(ry + p.fy * rh);
      const s   = p.sz;
      ctx.fillStyle = p.col;
      // halo — мягкое размытое свечение
      ctx.globalAlpha = br * 0.20;
      ctx.fillRect(ppx - s, ppy - s, s * 3, s * 3);
      // mid ореол
      ctx.globalAlpha = br * 0.52;
      ctx.fillRect(ppx - Math.max(1, s >> 1), ppy - Math.max(1, s >> 1), s + Math.max(1, s >> 1) * 2, s + Math.max(1, s >> 1) * 2);
      // core — яркий пиксель
      ctx.globalAlpha = br;
      ctx.fillRect(ppx, ppy, s, s);
    }
    ctx.globalAlpha = 1;
  }

  animId = requestAnimationFrame(animate);
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('scene2')) return;

  el = document.createElement('div');
  el.id = 'scene2';
  el.className = 'scene-root';
  el.style.zIndex = '55';

  const bg = document.createElement('img');
  bg.src = 'assets/bg/tree.png';
  bg.className = 'scene-bg';

  canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  ctx = canvas.getContext('2d');

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = closeSceneScene2;
  back.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); closeSceneScene2(); }, { passive: false });

  msgEl = document.createElement('div');
  msgEl.className = 'scene-msg';

  el.appendChild(bg); el.appendChild(canvas);
  el.appendChild(back); el.appendChild(msgEl);
  document.getElementById('wrap').appendChild(el);

  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    onTap(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const r = canvas.getBoundingClientRect();
    onTap(t.clientX - r.left, t.clientY - r.top);
  }, { passive: false });
  canvas.addEventListener('mousemove', e => {
    if (state.activeScreen !== SCREENS.SCENE2) return;
    // Кэш _s2Rect обновляется только на resize/scroll — не 60Hz.
    setCursor(!!hitZone(e.clientX - _s2Rect.left, e.clientY - _s2Rect.top));
  });
  canvas.addEventListener('mouseleave', () => { setCursor(false); });
  _s2CacheRect();
  window.addEventListener('resize', _s2CacheRect);
  window.addEventListener('scroll', _s2CacheRect, { passive: true });

  // keydown слушатель нужен только пока сцена открыта; подписываем на open,
  // снимаем на close — иначе навеки висит и продолжает обрабатывать события
  // уже закрытой сцены. Раньше было просто addEventListener без снятия.
}
function _bindKeydown()   { document.addEventListener('keydown', _onKey); }
function _unbindKeydown() { document.removeEventListener('keydown', _onKey); }

// Кэш canvas rect — чтобы mousemove не вызывал getBoundingClientRect 60 раз/сек.
let _s2Rect = { left: 0, top: 0, width: 0, height: 0 };
function _s2CacheRect() {
  if (canvas) _s2Rect = canvas.getBoundingClientRect();
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
// _waitImg перенесён в src/scene-base.js (waitImg) — см. другие сцены.
export async function openSceneScene2() {
  leaveMain();
  createEl();
  el = document.getElementById('scene2');
  showLoading('дерево');

  const bgImg = el.querySelector('img');
  await Promise.all([
    waitImg(bgImg), waitImg(bottleImg),
    waitImg(rock1Img), waitImg(rock2Img), waitImg(rock3Img),
  ]);
  if (!bgImg.naturalWidth) {
    // Без resumeMain игрок был в лимбо: main скрыта (из-за leaveMain),
    // сцена не показана, ошибка закрылась — пустой экран без кнопок.
    hideLoading();
    resumeMain();
    showError('не удалось загрузить сцену');
    return;
  }

  hideLoading();
  state.activeScreen = SCREENS.SCENE2;
  el.style.display   = 'block';
  _bindKeydown();
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    W = canvas.width  = Math.round(r.width);
    H = canvas.height = Math.round(r.height);
    _s2CacheRect();                       // rect валиден после resize canvas
    if (!animId) animate();
  });
}

export function closeSceneScene2() {
  state.activeScreen = SCREENS.MAIN;
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  _cancelActivations();
  _unbindKeydown();
  // window resize/scroll listeners ОСТАЮТСЯ — добавлены в createEl один раз,
  // canvas живёт всю сессию. _s2Rect обновится при следующем открытии.
  SaveManager.setScene('scene2', S);
  resumeMain();
}
window.closeSceneScene2 = closeSceneScene2;
