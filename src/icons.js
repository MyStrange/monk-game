// src/icons.js — все SVG pixel-art иконки предметов
// Правила: только <rect>, никаких <path>/<circle>/<polygon>
// Палитра: тёмные тона + один яркий акцент
// Шаблон: viewBox="0 0 48 48", style="image-rendering:pixelated"

// ── Stick / Glowstick ──────────────────────────────────────────────────────
export function renderStickIcon(glowing = false) {
  const shaft  = glowing ? '#b8ff70' : '#8B6914';
  const shadow = glowing ? '#5fa020' : '#5a3e00';
  const knot1  = glowing ? '#d4ffaa' : '#a07820';
  const knot2  = glowing ? '#4a8010' : '#6b4a00';
  const glow   = glowing ? '#e8ffcc' : 'none';
  return `<svg width="48" height="48" viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    ${glowing ? `
    <rect x="8"  y="6"  width="4" height="4" fill="${glow}" opacity="0.5"/>
    <rect x="36" y="38" width="4" height="4" fill="${glow}" opacity="0.5"/>
    <rect x="10" y="2"  width="2" height="2" fill="${glow}" opacity="0.3"/>
    <rect x="38" y="42" width="2" height="2" fill="${glow}" opacity="0.3"/>
    ` : ''}
    <!-- main shaft diagonal -->
    <rect x="8"  y="8"  width="4" height="4"  fill="${shaft}"/>
    <rect x="10" y="10" width="4" height="4"  fill="${shaft}"/>
    <rect x="12" y="12" width="4" height="4"  fill="${shaft}"/>
    <rect x="14" y="14" width="4" height="4"  fill="${shadow}"/>
    <rect x="16" y="16" width="4" height="4"  fill="${shaft}"/>
    <rect x="18" y="18" width="4" height="4"  fill="${shaft}"/>
    <rect x="20" y="20" width="4" height="4"  fill="${shadow}"/>
    <rect x="22" y="22" width="4" height="4"  fill="${shaft}"/>
    <rect x="24" y="24" width="4" height="4"  fill="${shaft}"/>
    <rect x="26" y="26" width="4" height="4"  fill="${knot1}"/>
    <rect x="28" y="26" width="2" height="2"  fill="${knot2}"/>
    <rect x="28" y="28" width="4" height="4"  fill="${shaft}"/>
    <rect x="30" y="30" width="4" height="4"  fill="${shaft}"/>
    <rect x="32" y="32" width="4" height="4"  fill="${shadow}"/>
    <rect x="34" y="34" width="4" height="4"  fill="${shaft}"/>
    <rect x="36" y="36" width="4" height="4"  fill="${shaft}"/>
    <!-- tip -->
    <rect x="6"  y="8"  width="4" height="2"  fill="${knot1}"/>
    <rect x="38" y="38" width="4" height="2"  fill="${shadow}"/>
  </svg>`;
}

// ── Jar (closed) / Jar open ────────────────────────────────────────────────
export function renderJarIcon(item) {
  const open    = item?.id === 'jar_open';
  const glowing = item?.glowing;
  const hasWater = item?.hasWater;
  const caught  = item?.caught ?? 0;

  const glass   = '#c8e8ff';
  const glassDk = '#7ab0d0';
  const cap     = open ? 'none' : '#e8c060';
  const capDk   = open ? 'none' : '#a07820';
  const base    = '#7ab0d0';

  // Fly dots inside
  const flyColor = glowing ? '#ffffa0' : (caught > 0 ? '#a0d070' : 'none');

  // Water tint
  const waterTint = hasWater ? '#5090c0' : 'none';

  return `<svg width="48" height="48" viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    ${glowing ? `
    <rect x="10" y="10" width="4" height="4" fill="#ffffa0" opacity="0.3"/>
    <rect x="34" y="10" width="4" height="4" fill="#ffffa0" opacity="0.3"/>
    <rect x="10" y="34" width="4" height="4" fill="#ffffa0" opacity="0.3"/>
    <rect x="34" y="34" width="4" height="4" fill="#ffffa0" opacity="0.3"/>
    ` : ''}
    <!-- cap -->
    ${!open ? `
    <rect x="16" y="6"  width="16" height="4" fill="${cap}"/>
    <rect x="14" y="8"  width="20" height="2" fill="${capDk}"/>
    ` : ''}
    <!-- neck -->
    <rect x="18" y="10" width="12" height="4" fill="${glassDk}"/>
    <!-- body -->
    <rect x="12" y="14" width="24" height="22" fill="${glass}"/>
    <rect x="10" y="16" width="28" height="18" fill="${glass}"/>
    <!-- water fill -->
    ${hasWater ? `<rect x="12" y="28" width="24" height="8"  fill="${waterTint}" opacity="0.6"/>
    <rect x="10" y="30" width="28" height="6" fill="${waterTint}" opacity="0.4"/>` : ''}
    <!-- gloss -->
    <rect x="14" y="16" width="4" height="10" fill="#e8f8ff" opacity="0.7"/>
    <!-- flies / glow -->
    ${caught > 0 || glowing ? `
    <rect x="22" y="20" width="2" height="2" fill="${flyColor}"/>
    <rect x="26" y="24" width="2" height="2" fill="${flyColor}"/>
    <rect x="20" y="26" width="2" height="2" fill="${flyColor}"/>
    ` : ''}
    <!-- bottom -->
    <rect x="12" y="36" width="24" height="4" fill="${base}"/>
    <rect x="14" y="38" width="20" height="2" fill="${glassDk}"/>
  </svg>`;
}

// ── Dirt ───────────────────────────────────────────────────────────────────
export function renderDirtIcon() {
  return `<svg width="48" height="48" viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- pile shape -->
    <rect x="18" y="14" width="12" height="4"  fill="#6b3a1f"/>
    <rect x="14" y="18" width="20" height="4"  fill="#7a4422"/>
    <rect x="10" y="22" width="28" height="4"  fill="#8b5428"/>
    <rect x="8"  y="26" width="32" height="4"  fill="#9a6030"/>
    <rect x="10" y="30" width="28" height="4"  fill="#7a4422"/>
    <rect x="14" y="34" width="20" height="2"  fill="#6b3a1f"/>
    <!-- texture dots -->
    <rect x="16" y="20" width="2" height="2"  fill="#5a2e14"/>
    <rect x="28" y="24" width="2" height="2"  fill="#5a2e14"/>
    <rect x="20" y="28" width="2" height="2"  fill="#4a2010"/>
    <rect x="32" y="28" width="2" height="2"  fill="#5a2e14"/>
    <!-- highlight -->
    <rect x="20" y="16" width="4" height="2"  fill="#b07840"/>
    <rect x="22" y="22" width="2" height="2"  fill="#a06830"/>
  </svg>`;
}

// ── Durian (rice bowl) ─────────────────────────────────────────────────────
export function renderDurianIcon() {
  return `<svg width="48" height="48" viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- bowl body -->
    <rect x="8"  y="26" width="32" height="12" fill="#d4a060"/>
    <rect x="6"  y="28" width="36" height="10" fill="#c89050"/>
    <rect x="10" y="38" width="28" height="4"  fill="#b07840"/>
    <!-- rim -->
    <rect x="6"  y="24" width="36" height="4"  fill="#e8b870"/>
    <!-- rice -->
    <rect x="10" y="18" width="28" height="8"  fill="#f0ead0"/>
    <rect x="12" y="16" width="24" height="4"  fill="#e8e0c0"/>
    <!-- rice texture -->
    <rect x="14" y="18" width="2" height="2"  fill="#fff8e8"/>
    <rect x="20" y="20" width="2" height="2"  fill="#fff8e8"/>
    <rect x="28" y="18" width="2" height="2"  fill="#fff8e8"/>
    <rect x="24" y="22" width="2" height="2"  fill="#fff8e8"/>
    <!-- durian chunks (yellow-green) -->
    <rect x="16" y="16" width="4" height="4"  fill="#c8d840"/>
    <rect x="26" y="18" width="4" height="4"  fill="#b8c830"/>
    <rect x="22" y="14" width="4" height="4"  fill="#d4e050"/>
    <!-- bowl shadow -->
    <rect x="8"  y="36" width="32" height="2"  fill="#906030"/>
  </svg>`;
}

// ── Fire Flower ────────────────────────────────────────────────────────────
export function renderFireflowerIcon() {
  return `<svg width="48" height="48" viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- glow aura -->
    <rect x="18" y="6"  width="12" height="4"  fill="#ff8820" opacity="0.4"/>
    <rect x="14" y="8"  width="20" height="4"  fill="#ff8820" opacity="0.3"/>
    <rect x="6"  y="12" width="36" height="4"  fill="#ff8820" opacity="0.2"/>
    <!-- petals -->
    <rect x="20" y="8"  width="8"  height="6"  fill="#ff6600"/>
    <rect x="8"  y="16" width="6"  height="8"  fill="#ff5500"/>
    <rect x="34" y="16" width="6"  height="8"  fill="#ff5500"/>
    <rect x="12" y="28" width="8"  height="6"  fill="#ff6600"/>
    <rect x="28" y="28" width="8"  height="6"  fill="#ff6600"/>
    <!-- petal highlights -->
    <rect x="22" y="10" width="4"  height="2"  fill="#ffaa40"/>
    <rect x="10" y="18" width="2"  height="4"  fill="#ffaa40"/>
    <!-- center -->
    <rect x="18" y="18" width="12" height="12" fill="#ffcc00"/>
    <rect x="20" y="20" width="8"  height="8"  fill="#ffe840"/>
    <!-- inner glow -->
    <rect x="22" y="22" width="4"  height="4"  fill="#fff8a0"/>
    <!-- stem -->
    <rect x="22" y="34" width="4"  height="8"  fill="#2a6620"/>
    <rect x="20" y="36" width="2"  height="4"  fill="#1e5018"/>
    <!-- leaf -->
    <rect x="26" y="36" width="6"  height="2"  fill="#2a6620"/>
    <rect x="16" y="38" width="6"  height="2"  fill="#2a6620"/>
  </svg>`;
}

// ── Achievement icons (UI) ─────────────────────────────────────────────────

// Eye — stub / persistence category
export function renderEyeIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="4"  y="12" width="24" height="8"  fill="#c0d8f0"/>
    <rect x="6"  y="10" width="20" height="12" fill="#c0d8f0"/>
    <rect x="8"  y="8"  width="16" height="16" fill="#c0d8f0"/>
    <rect x="12" y="12" width="8"  height="8"  fill="#2040a0"/>
    <rect x="14" y="14" width="4"  height="4"  fill="#080820"/>
    <rect x="14" y="14" width="2"  height="2"  fill="#ffffff"/>
    <rect x="6"  y="12" width="2"  height="2"  fill="#e8f4ff"/>
    <rect x="24" y="12" width="2"  height="2"  fill="#e8f4ff"/>
  </svg>`;
}

// Compass rose — exp / exploration category
export function renderCompassIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="14" y="2"  width="4"  height="12" fill="#e0c060"/>
    <rect x="14" y="18" width="4"  height="12" fill="#809060"/>
    <rect x="2"  y="14" width="12" height="4"  fill="#809060"/>
    <rect x="18" y="14" width="12" height="4"  fill="#809060"/>
    <rect x="12" y="12" width="8"  height="8"  fill="#c0a840"/>
    <rect x="14" y="14" width="4"  height="4"  fill="#f0e080"/>
    <rect x="4"  y="4"  width="4"  height="4"  fill="#506040" opacity="0.5"/>
    <rect x="24" y="4"  width="4"  height="4"  fill="#506040" opacity="0.5"/>
    <rect x="4"  y="24" width="4"  height="4"  fill="#506040" opacity="0.5"/>
    <rect x="24" y="24" width="4"  height="4"  fill="#506040" opacity="0.5"/>
  </svg>`;
}

// Empty circle / void — void category
export function renderVoidIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="10" y="4"  width="12" height="4"  fill="#404060"/>
    <rect x="4"  y="10" width="4"  height="12" fill="#404060"/>
    <rect x="24" y="10" width="4"  height="12" fill="#404060"/>
    <rect x="10" y="24" width="12" height="4"  fill="#404060"/>
    <rect x="6"  y="6"  width="4"  height="4"  fill="#404060"/>
    <rect x="22" y="6"  width="4"  height="4"  fill="#404060"/>
    <rect x="6"  y="22" width="4"  height="4"  fill="#404060"/>
    <rect x="22" y="22" width="4"  height="4"  fill="#404060"/>
    <rect x="12" y="12" width="8"  height="8"  fill="#0a0a14"/>
    <rect x="14" y="14" width="4"  height="4"  fill="#1a1a28"/>
  </svg>`;
}

// ── Icon dispatch map (для hotbar/cursor) ─────────────────────────────────
// Возвращает SVG-строку для предмета или null если нет рендерера.
export function renderItemIcon(item) {
  if (!item) return null;
  switch (item.id) {
    case 'stick':      return renderStickIcon(false);
    case 'glowstick':  return renderStickIcon(true);
    case 'jar':        return renderJarIcon(item);
    case 'jar_open':   return renderJarIcon(item);
    case 'dirt':       return renderDirtIcon();
    case 'durian':     return renderDurianIcon();
    case 'fireflower': return renderFireflowerIcon();
    default:           return null;
  }
}
