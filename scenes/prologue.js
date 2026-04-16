// scenes/prologue.js — пролог: последовательность слайдов перед игрой
// ─────────────────────────────────────────────────────────────────────────────
// Паттерн: Sequence из src/sequence.js управляет слайдами.
// Сцена рендерит currentSlide в animate(): текст поверх чёрного фона.
// Тап / клик → seq.next(). По окончании → openScene('main').
//
// Чтобы наполнить пролог:
//   1. Заполни SLIDES (text + duration или без duration = tap-to-advance)
//   2. Замени финальный onEnd если нужен другой переход
// ─────────────────────────────────────────────────────────────────────────────

import { state }                              from '../src/state.js';
import { showMsgIn }                          from '../src/utils.js';
import { leaveMain, resumeMain }              from './main.js';
import { Sequence }                           from '../src/sequence.js';
import { openScene }                          from '../src/nav.js';
import { SaveManager }                        from '../src/save.js';

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('prologue');
S.seen = S.seen ?? false;

// ── Slides — заполнить контентом ──────────────────────────────────────────
const SLIDES = [
  // { text: 'Было тихо.', duration: 3000 },
  // { text: 'Потом появился монах.', duration: 3000 },
  // { text: '' }  // пустой слайд = пауза, tap to continue
];

// ── DOM ────────────────────────────────────────────────────────────────────
let el, canvas, ctx;
let W = 0, H = 0;
let animId = null;

// ── Sequence ───────────────────────────────────────────────────────────────
const seq = new Sequence(SLIDES, _onEnd);

function _onEnd() {
  S.seen = true;
  SaveManager.setScene('prologue', S);
  closeScenePrologue();
  openScene('main');
}

// ── Render ─────────────────────────────────────────────────────────────────
function animate(t) {
  if (state.activeScreen !== 'prologue') { animId = null; return; }
  ctx.clearRect(0, 0, W, H);

  // фон — чёрный
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  const slide = seq.currentSlide;
  if (slide?.text) {
    ctx.save();
    ctx.fillStyle   = 'rgba(255,240,200,0.92)';
    ctx.font        = `${Math.round(H * 0.04)}px serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    // простой word-wrap: разбить по \n
    const lines = slide.text.split('\n');
    const lineH = Math.round(H * 0.06);
    lines.forEach((line, i) => {
      const y = H / 2 + (i - (lines.length - 1) / 2) * lineH;
      ctx.fillText(line, W / 2, y);
    });
    // подсказка "тап" если нет auto-advance
    if (!slide.duration) {
      ctx.fillStyle = 'rgba(255,240,200,0.3)';
      ctx.font      = `${Math.round(H * 0.025)}px serif`;
      ctx.fillText('· · ·', W / 2, H * 0.82);
    }
    ctx.restore();
  }

  animId = requestAnimationFrame(animate);
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('prologue-scene')) return;

  el = document.createElement('div');
  el.id = 'prologue-scene';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:60;background:#000;';

  canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:pointer;';
  ctx = canvas.getContext('2d');

  el.appendChild(canvas);
  document.getElementById('wrap').appendChild(el);

  const advance = () => { if (state.activeScreen === 'prologue') seq.next(); };
  canvas.addEventListener('click',    advance);
  canvas.addEventListener('touchend', e => { e.preventDefault(); advance(); }, { passive: false });
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
export async function openScenePrologue() {
  leaveMain();
  createEl();
  el = document.getElementById('prologue-scene');

  state.activeScreen  = 'prologue';
  el.style.display    = 'block';

  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    W = canvas.width  = Math.round(r.width);
    H = canvas.height = Math.round(r.height);
    seq.start();
    if (!animId) animate(0);
  });
}

export function closeScenePrologue() {
  seq.cancel();
  state.activeScreen = 'main';
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  SaveManager.setScene('prologue', S);
  resumeMain();   // иначе после пролога main не перезапустит animate()
}
window.closeScenePrologue = closeScenePrologue;
