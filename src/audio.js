// src/audio.js — AudioSystem: ambient, meditation, sound effects
// Весь звук генерируется через Web Audio API. Нет аудио-файлов.
// Инициализация — при первом взаимодействии пользователя.

export const AudioSystem = {
  ctx:            null,
  masterGain:     null,
  sfxGain:        null,
  ambientGain:    null,
  meditationGain: null,
  sittingGain:    null,
  mutedMusic:     false,
  mutedSfx:       false,
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
    // Стартуем с правильного значения сразу — иначе при mutedMusic=true всё равно
    // слышно 2.8с пока setMode() плавно гасит до 0.
    this.masterGain.gain.value = this.mutedMusic ? 0 : 0.18;
    this.masterGain.connect(this.ctx.destination);

    // sfxGain для звуковых эффектов — независим от музыки
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.mutedSfx ? 0 : 0.18;
    this.sfxGain.connect(this.ctx.destination);

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
      this.masterGain.gain.linearRampToValueAtTime(this.mutedMusic ? 0 : 0.18, now + 2.8);
      this.ambientGain.gain.linearRampToValueAtTime(1.0,  now + 2.8);
      this.meditationGain.gain.linearRampToValueAtTime(0,   now + 2.8);
      if (this.sittingGain) this.sittingGain.gain.linearRampToValueAtTime(0, now + 2.8);
      if (!this._meditationStarted) this._startMeditation();
    } else if (mode === 'meditation') {
      this.masterGain.gain.linearRampToValueAtTime(this.mutedMusic ? 0 : 0.28, now + 2.8);
      this.ambientGain.gain.linearRampToValueAtTime(0.08, now + 2.8);
      this.meditationGain.gain.linearRampToValueAtTime(1.0, now + 2.8);
      if (this.sittingGain) this.sittingGain.gain.linearRampToValueAtTime(0, now + 2.8);
      if (!this._meditationStarted) this._startMeditation();
    } else if (mode === 'sitting') {
      this.masterGain.gain.linearRampToValueAtTime(this.mutedMusic ? 0 : 0.22, now + 2.8);
      this.ambientGain.gain.linearRampToValueAtTime(0.06, now + 2.8);
      this.meditationGain.gain.linearRampToValueAtTime(0,   now + 2.8);
      if (this.sittingGain) this.sittingGain.gain.linearRampToValueAtTime(1.0, now + 2.8);
      if (!this._sittingStarted) this._startSitting();
    }
  },

  toggleMusic() {
    this.mutedMusic = !this.mutedMusic;
    if (this.masterGain) {
      const vol = this.mutedMusic ? 0 : (this._mode === 'meditation' ? 0.28 : this._mode === 'sitting' ? 0.22 : 0.18);
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }
    return this.mutedMusic;
  },
  toggleSfx() {
    this.mutedSfx = !this.mutedSfx;
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.mutedSfx ? 0 : 0.18, this.ctx.currentTime, 0.1);
    }
    return this.mutedSfx;
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
    const out = this.sfxGain;
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

  // Мягкий короткий щебет/чик-чик кота — для обычного клика (НЕ активация
  // дурианом). Не громкий яростный мяв, а тихий «мур-мяу»-чириканье.
  playCatChirp() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const out = this.sfxGain;
    const now = ac.currentTime;
    const DUR = 0.25;
    // Слой 1: короткий восходящий sine («прр?»)
    {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.linearRampToValueAtTime(1020, now + 0.08);
      osc.frequency.linearRampToValueAtTime(880,  now + 0.20);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.12, now + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, now + DUR);
      osc.connect(g); g.connect(out);
      osc.start(now); osc.stop(now + DUR + 0.02);
    }
    // Слой 2: тихий triangle-«мр» снизу — тело звука, как нос
    {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(320, now + 0.12);
      g.gain.setValueAtTime(0.06, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + DUR);
      osc.connect(g); g.connect(out);
      osc.start(now); osc.stop(now + DUR + 0.02);
    }
  },

  // Шипение кота — когда его обижают (например, вода из банки).
  // Короткий всплеск шума через bandpass-фильтр, чуть поднимающийся по
  // частоте → знакомый «шшшш» с характерной кошачьей остротой.
  playCatHiss() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const out = this.sfxGain;
    const now = ac.currentTime;
    const DUR = 0.55;
    // Шум-база
    const bufLen = Math.floor(ac.sampleRate * DUR);
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      // envelope-shaped noise: быстрая атака + долгий спад
      const env = i < bufLen * 0.08
        ? i / (bufLen * 0.08)
        : Math.pow(1 - (i - bufLen * 0.08) / (bufLen * 0.92), 1.4);
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ac.createBufferSource(); src.buffer = buf;
    // Bandpass с движением cutoff вверх — даёт характерное «шшш→сссс»
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 3.5;
    bp.frequency.setValueAtTime(2600, now);
    bp.frequency.linearRampToValueAtTime(4200, now + DUR * 0.5);
    bp.frequency.linearRampToValueAtTime(3400, now + DUR);
    // High-shelf подчеркнуть «остроту»
    const hs = ac.createBiquadFilter();
    hs.type = 'highshelf'; hs.frequency.value = 3000; hs.gain.value = 6;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.38, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + DUR);
    src.connect(bp); bp.connect(hs); hs.connect(g); g.connect(out);
    src.start(now); src.stop(now + DUR + 0.02);
  },

  playCatMeow() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const out = this.sfxGain;
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
    osc.connect(g); g.connect(this.sfxGain);
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
    osc.connect(g); g.connect(this.sfxGain);
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
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(now); osc.stop(now + dec);
    });
  },

  playWater() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const now = ac.currentTime;
    // Плавное «вш-ш-ш» воды: два слоя шума через band-pass фильтры
    // с LFO-модуляцией cutoff — имитирует журчание с ласковым переливом.
    // Дополнительно — тихий pitched тон 180Hz snaking по синусу даёт
    // подводную волновую нотку. Никаких резких plop'ов — чистый ток воды.
    const DUR = 1.20;

    // Слой 1: средний bandpass, модулируется медленным LFO
    const bufLen = Math.floor(ac.sampleRate * DUR);
    const buf1 = ac.createBuffer(1, bufLen, ac.sampleRate);
    const d1 = buf1.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d1[i] = (Math.random() * 2 - 1) * 0.7;
    const s1 = ac.createBufferSource(); s1.buffer = buf1;
    const bp1 = ac.createBiquadFilter();
    bp1.type = 'bandpass'; bp1.Q.value = 1.1;
    // LFO на cutoff — журчание
    const lfo1 = ac.createOscillator();
    const lg1  = ac.createGain();
    lfo1.frequency.value = 2.3;
    bp1.frequency.value = 850;
    lg1.gain.value = 380;
    lfo1.connect(lg1); lg1.connect(bp1.frequency);
    const g1 = ac.createGain();
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.12, now + 0.15);
    g1.gain.linearRampToValueAtTime(0.12, now + DUR - 0.30);
    g1.gain.linearRampToValueAtTime(0,    now + DUR);
    s1.connect(bp1); bp1.connect(g1); g1.connect(this.sfxGain);
    lfo1.start(now); lfo1.stop(now + DUR);
    s1.start(now);   s1.stop(now + DUR);

    // Слой 2: высокий bandpass — мелкая рябь, тише, модулируется быстрее
    const buf2 = ac.createBuffer(1, bufLen, ac.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d2[i] = (Math.random() * 2 - 1) * 0.5;
    const s2 = ac.createBufferSource(); s2.buffer = buf2;
    const bp2 = ac.createBiquadFilter();
    bp2.type = 'bandpass'; bp2.Q.value = 1.6;
    bp2.frequency.value = 2200;
    const lfo2 = ac.createOscillator();
    const lg2  = ac.createGain();
    lfo2.frequency.value = 5.8;
    lg2.gain.value = 600;
    lfo2.connect(lg2); lg2.connect(bp2.frequency);
    const g2 = ac.createGain();
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.05, now + 0.20);
    g2.gain.linearRampToValueAtTime(0.05, now + DUR - 0.30);
    g2.gain.linearRampToValueAtTime(0,    now + DUR);
    s2.connect(bp2); bp2.connect(g2); g2.connect(this.sfxGain);
    lfo2.start(now); lfo2.stop(now + DUR);
    s2.start(now);   s2.stop(now + DUR);
  },

  playRock() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const now = ac.currentTime;
    // Low-freq thud — sine pitch envelope + brief noise click
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.28);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.35);
    // Transient noise click
    const cLen = Math.floor(ac.sampleRate * 0.04);
    const cBuf = ac.createBuffer(1, cLen, ac.sampleRate);
    const cd   = cBuf.getChannelData(0);
    for (let i = 0; i < cLen; i++) cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cLen, 3);
    const cs = ac.createBufferSource(); cs.buffer = cBuf;
    const cg = ac.createGain(); cg.gain.value = 0.18;
    cs.connect(cg); cg.connect(this.sfxGain);
    cs.start(now);
  },

  playFlyCatch() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const now = ac.currentTime;
    // Звонкий колокольчик-тинг: одна «ping»-нота с гармониками.
    // Каждый пойманный светлячок — маленький бесплатный колокольчик.
    // Случайный питч из пентатоники, чтобы серия ловли складывалась
    // в мелодичное облако, а не в однообразный звон.
    const NOTES = [880, 988, 1109, 1319, 1480, 1760];
    const f = NOTES[Math.floor(Math.random() * NOTES.length)];
    [[f, 0.12, 1.2], [f * 2.01, 0.045, 0.7], [f * 3.0, 0.02, 0.5]].forEach(([hz, amp, dec]) => {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = 'sine'; osc.frequency.value = hz;
      g.gain.setValueAtTime(amp, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dec);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(now); osc.stop(now + dec);
    });
  },

  // Каскад колокольчиков — когда светлячки разлетаются из банки.
  // 6 нот восходящей пентатоникой, каждая с мягкой звонкостью,
  // разнесены по времени — звучит как «перелив».
  playReleaseChimes() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const now = ac.currentTime;
    const NOTES = [659, 784, 988, 1175, 1319, 1568, 1760];
    NOTES.forEach((f, i) => {
      const t = now + i * 0.11;
      [[f, 0.13, 1.6], [f * 2.0, 0.05, 1.0]].forEach(([hz, amp, dec]) => {
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type = 'sine'; osc.frequency.value = hz;
        g.gain.setValueAtTime(amp, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(t); osc.stop(t + dec);
      });
    });
  },

  playItemInteract() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.linearRampToValueAtTime(780, now + 0.09);
    g.gain.setValueAtTime(0.10, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.36);
  },

  // 10 разных «инструментов» для символов медитации — по одному на цвет.
  // Все ноты — в D-minor-пентатонике (D F G A C), в разных октавах,
  // поэтому любая последовательность звучит консонантно.
  // Каждый индекс имеет уникальный тембр: колокол/дерево/щипок/
  // стекло/маримба/куранты/гонг. Сочетаются как в одном ансамбле.
  playSymbolTone(colorIdx = 0) {
    if (!this.ctx) return;
    const ac    = this.ctx;
    const out   = this.sfxGain;
    const now   = ac.currentTime;
    const VOICES = [
      { f: 440.00, kind: 'bell'    },   // 0 — A4   колокол
      { f: 523.25, kind: 'wood'    },   // 1 — C5   деревянный блок
      { f: 587.33, kind: 'pluck'   },   // 2 — D5   щипок (кото)
      { f: 698.46, kind: 'glass'   },   // 3 — F5   стекло
      { f: 783.99, kind: 'marimba' },   // 4 — G5   маримба
      { f: 880.00, kind: 'chime'   },   // 5 — A5   FM-колокольчик
      { f: 1046.50,kind: 'bell'    },   // 6 — C6   высокий колокол
      { f: 349.23, kind: 'pluck'   },   // 7 — F4   низкий щипок
      { f: 392.00, kind: 'marimba' },   // 8 — G4   низкая маримба
      { f: 293.66, kind: 'gong'    },   // 9 — D4   гонг
    ];
    const v = VOICES[Math.min(Math.max(colorIdx, 0), VOICES.length - 1)];
    const f = v.f;
    // Каждый kind — отдельная мини-функция синтеза
    const mkOsc = (type, hz, amp, attack, decay, t0 = now) => {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = type;
      osc.frequency.value = hz;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(amp, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
      osc.connect(g); g.connect(out);
      osc.start(t0); osc.stop(t0 + attack + decay + 0.05);
    };
    switch (v.kind) {
      case 'bell': {
        // Sine fundamental + обертоны × 2.01, × 3.01 (слегка расстроенные)
        mkOsc('sine', f,         0.13, 0.001, 2.2);
        mkOsc('sine', f * 2.01,  0.045,0.001, 1.4);
        mkOsc('sine', f * 3.01,  0.02, 0.001, 0.9);
        break;
      }
      case 'wood': {
        // Triangle короткий + тихий click noise в атаке
        mkOsc('triangle', f,       0.14, 0.001, 0.35);
        mkOsc('triangle', f * 2.0, 0.05, 0.001, 0.20);
        // Noise click transient
        const cLen = Math.floor(ac.sampleRate * 0.025);
        const cBuf = ac.createBuffer(1, cLen, ac.sampleRate);
        const cd   = cBuf.getChannelData(0);
        for (let i = 0; i < cLen; i++) cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cLen, 2);
        const cs = ac.createBufferSource(); cs.buffer = cBuf;
        const cg = ac.createGain(); cg.gain.value = 0.08;
        cs.connect(cg); cg.connect(out);
        cs.start(now);
        break;
      }
      case 'pluck': {
        // Sine + AM-tremolo (эффект щипка)
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        const lfo = ac.createOscillator();
        const lg  = ac.createGain();
        osc.type = 'sine'; osc.frequency.value = f;
        lfo.type = 'sine'; lfo.frequency.value = 7;
        lg.gain.value = 0.06;
        lfo.connect(lg); lg.connect(g.gain);
        g.gain.setValueAtTime(0.16, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
        osc.connect(g); g.connect(out);
        osc.start(now); osc.stop(now + 1.2);
        lfo.start(now); lfo.stop(now + 1.2);
        // Верхняя гармоника добавляет «щипковый» характер
        mkOsc('sine', f * 2.0, 0.04, 0.001, 0.6);
        break;
      }
      case 'glass': {
        // Sine + высокие гармоники × 4 × 8 — кристальный звон
        mkOsc('sine', f,        0.11, 0.001, 2.0);
        mkOsc('sine', f * 4.0,  0.025, 0.001, 1.2);
        mkOsc('sine', f * 8.0,  0.012, 0.001, 0.8);
        break;
      }
      case 'marimba': {
        // Sine с быстрым decay + суб-октава — тёплое деревянное
        mkOsc('sine', f,       0.15, 0.001, 0.45);
        mkOsc('sine', f * 0.5, 0.08, 0.001, 0.55);
        mkOsc('sine', f * 2.0, 0.04, 0.001, 0.20);
        break;
      }
      case 'chime': {
        // FM-колокольчик: carrier + modulator
        const c  = ac.createOscillator();
        const cg = ac.createGain();
        const m  = ac.createOscillator();
        const mg = ac.createGain();
        c.type = 'sine'; c.frequency.value = f;
        m.type = 'sine'; m.frequency.value = f * 1.4;
        mg.gain.value = f * 0.6;
        m.connect(mg); mg.connect(c.frequency);
        cg.gain.setValueAtTime(0.12, now);
        cg.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
        c.connect(cg); cg.connect(out);
        c.start(now); c.stop(now + 1.9);
        m.start(now); m.stop(now + 1.9);
        mkOsc('sine', f * 2.0, 0.03, 0.001, 1.0);
        break;
      }
      case 'gong': {
        // Низкий triangle + медленный shimmer × 3, × 5 — гонг
        mkOsc('triangle', f,       0.14, 0.005, 2.8);
        mkOsc('sine',     f * 3.0, 0.035, 0.005, 2.0);
        mkOsc('sine',     f * 5.0, 0.018, 0.005, 1.4);
        break;
      }
    }
  },

  playTypewriterChirp() {
    if (!this.ctx) return;
    const ac  = this.ctx;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'sine';
    const f = 1500 + Math.random() * 900;
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.linearRampToValueAtTime(f * 1.08, now + 0.028);
    g.gain.setValueAtTime(0.022, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.045);
  },
};

export function toggleMusic() { return AudioSystem.toggleMusic(); }
export function toggleSfx()   { return AudioSystem.toggleSfx(); }
