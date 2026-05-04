// src/scene-base.js — общие помощники для image-сцен.
// Убирает хардкод, который раньше дублировался в buddha/scene2/scene3/scene4/inside.
//
// API:
//   waitImg(img)                      → Promise, ждёт load/error
//   coverRect(W,H, bgW,bgH, pos?)     → прямоугольник BG при object-fit:cover
//                                       pos = 'center' (дефолт) | 'top'
//   hitZone(cx,cy, zone, rect)        → попадание курсора в нормализованную зону
//                                       zone: {x0,y0,x1,y1} ИЛИ {fx,fy,fw,fh}
//   buildSceneDOM(opts)               → собирает div+bg+canvas+back+msgEl
//   bindSceneInput(canvas, handlers)  → click/touch/move с кэш-rect

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

// ─── buildSceneDOM ─────────────────────────────────────────────────────────
// Собирает каркас сцены: <div.scene-root><img.scene-bg><canvas.scene-canvas>
// + back-button + msg container. Это **единственный** шаблон, на который
// ориентирован _TEMPLATE.js и который должны использовать новые сцены.
//
// opts:
//   id        — id корневого div'а (и для querySelector)
//   bgSrc     — путь к фону (null для процедурных сцен типа scene3)
//   bgPos     — 'center' (дефолт) | 'top' (добавит класс scene-bg--top)
//   zIndex    — '55' | '60' (дефолт 55). Строка.
//   onClose   — fn() вызывается click и touchend на back-button
//   withBack  — true (дефолт); false отключит back-btn (для prologue/menu)
//
// ─── createBackBtn — кнопка-стрелка «назад» с touchend handler ───────────
// Используется и внутри buildSceneDOM, и в legacy-сценах, которые сами
// собирают DOM. Раньше каждая legacy-сцена дублировала 5 строк (создание
// button + className + textContent + onclick + touchend).
//
//   const back = createBackBtn(closeSceneXxx);
//   el.appendChild(back);
//
// touchend требует preventDefault для подавления double-tap zoom + click.
export function createBackBtn(onClose) {
  const back = document.createElement('button');
  back.className   = 'back-btn';
  back.textContent = '←';
  back.onclick     = onClose;
  back.addEventListener('touchend', e => {
    e.stopPropagation(); e.preventDefault(); onClose?.();
  }, { passive: false });
  return back;
}

// Возвращает: { el, bgImg | null, canvas, ctx, msgEl | null, back | null }
// Если элемент уже существует в DOM (createEl повторный вызов), возвращает
// ссылки через querySelector.
export function buildSceneDOM(opts) {
  const { id, bgSrc, bgPos = 'center', zIndex = '55',
          onClose, withBack = true, withMsg = true } = opts;

  const existing = document.getElementById(id);
  if (existing) {
    return {
      el:     existing,
      bgImg:  existing.querySelector('img.scene-bg'),
      canvas: existing.querySelector('canvas.scene-canvas'),
      ctx:    existing.querySelector('canvas.scene-canvas')?.getContext('2d'),
      msgEl:  existing.querySelector('.scene-msg'),
      back:   existing.querySelector('.back-btn'),
    };
  }

  const el = document.createElement('div');
  el.id = id;
  el.className = 'scene-root';
  el.style.zIndex = zIndex;

  let bgImg = null;
  if (bgSrc) {
    bgImg = document.createElement('img');
    bgImg.src = bgSrc;
    bgImg.className = 'scene-bg' + (bgPos === 'top' ? ' scene-bg--top' : '');
    el.appendChild(bgImg);
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  const ctx = canvas.getContext('2d');
  el.appendChild(canvas);

  let back = null;
  if (withBack) {
    back = createBackBtn(onClose);
    el.appendChild(back);
  }

  let msgEl = null;
  if (withMsg) {
    msgEl = document.createElement('div');
    msgEl.className = 'scene-msg';
    el.appendChild(msgEl);
  }

  document.getElementById('wrap').appendChild(el);

  return { el, bgImg, canvas, ctx, msgEl, back };
}

// ─── bindSceneInput ────────────────────────────────────────────────────────
// Навешивает click/touchend/mousemove/mouseleave с кэшированием rect.
// Rect обновляется на resize/scroll (passive), не каждый кадр.
//
// handlers:
//   onTap(cx, cy)     — клик или тач (координаты уже относительно canvas)
//   onHover(cx, cy)   — опционально, на mousemove; возврат игнорируется
//   onLeave()         — опционально, на mouseleave
//   activeCheck()     — возвращает bool: если false, events пропускаются
//                       (например `() => state.activeScreen === SCREENS.X`)
//
// Возвращает объект с `.refresh()` — ручной пересчёт rect при
// программном изменении размеров.
export function bindSceneInput(canvas, handlers) {
  const { onTap, onHover, onLeave, activeCheck = () => true } = handlers;
  let rect = { left: 0, top: 0, width: 0, height: 0 };
  const refresh = () => { if (canvas) rect = canvas.getBoundingClientRect(); };
  refresh();

  const relX = e => e.clientX - rect.left;
  const relY = e => e.clientY - rect.top;

  canvas.addEventListener('click', e => {
    if (!activeCheck()) return;
    onTap?.(relX(e), relY(e));
  });
  canvas.addEventListener('touchend', e => {
    if (!activeCheck()) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    onTap?.(t.clientX - rect.left, t.clientY - rect.top);
  }, { passive: false });

  if (onHover) {
    canvas.addEventListener('mousemove', e => {
      if (!activeCheck()) return;
      onHover(relX(e), relY(e));
    });
  }
  if (onLeave) canvas.addEventListener('mouseleave', onLeave);

  // Listener-ы — живут вместе с canvas (сцены не destroy'ятся, только hide/show).
  window.addEventListener('resize', refresh);
  window.addEventListener('scroll', refresh, { passive: true });

  return { refresh };
}
