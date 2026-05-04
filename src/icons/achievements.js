// src/icons/achievements.js — иконки достижений (и общий fallback)
// 35+ функций renderXIcon + ACH_ICON_MAP + renderAchIconByKey.
//
// Использование:
//   import { renderAchIconByKey } from '../src/icons/achievements.js';
//   const svg = renderAchIconByKey('eye'); // → SVG-строка
//
// Иконка `jar` и `shelf` в map'е используют рендереры из items.js
// (renderJarIcon — общий с инвентарём; renderShelfIcon — только тут).

import { renderJarIcon } from './items.js';

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

// Void — изометрический вихрь пустоты, концентрические кольца с градиентом
export function renderVoidIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- outer ring (lightest) -->
    <rect x="8"  y="2"  width="16" height="2"  fill="#6a6a88"/>
    <rect x="4"  y="4"  width="24" height="2"  fill="#6a6a88"/>
    <rect x="2"  y="6"  width="28" height="2"  fill="#5a5a78"/>
    <rect x="2"  y="8"  width="2"  height="18" fill="#5a5a78"/>
    <rect x="28" y="8"  width="2"  height="18" fill="#5a5a78"/>
    <rect x="2"  y="26" width="28" height="2"  fill="#4a4a68"/>
    <rect x="4"  y="28" width="24" height="2"  fill="#4a4a68"/>
    <rect x="8"  y="30" width="16" height="2"  fill="#3a3a58"/>
    <!-- middle ring -->
    <rect x="8"  y="6"  width="16" height="2"  fill="#3a3a58"/>
    <rect x="6"  y="8"  width="20" height="2"  fill="#2a2a48"/>
    <rect x="4"  y="10" width="24" height="2"  fill="#2a2a48"/>
    <rect x="4"  y="22" width="24" height="2"  fill="#1a1a38"/>
    <rect x="6"  y="24" width="20" height="2"  fill="#1a1a38"/>
    <rect x="8"  y="26" width="16" height="2"  fill="#0a0a28"/>
    <!-- inner ring -->
    <rect x="6"  y="12" width="20" height="10" fill="#0a0a18"/>
    <rect x="8"  y="10" width="16" height="2"  fill="#0a0a18"/>
    <!-- singularity core -->
    <rect x="12" y="14" width="8"  height="6"  fill="#000008"/>
    <rect x="14" y="16" width="4"  height="2"  fill="#1a1a3a"/>
    <!-- faint highlight -->
    <rect x="10" y="8"  width="4"  height="1"  fill="#8a8aa8" opacity="0.6"/>
  </svg>`;
}

// Shelf — комната полок (для ачивки shelf_visit). Изометрическая деревянная полка
// с маленьким трофеем сверху.
export function renderShelfIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- back panel (shadow) -->
    <rect x="4"  y="8"  width="24" height="14" fill="#3a2210"/>
    <!-- shelf surface front edge -->
    <rect x="2"  y="20" width="28" height="3"  fill="#8a5830"/>
    <rect x="2"  y="23" width="28" height="2"  fill="#6a4018"/>
    <!-- shelf surface top (isometric depth) -->
    <rect x="4"  y="18" width="24" height="2"  fill="#a06838"/>
    <!-- side walls -->
    <rect x="2"  y="6"  width="2"  height="20" fill="#4a2810"/>
    <rect x="28" y="6"  width="2"  height="20" fill="#4a2810"/>
    <!-- top edge -->
    <rect x="2"  y="6"  width="28" height="2"  fill="#6a4018"/>
    <!-- wood grain (back) -->
    <rect x="8"  y="12" width="16" height="1"  fill="#2a1608" opacity="0.6"/>
    <rect x="6"  y="16" width="20" height="1"  fill="#2a1608" opacity="0.6"/>
    <!-- trophy on the shelf: small golden medal -->
    <rect x="13" y="10" width="6"  height="8"  fill="#d49030"/>
    <rect x="14" y="9"  width="4"  height="1"  fill="#e8a840"/>
    <rect x="13" y="11" width="6"  height="1"  fill="#f0c040"/>
    <rect x="15" y="12" width="2"  height="4"  fill="#fff0a0"/>
    <!-- floor shadow -->
    <rect x="4"  y="28" width="24" height="2"  fill="#1a0a04" opacity="0.5"/>
  </svg>`;
}

// ── Locked placeholder — пиксельный знак вопроса ─────────────────────────
// Показывается на экране ачивок для незаработанных. Мягкий серо-синий,
// чтобы не отвлекал от открытых.
export function renderQuestionIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="8"  y="4"  width="16" height="4" fill="#4a5060"/>
    <rect x="6"  y="6"  width="20" height="4" fill="#5a6070"/>
    <rect x="20" y="10" width="6"  height="6" fill="#4a5060"/>
    <rect x="6"  y="10" width="6"  height="4" fill="#4a5060"/>
    <rect x="14" y="14" width="8"  height="4" fill="#5a6070"/>
    <rect x="12" y="18" width="8"  height="4" fill="#4a5060"/>
    <rect x="12" y="24" width="8"  height="4" fill="#5a6070"/>
    <!-- highlight -->
    <rect x="10" y="6"  width="4"  height="2" fill="#7a8090"/>
  </svg>`;
}

// ── Lotus — сидение/медитация ─────────────────────────────────────────────
export function renderLotusIcon(bright = false) {
  const petal = bright ? '#f0a0c8' : '#c06090';
  const petalLt = bright ? '#ffc0e0' : '#e088b0';
  const core = bright ? '#fff8d0' : '#e8d080';
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- outer petals -->
    <rect x="4"  y="14" width="6" height="8" fill="${petal}"/>
    <rect x="22" y="14" width="6" height="8" fill="${petal}"/>
    <rect x="12" y="6"  width="8" height="8" fill="${petal}"/>
    <rect x="6"  y="10" width="6" height="6" fill="${petalLt}"/>
    <rect x="20" y="10" width="6" height="6" fill="${petalLt}"/>
    <!-- core -->
    <rect x="12" y="14" width="8" height="6" fill="${core}"/>
    <rect x="14" y="16" width="4" height="2" fill="#ffffff"/>
    <!-- water base -->
    <rect x="2"  y="22" width="28" height="2" fill="#4880b0"/>
    <rect x="0"  y="24" width="32" height="4" fill="#3a6ea0"/>
    <rect x="2"  y="28" width="28" height="2" fill="#2a5080"/>
  </svg>`;
}

// ── Hand — подбор предмета ───────────────────────────────────────────────
export function renderHandIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="10" y="4"  width="4" height="14" fill="#d8a070"/>
    <rect x="14" y="2"  width="4" height="16" fill="#e0a878"/>
    <rect x="18" y="4"  width="4" height="14" fill="#d8a070"/>
    <rect x="6"  y="10" width="4" height="10" fill="#d09068"/>
    <rect x="22" y="10" width="4" height="8"  fill="#d09068"/>
    <rect x="6"  y="18" width="20" height="10" fill="#d8a070"/>
    <rect x="6"  y="26" width="20" height="2"  fill="#a06840"/>
    <rect x="10" y="20" width="12" height="2"  fill="#e8b888"/>
  </svg>`;
}

// ── Pouch — много предметов ──────────────────────────────────────────────
export function renderPouchIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="6"  y="8"  width="20" height="2"  fill="#6a4a20"/>
    <rect x="4"  y="10" width="24" height="16" fill="#8a6028"/>
    <rect x="6"  y="26" width="20" height="2"  fill="#5a3a18"/>
    <rect x="8"  y="12" width="16" height="10" fill="#a07838"/>
    <!-- tie -->
    <rect x="10" y="6"  width="4"  height="4"  fill="#c89040"/>
    <rect x="18" y="6"  width="4"  height="4"  fill="#c89040"/>
    <rect x="14" y="4"  width="4"  height="4"  fill="#e0a858"/>
    <!-- texture dots -->
    <rect x="12" y="16" width="2"  height="2"  fill="#6a4818"/>
    <rect x="18" y="18" width="2"  height="2"  fill="#6a4818"/>
  </svg>`;
}

// ── Rune — символ доставлен на надпись ───────────────────────────────────
export function renderRuneIcon(glowing = false) {
  const c = glowing ? '#ffe080' : '#b080e0';
  const cb = glowing ? '#fff4b0' : '#d0a0ff';
  const bg = '#2a1830';
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="4"  y="4"  width="24" height="24" fill="${bg}"/>
    <rect x="6"  y="6"  width="20" height="2"  fill="#3a2844"/>
    <rect x="6"  y="24" width="20" height="2"  fill="#3a2844"/>
    <!-- rune shape: ᚱ-like -->
    <rect x="10" y="8"  width="3"  height="16" fill="${c}"/>
    <rect x="13" y="8"  width="6"  height="3"  fill="${c}"/>
    <rect x="19" y="10" width="3"  height="4"  fill="${c}"/>
    <rect x="13" y="14" width="6"  height="3"  fill="${c}"/>
    <rect x="16" y="17" width="5"  height="3"  fill="${c}"/>
    <rect x="19" y="20" width="3"  height="4"  fill="${c}"/>
    <!-- highlight -->
    <rect x="10" y="8"  width="2"  height="4"  fill="${cb}"/>
  </svg>`;
}

// ── Stone — активация камня ──────────────────────────────────────────────
export function renderStoneIcon(lit = false) {
  const stone = '#6a707a';
  const dark = '#4a4e56';
  const crack = lit ? '#ffb060' : '#2a2e36';
  const glow = lit ? '#ffe080' : null;
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    ${lit ? `<rect x="2" y="8" width="28" height="18" fill="${glow}" opacity="0.2"/>` : ''}
    <rect x="8"  y="8"  width="16" height="4"  fill="${stone}"/>
    <rect x="4"  y="12" width="24" height="12" fill="${stone}"/>
    <rect x="6"  y="24" width="20" height="2"  fill="${dark}"/>
    <rect x="8"  y="10" width="4"  height="2"  fill="#808690"/>
    <!-- crack/glow line -->
    <rect x="12" y="14" width="2"  height="4"  fill="${crack}"/>
    <rect x="14" y="18" width="4"  height="2"  fill="${crack}"/>
    <rect x="18" y="16" width="2"  height="4"  fill="${crack}"/>
    <rect x="6"  y="22" width="3"  height="2"  fill="${dark}"/>
    <rect x="22" y="20" width="4"  height="3"  fill="${dark}"/>
  </svg>`;
}

// ── Speech bubble — диалог с монахом ─────────────────────────────────────
export function renderSpeechIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="4"  y="4"  width="24" height="2"  fill="#c8a060"/>
    <rect x="2"  y="6"  width="28" height="14" fill="#e8c880"/>
    <rect x="4"  y="20" width="24" height="2"  fill="#c8a060"/>
    <!-- tail -->
    <rect x="8"  y="22" width="4"  height="2"  fill="#c8a060"/>
    <rect x="10" y="24" width="2"  height="2"  fill="#a88040"/>
    <!-- dots (3 text dots) -->
    <rect x="8"  y="12" width="3"  height="3"  fill="#4a3010"/>
    <rect x="14" y="12" width="3"  height="3"  fill="#4a3010"/>
    <rect x="20" y="12" width="3"  height="3"  fill="#4a3010"/>
  </svg>`;
}

// ── Hibiscus mini — получил цветок от монаха ─────────────────────────────
export function renderFlowerMiniIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="12" y="4"  width="8"  height="8"  fill="#d02030"/>
    <rect x="20" y="8"  width="8"  height="8"  fill="#d02030"/>
    <rect x="20" y="16" width="8"  height="8"  fill="#d02030"/>
    <rect x="4"  y="16" width="8"  height="8"  fill="#d02030"/>
    <rect x="4"  y="8"  width="8"  height="8"  fill="#d02030"/>
    <rect x="10" y="10" width="12" height="12" fill="#d02030"/>
    <!-- hilites -->
    <rect x="14" y="6"  width="2"  height="2"  fill="#f05060"/>
    <rect x="22" y="10" width="2"  height="2"  fill="#f05060"/>
    <!-- dark throat -->
    <rect x="14" y="14" width="4"  height="4"  fill="#4a0818"/>
    <!-- yellow column -->
    <rect x="15" y="16" width="2"  height="8"  fill="#f5c832"/>
    <rect x="14" y="22" width="4"  height="2"  fill="#ffe060"/>
  </svg>`;
}

// ── Firefly — поймал светлячков ──────────────────────────────────────────
export function renderFireflyIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- glow aura -->
    <rect x="8"  y="8"  width="16" height="16" fill="#fff080" opacity="0.18"/>
    <rect x="10" y="10" width="12" height="12" fill="#fff080" opacity="0.28"/>
    <!-- body -->
    <rect x="13" y="14" width="6"  height="4"  fill="#6a4818"/>
    <rect x="14" y="12" width="4"  height="2"  fill="#4a3010"/>
    <!-- tail -->
    <rect x="15" y="18" width="2"  height="4"  fill="#ffe060"/>
    <rect x="14" y="20" width="4"  height="2"  fill="#fff4a0"/>
    <!-- wings -->
    <rect x="8"  y="12" width="5"  height="3"  fill="#c8d0e0" opacity="0.55"/>
    <rect x="19" y="12" width="5"  height="3"  fill="#c8d0e0" opacity="0.55"/>
    <!-- sparkle points -->
    <rect x="6"  y="6"  width="2"  height="2"  fill="#fff8a0"/>
    <rect x="24" y="8"  width="2"  height="2"  fill="#fff8a0"/>
    <rect x="4"  y="22" width="2"  height="2"  fill="#fff8a0"/>
    <rect x="26" y="24" width="2"  height="2"  fill="#fff8a0"/>
  </svg>`;
}

// ── Fly release — открытая банка с уходящими светлячками ─────────────────
export function renderReleaseIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- jar silhouette (tipped) -->
    <rect x="4"  y="18" width="14" height="10" fill="#6a7888"/>
    <rect x="4"  y="16" width="14" height="2"  fill="#4a5868"/>
    <rect x="6"  y="20" width="10" height="6"  fill="#3a4048"/>
    <!-- flies leaving -->
    <rect x="18" y="14" width="2"  height="2"  fill="#ffe060"/>
    <rect x="22" y="10" width="2"  height="2"  fill="#ffe060"/>
    <rect x="26" y="6"  width="2"  height="2"  fill="#ffe060"/>
    <rect x="20" y="8"  width="2"  height="2"  fill="#fff8a0"/>
    <rect x="24" y="14" width="2"  height="2"  fill="#fff8a0"/>
    <!-- trails -->
    <rect x="20" y="14" width="2"  height="1"  fill="#ffe060" opacity="0.5"/>
    <rect x="24" y="10" width="2"  height="1"  fill="#ffe060" opacity="0.5"/>
  </svg>`;
}

// ── Glowing jar — craft glowstick ────────────────────────────────────────
export function renderJarGlowIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="6"  y="6"  width="20" height="22" fill="#ffe060" opacity="0.18"/>
    <!-- cap -->
    <rect x="10" y="4"  width="12" height="3"  fill="#d4a840"/>
    <rect x="8"  y="7"  width="16" height="2"  fill="#8a6010"/>
    <!-- jar -->
    <rect x="8"  y="9"  width="16" height="18" fill="#d8e8f0" opacity="0.28"/>
    <rect x="8"  y="9"  width="16" height="2"  fill="#688090"/>
    <rect x="8"  y="25" width="16" height="2"  fill="#688090"/>
    <!-- glowing contents -->
    <rect x="10" y="14" width="12" height="10" fill="#ffd040" opacity="0.75"/>
    <rect x="12" y="16" width="8"  height="6"  fill="#fff080"/>
    <rect x="14" y="18" width="4"  height="2"  fill="#ffffff"/>
    <!-- glass highlight -->
    <rect x="10" y="11" width="2"  height="8"  fill="#ffffff" opacity="0.35"/>
  </svg>`;
}

// ── Water drop — набрал воды ─────────────────────────────────────────────
export function renderDropIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="14" y="4"  width="4"  height="4"  fill="#80c0f0"/>
    <rect x="12" y="8"  width="8"  height="4"  fill="#5090d0"/>
    <rect x="10" y="12" width="12" height="6"  fill="#3070b0"/>
    <rect x="8"  y="18" width="16" height="6"  fill="#2060a0"/>
    <rect x="10" y="24" width="12" height="2"  fill="#184880"/>
    <!-- highlight -->
    <rect x="14" y="6"  width="2"  height="4"  fill="#c0e0ff"/>
    <rect x="12" y="14" width="2"  height="4"  fill="#a0d0f0"/>
    <!-- splash -->
    <rect x="4"  y="26" width="4"  height="2"  fill="#5090d0" opacity="0.6"/>
    <rect x="24" y="26" width="4"  height="2"  fill="#5090d0" opacity="0.6"/>
  </svg>`;
}

// ── Sad cat — обидел кота ─────────────────────────────────────────────────
export function renderCatSadIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- ears (tall, triangular, bigger) -->
    <rect x="4"  y="2"  width="6"  height="8"  fill="#d8a040"/>
    <rect x="22" y="2"  width="6"  height="8"  fill="#d8a040"/>
    <rect x="6"  y="4"  width="2"  height="4"  fill="#a07828"/>
    <rect x="24" y="4"  width="2"  height="4"  fill="#a07828"/>
    <rect x="6"  y="2"  width="2"  height="2"  fill="#e8b858"/>
    <rect x="24" y="2"  width="2"  height="2"  fill="#e8b858"/>
    <!-- head fills most of canvas -->
    <rect x="4"  y="8"  width="24" height="20" fill="#d8a040"/>
    <rect x="2"  y="10" width="28" height="16" fill="#d8a040"/>
    <!-- head shading — right-bottom (isometric depth) -->
    <rect x="22" y="10" width="6"  height="16" fill="#b08830"/>
    <rect x="2"  y="24" width="28" height="2"  fill="#a07828"/>
    <!-- muzzle (lighter patch) -->
    <rect x="10" y="17" width="12" height="7"  fill="#e8b858"/>
    <!-- eyes (closed / drooping lines, bigger) -->
    <rect x="8"  y="14" width="6"  height="2"  fill="#2a1808"/>
    <rect x="18" y="14" width="6"  height="2"  fill="#2a1808"/>
    <rect x="7"  y="13" width="2"  height="1"  fill="#2a1808"/>
    <rect x="23" y="13" width="2"  height="1"  fill="#2a1808"/>
    <!-- tear, big drop -->
    <rect x="9"  y="17" width="2"  height="2"  fill="#80c0f0"/>
    <rect x="9"  y="19" width="2"  height="3"  fill="#a0d0f0"/>
    <rect x="10" y="22" width="1"  height="1"  fill="#80c0f0"/>
    <!-- nose (big pink triangle) -->
    <rect x="14" y="19" width="4"  height="2"  fill="#c05060"/>
    <rect x="15" y="21" width="2"  height="1"  fill="#a04050"/>
    <!-- mouth (frown) -->
    <rect x="12" y="23" width="3"  height="1"  fill="#4a2010"/>
    <rect x="17" y="23" width="3"  height="1"  fill="#4a2010"/>
    <rect x="14" y="22" width="1"  height="1"  fill="#4a2010"/>
    <rect x="17" y="22" width="1"  height="1"  fill="#4a2010"/>
    <!-- whiskers (droopy, longer) -->
    <rect x="0"  y="19" width="8"  height="1"  fill="#f0e0b0"/>
    <rect x="24" y="19" width="8"  height="1"  fill="#f0e0b0"/>
    <rect x="1"  y="21" width="6"  height="1"  fill="#f0e0b0"/>
    <rect x="25" y="21" width="6"  height="1"  fill="#f0e0b0"/>
  </svg>`;
}

// ── Paw print — кот закопал дуриан ───────────────────────────────────────
export function renderPawIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- 4 toes -->
    <rect x="4"  y="8"  width="4"  height="6"  fill="#4a2a10"/>
    <rect x="10" y="4"  width="4"  height="6"  fill="#4a2a10"/>
    <rect x="18" y="4"  width="4"  height="6"  fill="#4a2a10"/>
    <rect x="24" y="8"  width="4"  height="6"  fill="#4a2a10"/>
    <!-- main pad -->
    <rect x="8"  y="16" width="16" height="10" fill="#6a3a18"/>
    <rect x="10" y="14" width="12" height="2"  fill="#6a3a18"/>
    <rect x="6"  y="18" width="20" height="6"  fill="#7a4822"/>
    <!-- hilite -->
    <rect x="10" y="18" width="4"  height="2"  fill="#9a6030"/>
  </svg>`;
}

// ── Tree top — сцена сверху ──────────────────────────────────────────────
export function renderTreeTopIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- leaves (top-down ring) -->
    <rect x="8"  y="4"  width="16" height="4"  fill="#2e6020"/>
    <rect x="4"  y="8"  width="24" height="4"  fill="#3a7028"/>
    <rect x="2"  y="12" width="28" height="8"  fill="#4a8030"/>
    <rect x="4"  y="20" width="24" height="4"  fill="#3a7028"/>
    <rect x="8"  y="24" width="16" height="4"  fill="#2e6020"/>
    <!-- lighter highlights -->
    <rect x="6"  y="10" width="4"  height="4"  fill="#5a9838"/>
    <rect x="20" y="14" width="4"  height="4"  fill="#5a9838"/>
    <!-- center dark (trunk hollow) -->
    <rect x="12" y="12" width="8"  height="8"  fill="#1a3410"/>
    <rect x="14" y="14" width="4"  height="4"  fill="#0a1408"/>
  </svg>`;
}

// ── Door — вошёл внутрь дерева ───────────────────────────────────────────
export function renderDoorIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- frame (tree bark) -->
    <rect x="4"  y="2"  width="24" height="28" fill="#6a4818"/>
    <!-- door -->
    <rect x="8"  y="4"  width="16" height="2"  fill="#3a2810"/>
    <rect x="6"  y="6"  width="20" height="24" fill="#4a3014"/>
    <rect x="8"  y="8"  width="16" height="20" fill="#2a1a08"/>
    <!-- hint of light from inside -->
    <rect x="12" y="10" width="8"  height="8"  fill="#ffb040" opacity="0.4"/>
    <rect x="14" y="12" width="4"  height="4"  fill="#ffe080" opacity="0.6"/>
    <!-- handle -->
    <rect x="20" y="18" width="2"  height="3"  fill="#c8a040"/>
    <!-- wood grain -->
    <rect x="10" y="22" width="12" height="1"  fill="#1a1008"/>
    <rect x="10" y="25" width="12" height="1"  fill="#1a1008"/>
  </svg>`;
}

// ── Flame — огненный цветок собран ───────────────────────────────────────
export function renderFlameIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- outer glow -->
    <rect x="10" y="4"  width="12" height="4"  fill="#ff8820" opacity="0.4"/>
    <rect x="6"  y="6"  width="20" height="4"  fill="#ff8820" opacity="0.3"/>
    <!-- flame -->
    <rect x="12" y="6"  width="8"  height="4"  fill="#ffaa00"/>
    <rect x="10" y="10" width="12" height="6"  fill="#ff7700"/>
    <rect x="8"  y="16" width="16" height="6"  fill="#ff5500"/>
    <rect x="10" y="22" width="12" height="4"  fill="#d02000"/>
    <rect x="12" y="26" width="8"  height="2"  fill="#800000"/>
    <!-- inner hot core -->
    <rect x="13" y="12" width="6"  height="6"  fill="#ffe060"/>
    <rect x="14" y="14" width="4"  height="4"  fill="#ffffff"/>
    <rect x="15" y="20" width="2"  height="3"  fill="#ffe060"/>
  </svg>`;
}

// ── Heart — сцена внутри (сердце-огонь) ──────────────────────────────────
export function renderHeartIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="6"  y="8"  width="8"  height="6"  fill="#d02030"/>
    <rect x="18" y="8"  width="8"  height="6"  fill="#d02030"/>
    <rect x="4"  y="10" width="24" height="8"  fill="#d02030"/>
    <rect x="6"  y="18" width="20" height="4"  fill="#b01828"/>
    <rect x="10" y="22" width="12" height="3"  fill="#801020"/>
    <rect x="14" y="25" width="4"  height="3"  fill="#500818"/>
    <!-- hilites -->
    <rect x="8"  y="10" width="4"  height="2"  fill="#f05060"/>
    <rect x="22" y="10" width="2"  height="2"  fill="#f05060"/>
    <!-- inner flame hint -->
    <rect x="13" y="12" width="6"  height="4"  fill="#ffe060" opacity="0.55"/>
    <rect x="14" y="14" width="4"  height="2"  fill="#fffcc0" opacity="0.75"/>
  </svg>`;
}

// ── Moon — провёл много времени в медитации / ночной игрок ───────────────
export function renderMoonIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="10" y="4"  width="12" height="2"  fill="#e8e0c0"/>
    <rect x="6"  y="6"  width="18" height="4"  fill="#e8e0c0"/>
    <rect x="4"  y="10" width="20" height="14" fill="#e8e0c0"/>
    <rect x="6"  y="24" width="18" height="4"  fill="#e8e0c0"/>
    <rect x="10" y="28" width="12" height="2"  fill="#e8e0c0"/>
    <!-- crescent shadow -->
    <rect x="14" y="8"  width="14" height="2"  fill="#1a1830"/>
    <rect x="12" y="10" width="18" height="14" fill="#1a1830"/>
    <rect x="14" y="24" width="14" height="2"  fill="#1a1830"/>
    <!-- craters -->
    <rect x="6"  y="12" width="2"  height="2"  fill="#b0a888"/>
    <rect x="8"  y="18" width="3"  height="2"  fill="#b0a888"/>
    <!-- star -->
    <rect x="26" y="4"  width="2"  height="2"  fill="#ffe060"/>
  </svg>`;
}

// ── Cycle — вернулся на главную много раз (колесо) ───────────────────────
export function renderCycleIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- outer ring -->
    <rect x="8"  y="2"  width="16" height="4"  fill="#c89040"/>
    <rect x="4"  y="6"  width="24" height="2"  fill="#c89040"/>
    <rect x="2"  y="8"  width="4"  height="16" fill="#c89040"/>
    <rect x="26" y="8"  width="4"  height="16" fill="#c89040"/>
    <rect x="4"  y="24" width="24" height="2"  fill="#c89040"/>
    <rect x="8"  y="26" width="16" height="4"  fill="#c89040"/>
    <!-- inner dark -->
    <rect x="8"  y="8"  width="16" height="16" fill="#2a1a08"/>
    <!-- spokes -->
    <rect x="14" y="8"  width="4"  height="16" fill="#c89040"/>
    <rect x="8"  y="14" width="16" height="4"  fill="#c89040"/>
    <!-- hub -->
    <rect x="12" y="12" width="8"  height="8"  fill="#ffe060"/>
    <rect x="14" y="14" width="4"  height="4"  fill="#fff4a0"/>
  </svg>`;
}

// ── Leaf — природный (много зон леса) ────────────────────────────────────
export function renderLeafIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="14" y="4"  width="4"  height="4"  fill="#3a7028"/>
    <rect x="10" y="8"  width="12" height="4"  fill="#4a8030"/>
    <rect x="6"  y="12" width="20" height="6"  fill="#5a9838"/>
    <rect x="8"  y="18" width="16" height="4"  fill="#4a8030"/>
    <rect x="12" y="22" width="8"  height="2"  fill="#3a7028"/>
    <!-- vein -->
    <rect x="15" y="6"  width="2"  height="18" fill="#2a5018"/>
    <rect x="11" y="12" width="4"  height="1"  fill="#2a5018"/>
    <rect x="17" y="12" width="4"  height="1"  fill="#2a5018"/>
    <rect x="9"  y="15" width="6"  height="1"  fill="#2a5018"/>
    <rect x="17" y="15" width="6"  height="1"  fill="#2a5018"/>
    <!-- stem -->
    <rect x="15" y="24" width="2"  height="4"  fill="#6a4018"/>
    <!-- highlights -->
    <rect x="8"  y="13" width="3"  height="2"  fill="#7ab050"/>
  </svg>`;
}

// ── Hourglass — нетерпеливый. Простой, читаемый силуэт. ──────────────────
export function renderHourglassIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- top wooden cap -->
    <rect x="4"  y="2"  width="24" height="4"  fill="#8a5028"/>
    <rect x="6"  y="6"  width="20" height="2"  fill="#6a3818"/>
    <!-- bottom wooden cap -->
    <rect x="6"  y="24" width="20" height="2"  fill="#6a3818"/>
    <rect x="4"  y="26" width="24" height="4"  fill="#8a5028"/>
    <!-- hourglass silhouette — solid "sand" + glass -->
    <rect x="8"  y="8"  width="16" height="2"  fill="#4a2810"/>
    <rect x="8"  y="22" width="16" height="2"  fill="#4a2810"/>
    <!-- upper chamber (full sand top, amber) -->
    <rect x="9"  y="10" width="14" height="4"  fill="#f0c848"/>
    <rect x="11" y="14" width="10" height="2"  fill="#e8b030"/>
    <rect x="13" y="16" width="6"  height="1"  fill="#e8b030"/>
    <!-- narrow neck (sand trickle) -->
    <rect x="15" y="15" width="2"  height="4"  fill="#e8b030"/>
    <!-- lower chamber (pile of sand, heavier on bottom) -->
    <rect x="13" y="18" width="6"  height="2"  fill="#e8b030"/>
    <rect x="11" y="20" width="10" height="2"  fill="#e8b030"/>
    <rect x="9"  y="22" width="14" height="1"  fill="#e8b030"/>
    <!-- glass frame (wraps around sand) -->
    <rect x="8"  y="10" width="1"  height="12" fill="#c0a060" opacity="0.7"/>
    <rect x="23" y="10" width="1"  height="12" fill="#c0a060" opacity="0.7"/>
    <!-- highlights on glass (left side) -->
    <rect x="9"  y="11" width="1"  height="3"  fill="#fff0b0" opacity="0.5"/>
    <rect x="9"  y="20" width="1"  height="2"  fill="#fff0b0" opacity="0.5"/>
  </svg>`;
}

// ── Toggle — сомневающийся (галочка + крестик) ───────────────────────────
export function renderToggleIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- green check -->
    <rect x="4"  y="12" width="3"  height="3"  fill="#4a9030"/>
    <rect x="7"  y="15" width="3"  height="3"  fill="#4a9030"/>
    <rect x="10" y="18" width="3"  height="3"  fill="#4a9030"/>
    <rect x="13" y="15" width="3"  height="3"  fill="#4a9030"/>
    <rect x="16" y="12" width="3"  height="3"  fill="#4a9030"/>
    <rect x="19" y="9"  width="3"  height="3"  fill="#4a9030"/>
    <!-- red cross over it -->
    <rect x="20" y="16" width="2"  height="2"  fill="#c02020"/>
    <rect x="22" y="18" width="2"  height="2"  fill="#c02020"/>
    <rect x="24" y="20" width="2"  height="2"  fill="#c02020"/>
    <rect x="26" y="22" width="2"  height="2"  fill="#c02020"/>
    <rect x="26" y="16" width="2"  height="2"  fill="#c02020"/>
    <rect x="24" y="18" width="2"  height="2"  fill="#c02020"/>
    <rect x="22" y="20" width="2"  height="2"  fill="#c02020"/>
    <rect x="20" y="22" width="2"  height="2"  fill="#c02020"/>
  </svg>`;
}

// ── Alchemy fail — треснувшая колба ──────────────────────────────────────
export function renderAlchemyFailIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- neck -->
    <rect x="13" y="4"  width="6"  height="2"  fill="#6a7888"/>
    <rect x="13" y="6"  width="6"  height="8"  fill="#8a98a8" opacity="0.5"/>
    <!-- flask body -->
    <rect x="8"  y="14" width="16" height="14" fill="#8a98a8" opacity="0.5"/>
    <rect x="6"  y="16" width="20" height="12" fill="#8a98a8" opacity="0.4"/>
    <rect x="8"  y="28" width="16" height="2"  fill="#6a7888"/>
    <!-- murky goo -->
    <rect x="8"  y="22" width="16" height="6"  fill="#507040"/>
    <rect x="8"  y="21" width="16" height="1"  fill="#709050"/>
    <!-- crack -->
    <rect x="14" y="15" width="1"  height="3"  fill="#2a2a2a"/>
    <rect x="15" y="18" width="1"  height="2"  fill="#2a2a2a"/>
    <rect x="14" y="20" width="1"  height="2"  fill="#2a2a2a"/>
    <rect x="16" y="16" width="1"  height="2"  fill="#2a2a2a"/>
    <!-- sad bubble -->
    <rect x="18" y="24" width="2"  height="2"  fill="#80a070"/>
  </svg>`;
}

// ── Fizz — огонь + вода = пшик ───────────────────────────────────────────
export function renderFizzIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- steam -->
    <rect x="8"  y="4"  width="4"  height="2"  fill="#c0d0e0" opacity="0.6"/>
    <rect x="14" y="2"  width="4"  height="2"  fill="#c0d0e0" opacity="0.7"/>
    <rect x="20" y="4"  width="4"  height="2"  fill="#c0d0e0" opacity="0.6"/>
    <rect x="10" y="6"  width="3"  height="2"  fill="#d0e0f0" opacity="0.5"/>
    <rect x="19" y="6"  width="3"  height="2"  fill="#d0e0f0" opacity="0.5"/>
    <!-- dying flame -->
    <rect x="12" y="10" width="8"  height="4"  fill="#c04020"/>
    <rect x="14" y="14" width="4"  height="3"  fill="#804010"/>
    <!-- drop falling -->
    <rect x="15" y="7"  width="2"  height="2"  fill="#5090d0"/>
    <!-- puddle -->
    <rect x="6"  y="22" width="20" height="3"  fill="#4880b0"/>
    <rect x="4"  y="25" width="24" height="2"  fill="#3a6ea0"/>
    <!-- splashes -->
    <rect x="2"  y="20" width="2"  height="2"  fill="#5090d0" opacity="0.7"/>
    <rect x="28" y="20" width="2"  height="2"  fill="#5090d0" opacity="0.7"/>
  </svg>`;
}

// ── Splash — разбрызгиватель воды ────────────────────────────────────────
export function renderSplashIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- central puddle -->
    <rect x="10" y="18" width="12" height="4"  fill="#3a6ea0"/>
    <rect x="8"  y="20" width="16" height="4"  fill="#2a5080"/>
    <rect x="12" y="24" width="8"  height="2"  fill="#184880"/>
    <!-- droplets flying out -->
    <rect x="2"  y="12" width="3"  height="3"  fill="#5090d0"/>
    <rect x="27" y="12" width="3"  height="3"  fill="#5090d0"/>
    <rect x="6"  y="6"  width="2"  height="2"  fill="#80c0f0"/>
    <rect x="24" y="6"  width="2"  height="2"  fill="#80c0f0"/>
    <rect x="14" y="4"  width="4"  height="3"  fill="#80c0f0"/>
    <rect x="4"  y="20" width="2"  height="2"  fill="#5090d0"/>
    <rect x="26" y="20" width="2"  height="2"  fill="#5090d0"/>
    <!-- highlight -->
    <rect x="14" y="18" width="4"  height="1"  fill="#a0d0f0"/>
  </svg>`;
}

// ── Stick drink — палка и капля ──────────────────────────────────────────
export function renderStickDrinkIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- stick diagonal -->
    <rect x="6"  y="20" width="3"  height="3"  fill="#8B6914"/>
    <rect x="9"  y="17" width="3"  height="3"  fill="#8B6914"/>
    <rect x="12" y="14" width="3"  height="3"  fill="#a07820"/>
    <rect x="15" y="11" width="3"  height="3"  fill="#8B6914"/>
    <rect x="18" y="8"  width="3"  height="3"  fill="#8B6914"/>
    <rect x="21" y="5"  width="3"  height="3"  fill="#6b4a00"/>
    <!-- drop above tip -->
    <rect x="23" y="16" width="3"  height="2"  fill="#80c0f0"/>
    <rect x="22" y="18" width="5"  height="4"  fill="#3a6ea0"/>
    <rect x="24" y="22" width="2"  height="2"  fill="#184880"/>
    <!-- '?' above stick -->
    <rect x="4"  y="4"  width="3"  height="2"  fill="#b0b0b0"/>
    <rect x="6"  y="6"  width="2"  height="2"  fill="#b0b0b0"/>
    <rect x="5"  y="10" width="2"  height="1"  fill="#b0b0b0"/>
  </svg>`;
}

// ── Durian gift — дуриан с бантом ────────────────────────────────────────
export function renderDurianGiftIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- bow on top -->
    <rect x="10" y="4"  width="5"  height="4"  fill="#c02040"/>
    <rect x="17" y="4"  width="5"  height="4"  fill="#c02040"/>
    <rect x="14" y="6"  width="4"  height="3"  fill="#e04060"/>
    <rect x="11" y="5"  width="2"  height="2"  fill="#f06080"/>
    <!-- durian body -->
    <rect x="8"  y="12" width="16" height="14" fill="#8ea04a"/>
    <rect x="10" y="10" width="12" height="2"  fill="#7a9038"/>
    <rect x="6"  y="14" width="2"  height="10" fill="#7a9038"/>
    <rect x="24" y="14" width="2"  height="10" fill="#7a9038"/>
    <rect x="10" y="26" width="12" height="2"  fill="#607828"/>
    <!-- spikes -->
    <rect x="10" y="14" width="2"  height="2"  fill="#5a6e18"/>
    <rect x="14" y="12" width="2"  height="2"  fill="#5a6e18"/>
    <rect x="18" y="14" width="2"  height="2"  fill="#5a6e18"/>
    <rect x="20" y="18" width="2"  height="2"  fill="#5a6e18"/>
    <rect x="14" y="20" width="2"  height="2"  fill="#5a6e18"/>
    <rect x="10" y="22" width="2"  height="2"  fill="#5a6e18"/>
    <!-- highlight -->
    <rect x="11" y="15" width="3"  height="2"  fill="#a8be5a"/>
  </svg>`;
}

// ── Cat sit — медитация на коте ──────────────────────────────────────────
// Приплюснутый кот + мини-лотос сверху (намёк на задницу монаха).
export function renderCatSitIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- monk sitting on top (lotus pose, bigger, clearer) -->
    <rect x="12" y="0"  width="8"  height="3"  fill="#c0304a"/>
    <rect x="10" y="3"  width="12" height="3"  fill="#d04060"/>
    <rect x="14" y="6"  width="4"  height="2"  fill="#f0e0a0"/>
    <rect x="8"  y="8"  width="16" height="2"  fill="#c0304a"/>
    <!-- pressure shock lines -->
    <rect x="2"  y="10" width="4"  height="1"  fill="#808080"/>
    <rect x="26" y="10" width="4"  height="1"  fill="#808080"/>
    <rect x="4"  y="12" width="2"  height="1"  fill="#808080"/>
    <rect x="26" y="12" width="2"  height="1"  fill="#808080"/>
    <!-- squashed cat: flattened pancake body filling canvas width -->
    <rect x="4"  y="14" width="24" height="10" fill="#d8a040"/>
    <rect x="2"  y="16" width="28" height="8"  fill="#d8a040"/>
    <!-- bottom shading (isometric) -->
    <rect x="2"  y="22" width="28" height="2"  fill="#a07828"/>
    <!-- squashed ears poking sides -->
    <rect x="0"  y="14" width="4"  height="4"  fill="#d8a040"/>
    <rect x="28" y="14" width="4"  height="4"  fill="#d8a040"/>
    <!-- eyes (X_X big, visible) -->
    <rect x="8"  y="17" width="1"  height="3"  fill="#2a1808"/>
    <rect x="10" y="17" width="1"  height="3"  fill="#2a1808"/>
    <rect x="9"  y="18" width="1"  height="1"  fill="#2a1808"/>
    <rect x="21" y="17" width="1"  height="3"  fill="#2a1808"/>
    <rect x="23" y="17" width="1"  height="3"  fill="#2a1808"/>
    <rect x="22" y="18" width="1"  height="1"  fill="#2a1808"/>
    <!-- mouth (grimace O) -->
    <rect x="14" y="20" width="4"  height="2"  fill="#4a2010"/>
    <rect x="15" y="19" width="2"  height="1"  fill="#4a2010"/>
    <!-- paws splayed out -->
    <rect x="3"  y="23" width="4"  height="3"  fill="#c09030"/>
    <rect x="25" y="23" width="4"  height="3"  fill="#c09030"/>
    <!-- tail flicking -->
    <rect x="28" y="19" width="4"  height="2"  fill="#d8a040"/>
    <rect x="30" y="16" width="2"  height="3"  fill="#d8a040"/>
    <!-- ground shadow (stretched wide) -->
    <rect x="2"  y="28" width="28" height="2"  fill="#1a1a1a" opacity="0.5"/>
    <rect x="4"  y="30" width="24" height="1"  fill="#1a1a1a" opacity="0.3"/>
  </svg>`;
}

// ── Durian drop — дуриан с траекторией падения на голову ────────────────
export function renderDurianDropIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- motion trail (падает сверху) -->
    <rect x="14" y="2"  width="4"  height="1"  fill="#8ea04a" opacity="0.3"/>
    <rect x="14" y="4"  width="4"  height="1"  fill="#8ea04a" opacity="0.5"/>
    <rect x="14" y="6"  width="4"  height="1"  fill="#8ea04a" opacity="0.7"/>
    <!-- durian (летящий) -->
    <rect x="10" y="8"  width="12" height="10" fill="#8ea04a"/>
    <rect x="12" y="7"  width="8"  height="1"  fill="#7a9038"/>
    <rect x="8"  y="10" width="2"  height="6"  fill="#7a9038"/>
    <rect x="22" y="10" width="2"  height="6"  fill="#7a9038"/>
    <rect x="12" y="18" width="8"  height="1"  fill="#607828"/>
    <!-- spikes -->
    <rect x="10" y="10" width="2"  height="2"  fill="#5a6e18"/>
    <rect x="14" y="9"  width="2"  height="2"  fill="#5a6e18"/>
    <rect x="18" y="11" width="2"  height="2"  fill="#5a6e18"/>
    <rect x="14" y="15" width="2"  height="2"  fill="#5a6e18"/>
    <!-- monk head target (red dome внизу) -->
    <rect x="12" y="22" width="8"  height="4"  fill="#c02040"/>
    <rect x="10" y="24" width="12" height="4"  fill="#c02040"/>
    <rect x="8"  y="26" width="16" height="2"  fill="#8a1830"/>
    <!-- impact stars -->
    <rect x="6"  y="20" width="2"  height="2"  fill="#ffe060"/>
    <rect x="24" y="20" width="2"  height="2"  fill="#ffe060"/>
    <rect x="4"  y="22" width="1"  height="1"  fill="#ffe060"/>
    <rect x="27" y="22" width="1"  height="1"  fill="#ffe060"/>
  </svg>`;
}

// ── Achievement icon dispatch (id → function) ────────────────────────────

// ── Achievement icon dispatch (id → function) ────────────────────────────
// Хелпер для ачивок — сопоставляет id ачивки с функцией рендера.
const ACH_ICON_MAP = {
  eye:          renderEyeIcon,
  compass:      renderCompassIcon,
  void:         renderVoidIcon,
  question:     renderQuestionIcon,
  lotus:        () => renderLotusIcon(false),
  lotusBr:      () => renderLotusIcon(true),
  hand:         renderHandIcon,
  pouch:        renderPouchIcon,
  rune:         () => renderRuneIcon(false),
  runeBr:       () => renderRuneIcon(true),
  stone:        () => renderStoneIcon(false),
  stoneLit:     () => renderStoneIcon(true),
  speech:       renderSpeechIcon,
  flower:       renderFlowerMiniIcon,
  firefly:      renderFireflyIcon,
  release:      renderReleaseIcon,
  jarGlow:      renderJarGlowIcon,
  drop:         renderDropIcon,
  catSad:       renderCatSadIcon,
  paw:          renderPawIcon,
  treeTop:      renderTreeTopIcon,
  door:         renderDoorIcon,
  flame:        renderFlameIcon,
  heart:        renderHeartIcon,
  moon:         renderMoonIcon,
  cycle:        renderCycleIcon,
  leaf:         renderLeafIcon,
  // new off-script icons
  hourglass:    renderHourglassIcon,
  toggle:       renderToggleIcon,
  alchemyFail:  renderAlchemyFailIcon,
  fizz:         renderFizzIcon,
  splash:       renderSplashIcon,
  stickDrink:   renderStickDrinkIcon,
  durianGift:   renderDurianGiftIcon,
  catSit:       renderCatSitIcon,
  durianDrop:   renderDurianDropIcon,
  jar:          () => renderJarIcon({ id:'jar' }),
  shelf:        renderShelfIcon,
};

export function renderAchIconByKey(key) {
  const fn = ACH_ICON_MAP[key];
  return fn ? fn() : renderQuestionIcon();
}
