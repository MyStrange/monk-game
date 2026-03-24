// src/sequence.js — линейный движок слайдов (пролог, катсцены)
// ─────────────────────────────────────────────────────────────────────────────
// Использование:
//   const seq = new Sequence(SLIDES, onEnd);
//   seq.next();   // перейти к следующему слайду вручную
//   seq.cancel(); // прервать последовательность
//
// Формат слайда:
//   { text: 'строка',  duration: 4000 }   // auto-advance через duration мс
//   { text: 'строка' }                     // ждёт seq.next() (tap-to-advance)
//   { render: (ctx,W,H,t) => {} }          // кастомный рендер без текста
// ─────────────────────────────────────────────────────────────────────────────

export class Sequence {
  /**
   * @param {Array}    slides  — массив объектов слайдов
   * @param {Function} onEnd   — вызывается после последнего слайда
   */
  constructor(slides, onEnd) {
    this._slides  = slides;
    this._onEnd   = onEnd;
    this._idx     = -1;
    this._timer   = null;
    this._active  = false;
  }

  /** Запустить с первого слайда */
  start() {
    this._active = true;
    this._idx    = -1;
    this.next();
  }

  /** Перейти к следующему слайду */
  next() {
    if (!this._active) return;
    clearTimeout(this._timer);
    this._idx++;

    if (this._idx >= this._slides.length) {
      this._active = false;
      this._onEnd?.();
      return;
    }

    const slide = this._slides[this._idx];
    this._show(slide);

    if (slide.duration) {
      this._timer = setTimeout(() => this.next(), slide.duration);
    }
    // если duration нет — ждём явного next()
  }

  /** Прервать (без вызова onEnd) */
  cancel() {
    clearTimeout(this._timer);
    this._active = false;
    this._idx    = -1;
  }

  get active()       { return this._active; }
  get currentSlide() { return this._slides[this._idx] ?? null; }

  /** @private */
  _show(slide) {
    // Сцена сама отрисовывает currentSlide в своём animate().
    // Sequence только хранит состояние — не трогает DOM напрямую.
    // Вызов onSlide-колбека если нужен сайд-эффект (показать/скрыть UI).
    this.onSlide?.(slide, this._idx);
  }
}
