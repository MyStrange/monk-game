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

// ── Red hibiscus — simple pixel-art, 5 petals + yellow column
export function renderFlowerIcon() {
  // Минимум деталей: 5 крупных красных лепестков, тёмное ядро,
  // длинный жёлтый тычиночный столбик (характерная черта гибискуса), стебель.
  return `<svg width="48" height="48" viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- stem -->
    <rect x="22" y="38" width="4" height="10" fill="#3a7a2e"/>

    <!-- 5 petals (одноцветная красная заливка) -->
    <rect x="18" y="4"  width="12" height="12" fill="#d02030"/>  <!-- top -->
    <rect x="32" y="10" width="12" height="12" fill="#d02030"/>  <!-- top-right -->
    <rect x="30" y="26" width="12" height="12" fill="#d02030"/>  <!-- bottom-right -->
    <rect x="6"  y="26" width="12" height="12" fill="#d02030"/>  <!-- bottom-left -->
    <rect x="4"  y="10" width="12" height="12" fill="#d02030"/>  <!-- top-left -->

    <!-- Тело цветка, которое соединяет лепестки -->
    <rect x="14" y="12" width="20" height="20" fill="#d02030"/>

    <!-- Блики на каждом лепестке -->
    <rect x="22" y="6"  width="4" height="4" fill="#f05060"/>
    <rect x="36" y="12" width="4" height="4" fill="#f05060"/>
    <rect x="34" y="30" width="4" height="4" fill="#f05060"/>
    <rect x="10" y="30" width="4" height="4" fill="#f05060"/>
    <rect x="8"  y="12" width="4" height="4" fill="#f05060"/>

    <!-- Dark throat -->
    <rect x="20" y="20" width="8" height="8" fill="#4a0818"/>

    <!-- Yellow staminate column — торчит вниз из центра -->
    <rect x="23" y="24" width="2" height="14" fill="#f5c832"/>
    <rect x="22" y="36" width="4" height="2"  fill="#ffe060"/>
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
    <!-- head -->
    <rect x="8"  y="10" width="16" height="12" fill="#d8a040"/>
    <!-- ears -->
    <rect x="6"  y="6"  width="4"  height="6"  fill="#d8a040"/>
    <rect x="22" y="6"  width="4"  height="6"  fill="#d8a040"/>
    <rect x="8"  y="8"  width="2"  height="2"  fill="#a07828"/>
    <rect x="22" y="8"  width="2"  height="2"  fill="#a07828"/>
    <!-- eyes (closed/sad) -->
    <rect x="10" y="14" width="4"  height="2"  fill="#2a1808"/>
    <rect x="18" y="14" width="4"  height="2"  fill="#2a1808"/>
    <!-- tear -->
    <rect x="11" y="17" width="2"  height="2"  fill="#80c0f0"/>
    <rect x="11" y="19" width="2"  height="2"  fill="#a0d0f0"/>
    <!-- nose/mouth frown -->
    <rect x="14" y="17" width="4"  height="2"  fill="#a04040"/>
    <rect x="12" y="19" width="3"  height="1"  fill="#4a2010"/>
    <rect x="17" y="19" width="3"  height="1"  fill="#4a2010"/>
    <!-- droopy whiskers -->
    <rect x="4"  y="18" width="4"  height="1"  fill="#808080"/>
    <rect x="24" y="18" width="4"  height="1"  fill="#808080"/>
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

// ── Hourglass — нетерпеливый ─────────────────────────────────────────────
export function renderHourglassIcon() {
  return `<svg width="32" height="32" viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="6"  y="4"  width="20" height="3"  fill="#c89040"/>
    <rect x="6"  y="25" width="20" height="3"  fill="#c89040"/>
    <rect x="8"  y="7"  width="16" height="2"  fill="#e8b870"/>
    <rect x="8"  y="23" width="16" height="2"  fill="#e8b870"/>
    <!-- top chamber (empty) -->
    <rect x="10" y="9"  width="12" height="2"  fill="#e8c880" opacity="0.3"/>
    <!-- neck -->
    <rect x="14" y="14" width="4"  height="4"  fill="#f0d890"/>
    <!-- bottom chamber (full) -->
    <rect x="10" y="18" width="12" height="2"  fill="#e8c880"/>
    <rect x="8"  y="20" width="16" height="3"  fill="#d8b060"/>
    <!-- glass outline -->
    <rect x="8"  y="9"  width="2"  height="14" fill="#a08858" opacity="0.4"/>
    <rect x="22" y="9"  width="2"  height="14" fill="#a08858" opacity="0.4"/>
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
  jar:          () => renderJarIcon({ id:'jar' }),
};

export function renderAchIconByKey(key) {
  const fn = ACH_ICON_MAP[key];
  return fn ? fn() : renderQuestionIcon();
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
