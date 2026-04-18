// game.js — точка входа (~60 строк)
// import + window.* + init
// Версия: v1

import { SaveManager }                      from './src/save.js';
import { state }                            from './src/state.js';
import { AudioSystem, toggleSound }         from './src/audio.js';
import { renderHotbar }                     from './src/hotbar.js';
import { toggleFullscreen, initHoverAnim, initRotateOverlay } from './src/utils.js';
import { openAchievements, closeAchievements, loadAchievements } from './src/achievements.js';
import { initMain, leaveMain }              from './scenes/main.js';
import { openScene }                        from './src/nav.js';

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

// Восстановить мут ДО инициализации аудио — toggle() учтёт его при первом запуске
AudioSystem.muted = SaveManager.global.muted ?? false;

loadAchievements();
AudioSystem.init();
renderHotbar();
await initMain();

// Восстановить последнюю открытую сцену (F5 / перезагрузка вернёт туда же)
{
  const _last = SaveManager.global.lastScene;
  if (_last && _last !== 'main') openScene(_last);
}
initHoverAnim();
initRotateOverlay();

// ── Game menu ────────────────────────────────────────────────────────────────
{
  const menuBtn  = document.getElementById('menu-btn');
  const gameMenu = document.getElementById('game-menu');
  const gmSound  = document.getElementById('gm-sound');
  const gmAch    = document.getElementById('gm-ach');
  const gmFs     = document.getElementById('gm-fs');
  const gmReset  = document.getElementById('gm-reset');
  const backdrop = gameMenu?.querySelector('.game-menu-backdrop');

  function _openMenu() {
    if (gmSound) gmSound.textContent = AudioSystem.muted ? '♪ Звук выкл' : '♪ Звук вкл';
    if (gameMenu) gameMenu.style.display = 'block';
  }
  function _closeMenu() {
    if (gameMenu) gameMenu.style.display = 'none';
  }

  menuBtn?.addEventListener('click', () => {
    gameMenu?.style.display === 'block' ? _closeMenu() : _openMenu();
  });
  backdrop?.addEventListener('click', _closeMenu);

  gmSound?.addEventListener('click', () => {
    const muted = toggleSound();
    // Сохраняем состояние звука — восстановится после перезагрузки
    SaveManager.global.muted = muted;
    SaveManager.save();
    if (gmSound) gmSound.textContent = muted ? '♪ Звук выкл' : '♪ Звук вкл';
    _closeMenu();
  });
  gmAch?.addEventListener('click',   () => { openAchievements(); _closeMenu(); });
  gmFs?.addEventListener('click',    () => { toggleFullscreen(); _closeMenu(); });
  gmReset?.addEventListener('click', () => {
    _closeMenu();
    if (confirm('Начать игру заново? Весь прогресс будет удалён.')) {
      SaveManager.reset();
      location.reload();
    }
  });
}
