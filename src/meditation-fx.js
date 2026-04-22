// src/meditation-fx.js — общий эффект медитации.
// Тайские символы плывут вверх, слегка качаются, растворяются.
//
// Для achievements и любых будущих сцен без gameplay-символов:
//   const fx = createMeditationFx();
//   // в animate(): if (hero.praying && tick % 24 === 0) fx.spawn(x, y);
//   fx.tick(); fx.draw(ctx);
//
// Главная сцена использует константы отсюда, но свой spawn (с path/drag/deliver).

// ── Константы стиля ────────────────────────────────────────────────────────
// Источник правды — все сцены спавнят один и тот же набор символов,
// одну и ту же палитру. Менять только здесь.
export const THAI_CHARS    = 'ธมอนภวตสกรคทยชพระศษสหฬาิีุูเแโใไ';
export const PURPLE_PALETTE = [
  '#ffffff','#f0e8ff','#e2d4ff','#c8aaff',
  '#b888ff','#9966ee','#ddaaff','#ffe8ff','#ccbbff','#aa88ee',
];

// ── Helpers ────────────────────────────────────────────────────────────────
export function randomThaiChar() {
  return THAI_CHARS[Math.floor(Math.random() * THAI_CHARS.length)];
}
export function randomPurpleColor() {
  return PURPLE_PALETTE[Math.floor(Math.random() * PURPLE_PALETTE.length)];
}

// ── Простой эффект ─────────────────────────────────────────────────────────
// Для сцен, где символы — чисто декорация (achievements, будущие сцены).
// Главная использует свой spawnSym с path/drag/deliver, но палитру/шрифт/
// общую математику — отсюда.
export function createMeditationFx({ sizeBase = 22, sizeVar = 30 } = {}) {
  let syms = [];

  function spawn(cx, cy) {
    syms.push({
      ch:        randomThaiChar(),
      x: cx, y: cy,
      x0: cx, y0: cy,
      t: 0,
      phase:     Math.random() * Math.PI * 2,
      ampX:      18 + Math.random() * 30,
      freqX:     0.35 + Math.random() * 0.45,
      riseSpeed: 0.38 + Math.random() * 0.30,
      life:      1.0,
      size:      sizeBase + Math.random() * sizeVar,
      color:     randomPurpleColor(),
    });
  }

  function tick() {
    for (let i = syms.length - 1; i >= 0; i--) {
      const s = syms[i];
      s.t++;
      const sec = s.t / 60;
      s.x = s.x0 + Math.sin(sec * s.freqX * Math.PI + s.phase) * s.ampX;
      s.y = s.y0 - (s.riseSpeed * s.t + 0.0008 * s.t * s.t);
      s.life -= 0.0016;
      if (s.life <= 0 || s.y < -80) syms.splice(i, 1);
    }
  }

  function draw(ctx) {
    if (!syms.length) return;
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (const s of syms) {
      ctx.globalAlpha = Math.max(0, Math.min(1, s.life));
      ctx.fillStyle   = s.color;
      ctx.font        = `${s.size}px "VT323", monospace`;
      ctx.fillText(s.ch, s.x, s.y);
    }
    ctx.restore();
  }

  function clear() { syms = []; }

  return {
    spawn, tick, draw, clear,
    get syms() { return syms; },
  };
}
