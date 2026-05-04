// game.js — точка входа (~60 строк)
// import + window.* + init
// Версия: v1

import { SaveManager }                      from './src/save.js';
import { state }                            from './src/state.js';
import { AudioSystem, toggleMusic, toggleSfx } from './src/audio.js';
import { renderHotbar }                     from './src/hotbar.js';
import { toggleFullscreen, hideLoading }    from './src/ui/overlays.js';
import { initHoverAnim }                    from './src/ui/cursor.js';
import { initRotateOverlay }                from './src/rotate-overlay.js';
import { openAchievements, closeAchievements, loadAchievements, resetAchievementStats } from './src/achievements.js';
import { initMain, leaveMain }              from './scenes/main.js';
import { openScene }                        from './src/nav.js';
import './src/assets.js';   // регистрирует window.__validateAssets() для dev-console
import './src/scene-registrations.js';   // регистрирует все сцены в scene-registry

// ── Boot-time preload ───────────────────────────────────────────────────────
// Loading overlay показан inline в index.html (display:flex). Здесь ждём пока
// все critical-ассеты (теги <link rel=preload as=image>) реально загрузятся,
// и только потом запускаем сцены. Иначе пользователь видит «недозагруженные»
// картинки. Hard timeout 6s — даже если что-то 404, игра не висит.
async function _preloadCriticalAssets() {
  const links = Array.from(document.querySelectorAll('link[rel="preload"][as="image"]'));
  const wait = links.map(l => new Promise(resolve => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = l.href;
    if (img.complete) resolve();
  }));
  const timeout = new Promise(r => setTimeout(r, 6000));
  await Promise.race([Promise.all(wait), timeout]);
}
await _preloadCriticalAssets();

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

// Сцена готова — убрать boot-loading overlay (показан в index.html по умолчанию).
hideLoading();

// ── Game menu ────────────────────────────────────────────────────────────────
{
  const menuBtn  = document.getElementById('menu-btn');
  const gameMenu = document.getElementById('game-menu');
  const gmMusic  = document.getElementById('gm-music');
  const gmSfx    = document.getElementById('gm-sfx');
  const gmAch    = document.getElementById('gm-ach');
  const gmFs     = document.getElementById('gm-fs');
  const gmTut    = document.getElementById('gm-tut');
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
  gmTut?.addEventListener('click',   () => {
    _closeMenu();
    import('./scenes/tutorial.js').then(m => m.openSceneTutorial());
  });
  gmReset?.addEventListener('click', () => {
    _closeMenu();
    if (confirm('Начать игру заново? Весь прогресс будет удалён.')) {
      SaveManager.reset();
      resetAchievementStats();
      location.reload();
    }
  });
}
