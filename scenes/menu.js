// scenes/menu.js — главное меню (старт, настройки, ачивки)
// ─────────────────────────────────────────────────────────────────────────────
// Паттерн: зоны-кнопки на canvas поверх фонового изображения.
// Кнопки хранятся в BUTTONS: { label, fx, fy, fw, fh, action }
// action() — вызывается при тапе по зоне.
//
// Чтобы наполнить меню:
//   1. Заменить фон (assets/bg/menu.jpeg) или рисовать программно
//   2. Добавить кнопки в BUTTONS
//   3. Прописать action для каждой
// ─────────────────────────────────────────────────────────────────────────────

import { state }                              from '../src/state.js';
import { SCREENS }                            from '../src/constants.js';
import { leaveMain, resumeMain }              from './main.js';
import { openScene }                          from '../src/nav.js';
import { SaveManager }                        from '../src/save.js';
import { openAchievements }                   from '../src/achievements.js';
import { setCursor }                          from '../src/ui/cursor.js';

// ── Buttons (фракции 0..1 от W/H) ─────────────────────────────────────────
const BUTTONS = [
  {
    label:  'Начать',
    fx: 0.35, fy: 0.45, fw: 0.30, fh: 0.09,
    action: () => { closeSceneMenu(); openScene('prologue'); },
  },
  {
    label:  'Продолжить',
    fx: 0.35, fy: 0.57, fw: 0.30, fh: 0.09,
    action: () => { closeSceneMenu(); openScene('main'); },
  },
  {
    label:  'Достижения',
    fx: 0.35, fy: 0.69, fw: 0.30, fh: 0.09,
    action: () => openAchievements(),
  },
];

// ── DOM ────────────────────────────────────────────────────────────────────
let el, canvas, ctx;
let W = 0, H = 0;
let animId = null;

// ── Hit test ───────────────────────────────────────────────────────────────
function hitButton(cx, cy) {
  for (const btn of BUTTONS) {
    if (cx >= btn.fx * W && cx < (btn.fx + btn.fw) * W &&
        cy >= btn.fy * H && cy < (btn.fy + btn.fh) * H) return btn;
  }
  return null;
}

// ── Render ─────────────────────────────────────────────────────────────────
function animate() {
  if (state.activeScreen !== SCREENS.MENU) { animId = null; return; }
  ctx.clearRect(0, 0, W, H);

  // фон
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);

  // заголовок
  ctx.save();
  ctx.fillStyle   = 'rgba(255,230,120,0.9)';
  ctx.font        = `bold ${Math.round(H * 0.07)}px serif`;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Монах', W / 2, H * 0.28);
  ctx.restore();

  // кнопки
  for (const btn of BUTTONS) {
    const x = btn.fx * W, y = btn.fy * H;
    const w = btn.fw * W, h = btn.fh * H;

    ctx.save();
    ctx.fillStyle   = 'rgba(255,230,120,0.08)';
    ctx.strokeStyle = 'rgba(255,230,120,0.35)';
    ctx.lineWidth   = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle    = 'rgba(255,240,200,0.85)';
    ctx.font         = `${Math.round(h * 0.5)}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, x + w / 2, y + h / 2);
    ctx.restore();
  }

  animId = requestAnimationFrame(animate);
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('menu-scene')) return;

  el = document.createElement('div');
  el.id = 'menu-scene';
  el.className = 'scene-root';
  el.style.zIndex = '60';

  canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  // Не задаём cursor — наследуется bud/lotus от #wrap (см. utils.setCursor + style.css).
  ctx = canvas.getContext('2d');

  el.appendChild(canvas);
  document.getElementById('wrap').appendChild(el);

  const onTap = (cx, cy) => {
    if (state.activeScreen !== SCREENS.MENU) return;
    hitButton(cx, cy)?.action();
  };

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

  // Hover: lotus над кнопкой, bud над пустым местом.
  canvas.addEventListener('mousemove', e => {
    if (state.activeScreen !== SCREENS.MENU) return;
    const r = canvas.getBoundingClientRect();
    setCursor(hitButton(e.clientX - r.left, e.clientY - r.top) ? 'ptr' : false);
  });
  canvas.addEventListener('mouseleave', () => setCursor(false));
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
export async function openSceneMenu() {
  leaveMain();
  createEl();
  el = document.getElementById('menu-scene');

  state.activeScreen = SCREENS.MENU;
  el.style.display   = 'block';

  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    W = canvas.width  = Math.round(r.width);
    H = canvas.height = Math.round(r.height);
    if (!animId) animate();
  });
}

export function closeSceneMenu() {
  state.activeScreen = SCREENS.MAIN;
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  setCursor(false);   // сбросить hover-курсор если уходим с подсвеченной кнопки
  resumeMain();   // иначе main-анимация не перезапустится после меню
}
window.closeSceneMenu = closeSceneMenu;
