// src/scene-registrations.js — bootstrap-регистрация всех сцен.
//
// Импортируется один раз из game.js и инициализирует реестр в src/scene-registry.js.
// Постепенно каждая сцена будет регистрировать себя сама в своём же файле,
// пока этот общий список не выродится. Сейчас — переходное состояние.

import { registerScene } from './scene-registry.js';

// ── Жизнь монаха ────────────────────────────────────────────────────────
registerScene({
  id:     'main',
  module: null,        // main не открывается через openScene — это базовая
  edges:  { left: { scene: 'achievements', enterAt: 'right' } },
});

registerScene({
  id:     'scene2',
  module: 'scenes/scene2.js',
  assets: ['bg/tree'],
});

registerScene({
  id:       'buddha',
  module:   'scenes/buddha.js',
  canLeave: (S) => !S.wishPlaying,
  block:    'Подожди...',
  assets:   ['bg/buddha'],
});

registerScene({
  id:     'scene3',
  module: 'scenes/scene3.js',
});

registerScene({
  id:     'scene4',
  module: 'scenes/scene4.js',
  assets: ['bg/above_main', 'bg/above2', 'bg/above3'],
});

registerScene({
  id:     'inside',
  module: 'scenes/inside.js',
  assets: ['bg/inside', 'bg/inside_heart'],
});

registerScene({
  id:     'achievements',
  module: 'scenes/achievements.js',
  assets: ['bg/shelf'],
  edges:  { right: { scene: 'main', enterAt: 'left' } },
});

// ── Жизнь панка (туториал) ──────────────────────────────────────────────
registerScene({
  id:     'tutorial',
  module: 'scenes/tutorial.js',
  assets: ['bg/tut_start', 'bg/tut_broken', 'bg/tut_fire_a', 'bg/tut_fire_b'],
});

// ── Системные ────────────────────────────────────────────────────────────
registerScene({
  id:     'menu',
  module: 'scenes/menu.js',
});

registerScene({
  id:     'prologue',
  module: 'scenes/prologue.js',
});
