// scenes/buddha.js — Будда: светлячки, желание, ухо, диалог философов

import { state }         from '../src/state.js';
import { SCREENS }       from '../src/constants.js';
import { showMsgIn, showChoiceIn, showLoading, hideLoading, showError, CURSOR_DEF, CURSOR_PTR, setCursor } from '../src/utils.js';
import { leaveMain, resumeMain } from './main.js';
import { getSelectedItem, addItem, removeItem, makeItem, getItemSlot } from '../src/inventory.js';
import { renderHotbar }  from '../src/hotbar.js';
import { SaveManager }   from '../src/save.js';
import { AudioSystem }   from '../src/audio.js';
import { trackZoneClick, trackSpotClick } from '../src/achievements.js';
import {
  wishDoneMsg,
  earMsg, durianAfterDialog, DIALOG,
} from '../src/dialogue.js';

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('buddha');
S.earUsed        = S.earUsed        ?? false;
S.wishPlaying    = S.wishPlaying    ?? false;
S.durianPickedUp = S.durianPickedUp ?? false;

// ── DOM ────────────────────────────────────────────────────────────────────
let el, bCanvas, wishCanvas, bCtx, wCtx, bMsgEl;
let bW = 0, bH = 0;
const showMsg = (t, d) => showMsgIn(bMsgEl, t, d);

// ── object-fit: cover math для клик-зон по фиксированным точкам bg ────────
// buddha.jpeg (1376×768) отрисована с object-fit:cover → видимый
// прямоугольник может быть меньше canvas по одной из осей. Ухо Будды
// привязано к конкретному пикселю bg, значит hit-зона должна считаться
// относительно видимого rect, а не canvas (иначе на экранах с aspect
// ≠ 1376/768 зона уплывает от нарисованного уха).
const BBG_AR = 1376 / 768;
function _bgRect() {
  const cAr = bW / bH;
  if (cAr > BBG_AR) {
    const w = bH * BBG_AR;
    return { x: (bW - w) / 2, y: 0, w, h: bH };
  }
  const h = bW / BBG_AR;
  return { x: 0, y: (bH - h) / 2, w: bW, h };
}
// Ear zone in bg-fractions (left, top, right, bottom) — конкретный пиксель уха
const EAR_FX0 = 0.60, EAR_FY0 = 0.44, EAR_FX1 = 0.73, EAR_FY1 = 0.60;
function _inEar(cx, cy) {
  if (S.earUsed) return false;
  const R = _bgRect();
  return cx > R.x + EAR_FX0 * R.w && cx < R.x + EAR_FX1 * R.w
      && cy > R.y + EAR_FY0 * R.h && cy < R.y + EAR_FY1 * R.h;
}

// ── Fireflies ──────────────────────────────────────────────────────────────
let bFlies = [];
let bDust  = [];  // фоновые некликабельные частицы
let bFlash = [];  // вспышки при поимке светлячка

function _spawnFlies(n) {
  bFlies = Array.from({ length: n }, () => ({
    x:  Math.random() * bW,
    y:  Math.random() * bH,
    vx: (Math.random() - 0.5) * 1.2,
    vy: (Math.random() - 0.5) * 0.8,
    sz: 3 + Math.random() * 4,   // маленькое ядро (3–7px), большое свечение
    br: Math.random(),
    bv: (Math.random() - 0.5) * 0.025,
    alive: true,
    trail: [],
  }));
  bDust = Array.from({ length: 40 }, () => ({
    x:  Math.random() * bW,
    y:  Math.random() * bH,
    vx: (Math.random() - 0.5) * 0.22,
    vy: -0.08 - Math.random() * 0.14,
    sz: 1 + Math.random() * 1.8,
    br: Math.random(),
    bv: (Math.random() - 0.5) * 0.008,
  }));
}

// ── Epic wish release animation ─────────────────────────────────────────────
// Светлячки вырываются из позиции банки в инвентаре (низ экрана),
// летят по большим петлям со светящимися следами.
let wishFlies = [];
let wishTick  = 0;
const WISH_DURATION = 160; // frames @ ~60fps = ~2.7s

function _startWish(jar) {
  S.wishPlaying = true;
  wishTick  = 0;

  // Старт — примерно позиция хотбара внизу экрана
  const startX = bW * 0.5;
  const startY = bH * 0.88;

  wishFlies = Array.from({ length: 10 }, (_, i) => {
    const phase = (i / 10) * Math.PI * 2;
    return {
      t:          0,
      phase,
      riseSpeed:  1.2 + Math.random() * 0.8,
      orbitR:     50 + Math.random() * 70,
      orbitSpeed: 0.045 + Math.random() * 0.025,
      loopR:      25 + Math.random() * 45,
      loopSpeed:  0.11 + Math.random() * 0.07,
      x:          startX + (Math.random() - 0.5) * 30,
      y:          startY,
      trail:      [],
      alpha:      1.0,
      sz:         3 + Math.random() * 4,    // то же что ambient: маленькое ядро, большое свечение
    };
  });

  setTimeout(() => {
    // Guard: колбэк не должен дёргать UI если игрок ушёл из buddha
    if (state.activeScreen !== SCREENS.BUDDHA) { S.wishPlaying = false; return; }
    S.wishPlaying      = false;
    jar.glowing        = true;
    jar.released       = true;
    jar.caught         = 0;
    jar.label          = 'банка';
    jar.description    = 'Светляковая жижка. Внутри мерцает тихий свет — след от десяти светлячков.';
    state.selectedSlot = -1;  // снять с руки после завершения желания
    renderHotbar();
    showMsg(wishDoneMsg, { story: true });
  }, (WISH_DURATION / 60) * 1000 + 200);
}

// ── Fly-room bubble dialog ──────────────────────────────────────────────────
let flyroomEl     = null;
let flyroomAnimId = null;
let _frAnimateFn  = null;  // ref to canvas animate fn, для перезапуска

// Dialog state
let _dlgLines    = [];
let _dlgIdx      = 0;
let _dlgActive   = false;
let _dlgOnEnd    = null;
let _pauseTimer  = null;
let _pauseClicks = 0;

// Typewriter state
let _twTimer  = null;   // setTimeout handle for next char
let _twBub    = null;   // bubble element being typed into
let _twText   = '';     // full text being typed
let _twIdx    = 0;      // chars revealed so far
let _twChirpN = 0;      // char counter for sound rate-limiting

// Bubble DOM refs
let _bubA = null, _bubB = null, _bubNarr = null, _pauseDots = null;

function _buildFlyroom() {
  if (document.getElementById('flyroom')) return;

  flyroomEl = document.createElement('div');
  flyroomEl.id = 'flyroom';
  flyroomEl.style.cssText = 'position:absolute;inset:0;display:none;z-index:65;overflow:hidden;cursor:pointer;';

  const bg = document.createElement('img');
  bg.src = 'assets/bg/flyroom.jpeg';
  bg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;pointer-events:none;';

  const frCanvas = document.createElement('canvas');
  frCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';

  // Speech bubbles
  _bubA = document.createElement('div');
  _bubA.className = 'fly-bubble bubble-a';
  _bubA.style.cssText = 'left:27%;bottom:16%;';

  _bubB = document.createElement('div');
  _bubB.className = 'fly-bubble bubble-b';
  _bubB.style.cssText = 'left:70%;bottom:16%;';

  _bubNarr = document.createElement('div');
  _bubNarr.className = 'fly-bubble bubble-narrator';
  _bubNarr.style.cssText = 'left:50%;bottom:10%;max-width:72%;';

  // Pause dots indicator
  _pauseDots = document.createElement('div');
  _pauseDots.className = 'fly-pause-dots';
  _pauseDots.innerHTML = '<span>·</span><span>·</span><span>·</span>';
  _pauseDots.style.display = 'none';

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  const _closeFlyr = e => { e.stopPropagation(); e.preventDefault(); flyroomEl.style.display = 'none'; };
  back.onclick = _closeFlyr;
  back.addEventListener('touchend', _closeFlyr, { passive: false });

  flyroomEl.appendChild(bg);
  flyroomEl.appendChild(frCanvas);
  flyroomEl.appendChild(_bubA);
  flyroomEl.appendChild(_bubB);
  flyroomEl.appendChild(_bubNarr);
  flyroomEl.appendChild(_pauseDots);
  flyroomEl.appendChild(back);
  document.getElementById('wrap').appendChild(flyroomEl);

  // Click anywhere to advance
  flyroomEl.addEventListener('click', () => _dlgClick());
  flyroomEl.addEventListener('touchend', e => { e.preventDefault(); _dlgClick(); }, { passive: false });

  // Canvas glow animation
  let frW = 0, frH = 0;
  const frCtx = frCanvas.getContext('2d');
  // Брюшки-фонарики: левый светлячок ~x=0.27, правый ~x=0.70, оба ~y=0.73
  const flyGlows = [
    { x: 0.27, y: 0.73, color: '#ffcc30' },
    { x: 0.70, y: 0.73, color: '#ffe050' },
  ];
  // Пар над кашей (миска по центру стола ~x=0.50, y≈0.62)
  const frSteam = Array.from({ length: 10 }, () => ({
    x:   0.45 + Math.random() * 0.10,
    y:   0.58 + Math.random() * 0.06,
    vx:  (Math.random() - 0.5) * 0.00014,
    vy:  -0.00024 - Math.random() * 0.00018,
    sz:  2 + Math.random() * 3,
    life: Math.random(),
    lv:  0.0035 + Math.random() * 0.0030,
  }));
  // Мелкая пыльца в воздухе
  const frDust = Array.from({ length: 50 }, () => ({
    x:  Math.random(),
    y:  Math.random(),
    vx: (Math.random() - 0.5) * 0.00040,
    vy: -0.00012 - Math.random() * 0.00020,
    sz: 1.0 + Math.random() * 2.0,
    br: Math.random(),
    bv: (Math.random() - 0.5) * 0.015,
  }));
  let frTick = 0;
  _frAnimateFn = function frAnimate() {
    if (flyroomEl.style.display === 'none') { flyroomAnimId = null; return; }
    const r = frCanvas.getBoundingClientRect();
    if (r.width !== frW)  { frW = frCanvas.width  = Math.round(r.width); }
    if (r.height !== frH) { frH = frCanvas.height = Math.round(r.height); }
    frCtx.clearRect(0, 0, frW, frH);
    frTick++;

    // Свечение брюшков-фонариков
    for (const g of flyGlows) {
      const alpha = 0.60 + 0.40 * Math.sin(frTick * 0.05);
      const grd   = frCtx.createRadialGradient(g.x*frW, g.y*frH, 0, g.x*frW, g.y*frH, 70);
      grd.addColorStop(0,   g.color + 'ff');
      grd.addColorStop(0.35, g.color + '99');
      grd.addColorStop(1,   g.color + '00');
      frCtx.globalAlpha = alpha;
      frCtx.fillStyle   = grd;
      frCtx.beginPath();
      frCtx.arc(g.x*frW, g.y*frH, 70, 0, Math.PI * 2);
      frCtx.fill();
    }

    // Пар над кашей
    for (const s of frSteam) {
      s.x += s.vx; s.y += s.vy;
      s.life += s.lv;
      if (s.life >= 1) {
        s.life = 0;
        s.x = 0.45 + Math.random() * 0.10;
        s.y = 0.58 + Math.random() * 0.04;
      }
      const fa = s.life < 0.3 ? s.life / 0.3 : (1 - s.life);
      frCtx.globalAlpha = fa * 0.32;
      frCtx.fillStyle   = '#fffde8';
      frCtx.fillRect(Math.round(s.x * frW), Math.round(s.y * frH), Math.ceil(s.sz), Math.ceil(s.sz));
    }

    // Пыльца
    for (const d of frDust) {
      d.x += d.vx; d.y += d.vy;
      if (d.y < 0)  { d.y = 1; d.x = Math.random(); }
      if (d.x < 0 || d.x > 1) { d.x = Math.random(); }
      d.br += d.bv;
      if (d.br < 0 || d.br > 1) d.bv *= -1;
      frCtx.globalAlpha = 0.22 + d.br * 0.40;
      frCtx.fillStyle   = '#ffee88';
      frCtx.fillRect(Math.round(d.x * frW), Math.round(d.y * frH), Math.ceil(d.sz), Math.ceil(d.sz));
    }

    frCtx.globalAlpha = 1;
    flyroomAnimId = requestAnimationFrame(_frAnimateFn);
  };
  // ВАЖНО: раньше и onload, и if(complete)onload() могли выстрелить ОБА
  // (cached + real load) → два параллельных requestAnimationFrame-цикла,
  // анимация шла в 2× скорости. Теперь строго один путь.
  if (bg.complete && bg.naturalWidth) _frAnimateFn();
  else bg.addEventListener('load', _frAnimateFn, { once: true });
}

function _stopTypewriter(showFull) {
  if (_twTimer) { clearTimeout(_twTimer); _twTimer = null; }
  if (showFull && _twBub && _twText) _twBub.textContent = _twText;
  _twBub  = null;
  _twText = '';
  _twIdx  = 0;
}

function _startTypewriter(bub, text) {
  _stopTypewriter(false);
  _twBub    = bub;
  _twText   = text;
  _twIdx    = 0;
  _twChirpN = 0;
  bub.textContent  = '';
  bub.style.display = 'block';
  const CHAR_MS    = 32;   // ms per character
  const CHIRP_EVERY = 4;   // play sound every N chars
  function _tick() {
    if (_twIdx >= _twText.length) { _twTimer = null; return; }
    _twIdx++;
    bub.textContent = _twText.slice(0, _twIdx);
    _twChirpN++;
    if (_twChirpN % CHIRP_EVERY === 1) AudioSystem.playTypewriterChirp?.();
    _twTimer = setTimeout(_tick, CHAR_MS);
  }
  _twTimer = setTimeout(_tick, CHAR_MS);
}

function _dlgHideAll() {
  _bubA.style.display = _bubB.style.display = _bubNarr.style.display = 'none';
  _pauseDots.style.display = 'none';
}

function _dlgShowLine(line) {
  _stopTypewriter(false);
  _dlgHideAll();
  if (line.type === 'pause') {
    _pauseClicks = 0;
    _pauseDots.style.display = 'flex';
    _pauseTimer = setTimeout(_dlgNext, 2000);
    return;
  }
  let bub;
  if (!line.speaker)           bub = _bubNarr;
  else if (line.speaker === 'А') bub = _bubA;
  else                          bub = _bubB;
  _startTypewriter(bub, line.text);
}

function _dlgNext() {
  clearTimeout(_pauseTimer);
  _dlgIdx++;
  if (_dlgIdx >= _dlgLines.length) {
    _dlgActive = false;
    _dlgHideAll();
    flyroomEl.style.display = 'none';
    _dlgOnEnd?.();
    return;
  }
  _dlgShowLine(_dlgLines[_dlgIdx]);
}

function _dlgClick() {
  if (!_dlgActive) return;
  // Если идёт побуквенная анимация — клик скипает к полному тексту
  if (_twTimer) {
    _stopTypewriter(true);
    return;
  }
  const cur = _dlgLines[_dlgIdx];
  if (cur?.type === 'pause') {
    _pauseClicks++;
    if (_pauseClicks >= 3) { clearTimeout(_pauseTimer); _dlgNext(); }
  } else {
    _dlgNext();
  }
}

function startFireflyDialog() {
  if (!flyroomEl) _buildFlyroom();
  const bgImg = flyroomEl.querySelector('img');
  const _show = () => {
    flyroomEl.style.display = 'block';
    if (flyroomAnimId === null && _frAnimateFn) _frAnimateFn();
  };
  if (bgImg && !(bgImg.complete && bgImg.naturalWidth)) {
    showLoading('светляки');
    bgImg.addEventListener('load',  () => { hideLoading(); _show(); }, { once: true });
    bgImg.addEventListener('error', () => { hideLoading(); showError('не удалось загрузить сцену'); }, { once: true });
  } else {
    _show();
  }
  _dlgLines  = DIALOG;
  _dlgIdx    = 0;
  _dlgActive = true;
  _dlgOnEnd  = () => {
    if (!S.durianPickedUp) {
      if (addItem(makeItem('durian'))) {
        S.durianPickedUp = true;
        SaveManager.setScene('buddha', S);
        renderHotbar();
      } else {
        showMsg('Руки заняты. Некуда взять миску.', 3200);
        return;
      }
    }
    showMsg(durianAfterDialog, { story: true });
  };
  setTimeout(() => _dlgShowLine(_dlgLines[0]), 200);
}

// ── interactItem ───────────────────────────────────────────────────────────
function interactItem(itemId, zone) {
  // Glowstick on ear — инструмент многоразовый, остаётся в инвентаре
  if (itemId === 'glowstick' && zone === 'ear' && !S.earUsed) {
    S.earUsed = true;
    SaveManager.setScene('buddha', S);   // флаг сразу — не теряется при F5 за 2.8с
    state.selectedSlot = -1;             // снять с руки, но не удалять
    renderHotbar();
    AudioSystem.playBell();
    showMsg(earMsg, 3500);
    setTimeout(() => {
      // Guard: не открываем диалог если игрок ушёл из buddha
      if (state.activeScreen !== SCREENS.BUDDHA) return;
      startFireflyDialog();
    }, 2800);
  }
  // All other item×zone: no actions here (zone msgs handled via zone-msgs.js)
}

// ── Hit test (for cursor) ─────────────────────────────────────────────────
function _hitBuddha(cx, cy) {
  if (_inEar(cx, cy)) return true;
  for (const f of bFlies) {
    if (f.alive && !f.escaping && Math.hypot(cx - f.x, cy - f.y) < Math.max(22, f.sz * 3)) return true;
  }
  return false;
}

// ── onTap ──────────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== SCREENS.BUDDHA) return;
  if (S.wishPlaying) return;  // блокируем все взаимодействия во время анимации желания

  const item = getSelectedItem();
  trackZoneClick('buddha');
  trackSpotClick(cx, cy, 'buddha');

  // Ear hit zone
  if (_inEar(cx, cy)) {
    if (item) { interactItem(item.id, 'ear'); return; }
  }

  // No jar: click on fly → it escapes with buzz + trail
  if (!item || (item.id !== 'jar' && item.id !== 'jar_open')) {
    for (const f of bFlies) {
      if (f.alive && !f.escaping && Math.hypot(cx - f.x, cy - f.y) < Math.max(22, f.sz * 3)) {
        f.escaping = true;
        const angle = Math.random() * Math.PI * 2;
        f.escapeVx  = Math.cos(angle) * (5 + Math.random() * 4);
        f.escapeVy  = Math.sin(angle) * (5 + Math.random() * 4);
        f.escapeA   = 1.0;
        AudioSystem.playFlyFlutter?.();
        return;
      }
    }
  }

  // Jar: catch firefly (small precision radius)
  if (item && (item.id === 'jar' || item.id === 'jar_open')) {
    if (item.released) { showMsg('В банке уже был свет. Хватит.'); return; }
    for (let i = 0; i < bFlies.length; i++) {
      const f = bFlies[i];
      if (!f.alive) continue;
      if (Math.hypot(cx - f.x, cy - f.y) < Math.max(22, f.sz * 3)) {
        bFlash.push({ x: f.x, y: f.y, t: 0 });
        f.alive = false;
        item.caught = (item.caught ?? 0) + 1;
        AudioSystem.playFlyCatch();

        // Оставляем банку в руке — обновляем только иконку (caught увеличился)
        renderHotbar();

        if (item.caught >= 10) {
          // Сразу запускаем wish-анимацию. Единое story-сообщение
          // (wishDoneMsg) появится в самом конце — никакого мигания
          // между двумя сообщениями.
          setTimeout(() => {
            if (state.activeScreen !== SCREENS.BUDDHA) return;  // guard
            _startWish(item);
          }, 300);
        }
        return;
      }
    }
  }
}

// ── Animation ──────────────────────────────────────────────────────────────
let animId = null;
let bTick  = 0;

function animate() {
  if (state.activeScreen !== SCREENS.BUDDHA) { animId = null; return; }
  bCtx.clearRect(0, 0, bW, bH);
  bTick++;

  // ── Background dust (dim, non-interactive) ────────────────────────────────
  for (const d of bDust) {
    d.x += d.vx; d.y += d.vy;
    if (d.y < 0) { d.y = bH; d.x = Math.random() * bW; }
    if (d.x < 0 || d.x > bW) d.x = Math.random() * bW;
    d.br += d.bv; if (d.br < 0 || d.br > 1) d.bv *= -1;
    bCtx.globalAlpha = 0.07 + d.br * 0.16;
    bCtx.fillStyle   = '#ffe8a0';
    bCtx.fillRect(Math.round(d.x), Math.round(d.y), Math.ceil(d.sz), Math.ceil(d.sz));
  }
  bCtx.globalAlpha = 1;

  // ── Ambient fireflies (yellow pixels with glow) ───────────────────────────
  for (const f of bFlies) {
    if (!f.alive) continue;

    if (f.escaping) {
      // Убегающий светлячок: ускоряется, оставляет след
      f.trail.push({ x: f.x, y: f.y });
      if (f.trail.length > 18) f.trail.shift();
      f.x += f.escapeVx; f.y += f.escapeVy;
      f.escapeVx *= 0.95; f.escapeVy *= 0.95;
      f.escapeA  -= 0.022;
      if (f.escapeA <= 0 || f.x < -80 || f.x > bW + 80 || f.y < -80 || f.y > bH + 80) {
        f.alive = false; continue;
      }
      // Светящийся след (3 слоя без shadowBlur)
      for (let ti = 0; ti < f.trail.length; ti++) {
        const p  = f.trail[ti];
        const ta = (ti / f.trail.length) * f.escapeA * 0.7;
        if (ta < 0.01) continue;
        bCtx.fillStyle = `rgba(255,220,60,${ta})`;
        bCtx.globalAlpha = ta * 0.18; bCtx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 7, 7);
        bCtx.globalAlpha = ta * 0.45; bCtx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 5, 5);
        bCtx.globalAlpha = ta;        bCtx.fillRect(Math.round(p.x),     Math.round(p.y),     3, 3);
      }
      // Сам улетающий светлячок — 4 слоя
      const s    = Math.ceil(f.sz);
      const px   = Math.round(f.x), py = Math.round(f.y);
      const ea   = f.escapeA;
      bCtx.fillStyle = `rgba(255,255,200,${ea})`;
      bCtx.globalAlpha = ea * 0.08;  bCtx.fillRect(px - s*5, py - s*5, s*11, s*11);
      bCtx.globalAlpha = ea * 0.18;  bCtx.fillRect(px - s*3, py - s*3, s*7,  s*7);
      bCtx.globalAlpha = ea * 0.42;  bCtx.fillRect(px - s,   py - s,   s*3,  s*3);
      bCtx.globalAlpha = ea;         bCtx.fillRect(px,        py,       s,    s);
      continue;
    }

    f.x += f.vx; f.y += f.vy;
    f.br += f.bv;
    if (f.br < 0 || f.br > 1) f.bv *= -1;
    if (f.x < 0) f.x = bW; if (f.x > bW) f.x = 0;
    if (f.y < 0) f.y = bH; if (f.y > bH) f.y = 0;
    // Светлячок: маленькое ядро + большой многослойный ореол (без shadowBlur)
    const a  = 0.4 + f.br * 0.6;
    const s  = Math.ceil(f.sz);
    const px = Math.round(f.x), py = Math.round(f.y);
    bCtx.fillStyle = `rgba(255,220,80,${a})`;
    // внешнее широкое свечение
    bCtx.globalAlpha = a * 0.07;  bCtx.fillRect(px - s*5, py - s*5, s*11, s*11);
    // средний ореол
    bCtx.globalAlpha = a * 0.16;  bCtx.fillRect(px - s*3, py - s*3, s*7,  s*7);
    // ближний ореол
    bCtx.globalAlpha = a * 0.38;  bCtx.fillRect(px - s,   py - s,   s*3,  s*3);
    // яркое ядро
    bCtx.globalAlpha = a;         bCtx.fillRect(px,        py,       s,    s);
    bCtx.globalAlpha = 1;
  }

  // ── Catch flashes ─────────────────────────────────────────────────────────
  for (let i = bFlash.length - 1; i >= 0; i--) {
    const fl = bFlash[i];
    fl.t++;
    if (fl.t >= 20) { bFlash.splice(i, 1); continue; }
    const prog = fl.t / 20;
    const radius = 18 + prog * 44;
    const a = (1 - prog) * 0.72;
    bCtx.save();
    const grd = bCtx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, radius);
    grd.addColorStop(0,   `rgba(255,255,220,${a})`);
    grd.addColorStop(0.5, `rgba(255,210,50,${a * 0.55})`);
    grd.addColorStop(1,   'rgba(255,180,0,0)');
    bCtx.fillStyle = grd;
    bCtx.beginPath();
    bCtx.arc(fl.x, fl.y, radius, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.restore();
  }

  // ── Epic wish release animation ────────────────────────────────────────────
  wCtx.clearRect(0, 0, bW, bH);
  if (S.wishPlaying && wishFlies.length) {
    wishTick++;
    const prog = wishTick / WISH_DURATION;

    for (const wf of wishFlies) {
      wf.t++;
      // Rising center with slow drift
      const cx = bW * 0.5 + Math.sin(wf.t * 0.018 + wf.phase) * bW * 0.18;
      const cy = bH * 0.88 - wf.t * wf.riseSpeed;

      // Large spiral orbit
      const ox = Math.cos(wf.t * wf.orbitSpeed + wf.phase) * wf.orbitR;
      const oy = Math.sin(wf.t * wf.orbitSpeed + wf.phase) * wf.orbitR * 0.55;

      // Secondary smaller loop
      const lx = Math.cos(wf.t * wf.loopSpeed) * wf.loopR;
      const ly = Math.sin(wf.t * wf.loopSpeed) * wf.loopR * 0.7;

      wf.x = cx + ox + lx;
      wf.y = cy + oy + ly;
      wf.alpha = Math.max(1.0 - prog * 1.1, 0);

      // Trail
      wf.trail.push({ x: wf.x, y: wf.y });
      if (wf.trail.length > 38) wf.trail.shift();

      // Draw trail (3 слоя без shadowBlur)
      const trailSz = Math.max(2, Math.ceil(wf.sz * 0.8));
      for (let ti = 0; ti < wf.trail.length; ti++) {
        const p  = wf.trail[ti];
        const ta = (ti / wf.trail.length) * wf.alpha * 0.65;
        if (ta < 0.01) continue;
        wCtx.fillStyle = `rgba(255,220,60,${ta})`;
        wCtx.globalAlpha = ta * 0.15; wCtx.fillRect(Math.round(p.x) - trailSz, Math.round(p.y) - trailSz, trailSz*3, trailSz*3);
        wCtx.globalAlpha = ta * 0.40; wCtx.fillRect(Math.round(p.x),           Math.round(p.y),            trailSz,   trailSz);
      }
      // Wish fly — 4-layer glow
      const ws  = Math.ceil(wf.sz);
      const wpx = Math.round(wf.x), wpy = Math.round(wf.y);
      const wa  = wf.alpha;
      wCtx.fillStyle = `rgba(255,255,200,${wa})`;
      wCtx.globalAlpha = wa * 0.07;  wCtx.fillRect(wpx - ws*6, wpy - ws*6, ws*13, ws*13);
      wCtx.globalAlpha = wa * 0.16;  wCtx.fillRect(wpx - ws*3, wpy - ws*3, ws*7,  ws*7);
      wCtx.globalAlpha = wa * 0.42;  wCtx.fillRect(wpx - ws,   wpy - ws,   ws*3,  ws*3);
      wCtx.globalAlpha = wa;         wCtx.fillRect(wpx,         wpy,        ws,    ws);
      wCtx.globalAlpha = 1;
    }
  }

  animId = requestAnimationFrame(animate);
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('buddha')) return;

  el = document.createElement('div');
  el.id = 'buddha';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;';

  const bg = document.createElement('img');
  bg.src = 'assets/bg/buddha.jpeg';
  bg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';

  bCanvas = document.createElement('canvas');
  bCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  bCtx = bCanvas.getContext('2d');

  wishCanvas = document.createElement('canvas');
  wishCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  wCtx = wishCanvas.getContext('2d');

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = closeSceneBuddha;
  back.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); closeSceneBuddha(); }, { passive: false });

  bMsgEl = document.createElement('div');
  bMsgEl.className = 'scene-msg';

  el.appendChild(bg);
  el.appendChild(bCanvas);
  el.appendChild(wishCanvas);
  el.appendChild(back);
  el.appendChild(bMsgEl);
  document.getElementById('wrap').appendChild(el);

  bCanvas.addEventListener('click', e => {
    const r = bCanvas.getBoundingClientRect();
    onTap(e.clientX - r.left, e.clientY - r.top);
  });
  bCanvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const r = bCanvas.getBoundingClientRect();
    onTap(t.clientX - r.left, t.clientY - r.top);
  }, { passive: false });
  let _stickHintZone = false;
  bCanvas.addEventListener('mousemove', e => {
    if (state.activeScreen !== SCREENS.BUDDHA) return;
    const r  = bCanvas.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    setCursor(_hitBuddha(cx, cy));
    // Подсказка: стик над зоной уха
    const item = getSelectedItem();
    const inEar = _inEar(cx, cy);
    if (item?.id === 'stick' && inEar && !_stickHintZone) {
      _stickHintZone = true;
      showMsg('Что-то мешает внутри. Может, посветить?');
    } else if (!inEar) {
      _stickHintZone = false;
    }
  });
  bCanvas.addEventListener('mouseleave', () => { setCursor(false); });
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
export async function openSceneBuddha() {
  leaveMain();
  createEl();
  el = document.getElementById('buddha');

  // Защита от мягкого deadlock'а: если игрок закрыл вкладку в окно 2.8с
  // wish-анимации, флаг S.wishPlaying остался бы true навсегда и
  // closeSceneBuddha бесконечно показывал «Подожди...». При открытии
  // сцены заново анимация не идёт — значит флаг можно сбросить.
  if (S.wishPlaying) {
    S.wishPlaying = false;
    SaveManager.setScene('buddha', S);
  }

  showLoading('будда');

  const bgImg = el.querySelector('img');
  const _onReady = () => {
    hideLoading();
    state.activeScreen = SCREENS.BUDDHA;
    el.style.display   = 'block';
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      bW = bCanvas.width = wishCanvas.width  = Math.round(r.width);
      bH = bCanvas.height = wishCanvas.height = Math.round(r.height);
      _spawnFlies(30);
      if (!animId) animate();
    });
  };
  const _onFail = () => {
    hideLoading();
    showError('не удалось загрузить сцену');
  };
  bgImg.onerror = _onFail;
  bgImg.onload  = _onReady;
  if (bgImg.complete) {
    // complete=true может означать ошибку загрузки → naturalWidth===0
    if (bgImg.naturalWidth) _onReady();
    else _onFail();
  }
}

export function closeSceneBuddha() {
  if (S.wishPlaying) { showMsg('Подожди...'); return; }
  const jar = state.inventory.find(i => i?.id === 'jar' || i?.id === 'jar_open');
  if (jar && jar.caught > 0) {
    // Раньше это было тупиком: если игрок поймал 1-9 светлячков и закрыл
    // вкладку → jar.caught остался в инвентаре → сцена навсегда заперта.
    // Теперь даём выбор: или выпустить и выйти, или остаться.
    showChoiceIn(bMsgEl, 'В банке ещё светлячки. Выпустить их?',
      [{ text: 'Выпустить' }, { text: 'Остаться' }],
      v => {
        if (v !== 'Выпустить') return;
        jar.caught = 0;
        renderHotbar();
        // Визуально: светлячки возвращаются в сцену (доливаем до 30)
        if (state.activeScreen === SCREENS.BUDDHA) {
          const need = Math.max(0, 30 - bFlies.filter(f => f.alive).length);
          if (need > 0) {
            const extra = Array.from({ length: need }, () => ({
              x:  Math.random() * bW,
              y:  Math.random() * bH,
              vx: (Math.random() - 0.5) * 1.2,
              vy: (Math.random() - 0.5) * 0.8,
              // Совпадает с обычным спавном (строка 63): маленькое ядро + свечение.
              // Раньше здесь было 14+rand*14 → размер был 4× больше чем у родных,
              // разлёт выглядел как шарики бурундука, а не светлячки.
              sz: 3 + Math.random() * 4,
              br: Math.random(),
              bv: (Math.random() - 0.5) * 0.025,
              alive: true,
              trail: [],
            }));
            bFlies = bFlies.filter(f => f.alive).concat(extra);
          }
          showMsg('Светлячки разлетаются.');
        }
        // Закрываем сцену после короткой паузы (чтобы игрок увидел разлёт)
        setTimeout(() => {
          if (state.activeScreen !== SCREENS.BUDDHA) return;
          _closeNow();
        }, 900);
      });
    return;
  }
  _closeNow();
}

function _closeNow() {
  state.activeScreen = SCREENS.MAIN;
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  SaveManager.setScene('buddha', S);
  resumeMain();
}
window.closeSceneBuddha = closeSceneBuddha;
