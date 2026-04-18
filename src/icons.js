// src/icons.js — все SVG pixel-art иконки предметов
// Правила: только <rect>, никаких <path>/<circle>/<polygon>
// Палитра: тёмные тона + один яркий акцент
// Шаблон: viewBox="0 0 48 48", style="image-rendering:pixelated"

// ── Stick / Glowstick ──────────────────────────────────────────────────────
// Glowstick: только верхняя треть светится жёлтым, остальное — обычное дерево
export function renderStickIcon(glowing = false) {
  // Base colours (always brown shaft)
  const shaft  = '#8B6914';
  const shadow = '#5a3e00';
  const knot1  = '#a07820';
  const knot2  = '#6b4a00';

  // Top-tip glow colours (only first ~3 rects when glowing)
  const tip    = glowing ? '#ffe860' : shaft;
  const tipDk  = glowing ? '#ffcc20' : shadow;
  const tipLt  = glowing ? '#fff4a0' : knot1;

  return `<svg width="48" height="48" viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    ${glowing ? `
    <!-- glow aura only around top tip -->
    <rect x="4"  y="4"  width="6" height="6" fill="#ffe860" opacity="0.45"/>
    <rect x="6"  y="2"  width="4" height="4" fill="#fff4a0" opacity="0.3"/>
    <rect x="2"  y="6"  width="4" height="4" fill="#ffe860" opacity="0.25"/>
    ` : ''}
    <!-- top tip — glowing yellow when glowstick -->
    <rect x="8"  y="8"  width="4" height="4"  fill="${tip}"/>
    <rect x="10" y="10" width="4" height="4"  fill="${tip}"/>
    <rect x="12" y="12" width="4" height="4"  fill="${tipDk}"/>
    <!-- transition: blend yellow→brown -->
    <rect x="14" y="14" width="4" height="4"  fill="${glowing ? '#c09030' : shadow}"/>
    <!-- rest of shaft: normal brown -->
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
    <!-- tips -->
    <rect x="6"  y="8"  width="4" height="2"  fill="${tipLt}"/>
    <rect x="38" y="38" width="4" height="2"  fill="${shadow}"/>
  </svg>`;
}

// ── Jar (closed) / Jar open ────────────────────────────────────────────────
// Позиции точек-светлячков внутри банки (до 9, индекс = caught-1)
const _JAR_FLY_DOTS = [
  [22,22],[28,26],[18,30],
  [26,20],[20,24],[30,28],
  [24,32],[16,22],[32,22],
];

export function renderJarIcon(item) {
  const open     = item?.id === 'jar_open';
  const glowing  = item?.glowing;
  const released = item?.released;
  const hasWater = item?.hasWater;
  const caught   = Math.min(item?.caught ?? 0, 9);

  const outline   = '#688090';
  const glass     = '#e8f4f8';
  const waterTint = '#4880b0';

  // Режим: светящаяся жижка (после отпускания светлячков)
  const gooMode = glowing && released;
  // Крышка: скрыта если открытая банка или gooMode
  const showCap = !open && !gooMode;

  // Точки светлячков (только когда пойманы, но не released)
  const flyDots = (!gooMode && caught > 0)
    ? _JAR_FLY_DOTS.slice(0, caught).map(([x,y]) =>
        `<rect x="${x}" y="${y}" width="2" height="2" fill="#88cc44"/>`).join('')
    : '';

  if (gooMode) {
    // Банка с жижей — чёткий пиксельный силуэт, тёплое свечение,
    // густая желеобразная субстанция внутри с пузырьками и бликами.
    return `<svg width="48" height="48" viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
      <!-- внешнее тёплое свечение -->
      <rect x="6"  y="8"  width="36" height="34" fill="#ffcc20" opacity="0.10">
        <animate attributeName="opacity" values="0.08;0.22;0.08" dur="1.8s" repeatCount="indefinite"/>
      </rect>
      <rect x="10" y="10" width="28" height="30" fill="#fff0a0" opacity="0.14">
        <animate attributeName="opacity" values="0.06;0.18;0.06" dur="1.2s" begin="0.3s" repeatCount="indefinite"/>
      </rect>

      <!-- горлышко (без крышки) -->
      <rect x="18" y="8"  width="12" height="2" fill="#b8c8d0"/>
      <rect x="17" y="10" width="14" height="2" fill="#8a9aa4"/>
      <rect x="16" y="12" width="16" height="2" fill="#788890"/>

      <!-- силуэт банки: плечи, корпус, дно -->
      <rect x="14" y="14" width="20" height="2" fill="#4a5860"/>
      <rect x="12" y="16" width="24" height="2" fill="#3a4650"/>
      <rect x="11" y="18" width="26" height="18" fill="#2a3036"/>
      <rect x="12" y="36" width="24" height="2" fill="#3a4650"/>
      <rect x="14" y="38" width="20" height="2" fill="#4a5860"/>

      <!-- жижа: плотная, занимает почти весь корпус, скруглённый верхний мениск -->
      <rect x="13" y="20" width="22" height="2" fill="#d49010"/>
      <rect x="12" y="22" width="24" height="14" fill="#e8a820">
        <animate attributeName="fill" values="#e8a820;#f0b828;#e8a820" dur="1.2s" repeatCount="indefinite"/>
      </rect>
      <!-- верхний тёплый слой жижи -->
      <rect x="12" y="22" width="24" height="3" fill="#ffd840">
        <animate attributeName="opacity" values="0.75;1.0;0.75" dur="1.0s" repeatCount="indefinite"/>
      </rect>
      <!-- яркая сердцевина света -->
      <rect x="18" y="26" width="12" height="6" fill="#fff0a0">
        <animate attributeName="opacity" values="0.55;0.95;0.55" dur="0.9s" repeatCount="indefinite"/>
      </rect>
      <rect x="20" y="28" width="8"  height="3" fill="#ffffff">
        <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.7s" begin="0.15s" repeatCount="indefinite"/>
      </rect>

      <!-- пузырьки поднимаются -->
      <rect x="16" y="32" width="2" height="2" fill="#fff8c0">
        <animate attributeName="y" values="34;22;22" dur="2.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.9;0.9;0" dur="2.2s" repeatCount="indefinite"/>
      </rect>
      <rect x="30" y="32" width="2" height="2" fill="#fff8c0">
        <animate attributeName="y" values="34;22;22" dur="2.6s" begin="0.7s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.9;0.9;0" dur="2.6s" begin="0.7s" repeatCount="indefinite"/>
      </rect>
      <rect x="24" y="30" width="2" height="2" fill="#ffffff">
        <animate attributeName="y" values="34;20;20" dur="1.8s" begin="1.1s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.9;0.9;0" dur="1.8s" begin="1.1s" repeatCount="indefinite"/>
      </rect>

      <!-- блик стекла слева -->
      <rect x="13" y="19" width="2" height="10" fill="#ffffff" opacity="0.22"/>
      <rect x="14" y="19" width="1" height="14" fill="#ffffff" opacity="0.12"/>
      <!-- мягкая тень справа -->
      <rect x="33" y="20" width="2" height="14" fill="#09080e" opacity="0.25"/>
    </svg>`;
  }

  return `<svg width="48" height="48" viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- крышка -->
    ${showCap ? `
    <rect x="16" y="6"  width="16" height="4" fill="#d4a840"/>
    <rect x="14" y="8"  width="20" height="2" fill="#8a6010"/>
    ` : ''}
    <!-- горлышко -->
    <rect x="18" y="10" width="12" height="4" fill="${outline}" opacity="0.4"/>
    <!-- корпус — очень лёгкий -->
    <rect x="11" y="14" width="26" height="24" fill="${outline}" opacity="0.22"/>
    <rect x="9"  y="16" width="30" height="20" fill="${outline}" opacity="0.14"/>
    <!-- стекло — почти прозрачное -->
    <rect x="12" y="14" width="24" height="22" fill="${glass}" opacity="0.08"/>
    <rect x="10" y="16" width="28" height="18" fill="${glass}" opacity="0.06"/>
    <!-- вода -->
    ${hasWater ? `
    <rect x="12" y="26" width="24" height="10" fill="${waterTint}" opacity="0.40"/>
    <rect x="10" y="28" width="28" height="8"  fill="${waterTint}" opacity="0.25"/>` : ''}
    <!-- блик стекла -->
    <rect x="14" y="16" width="3" height="10" fill="#ffffff" opacity="0.12"/>
    <!-- точки светлячков -->
    ${flyDots}
    <!-- нижний ободок -->
    <rect x="12" y="36" width="24" height="3" fill="${outline}" opacity="0.3"/>
  </svg>`;
}

// ── Dirt ───────────────────────────────────────────────────────────────────
export function renderDirtIcon() {
  return `<svg width="48" height="48" viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- куча земли — основание -->
    <rect x="16" y="22" width="16" height="2"  fill="#6b3a1f"/>
    <rect x="10" y="24" width="28" height="4"  fill="#7a4422"/>
    <rect x="8"  y="28" width="32" height="4"  fill="#8b5428"/>
    <rect x="10" y="32" width="28" height="3"  fill="#7a4422"/>
    <rect x="14" y="35" width="20" height="2"  fill="#6b3a1f"/>
    <rect x="18" y="37" width="12" height="2"  fill="#4a2010"/>
    <!-- текстура земли — тёмные крупинки -->
    <rect x="14" y="26" width="2"  height="2"  fill="#4a2010"/>
    <rect x="20" y="30" width="2"  height="2"  fill="#4a2010"/>
    <rect x="32" y="28" width="2"  height="2"  fill="#5a2e14"/>
    <rect x="26" y="33" width="2"  height="2"  fill="#4a2010"/>
    <!-- верхний блик кучи -->
    <rect x="20" y="24" width="8"  height="2"  fill="#9a6030"/>

    <!-- палочка 1: наискосок слева направо -->
    <rect x="8"  y="22" width="2"  height="2"  fill="#7a5020"/>
    <rect x="10" y="24" width="2"  height="2"  fill="#7a5020"/>
    <rect x="12" y="26" width="2"  height="2"  fill="#6b4518"/>
    <rect x="14" y="28" width="2"  height="2"  fill="#7a5020"/>
    <rect x="16" y="30" width="2"  height="2"  fill="#8a6028"/>
    <rect x="18" y="32" width="2"  height="2"  fill="#7a5020"/>
    <!-- сучок -->
    <rect x="13" y="25" width="2"  height="2"  fill="#5a3810"/>

    <!-- палочка 2: более горизонтальная, пересекается -->
    <rect x="28" y="22" width="2"  height="2"  fill="#8a6028"/>
    <rect x="30" y="24" width="2"  height="2"  fill="#7a5020"/>
    <rect x="32" y="24" width="2"  height="2"  fill="#8a6028"/>
    <rect x="34" y="26" width="2"  height="2"  fill="#7a5020"/>
    <rect x="36" y="26" width="2"  height="2"  fill="#6b4518"/>
    <rect x="38" y="28" width="2"  height="2"  fill="#7a5020"/>

    <!-- листок 1: трёхлопастный, левее центра -->
    <rect x="18" y="14" width="2"  height="2"  fill="#2e5a10"/>  <!-- черешок -->
    <rect x="18" y="16" width="2"  height="4"  fill="#3a6e18"/>
    <rect x="14" y="16" width="4"  height="2"  fill="#4a7a22"/>  <!-- левая лопасть -->
    <rect x="12" y="18" width="4"  height="2"  fill="#3a6e18"/>
    <rect x="20" y="16" width="4"  height="2"  fill="#4a8020"/>  <!-- правая лопасть -->
    <rect x="22" y="18" width="4"  height="2"  fill="#3a6e18"/>
    <!-- прожилка -->
    <rect x="18" y="18" width="2"  height="2"  fill="#2a5410"/>

    <!-- листок 2: маленький, правее -->
    <rect x="32" y="18" width="2"  height="4"  fill="#2e5a10"/>  <!-- черешок -->
    <rect x="30" y="18" width="4"  height="2"  fill="#4a7a22"/>
    <rect x="34" y="20" width="4"  height="2"  fill="#3a6e18"/>

    <!-- камушек 1: серо-голубой, слева внизу -->
    <rect x="10" y="32" width="4"  height="2"  fill="#707888"/>
    <rect x="8"  y="34" width="6"  height="2"  fill="#828898"/>
    <rect x="10" y="36" width="4"  height="2"  fill="#606070"/>
    <!-- блик камушка -->
    <rect x="10" y="32" width="2"  height="2"  fill="#9098a8"/>

    <!-- камушек 2: светлее, справа -->
    <rect x="36" y="31" width="4"  height="2"  fill="#7a8898"/>
    <rect x="34" y="33" width="6"  height="2"  fill="#8a98a8"/>
    <rect x="36" y="35" width="4"  height="2"  fill="#686878"/>
    <!-- блик -->
    <rect x="36" y="31" width="2"  height="2"  fill="#98a8b8"/>
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

// ── Flower from inside_heart.png — round bloom with 4 rosette petals + warm core
export function renderFlowerIcon() {
  // Крестообразный цветок с круглыми лепестками (N/E/S/W),
  // мягкими диагональными долями и тёплым оранжево-жёлтым центром.
  // НЕ роза — просто округлая роза́тка с ярким ядром.
  return `<svg width="48" height="48" viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- stem + leaves -->
    <rect x="22" y="38" width="4"  height="8"  fill="#2a6620"/>
    <rect x="10" y="40" width="12" height="4"  fill="#2a6620"/>
    <rect x="26" y="41" width="12" height="4"  fill="#2a6620"/>
    <rect x="12" y="42" width="8"  height="2"  fill="#38741e"/>
    <rect x="28" y="43" width="8"  height="2"  fill="#38741e"/>

    <!-- deep outer shadow ring (dark burgundy) -->
    <rect x="14" y="6"  width="20" height="4"  fill="#4a0810"/>
    <rect x="10" y="10" width="28" height="4"  fill="#4a0810"/>
    <rect x="6"  y="14" width="36" height="20" fill="#4a0810"/>
    <rect x="10" y="34" width="28" height="4"  fill="#4a0810"/>
    <rect x="14" y="38" width="20" height="2"  fill="#4a0810"/>

    <!-- mid ring (deep red — main petal body) -->
    <rect x="14" y="8"  width="20" height="4"  fill="#8a1220"/>
    <rect x="10" y="12" width="28" height="4"  fill="#8a1220"/>
    <rect x="8"  y="16" width="32" height="16" fill="#8a1220"/>
    <rect x="10" y="32" width="28" height="4"  fill="#8a1220"/>
    <rect x="14" y="36" width="20" height="2"  fill="#8a1220"/>

    <!-- 4 outer petal bumps (N / E / S / W) — brighter red lobes -->
    <!-- N -->
    <rect x="18" y="6"  width="12" height="4"  fill="#b01828"/>
    <rect x="20" y="4"  width="8"  height="2"  fill="#b01828"/>
    <!-- S -->
    <rect x="18" y="36" width="12" height="4"  fill="#b01828"/>
    <rect x="20" y="40" width="8"  height="2"  fill="#b01828"/>
    <!-- W -->
    <rect x="6"  y="18" width="4"  height="12" fill="#b01828"/>
    <rect x="4"  y="20" width="2"  height="8"  fill="#b01828"/>
    <!-- E -->
    <rect x="38" y="18" width="4"  height="12" fill="#b01828"/>
    <rect x="42" y="20" width="2"  height="8"  fill="#b01828"/>

    <!-- inner rosette body (bright red, rounded square) -->
    <rect x="14" y="12" width="20" height="24" fill="#c82030"/>
    <rect x="12" y="14" width="24" height="20" fill="#c82030"/>
    <rect x="10" y="16" width="28" height="16" fill="#c82030"/>

    <!-- diagonal petal highlights (4 corners of rosette) -->
    <rect x="14" y="14" width="4"  height="4"  fill="#d83040"/>
    <rect x="30" y="14" width="4"  height="4"  fill="#d83040"/>
    <rect x="14" y="30" width="4"  height="4"  fill="#d83040"/>
    <rect x="30" y="30" width="4"  height="4"  fill="#d83040"/>

    <!-- petal tips — soft pink highlights at cardinal points -->
    <rect x="22" y="10" width="4"  height="2"  fill="#f05060"/>
    <rect x="22" y="36" width="4"  height="2"  fill="#f05060"/>
    <rect x="10" y="22" width="2"  height="4"  fill="#f05060"/>
    <rect x="36" y="22" width="2"  height="4"  fill="#f05060"/>

    <!-- warm glowing core (yellow-orange pistil) -->
    <rect x="20" y="20" width="8"  height="8"  fill="#d84020"/>
    <rect x="21" y="21" width="6"  height="6"  fill="#f07028"/>
    <rect x="22" y="22" width="4"  height="4"  fill="#f8a030"/>
    <rect x="23" y="23" width="2"  height="2"  fill="#fff0a0"/>
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
    case 'flower':     return renderFlowerIcon();
    default:           return null;
  }
}
