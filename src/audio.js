// src/audio.js — AudioSystem: ambient, meditation, sound effects
// Весь звук генерируется через Web Audio API. Нет аудио-файлов.
// Инициализация — при первом взаимодействии пользователя.

export const AudioSystem = {
  ctx:            null,
  masterGain:     null,
  ambientGain:    null,
  meditationGain: null,
  sittingGain:    null,
  muted:          false,
  _started:       false,
  _mode:          'silent',  // 'ambient' | 'meditation' | 'sitting' | 'silent'

  // ── Init ──────────────────────────────────────────────────────────────
  init() {
    // Start audio on first user gesture — fully synchronous, touchend for iOS
    const start = () => {
      if (this._started) return;
      try {
        this._started = true;
        this._create();
        this.ctx.resume();
        this._playsilent();                      // kick iOS AVAudioSession hardware
        this._startAmbient();
        this.setMode('ambient');
        // Detect iOS silent mode: play a test tone, check if audio was actually rendered
        this._checkSilentMode();
      } catch (e) {
        this._started = false;                   // allow retry on next gesture
      }
    };
    // CAPTURE phase — fires BEFORE canvas touchend handlers that call preventDefault().
    // iOS won't unlock audio if the gesture is "consumed" by preventDefault in bubble phase.
    const _tryStart = () => {
      start();
      if (this._started) {
        ['touchstart', 'touchend', 'click', 'keydown'].forEach(ev =>
          document.removeEventListener(ev, _tryStart, true));
      }
    };
    ['touchstart', 'touchend', 'click', 'keydown'].forEach(e =>
      document.addEventListener(e, _tryStart, true));

    // Re-unlock on every gesture — iOS suspends ctx on background / lock / call
    const _unlock = () => {
      if (!this.ctx) return;
      if (this.ctx.state !== 'running') {
        this.ctx.resume();
        this._playsilent();
      }
    };
    document.addEventListener('touchstart', _unlock, true);
    document.addEventListener('touchend',  _unlock, true);
    document.addEventListener('click',     _unlock, true);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) _unlock(); });
  },

  // Show mute hint if iOS silent switch is on (sound won't play)
  _showMuteHint() {
    if (document.getElementById('mute-hint')) return;
    const el = document.createElement('div');
    el.id = 'mute-hint';
    el.className = 'scene-msg-item visible';
    el.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:999999;pointer-events:auto;cursor:pointer;';
    el.textContent = 'Выключи беззвучный режим для звука';
    el.onclick = () => { el.remove(); this._checkSilentMode(); };
    document.body.appendChild(el);
    // Auto-hide after 6 seconds
    setTimeout(() => el.remove(), 6000);
  },

  // Detect silent mode via AnalyserNode — if context is running but no audio output
  _checkSilentMode() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    // On iOS, we can't truly detect silent switch from JS.
    // But we CAN detect if AudioContext was freshly resumed — if user sees no sound,
    // the silent switch is the most likely cause. Show hint on mobile only.
    if (!window.matchMedia('(pointer:coarse)').matches) return;
    // Show hint once per session
    if (this._muteHintShown) return;
    this._muteHintShown = true;
    this._showMuteHint();
  },

  // Silent buffer trick — forces iOS WebKit to activate hardware audio session.
  // resume() alone flips the state flag but doesn't route audio to speakers.
  _playsilent() {
    if (!this.ctx) return;
    const buf = this.ctx.createBuffer(1, 1, 22050);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    src.start();
  },

  _create() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    // onstatechange property (safer than addEventListener which may not exist on iOS)
    this.ctx.onstatechange = () => {
      if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
        this.ctx.resume();
      }
    };
    this.masterGain = this.ctx.createGain();
    // Стартуем с правильного значения сразу — иначе при muted=true всё равно
    // слышно 2.8с пока setMode() плавно гасит до 0.
    this.masterGain.gain.value = this.muted ? 0 : 0.18;
    this.masterGain.connect(this.ctx.destination);

    this.ambientGain    = this.ctx.createGain();  this.ambientGain.gain.value    = 1.0;
    this.meditationGain = this.ctx.createGain();  this.meditationGain.gain.value = 0.0;
    this.sittingGain    = this.ctx.createGain();  this.sittingGain.gain.value    = 0.0;
    this.ambientGain.connect(this.masterGain);
    this.meditationGain.connect(this.masterGain);
    this.sittingGain.connect(this.masterGain);
  },

  // ── Mode switch ────────────────────────────────────────────────────────
  setMode(mode) {
    this._mode = mode;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (mode === 'ambient') {
      this.masterGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.18, now + 2.8);
      this.ambientGain.gain.linearRampToValueAtTime(1.0,  now + 2.8);
      this.meditationGain.gain.linearRampToValueAtTime(0,   now + 2.8);
      if (this.sittingGain) this.sittingGain.gain.linearRampToValueAtTime(0, now + 2.8);
      if (!this._meditationStarted) this._startMeditation();
    } else if (mode === 'meditation') {
      this.masterGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.28, now + 2.8);
      this.ambientGain.gain.linearRampToValueAtTime(0.08, now + 2.8);
      this.meditationGain.gain.linearRampToValueAtTime(1.0, now + 2.8);
      if (this.sittingGain) this.sittingGain.gain.linearRampToValueAtTime(0, now + 2.8);
      if (!this._meditationStarted) this._startMeditation();
    } else if (mode === 'sitting') {
      this.masterGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.22, now + 2.8);
      this.ambientGain.gain.linearRampToValueAtTime(0.06, now + 2.8);
      this.meditationGain.gain.linearRampToValueAtTime(0,   now + 2.8);
      if (this.sittingGain) this.sittingGain.gain.linearRampToValueAtTime(1.0, now + 2.8);
      if (!this._sittingStarted) this._startSitting();
    }
  },

  toggle() {
    this.muted = !this.muted;
    if (this.masterGain) {
      const vol = this.muted ? 0 : (this._mode === 'meditation' ? 0.28 : this._mode === 'sitting' ? 0.22 : 0.18);
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }
    return this.muted;
  },

  // ── Ambient music ──────────────────────────────────────────────────────
  _startAmbient() {
    const ac = this.ctx;
    const out = this.ambientGain;

    // Drone layer
    [[55, 0.28], [110, 0.16], [164.8, 0.08]].forEach(([freq, amp]) => {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      const lfo = ac.createOscillator();
      const lg  = ac.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.value = amp;
      lfo.frequency.value = 0.07 + Math.random() * 0.04;
      lg.gain.value = amp * 0.3;
      lfo.connect(lg); lg.connect(g.gain);
      osc.connect(g);  g.connect(out);
      osc.start(); lfo.start();
    });

    // Reverb (synthesized IR)
    const reverb = ac.createConvolver();
    const irLen  = ac.sampleRate * 2.5;
    const irBuf  = ac.createBuffer(2, irLen, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = irBuf.getChannelData(ch);
      for (let i = 0; i < irLen; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2);
    }
    reverb.buffer = irBuf;
    reverb.connect(out);

    // Pentatonic pad
    const PEN = [220, 246.9, 293.7, 329.6, 392, 440, 493.9];
    const _schedPad = () => {
      const freq = PEN[Math.floor(Math.random() * PEN.length)];
      const dur  = 4.5 + Math.random() * 3.5;
      const osc  = ac.createOscillator();
      const g    = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.003);
      g.gain.setValueAtTime(0, ac.currentTime);
      g.gain.linearRampToValueAtTime(0.06, ac.currentTime + 0.5);
      g.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
      osc.connect(g); g.connect(reverb);
      osc.start(); osc.stop(ac.currentTime + dur + 0.1);
      setTimeout(_schedPad, (2200 + Math.random() * 3500));
    };
    for (let i = 0; i < 3; i++) setTimeout(_schedPad, i * 800);

    // Ambient bells
    const BELLS = [880, 1046.5, 1318.5, 659.3];
    const _schedBell = () => {
      const f   = BELLS[Math.floor(Math.random() * BELLS.length)];
      const now = ac.currentTime;
      [[f, 0.08, 4.5], [f * 2.756, 0.03, 3.0]].forEach(([freq, amp, dec]) => {
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        g.gain.setValueAtTime(amp, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dec);
        osc.connect(g); g.connect(out);
        osc.start(now); osc.stop(now + dec);
      });
      setTimeout(_schedBell, (10000 + Math.random() * 16000));
    };
    setTimeout(_schedBell, 6000 + Math.random() * 8000);
  },

  // ── Meditation music ───────────────────────────────────────────────────
  _meditationStarted: false,
  _startMeditation() {
    this._meditationStarted = true;
    const ac  = this.ctx;
    const out = this.meditationGain;

    // Deep drones
    [[27.5, 0.55, 0.03], [41.25, 0.38, 0.05], [55, 0.22, 0.07]].forEach(([freq, amp, lfoHz]) => {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      const lfo = ac.createOscillator();
      const lg  = ac.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.value = amp;
      lfo.frequency.value = lfoHz; lg.gain.value = amp * 0.25;
      lfo.connect(lg); lg.connect(g.gain);
      osc.connect(g);  g.connect(out);
      osc.start(); lfo.start();
    });

    // 528 Hz shimmer
    {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      const lfo = ac.createOscillator();
      const lg  = ac.createGain();
      osc.type = 'sine'; osc.frequency.value = 528;
      g.gain.value = 0.14; lfo.frequency.value = 0.06; lg.gain.value = 0.10;
      lfo.connect(lg); lg.connect(g.gain);
      osc.connect(g); g.connect(out);
      osc.start(); lfo.start();
    }

    // Binaural pair
    [[432, 0.08], [435, 0.06]].forEach(([freq, amp]) => {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = 'sine'; osc.frequency.value = freq; g.gain.value = amp;
      osc.connect(g); g.connect(out); osc.start();
    });

    // Meditation bells
    const MB = [528, 639, 741, 852, 1046.5, 1318.5];
    const _schedMBell = () => {
      const f   = MB[Math.floor(Math.random() * MB.length)];
      const now = ac.currentTime;
      [[f, 0.12, 3.5], [f * 1.5, 0.018, 2.5]].forEach(([freq, amp, dec]) => {
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        g.gain.setValueAtTime(amp, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dec);
        osc.connect(g); g.connect(out);
        osc.start(now); osc.stop(now + dec);
      });
      setTimeout(_schedMBell, 2200 + Math.random() * 3000);
    };
    setTimeout(_schedMBell, 800);
  },

  // ── Sitting music (lighter, melodic — отличается от медитации) ────────
  _sittingStarted: false,
  _startSitting() {
    this._sittingStarted = true;
    const ac  = this.ctx;
    const out = this.sittingGain;

    // Мягкий средний дрон (не такой низкий как медитация)
    [[110, 0.16, 0.04], [165, 0.09, 0.06], [220, 0.05, 0.05]].forEach(([freq, amp, lfoHz]) => {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      const lfo = ac.createOscillator();
      const lg  = ac.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.value = amp;
      lfo.frequency.value = lfoHz; lg.gain.value = amp * 0.2;
      lfo.connect(lg); lg.connect(g.gain);
      osc.connect(g); g.connect(out);
      osc.start(); lfo.start();
    });

    // Реверб для мелодии
    const reverb = ac.createConvolver();
    const irLen  = ac.sampleRate * 3.5;
    const irBuf  = ac.createBuffer(2, irLen, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = irBuf.getChannelData(ch);
      for (let i = 0; i < irLen; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 1.8);
    }
    reverb.buffer = irBuf;
    reverb.connect(out);

    // Плавающая пентатоника — редкие длинные ноты
    const NOTES = [440, 528, 594, 660, 792, 880, 1056];
    const _schedNote = () => {
      const freq = NOTES[Math.floor(Math.random() * NOTES.length)];
      const dur  = 6 + Math.random() * 6;
      const osc  = ac.createOscillator();
      const g    = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.002);
      g.gain.setValueAtTime(0, ac.currentTime);
      g.gain.linearRampToValueAtTime(0.09, ac.currentTime + 1.8);
      g.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
      osc.connect(g); g.connect(reverb);
      osc.start(); osc.stop(ac.currentTime + dur + 0.1);
      setTimeout(_schedNote, 3500 + Math.random() * 4500);
    };
    for (let i = 0; i < 2; i++) setTimeout(_schedNote, i * 1400);

    // Звуки поющей чаши — редкие, чистые
    const BOWL = [396, 528, 660, 792];
    const _schedBowl = () => {
      const f   = BOWL[Math.floor(Math.random() * BOWL.length)];
      const now = ac.currentTime;
      [[f, 0.13, 5.5], [f * 2, 0.035, 3.5]].forEach(([freq, amp, dec]) => {
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        g.gain.setValueAtTime(amp, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dec);
        osc.connect(g); g.connect(out);
        osc.start(now); osc.stop(now + dec);
      });
      setTimeout(_schedBowl, 4500 + Math.random() * 5500);
    };
    setTimeout(_schedBowl, 600);
  },

  // ── SFX ───────────────────────────────────────────────────────────────
  playPrayerSound() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const out = this.masterGain;
    [[220, 0.20, 4.0], [440, 0.10, 3.0], [660, 0.055, 2.2], [880, 0.03, 1.6]].forEach(([f, amp, dec]) => {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = 'sine'; osc.frequency.value = f;
      g.gain.setValueAtTime(amp, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dec);
      osc.connect(g); g.connect(out);
      osc.start(); osc.stop(ac.currentTime + dec);
    });
  },

  playCatMeow() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const out = this.masterGain;
    const now = ac.currentTime;
    const dur = 0.6;

    // Layer 1: sawtooth with pitch envelope
    {
      const osc    = ac.createOscillator();
      const filter = ac.createBiquadFilter();
      const g      = ac.createGain();
      osc.type = 'sawtooth';
      filter.type = 'bandpass'; filter.frequency.value = 1100; filter.Q.value = 2.5;
      const pts = [[0, 480], [0.1, 860], [0.25, 1020], [0.45, 680], [0.6, 520]];
      pts.forEach(([t, f]) => osc.frequency.setValueAtTime(f, now + t));
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.22, now + 0.05);
      g.gain.linearRampToValueAtTime(0, now + dur);
      osc.connect(filter); filter.connect(g); g.connect(out);
      osc.start(now); osc.stop(now + dur + 0.05);
    }

    // Layer 2: sine overtone
    {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = 'sine';
      [[0, 1600], [0.2, 2100], [0.5, 1400]].forEach(([t, f]) =>
        osc.frequency.setValueAtTime(f, now + t));
      g.gain.value = 0.06;
      osc.connect(g); g.connect(out);
      osc.start(now); osc.stop(now + dur);
    }
  },

  playFlyFlutter() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const now = ac.currentTime;
    // Мягкое жужжание светлячка: быстрое FM
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    const lfo = ac.createOscillator();
    const lg  = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.06);
    osc.frequency.linearRampToValueAtTime(120, now + 0.2);
    lfo.frequency.value = 48; lg.gain.value = 70;
    lfo.connect(lg); lg.connect(osc.frequency);
    g.gain.setValueAtTime(0.055, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(now); osc.stop(now + 0.38);
    lfo.start(now); lfo.stop(now + 0.38);
  },

  playPickup() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.1);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(now); osc.stop(now + 0.3);
  },

  playBell() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const now = ac.currentTime;
    [[528, 0.15, 3.0], [1056, 0.06, 2.0]].forEach(([f, amp, dec]) => {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = 'sine'; osc.frequency.value = f;
      g.gain.setValueAtTime(amp, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dec);
      osc.connect(g); g.connect(this.masterGain);
      osc.start(now); osc.stop(now + dec);
    });
  },
};

export function toggleSound() {
  return AudioSystem.toggle();
}
