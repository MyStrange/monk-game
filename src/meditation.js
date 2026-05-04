// src/meditation.js — единая логика «сесть медитировать / встать».
//
// Раньше sitDown/standUp были скопированы в main.js и achievements.js
// почти один-в-один. Теперь обе сцены вызывают эти helper'ы и передают
// контекст (hero ref, опциональные cleanup'ы и tracker'ы).
//
// Использование:
//   import { sitDown, standUp } from '../src/meditation.js';
//   sitDown(hero, {
//     onTrack: () => trackSitDown(),
//     onSit:   () => maybeSitOnCat(),
//   });
//   standUp(hero, {
//     onTrack: () => trackStandUp(),
//     cleanup: () => { pSyms = []; mParticles = []; meditationPhase = 0; },
//   });
//
// Если hero уже praying и вызвали sitDown — это toggle: вызовет standUp.
//
// Все взаимодействия с AudioSystem делаются через optional-chaining, чтобы
// сцены без полного аудио-стека (achievements) не падали.

import { AudioSystem } from './audio.js';

// Сесть. Возвращает true если действительно сел; false если был toggle (встал).
export function sitDown(hero, opts = {}) {
  if (!hero) return false;
  if (hero.praying) {
    // toggle: уже сидим → встаём
    standUp(hero, opts);
    return false;
  }
  hero.praying  = true;
  hero.walking  = false;
  hero.targetX  = null;
  AudioSystem.playPrayerSound?.();
  AudioSystem.setMode?.('sitting');
  opts.onTrack?.();
  opts.onSit?.();
  return true;
}

// Встать. Если уже стоит — no-op.
export function standUp(hero, opts = {}) {
  if (!hero) return;
  if (!hero.praying) return;
  hero.praying = false;
  AudioSystem.setMode?.('ambient');
  opts.onTrack?.();
  // Сцена-специфичный cleanup (очистка частиц, символов, фазы).
  opts.cleanup?.();
}

// Принудительно установить состояние без toggle. Используется при возврате
// из inside.js — игрок остаётся в медитации после выхода из дупла.
export function setMeditating(hero, on = true, opts = {}) {
  if (!hero) return;
  if (on && !hero.praying) sitDown(hero, opts);
  else if (!on && hero.praying) standUp(hero, opts);
}
