// src/input.js — InputManager: mouse + touch → {cx, cy}

export const InputManager = {
  isMobile: () =>
    window.matchMedia('(pointer:coarse)').matches || window.innerWidth < 768,

  // Привязать к canvas — возвращает функцию отвязки
  bind(canvas, onTap, onHover) {
    const coords = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      return { cx: clientX - r.left, cy: clientY - r.top };
    };

    const onClick = e => onTap(coords(e.clientX, e.clientY));
    const onMove  = e => onHover?.(coords(e.clientX, e.clientY));
    const onTouch = e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      onTap(coords(t.clientX, t.clientY));
    };

    canvas.addEventListener('click',      onClick);
    canvas.addEventListener('mousemove',  onMove);
    canvas.addEventListener('touchend',   onTouch, { passive: false });

    return () => {
      canvas.removeEventListener('click',     onClick);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('touchend',  onTouch);
    };
  },
};
