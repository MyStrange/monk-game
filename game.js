// game.js — точка входа (~60 строк)
// import + window.* + init
// Версия: v1

import { SaveManager }                      from './src/save.js';
import { state }                            from './src/state.js';
import { AudioSystem, toggleMusic, toggleSfx } from './src/audio.js';
import { renderHotbar }                     from './src/hotbar.js';
import { toggleFullscreen, initHoverAnim, initRotateOverlay } from './src/utils.js';
import { openAchievements, closeAchievements, loadAchievements } from './src/achievements.js';
import { initMain, leaveMain }              from './scenes/main.js';
import { openScene }                        from './src/nav.js';
import './src/assets.js';   // регистрирует window.__validateAssets() для dev-console

// ── window.* для HTML onclick= ─────────────────────────────────────────────
// closeSceneXXX экспортируется и присваивается window.* в каждом файле сцены.
Object.assign(window, {
  toggleMusic,
  toggleSfx,
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

// Восстановить мут ДО инициализации аудио — toggleMusic/toggleSfx учтут при первом запуске
AudioSystem.mutedMusic = SaveManager.global.mutedMusic ?? false;
AudioSystem.mutedSfx   = SaveManager.global.mutedSfx   ?? false;

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
  const gmMusic  = document.getElementById('gm-music');
  const gmSfx    = document.getElementById('gm-sfx');
  const gmAch    = document.getElementById('gm-ach');
  const gmFs     = document.getElementById('gm-fs');
  const gmReset  = document.getElementById('gm-reset');
  const backdrop = gameMenu?.querySelector('.game-menu-backdrop');

  function _openMenu() {
    if (gmMusic) gmMusic.textContent = AudioSystem.mutedMusic ? '♫ Музыка выкл' : '♫ Музыка вкл';
    if (gmSfx)   gmSfx.textContent   = AudioSystem.mutedSfx   ? '♪ Звуки выкл'  : '♪ Звуки вкл';
    if (gameMenu) gameMenu.style.display = 'block';
  }
  function _closeMenu() {
    if (gameMenu) gameMenu.style.display = 'none';
  }

  menuBtn?.addEventListener('click', () => {
    gameMenu?.style.display === 'block' ? _closeMenu() : _openMenu();
  });
  backdrop?.addEventListener('click', _closeMenu);

  gmMusic?.addEventListener('click', () => {
    const muted = toggleMusic();
    SaveManager.global.mutedMusic = muted;
    SaveManager.save();
    if (gmMusic) gmMusic.textContent = muted ? '♫ Музыка выкл' : '♫ Музыка вкл';
    _closeMenu();
  });
  gmSfx?.addEventListener('click', () => {
    const muted = toggleSfx();
    SaveManager.global.mutedSfx = muted;
    SaveManager.save();
    if (gmSfx) gmSfx.textContent = muted ? '♪ Звуки выкл' : '♪ Звуки вкл';
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
