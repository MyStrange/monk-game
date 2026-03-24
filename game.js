// game.js — точка входа (~60 строк)
// import + window.* + init
// Версия: v1

import { SaveManager }                      from './src/save.js';
import { state }                            from './src/state.js';
import { AudioSystem, toggleSound }         from './src/audio.js';
import { renderHotbar }                     from './src/hotbar.js';
import { toggleFullscreen }                 from './src/utils.js';
import { openAchievements, closeAchievements, loadAchievements } from './src/achievements.js';
import { initMain, leaveMain }              from './scenes/main.js';

// ── window.* для HTML onclick= ─────────────────────────────────────────────
// closeSceneXXX экспортируется и присваивается window.* в каждом файле сцены.
Object.assign(window, {
  toggleSound,
  toggleFullscreen,
  openAchievements,
  closeAchievements,
  leaveMain,
});

// ── Init ───────────────────────────────────────────────────────────────────
SaveManager.load();

// Восстановить инвентарь из сохранения
const _savedInv = SaveManager.global.inventory;
if (_savedInv) for (let i = 0; i < 5; i++) state.inventory[i] = _savedInv[i] ?? null;

loadAchievements();
AudioSystem.init();
renderHotbar();
initMain();

// ── Временная кнопка сброса (потом убрать) ──────────────────────────────────
{
  const btn = document.createElement('button');
  btn.className = 'ui-btn';
  btn.title = 'Сбросить игру';
  btn.textContent = '↺';
  btn.style.cssText = 'position:fixed;top:14px;right:56px;z-index:300;';
  btn.onclick = () => { SaveManager.reset(); location.reload(); };
  document.body.appendChild(btn);
}
