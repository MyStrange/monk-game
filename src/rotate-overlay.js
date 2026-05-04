// src/rotate-overlay.js — оверлей «поверни телефон» для портретного режима
// Только мобильные. Огоньки-светлячки на canvas. Запуск из game.js один раз.

import { drawPixelGlow3 } from './anims.js';

export function initRotateOverlay() {
  if (!window.matchMedia('(pointer:coarse)').matches) return; // desktop: skip
  const overlay = document.getElementById('rotate-overlay');
  const canvas  = document.getElementById('rotate-canvas');
  if (!overlay || !canvas) return;

  const ctx = canvas.getContext('2d');
  // Yellow / orange / white palette
  const COLORS = ['#f0c040','#ffe066','#ffb020','#ff8800','#ffd080','#fff0a0','#ffffff','#ffcc44','#ffa030','#ffe8b0'];
  const N = 80;
  let flies = [], animId = null;

  function _spawnFlies() {
    const W = canvas.width, H = canvas.height;
    flies = Array.from({length: N}, () => {
      const r = Math.random();
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(Math.random() * 0.55 + 0.1),
        sz: r < 0.15 ? 3 : 2,  // smaller: max 3px
        col: COLORS[Math.floor(Math.random() * COLORS.length)],
        phase: Math.random() * Math.PI * 2,
        rate:  Math.random() * 0.022 + 0.007,
      };
    });
  }

  function _resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    if (flies.length === 0) _spawnFlies();
  }

  function _tick() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    for (const f of flies) {
      f.phase += f.rate;
      // pulse: 0.3…1.0, same formula as scene4
      const br = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(f.phase));
      f.x += f.vx + Math.sin(f.phase * 0.6) * 0.35;
      f.y += f.vy;
      if (f.y < -8)    { f.y = H + 4; f.x = Math.random() * W; }
      if (f.x < -8)    f.x = W + 4;
      if (f.x > W + 8) f.x = -4;
      // 3-слойный pixel glow — единый визуал из src/anims.js.
      drawPixelGlow3(ctx, Math.round(f.x), Math.round(f.y), f.sz, f.col, br);
    }
    ctx.globalAlpha = 1;
    animId = requestAnimationFrame(_tick);
  }

  function _start() { _resize(); if (!animId) animId = requestAnimationFrame(_tick); }
  function _stop()  { if (animId) { cancelAnimationFrame(animId); animId = null; } }

  const mq = window.matchMedia('(orientation:portrait)');
  function _onOrient() { mq.matches ? _start() : _stop(); }
  mq.addEventListener('change', _onOrient);
  window.addEventListener('resize', () => { if (mq.matches) _resize(); });
  _onOrient();
}
