// src/anim-loop.js — universal requestAnimationFrame loop с guard'ом сцены.
//
// Раньше каждая сцена писала свою копию:
//
//   let animId = null;
//   function animate() {
//     if (state.activeScreen !== SCREENS.X) { animId = null; return; }
//     ctx.clearRect(0, 0, W, H);
//     tick++;
//     ...рендер...
//     animId = requestAnimationFrame(animate);
//   }
//
// 7+ строк boilerplate × 10 сцен. Теперь — один helper.
//
// ── Использование ────────────────────────────────────────────────────────
//
//   import { runAnimLoop } from '../src/anim-loop.js';
//   import { makeIsActiveCheck } from '../src/scene-input.js';
//
//   let tick = 0;
//   const loop = runAnimLoop({
//     canvas,
//     isActive: makeIsActiveCheck(SCREENS.MAIN),
//     onFrame: (ctx, w, h) => {
//       tick++;
//       drawHero(ctx, ...);
//       drawZones(ctx, ...);
//     },
//     // Опции:
//     autoClear: true,   // ctx.clearRect перед каждым кадром (default true)
//   });
//   loop.start();   // запуск
//   loop.stop();    // ручная остановка (обычно guard сам останавливает)
//   loop.running    // текущее состояние

export function runAnimLoop({ canvas, isActive, onFrame, autoClear = true }) {
  if (!canvas) throw new Error('runAnimLoop: canvas required');
  if (!onFrame) throw new Error('runAnimLoop: onFrame required');
  const ctx = canvas.getContext('2d');
  let animId = null;

  function tick() {
    if (!isActive || !isActive()) { animId = null; return; }
    if (autoClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onFrame(ctx, canvas.width, canvas.height);
    animId = requestAnimationFrame(tick);
  }

  return {
    start() { if (animId == null) tick(); },
    stop()  { if (animId != null) { cancelAnimationFrame(animId); animId = null; } },
    get running() { return animId != null; },
  };
}
