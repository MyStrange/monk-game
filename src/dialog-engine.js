// src/dialog-engine.js — DialogEngine: runner диалогов с портретами/ветками
// Используется для fly-room диалога (DIALOG из dialogue.js) и будущих диалогов.

export class DialogEngine {
  // containerEl: div который будет показан/скрыт
  constructor(containerEl) {
    this.el     = containerEl;
    this.lines  = [];
    this.idx    = 0;
    this.onEnd  = null;
    this._buildDOM();
  }

  // lines: [{speaker, text, portrait?, last?}, ...]
  // speaker: 'А' | 'Б' | '' (нарратор)
  // last:true → скрыть hint "tap to continue"
  play(lines, onEnd) {
    this.lines = lines;
    this.idx   = 0;
    this.onEnd = onEnd;
    this._render();
    this.el.style.display = 'flex';
  }

  next() {
    this.idx++;
    if (this.idx >= this.lines.length) { this.end(); return; }
    this._render();
  }

  end() {
    this.el.style.display = 'none';
    this.onEnd?.();
  }

  _buildDOM() {
    this.el.innerHTML = `
      <div class="dlg-box">
        <div class="dlg-speaker" id="dlg-speaker"></div>
        <div class="dlg-text"    id="dlg-text"></div>
        <div class="dlg-hint"    id="dlg-hint">нажми чтобы продолжить</div>
      </div>`;

    this.el.addEventListener('click', () => this.next());
    this.el.addEventListener('touchend', e => {
      e.preventDefault();
      this.next();
    }, { passive: false });
  }

  _render() {
    const line = this.lines[this.idx];
    if (!line) return;

    const speakerEl = this.el.querySelector('#dlg-speaker');
    const textEl    = this.el.querySelector('#dlg-text');
    const hintEl    = this.el.querySelector('#dlg-hint');

    // Speaker styling
    speakerEl.textContent = line.speaker || '';
    speakerEl.className   = 'dlg-speaker';
    if (line.speaker === 'А') speakerEl.classList.add('speaker-a');
    if (line.speaker === 'Б') speakerEl.classList.add('speaker-b');
    if (!line.speaker)        speakerEl.classList.add('speaker-narrator');

    textEl.textContent = line.text;

    // Hint
    hintEl.style.display = line.last ? 'none' : 'block';
  }
}
