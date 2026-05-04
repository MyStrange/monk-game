// src/particles.js — общий класс Particles для всех систем частиц.
//
// Раньше каждая сцена писала свой массив + _spawnX + _drawX:
//   tutorial: smoke[] + embers[]  (~60 строк)
//   buddha:   bFlies[] + bDust[] + wishFlies[]  (~80 строк)
//   inside:   _spores[]  (~30 строк)
//   main:     mParticles + statueParticles  (~40 строк)
// — везде один паттерн: push в массив, tick (обновить vx/vy + life), удалить
// мёртвых, draw.
//
// Этот класс инкапсулирует это.
//
// ── Использование (life-based, как smoke/embers) ─────────────────────────
//
//   import { Particles } from '../src/particles.js';
//   const smoke = new Particles();
//   // Spawn:
//   smoke.spawn({ x, y, vx, vy, life: 1.0, decay: 0.011, sz: 3 });
//   // Tick:
//   smoke.tick();   // x += vx; y += vy; life -= decay; truncate dead
//   // Draw:
//   smoke.forEach(p => {
//     ctx.globalAlpha = p.life * 0.5;
//     ctx.fillStyle = '#a0a0a8';
//     ctx.fillRect(Math.round(p.x * sx), Math.round(p.y * sy), p.sz * sx, p.sz * sy);
//   });
//
// ── Использование (batch, как inside spores) ─────────────────────────────
//
//   const spores = new Particles();
//   spores.spawnBatch(160, () => ({
//     x: Math.random(), y: Math.random(),
//     vy: -(0.0005 + Math.random() * 0.0018),
//     phase: Math.random() * Math.PI * 2,
//     // ...
//   }));
//   // Кастомный tick если нужны нестандартные обновления:
//   spores.forEach(p => { p.phase += 0.01; p.y += p.vy; });

export class Particles {
  constructor() {
    this.arr = [];
  }

  // Добавить одну частицу. Поля произвольные; tick() умеет работать с
  // {x, y, vx, vy, life, decay} и игнорирует остальные.
  spawn(props) {
    this.arr.push(props);
    return this.arr[this.arr.length - 1];
  }

  // Сгенерировать N частиц через factory(). Заменяет существующие, если
  // resetFirst=true (поведение _spawnSpores в inside.js).
  spawnBatch(count, factory, resetFirst = false) {
    if (resetFirst) this.arr = [];
    for (let i = 0; i < count; i++) this.arr.push(factory(i));
  }

  // Стандартный tick для life-based частиц:
  //   p.x  += p.vx                (если есть)
  //   p.y  += p.vy
  //   p.life -= p.decay           (если есть)
  // Удаляет частицы с life <= 0.
  // Для нестандартного поведения (sin-sway, phase-rate) — используй forEach.
  tick() {
    for (let i = this.arr.length - 1; i >= 0; i--) {
      const p = this.arr[i];
      if (p.vx != null) p.x += p.vx;
      if (p.vy != null) p.y += p.vy;
      if (p.decay != null) p.life -= p.decay;
      if (p.life != null && p.life <= 0) this.arr.splice(i, 1);
    }
  }

  // Пройтись по живым частицам. Возвращаемое значение игнорируется.
  forEach(fn) {
    for (let i = 0; i < this.arr.length; i++) fn(this.arr[i], i);
  }

  // Очистить все. Используется при выходе из сцены / standUp.
  clear() {
    this.arr.length = 0;
  }

  get length() { return this.arr.length; }
}
