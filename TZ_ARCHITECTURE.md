# MONK GAME — Architecture TZ v4
> Единственный источник правды об архитектуре. Читать перед любой правкой.
> Цель: 100 сцен, минимум токенов на правку, 0 архитектурных багов.

---

## Структура файлов

```
/
├── index.html                    ← точка входа, <script type="module" src="game.js?vN">
├── style.css                     ← только стили, не трогать без причины
├── game.js                       ← ~60 строк: import + window.* + init
│
├── src/
│   ├── state.js                  ← ТОЛЬКО: inventory, selectedSlot, activeScreen
│   ├── input.js                  ← InputManager: mouse+touch → {cx,cy}, isMobile()
│   ├── save.js                   ← SaveManager: localStorage, per-scene state
│   ├── nav.js                    ← NAV_MAP: граф сцен, openScene(id), canLeave()
│   ├── utils.js                  ← showMsgIn, showLoading, hideLoading, showError
│   ├── inventory.js              ← ITEM_DEFS, makeItem, addItem, SCENE_DEFS
│   ├── icons.js                  ← все renderXIcon() SVG функции
│   ├── hotbar.js                 ← renderHotbar, updateItemCursor, item menu
│   ├── combos.js                 ← ITEM_COMBO, itemOnItem (предмет × предмет)
│   ├── zone-msgs.js              ← ZONE_MSGS, getZoneMsg (флейвор текст)
│   ├── dialogue.js               ← все массивы текстов (catMsgs, MEDITATE_MSGS...)
│   ├── dialog-engine.js          ← DialogEngine: runner диалогов с портретами/ветками
│   ├── cutscene.js               ← CutsceneEngine: видео + анимационные секвенции
│   ├── audio.js                  ← AudioSystem: ambient, meditation, sound effects
│   └── achievements.js           ← ACHIEVEMENT_DEFS, track, unlock, toast, screen
│
├── scenes/
│   ├── _TEMPLATE.js              ← ШАБЛОН — копировать при создании любой новой сцены
│   ├── main.js                   ← главная сцена, loop, hero, leaveMain
│   ├── meditation.js             ← медитация, символы, надпись
│   ├── scene2.js                 ← корни / дерево
│   ├── buddha.js                 ← экран Будды
│   ├── scene3.js                 ← огненный цветок
│   ├── scene4.js                 ← aerial + светлячки-философы
│   └── ... (новые сцены сюда)
│
└── assets/
    ├── bg/                       ← фоны сцен (.jpeg)
    ├── sprites/                  ← персонажи (.png, spritesheet)
    ├── items/                    ← предметы (.png)
    ├── video/                    ← катсцены (.mp4)
    └── audio/                    ← звуки (.ogg/.mp3)
```

---

## Правило токенов (главное правило)

| Задача | Читать только |
|---|---|
| Добавить реплику | `dialogue.js` (~120 строк) |
| Добавить предмет | `inventory.js` + `icons.js` + `zone-msgs.js` |
| Добавить новую сцену | `_TEMPLATE.js` → новый файл (~150 строк) |
| Взаимодействие предмет×зона | файл сцены (свой `interactItem`) |
| Взаимодействие предмет×предмет | `combos.js` |
| Починить медитацию | `meditation.js` |
| Звук | `audio.js` |
| Ачивка | `achievements.js` |
| Диалог с ветками | `dialog-engine.js` |
| Катсцена / видео | `cutscene.js` |

---

## Ядро: state.js

```js
// src/state.js — ВСЁ содержимое, никогда не расширять
export const state = {
  inventory:    Array(5).fill(null),
  selectedSlot: -1,
  activeScreen: 'main',  // 'main' | 'scene2' | 'buddha' | ... (id из NAV_MAP)
};
```

**Флаги сцены — ТОЛЬКО в файле сцены, не в state:**
```js
// scenes/scene2.js — правильно
let jarPickedUp  = false;
let rockStates   = { rock1: false, rock2: false, rock3: false };
```

---

## Шаблон сцены: _TEMPLATE.js

```js
// scenes/_TEMPLATE.js
// 1. cp _TEMPLATE.js my_scene.js
// 2. Заменить все SCENEID на реальный id (snake_case)
// 3. Заполнить ZONES, msgs, interactItem, особую логику
// 4. Добавить в NAV_MAP в src/nav.js
// 5. Добавить window.closeSceneSCENEID в game.js

import { state }              from '../src/state.js';
import { showMsgIn }          from '../src/utils.js';
import { showLoading, hideLoading, showError } from '../src/utils.js';
import { leaveMain }          from './main.js';
import { getSelectedItem }    from '../src/inventory.js';
import { getZoneMsg }         from '../src/zone-msgs.js';
import { SaveManager }        from '../src/save.js';

// ── SCENE STATE (только флаги этой сцены) ─────────────────────────────────────
const S = SaveManager.getScene('SCENEID');  // { flag1: false, flag2: 0, ... }

// ── DOM ───────────────────────────────────────────────────────────────────────
let el, canvas, ctx, msgEl;
let W = 0, H = 0;
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── ZONES (доли 0..1 от W/H) ──────────────────────────────────────────────────
// fx,fy = левый верхний угол, fw,fh = ширина/высота
const ZONES = {
  // zone_name: { fx, fy, fw, fh }
  example: { fx: 0.2, fy: 0.3, fw: 0.15, fh: 0.25 },
};

function hitZone(cx, cy) {
  for (const [name, z] of Object.entries(ZONES)) {
    if (cx >= z.fx*W && cx < (z.fx+z.fw)*W &&
        cy >= z.fy*H && cy < (z.fy+z.fh)*H) return name;
  }
  return null;
}

// ── ITEM × ZONE INTERACTIONS ──────────────────────────────────────────────────
// Не использовать combos.js — взаимодействия этой сцены живут здесь
function interactItem(itemId, zone) {
  // if (itemId === 'stick' && zone === 'example') { ... return; }
  const msg = getZoneMsg(itemId, zone);
  if (msg) showMsg(msg);
}

// ── ZONE CLICKS (без предмета) ────────────────────────────────────────────────
function zoneClick(zone) {
  const msg = getZoneMsg(null, zone);  // bareZone msgs
  if (msg) showMsg(msg);
}

// ── TAP HANDLER ───────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== 'SCENEID') return;
  const item = getSelectedItem();
  const zone = hitZone(cx, cy);

  if (item && zone) { interactItem(item.id, zone); return; }
  if (zone)         { zoneClick(zone); return; }
  // empty click — для ачивок trackEmptyClick() можно добавить здесь
}

// ── ANIMATION ─────────────────────────────────────────────────────────────────
let animId = null;
function animate(t) {
  if (state.activeScreen !== 'SCENEID') { animId = null; return; }
  ctx.clearRect(0, 0, W, H);
  // draw here
  animId = requestAnimationFrame(animate);
}

// ── DOM CREATION ──────────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('SCENEID')) return;
  el = document.createElement('div');
  el.id = 'SCENEID';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;';

  const bg = document.createElement('img');
  bg.src = 'assets/bg/SCENEID.jpeg';
  bg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';

  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:default;';
  ctx = canvas.getContext('2d');

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.onclick = closeSceneSCENEID;

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
}

// ── LIFECYCLE ─────────────────────────────────────────────────────────────────
export async function openSceneSCENEID() {
  leaveMain();
  createEl();
  el = document.getElementById('SCENEID');
  showLoading('SCENEID');

  const bgImg = el.querySelector('img');
  bgImg.onerror = () => showError('не удалось загрузить сцену');
  bgImg.onload  = () => {
    hideLoading();
    state.activeScreen = 'SCENEID';
    el.style.display = 'block';
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      W = canvas.width  = Math.round(r.width);
      H = canvas.height = Math.round(r.height);
      if (!animId) animate(0);
    });
  };
  if (bgImg.complete && bgImg.naturalWidth) bgImg.onload();
}

export function closeSceneSCENEID() {
  state.activeScreen = 'main';
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  SaveManager.setScene('SCENEID', S);  // сохранить флаги
}
window.closeSceneSCENEID = closeSceneSCENEID;
```

---

## Navigation: nav.js

```js
// src/nav.js
// Граф сцен — добавить новую сцену в один объект, больше ничего не менять

import { state } from './state.js';

export const NAV_MAP = {
  //  id         opener import                canLeave(S)       leaveBlockMsg
  main:    { open: null,               canLeave: ()=>true,  block: null },
  scene2:  { open: 'scenes/scene2.js', canLeave: ()=>true,  block: null },
  buddha:  { open: 'scenes/buddha.js', canLeave: (S)=>!S.wishPlaying, block: 'Подожди...' },
  scene3:  { open: 'scenes/scene3.js', canLeave: ()=>true,  block: null },
  scene4:  { open: 'scenes/scene4.js', canLeave: ()=>true,  block: null },
  // new_scene: { open: 'scenes/new_scene.js', canLeave: ()=>true, block: null },
};

export async function openScene(id) {
  const def = NAV_MAP[id];
  if (!def || !def.open) return;
  const mod = await import(`../${def.open}`);
  mod[`openScene${toPascal(id)}`]?.() ?? mod[`open${toPascal(id)}`]?.();
}

export function canLeave(id, sceneState) {
  return NAV_MAP[id]?.canLeave(sceneState) ?? true;
}
```

---

## SaveManager: save.js

```js
// src/save.js
// Структура localStorage — никогда не менять ключи без миграции

const KEY = 'monk_save_v1';

const DEFAULT = {
  version:  1,
  global: {
    inventory:    Array(5).fill(null),
    achievements: [],
    visitedScenes: [],
  },
  scenes: {},  // { scene_id: { ...флаги сцены } }
};

export const SaveManager = {
  _data: null,

  load() {
    try { this._data = JSON.parse(localStorage.getItem(KEY)) || DEFAULT; }
    catch { this._data = DEFAULT; }
    return this;
  },

  save() {
    localStorage.setItem(KEY, JSON.stringify(this._data));
  },

  getScene(id) {
    return this._data.scenes[id] ?? {};
  },

  setScene(id, state) {
    this._data.scenes[id] = state;
    this.save();
  },

  get global() { return this._data.global; },
};
```

---

## InputManager: input.js

```js
// src/input.js
// Единая точка mouse + touch → {cx, cy} в координатах canvas

export const InputManager = {
  isMobile: () => window.matchMedia('(pointer:coarse)').matches || window.innerWidth < 768,

  // Привязать к canvas — возвращает функцию отвязки
  bind(canvas, onTap, onHover) {
    const coords = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      return { cx: clientX - r.left, cy: clientY - r.top };
    };

    const onClick = e => onTap(coords(e.clientX, e.clientY));
    const onMove  = e => onHover?.(coords(e.clientX, e.clientY));
    const onTouch = e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      onTap(coords(t.clientX, t.clientY));
    };

    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('touchend', onTouch, { passive: false });

    return () => {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('touchend', onTouch);
    };
  }
};
```

---

## Mobile vs Desktop UI

### Определение платформы
```js
// src/utils.js
export const isMobile = () =>
  window.matchMedia('(pointer:coarse)').matches || window.innerWidth < 768;
```

### Хотбар
| | Desktop | Mobile |
|---|---|---|
| Позиция | bottom, по центру | bottom, на всю ширину |
| Размер слота | 56px | 72px |
| Курсор | кастомный CSS cursor | overlay-иконка под пальцем (top-left) |
| Взаимодействие | hover = tooltip, click = выбор | tap = выбор, long press = контекст-меню |

```js
// hotbar.js — адаптив через CSS класс
hotbarEl.classList.toggle('mobile', isMobile());
```

```css
/* style.css */
#hotbar { display:flex; gap:8px; padding:8px; }
#hotbar.mobile { width:100%; gap:4px; padding:6px 4px; }
#hotbar .slot  { width:56px; height:56px; }
#hotbar.mobile .slot { flex:1; height:72px; max-width:80px; }
```

### Кнопки управления (звук, fullscreen, ачивки)
```
Desktop: правый верхний угол, 32×32px, hover highlight
Mobile:  правый верхний угол, 44×44px (минимум tap target)
```

```js
// Единый шаблон кнопки
function makeUIButton(id, iconFn, onClick) {
  const btn = document.createElement('button');
  btn.id = id;
  btn.className = `ui-btn ${isMobile() ? 'mobile' : ''}`;
  btn.innerHTML = iconFn();
  btn.onclick = onClick;
  return btn;
}
```

### Back button (каждая сцена)
```css
.back-btn {
  position: absolute;
  top: 12px; left: 12px;
  z-index: 10;
  min-width: 44px; min-height: 44px;   /* mobile tap target */
  padding: 8px 14px;
}
```

---

## DialogEngine: dialog-engine.js

Для диалогов с портретами, ветками, choices (сцены-диалоги):

```js
// src/dialog-engine.js

export class DialogEngine {
  constructor(containerEl) {
    this.el = containerEl;
    this.onEnd = null;
  }

  // lines: [{speaker, text, portrait?}, ...] | {speaker, text, choices:[{label, next}]}
  play(lines, onEnd) {
    this.lines = lines;
    this.idx   = 0;
    this.onEnd = onEnd;
    this._render();
    this.el.style.display = 'block';
  }

  next() {
    this.idx++;
    if (this.idx >= this.lines.length) { this.end(); return; }
    this._render();
  }

  choose(nextId) {
    const branch = this.lines.find(l => l.id === nextId);
    if (!branch) { this.end(); return; }
    this.lines = Array.isArray(branch) ? branch : [branch];
    this.idx = 0;
    this._render();
  }

  end() {
    this.el.style.display = 'none';
    this.onEnd?.();
  }

  _render() {
    const line = this.lines[this.idx];
    // построить DOM: портрет + текст + кнопка "далее" или choices
  }
}
```

Использование в сцене:
```js
import { DialogEngine } from '../src/dialog-engine.js';

const dlg = new DialogEngine(document.getElementById('dialog-box'));
dlg.play([
  { speaker: 'монах', text: 'Ты снова здесь.' },
  { speaker: 'монах', text: 'Или ты всегда был здесь?' },
  { speaker: null,    text: 'Молчание.' },
], () => openScene('forest'));
```

---

## CutsceneEngine: cutscene.js

```js
// src/cutscene.js
// Секвенция: видео → диалог → переход в сцену

export class CutsceneEngine {
  constructor(containerEl) {
    this.el  = containerEl;
    this.seq = [];
    this.idx = 0;
  }

  play(sequence) {
    // sequence: [{type:'video',src}, {type:'dialog',lines}, {type:'scene',id}, ...]
    this.seq = sequence;
    this.idx = 0;
    this.el.style.display = 'block';
    this._step();
  }

  _step() {
    if (this.idx >= this.seq.length) { this._end(); return; }
    const s = this.seq[this.idx++];

    if (s.type === 'video') {
      const v = document.createElement('video');
      v.src = s.src; v.autoplay = true; v.muted = s.muted ?? false;
      v.onended = () => this._step();
      this.el.replaceChildren(v);
      v.play();

    } else if (s.type === 'dialog') {
      // использует DialogEngine
      dialogEngine.play(s.lines, () => this._step());

    } else if (s.type === 'fade') {
      // fade in/out
      this.el.animate([{opacity:0},{opacity:1}], { duration: s.dur ?? 800 })
        .onfinish = () => this._step();

    } else if (s.type === 'scene') {
      this._end();
      openScene(s.id);
    }
  }

  _end() {
    this.el.style.display = 'none';
  }
}
```

---

## AudioSystem: audio.js

```js
// src/audio.js
// Два режима: ambient (игра) + meditation (медитация)
// Переключение через setMode('ambient' | 'meditation' | 'silent')

export const AudioSystem = {
  ctx:    null,
  mode:   'silent',  // 'ambient' | 'meditation' | 'silent'
  muted:  false,

  init()             { /* создать AudioContext при первом взаимодействии */ },
  toggle()           { this.muted = !this.muted; this._apply(); },
  setMode(mode)      { this.mode = mode; this._apply(); },

  _apply() {
    if (this.muted || this.mode === 'silent') { /* stop all */ return; }
    if (this.mode === 'ambient')    this._playAmbient();
    if (this.mode === 'meditation') this._playMeditation();
  },

  _playAmbient()    { /* процедурная лесная атмосфера */ },
  _playMeditation() { /* процедурные тоны + тибетская чаша */ },

  // SFX
  playCatMeow()     {},
  playBell()        {},
  playPickup()      {},
};
```

Из сцены вызывать:
```js
AudioSystem.setMode('meditation');  // при входе в медитацию
AudioSystem.setMode('ambient');     // при выходе
```

---

## AchievementSystem: achievements.js

```js
// ACHIEVEMENT_DEFS — шаблон одного достижения
{
  id:       'stub_1',            // уникальный id
  category: 'stub',              // stub | exp | void | ...
  level:    1,                   // 1 | 2 | 3
  title:    'Замкнутый круг',
  desc:     'Ты кликнул на один объект 5 раз. Колесо сансары приветствует тебя.',
  icon:     renderEyeIcon,       // функция → SVG string
  condition: (stats) => stats.maxZoneClicks >= 5,
}
```

---

## Invariants — никогда не нарушать

```
1. state.js — только inventory, selectedSlot, activeScreen.
   Флаги сцены → в файле сцены. Никогда не добавлять в state.js.

2. utils.js — только примитивы (showMsgIn, showLoading, showError, isMobile).
   Каждая сцена делает: const showMsg = (t,d) => showMsgIn(myMsgEl, t, d)
   utils.js не знает ни об одном DOM-элементе сцены.

3. Новая сцена — ВСЕГДА копировать _TEMPLATE.js.
   Не создавать сцену с нуля.

4. interactItem(itemId, zone) — в файле сцены (не в combos.js).
   combos.js = только предмет×предмет.

5. Новый текст → dialogue.js. Не хардкодить строки в файлах сцен.

6. Новый предмет → inventory.js + icons.js + zone-msgs.js.
   Предмет без SVG иконки — не добавлять.

7. Переход в сцену: leaveMain() первым делом.
   Выход из сцены: SaveManager.setScene(id, S) — сохранить флаги.

8. Touch targets: минимум 44×44px на мобильных.
   Hotbar slots: 72px на mobile, 56px на desktop.

9. Сообщения только через showMsg (обёртка showMsgIn).
   Никогда не писать el.textContent напрямую.

10. activeScreen — строго id из NAV_MAP. Не использовать произвольные строки.
```

---

## Чеклист: добавить новую сцену (5 шагов)

```
1. cp scenes/_TEMPLATE.js scenes/my_scene.js
   Заменить все SCENEID → my_scene

2. Добавить bg: assets/bg/my_scene.jpeg
   Добавить <link rel="preload"> в index.html

3. Заполнить в my_scene.js:
   - ZONES (координаты зон 0..1)
   - interactItem (предмет × зона)
   - zoneClick (клик без предмета)
   - S = начальные флаги сцены

4. Добавить в src/nav.js → NAV_MAP:
   my_scene: { open: 'scenes/my_scene.js', canLeave: ()=>true, block: null }

5. Добавить в game.js:
   window.closeSceneMyScene = closeSceneMyScene;
```

---

## game.js — точка входа (~60 строк)

```js
// game.js
import { state }          from './src/state.js';
import { SaveManager }    from './src/save.js';
import { InputManager }   from './src/input.js';
import { AudioSystem }    from './src/audio.js';
import { renderHotbar }   from './src/hotbar.js';
import { toggleSound }    from './src/audio.js';
import { toggleFullscreen, showLoading, hideLoading } from './src/utils.js';
import { openAchievements, closeAchievements } from './src/achievements.js';
import { initMain, leaveMain } from './scenes/main.js';

// ── window.* для HTML onclick= ─────────────────────────────────────────────
Object.assign(window, {
  toggleSound, toggleFullscreen,
  openAchievements, closeAchievements,
  leaveMain,
  // closeSceneXXX добавляется в каждом файле сцены
});

// ── Init ───────────────────────────────────────────────────────────────────
SaveManager.load();
AudioSystem.init();
initMain();
```

---

## Ожидаемые размеры файлов

| Файл | Строк | Растёт? |
|---|---|---|
| game.js | ~60 | нет |
| src/state.js | ~10 | никогда |
| src/utils.js | ~50 | никогда |
| src/input.js | ~40 | редко |
| src/save.js | ~40 | редко |
| src/nav.js | ~30 + N строк | +1 строка на сцену |
| src/inventory.js | ~80 | +5 строк на предмет |
| src/icons.js | ~500 | +30 строк на предмет |
| src/hotbar.js | ~100 | редко |
| src/combos.js | ~120 | +5 строк на комбо |
| src/zone-msgs.js | ~150 | +3 строки на зону |
| src/dialogue.js | ~150 | +N строк на диалог |
| src/dialog-engine.js | ~80 | редко |
| src/cutscene.js | ~80 | редко |
| src/audio.js | ~200 | редко |
| src/achievements.js | ~150 | +8 строк на ачивку |
| scenes/_TEMPLATE.js | ~120 | никогда |
| scenes/my_scene.js | ~120–200 | изолировано |
