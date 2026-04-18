// src/scene-base.js — общие помощники для image-сцен.
// Убирает хардкод, который раньше дублировался в buddha/scene2/scene3/scene4/inside.
//
// API:
//   waitImg(img)                      → Promise, ждёт load/error
//   coverRect(W,H, bgW,bgH, pos?)     → прямоугольник BG при object-fit:cover
//                                       pos = 'center' (дефолт) | 'top'
//   hitZone(cx,cy, zone, rect)        → попадание курсора в нормализованную зону
//                                       zone: {x0,y0,x1,y1} ИЛИ {fx,fy,fw,fh}

// ─── Image preloading ──────────────────────────────────────────────────────
// Гарант: resolve() один раз, даже если bg уже cached к моменту вызова.
// Важно для async lifecycle — иначе await-цепочка зависает.
export function waitImg(img) {
  if (!img) return Promise.resolve();
  if (img.complete && img.naturalWidth) return Promise.resolve();
  return new Promise(r => {
    const done = () => {
      img.removeEventListener('load',  done);
      img.removeEventListener('error', done);
      r();
    };
    img.addEventListener('load',  done);
    img.addEventListener('error', done);
  });
}

// ─── object-fit: cover math ────────────────────────────────────────────────
// Возвращает фактический прямоугольник BG внутри (W,H) canvas.
// pos='center' — стандарт (scene2, inside, buddha).
// pos='top'    — scene4, где object-position:top.
//
// Все зоны нормализованы в [0..1] относительно natural BG size (bgW, bgH),
// и здесь они разворачиваются обратно в пиксели — так один набор координат
// работает на любом соотношении сторон экрана.
export function coverRect(W, H, bgW, bgH, pos = 'center') {
  const ar  = bgW / bgH;
  const cAr = W / H;

  if (pos === 'top') {
    if (cAr > ar) {
      const dW = W, dH = W / ar;
      return { x: 0, y: 0, w: dW, h: dH, scale: dW / bgW };
    }
    const dH = H, dW = H * ar;
    return { x: (W - dW) / 2, y: 0, w: dW, h: dH, scale: dH / bgH };
  }

  // center
  if (cAr > ar) {
    const bh = W / ar;
    return { x: 0, y: (H - bh) / 2, w: W, h: bh, scale: W / bgW };
  }
  const bw = H * ar;
  return { x: (W - bw) / 2, y: 0, w: bw, h: H, scale: H / bgH };
}

// ─── Hit-тест нормализованной зоны ─────────────────────────────────────────
// Принимает оба формата зон, которые исторически сосуществуют:
//   {x0, y0, x1, y1}      — scene4, inside
//   {fx, fy, fw, fh}      — scene2 (bottle/rocks)
export function hitZone(cx, cy, zone, rect) {
  let x0, y0, x1, y1;
  if (zone.fx !== undefined) {
    x0 = zone.fx;
    y0 = zone.fy;
    x1 = zone.fx + zone.fw;
    y1 = zone.fy + zone.fh;
  } else {
    x0 = zone.x0;
    y0 = zone.y0;
    x1 = zone.x1;
    y1 = zone.y1;
  }
  const nx = (cx - rect.x) / rect.w;
  const ny = (cy - rect.y) / rect.h;
  return nx >= x0 && nx <= x1 && ny >= y0 && ny <= y1;
}
