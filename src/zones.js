// src/zones.js — универсальные хелперы hit-test для зон сцены.
//
// Сцена обычно держит ZONES_BG = { name: { x, y, w, h }, ... } в координатах
// фоновой картинки. Игрок кликает по canvas — нужно перевести в BG-координаты
// и пройти по списку. Эти 5 строк дублировались в main/tutorial/scene2/inside.
//
// Использование:
//   import { hitZoneBG, canvasToBG } from '../src/zones.js';
//   const z = hitZoneBG(cx, cy, _bgR, BG_W, BG_H, ZONES_BG, name => {
//     if (name === 'bush' && S.stickPickedUp) return true;  // скрыта
//     if (name === 'cat'  && catHidden)        return true;
//     return false;
//   });

// canvas px → BG px (cover-rect already applied via _bgR).
export function canvasToBG(cx, cy, bgR, bgW, bgH) {
  return {
    x: (cx - bgR.x) * bgW / bgR.w,
    y: (cy - bgR.y) * bgH / bgR.h,
  };
}

// canvas px → BG px (для сцен без cover-rect, прямой scale W↔BG_W).
export function canvasToBGSimple(cx, cy, canvasW, canvasH, bgW, bgH) {
  return { x: cx * bgW / canvasW, y: cy * bgH / canvasH };
}

// Проверяет точку в BG-координатах против объекта зон. Возвращает name или null.
// `isHidden(name)` — опциональный фильтр: вернёт true если зону пропустить.
export function hitZoneAtBG(bx, by, zones, isHidden) {
  for (const [name, z] of Object.entries(zones)) {
    if (isHidden && isHidden(name)) continue;
    if (bx >= z.x && bx < z.x + z.w && by >= z.y && by < z.y + z.h) return name;
  }
  return null;
}

// Удобный шорткат: canvas px + cover-rect + zones за один вызов.
export function hitZoneBG(cx, cy, bgR, bgW, bgH, zones, isHidden) {
  const { x: bx, y: by } = canvasToBG(cx, cy, bgR, bgW, bgH);
  return hitZoneAtBG(bx, by, zones, isHidden);
}

// Тест точки в нормализованной зоне (fx, fy, fw, fh — 0..1) относительно cover-rect.
// Альтернативный паттерн: зоны заданы как fractions от cover-rect (как в inside.js).
export function hitNormZone(cx, cy, z, bgR) {
  const x = bgR.x + z.fx * bgR.w;
  const y = bgR.y + z.fy * bgR.h;
  const w = z.fw * bgR.w;
  const h = z.fh * bgR.h;
  return cx >= x && cx <= x + w && cy >= y && cy <= y + h;
}
