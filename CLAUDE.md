# CLAUDE.md — Monk Game Rules

> Ветка: `main` | GitHub: https://github.com/MyStrange/monk-game
>
> Параллельные фичи живут в отдельных ветках (например `tutorial`). В `main` льётся только готовое.

---

## ОБЯЗАТЕЛЬНО ПЕРЕД ЛЮБОЙ ПРАВКОЙ

1. При добавлении **сцены** → прочти `scenes/_TEMPLATE.js` целиком
2. При добавлении **предмета**:
   - монах → `src/lives/monk/items.js` + `src/icons/items.js` + `src/zone-msgs.js`
   - панк (туториал) → `src/lives/punk/items.js` + `src/icons/items.js` + `src/zone-msgs.js`
   - новая жизнь → создать `src/lives/<life>/items.js`, записать в `src/inventory.js` спред
3. При добавлении **диалога** → `src/dialogue.js`
4. При добавлении **комбо** → `src/combos.js`

---

## САМОПРОВЕРКА — после каждого изменения кода

Перед коммитом убедись по каждому пункту:

### Оптимизация
- [ ] Нет лишних переменных, дублирующих уже существующие (проверить через `grep` или чтение файла)
- [ ] Нет вызовов функций внутри `animate()` / `requestAnimationFrame`, которые можно вынести наружу
- [ ] Новые массивы/объекты не создаются каждый кадр — инициализированы один раз
- [ ] Системы частиц — через `Particles` из `src/particles.js`, не свой массив
- [ ] Нет локального `_waitImg` — использовать `waitImg` из `src/scene-base.js`
- [ ] Edge-spawn героя — `spawnHeroAtEdge(...)` из `src/hero.js`, не ручной if/else
- [ ] visibilitychange — `onSceneVisible(...)` из `src/scene-input.js`
- [ ] BG_W / BG_H / groundY — из `SCENE_DEFS.<id>`, не хардкод

### Расположение кода
- [ ] UI-сообщения → `src/ui/messages.js` (showMsgIn, showChoiceIn, showCascadeIn)
- [ ] UI-курсор → `src/ui/cursor.js` (setCursor, CURSOR_*)
- [ ] UI-оверлеи → `src/ui/overlays.js` (showLoading, showError, setMeditateBtn)
- [ ] Edge-навигация → `src/edge-nav.js` (edgeNavMode, OPPOSITE_EDGE, …)
- [ ] Иконки предметов → `src/icons/items.js` (новые статичные — через `svgRects`)
- [ ] Иконки ачивок → `src/icons/achievements.js`
- [ ] sitDown / standUp / setMeditating → `src/meditation.js`
- [ ] Палитра символов / overlay / particles медитации → `src/meditation-fx.js`
      (`createMeditationFx` paths, `createDustField`, `drawMeditationOverlay`)
- [ ] Анимационные примитивы (phaseUp/Down, decay, pumpDecay, sinSway) → `src/anims.js`
- [ ] Универсальный hit-test зон → `src/zones.js` (canvasToBG, bgToCanvas, hitZoneBG)
- [ ] Системы частиц → `src/particles.js` (`new Particles()`, spawn/tick/forEach/clear)
- [ ] Animation-loop с guard'ом → `src/anim-loop.js` (`runAnimLoop`)
- [ ] Edge-spawn героя → `src/hero.js` → `spawnHeroAtEdge`, `setHeroTarget`
- [ ] Состояние сцены → `useSceneState('id', defaults)` из `src/save.js`
- [ ] visibilitychange / keysHeld → `src/scene-input.js` (onSceneVisible, createKeysHeld)
- [ ] Image preload в сцене → `waitImg` из `src/scene-base.js`
- [ ] Звук → `src/audio.js`
- [ ] Диалоги/тексты → `src/dialogue.js` (никаких inline-массивов в сценах)
- [ ] Комбо предметов → `src/combos.js`
- [ ] Сообщения зон → `src/zone-msgs.js`
- [ ] Реестр BG_W/BG_H/groundY сцен → `src/scene-defs.js`
- [ ] Регистрация сцены (id, module, edges, assets) → `src/scene-registrations.js`
- [ ] Логика сцены → `scenes/<name>.js`, не в `game.js`
- [ ] `game.js` — только точка входа (imports + init), ничего лишнего

### Конфликты
- [ ] Новый экспорт не конфликтует с именами в других файлах (`grep` по имени функции)
- [ ] Если добавил глобальную переменную в сцене — убедись, что она сбрасывается при `close()`
- [ ] CSS-класс или id не повторяется — проверить через `grep` по `style.css`
- [ ] `window.closeSceneX` присвоен в конце файла сцены

---

## TOKEN BUDGET — что читать для каждой задачи

| Задача | Читать | Не читать |
|---|---|---|
| Новая сцена | `scenes/_TEMPLATE.js` + 1 строка `src/nav.js` | остальное |
| Новый предмет | `src/inventory.js`, `src/icons/items.js`, `src/zone-msgs.js` | сцены, achievements-иконки |
| Новая ачивка | `src/achievements.js`, `src/icons/achievements.js` | items-иконки |
| Диалог/текст | `src/dialogue.js` | — |
| Правка медитации | `src/meditation.js` | main.js |
| UI-сообщение/курсор | `src/ui/messages.js` или `src/ui/cursor.js` | utils.js (старого нет) |
| Предмет × предмет | `src/combos.js` | сцены |
| Предмет × зона | только сам файл сцены | combos.js |
| Звук | `src/audio.js` | — |
| Ачивка | `src/achievements.js` | — |
| Пролог (слайды) | `scenes/prologue.js` + `src/sequence.js` | — |

---

## ЧЕК-ЛИСТ: Добавить новый предмет

### 1. Определение предмета (`ITEM_DEFS` в `src/inventory.js`)
- [ ] `id` — уникальный, snake_case
- [ ] `label` — короткое название (для хотбара)
- [ ] `description` — что игрок видит в контекст-меню (1–2 предл., тон: тихий, ироничный)
- [ ] Нет поля `look` и `icon` — оба удалены, не добавлять

### 2. Где берётся предмет
- [ ] В какой сцене появляется?
- [ ] Какой зоной/действием выдаётся?
- [ ] Нужен ли флаг `xPickedUp` чтобы не выдавать дважды?
- [ ] Через `addItem(makeItem('id', {...}))` — не вручную

### 3. SVG иконка (`src/icons.js`)
- [ ] Написать `renderXIcon()` — только `<rect>` элементы, никаких `<path>/<circle>`
- [ ] Добавить ветку в `renderItemIcon()` (dispatch)
- [ ] Проверить отображение в хотбаре и курсоре

### 4. Флейворные сообщения (`src/zone-msgs.js`)
Для каждой зоны во всех сценах где предмет может быть активным — хотя бы одна строка.
Минимум — главная сцена:

| Зона | Написано? |
|---|---|
| `statue` | |
| `tree` | |
| `cat` | |
| `monk` | |
| `bush` | |
| `water` | |
| `dirt` | |

Сцена 2 (корни):

| Зона | Написано? |
|---|---|
| `rock1` | |
| `rock2` | |
| `rock3` | |
| `bottle` | |

**Правило тона**: минимум 2–3 варианта строки (массив). Не писать «ничего не произошло».

### 5. Комбинации предмет × предмет (`src/combos.js`)

| Существующий предмет | Комбо? | Что происходит |
|---|---|---|
| `stick` | | |
| `glowstick` | | |
| `jar` | | |
| `jar_open` | | |
| `dirt` | | |
| `durian` | | |
| `fireflower` | | |

- Осмысленное комбо → `ITEM_COMBO` с `condition`, `failMsg`, `apply`
- Смешное несочетание → `failMsg` (объясняет почему нет)
- Нет комбо → ничего (вернётся `null` = смена выбора)

### ОБЯЗАТЕЛЬНО: При добавлении нового предмета — перекрёстная проверка
Для КАЖДОГО существующего предмета в игре проверь:
1. **item × item**: есть ли смысл в комбинации с новым предметом? → `ITEM_COMBO`
2. **item × zone**: добавь `failMsg` в `ZONE_MSGS` если новый предмет оказывается рядом
3. **Подсказки при наведении**: если один предмет может взаимодействовать с другим предметом на сцене или зоной — добавь hint через `showMsg` в `mousemove` handler зоны

**Правило подсказки (`hint on hover`):**
Если игрок держит предмет A и наводит на область/предмет B, где A+B имеет смысл:
```js
// В mousemove canvas:
if (item?.id === 'A' && inZoneB && !_hintShownFlag) {
  _hintShownFlag = true;
  showMsg('...');  // тихий намёк, не прямая инструкция
} else if (!inZoneB) {
  _hintShownFlag = false;
}
```
Флаг `_hintShownFlag` — локальная переменная, сбрасывается при выходе из зоны.

---

## ЧЕК-ЛИСТ: Добавить новую сцену

> **Перед написанием → прочти `scenes/_TEMPLATE.js` целиком и скопируй его.**

- [ ] Скопировать `scenes/_TEMPLATE.js` → `scenes/my_scene.js`
- [ ] Заменить все `SCENEID` на реальный id (snake_case)
- [ ] Добавить в `src/nav.js` → `NAV_MAP` одну строку
- [ ] `openSceneXXX()` начинается с `leaveMain()`
- [ ] `closeSceneXXX()` вызывает `cancelAnimationFrame(animId); animId = null`
- [ ] `window.closeSceneXXX = closeSceneXXX` — в конце файла сцены (не в game.js!)
- [ ] Сообщения через `const showMsg = (t,d) => showMsgIn(msgEl, t, d)` — не `.textContent`
- [ ] Добавить `<link rel="preload">` для ВСЕХ ассетов сцены в `index.html` (фон + все спрайт-слои)

### ⚠️ КРИТИЧЕСКОЕ ПРАВИЛО: Preload + await перед показом сцены

**Все спрайты и фоны ДОЛЖНЫ быть загружены ДО того, как игрок видит сцену.**
Нарушение = pop-in спрайтов на глазах у игрока = спойлер прогресса.

1. **`index.html`**: каждый новый ассет → отдельный `<link rel="preload" as="image">`.
2. **`openSceneXXX()`**: ждать ВСЕ картинки через `Promise.all([_waitImg(img1), _waitImg(img2), ...])` перед `hideLoading()` и `el.style.display = 'block'`.
3. **`_waitImg` helper** (копировать в каждую сцену с несколькими картинками):
```js
const _waitImg = img => img.complete && img.naturalWidth
  ? Promise.resolve()
  : new Promise(r => { img.onload = r; img.onerror = r; });
```
4. **Если загрузка провалилась** (`!bgImg.naturalWidth`): `hideLoading()`, восстановить предыдущую сцену (`resumeMain()` или `s4.style.display='block'`), затем `showError(...)`.

**Паттерн сцены с картинкой** — эталон в `scenes/_TEMPLATE.js`.
Для новых сцен бери его и меняй SCENEID. Он использует:
- `buildSceneDOM({id, bgSrc, zIndex, onClose})` — собирает каркас
  (div.scene-root + img.scene-bg + canvas.scene-canvas + back + msgEl).
- `bindSceneInput(canvas, {onTap, onHover, onLeave, activeCheck})` —
  все click/touch/move с кэшированием rect (не вызывается getBoundingClientRect
  каждый кадр).
- `ASSET('bg/name')` из `src/assets.js` — путь из единого реестра ассетов.
- `waitImg(bgImg)` + `coverRect` + `hitZone` из `src/scene-base.js`.

Существующие сцены (scene2/3/4/inside/buddha/menu/prologue) сохранены в
старом стиле для стабильности, но новые — через factory.
Загрузка (async/await, обязательно!):
```js
showLoading('название');
await Promise.all([_waitImg(bgImg), _waitImg(layer2Img), ...]); // ВСЕ слои
if (!bgImg.naturalWidth) { hideLoading(); resumeMain(); showError('...'); return; }
hideLoading();
state.activeScreen = 'sceneName';
el.style.display = 'block';
```

**Паттерн пролога (слайды)** — используй `src/sequence.js`:
```js
import { Sequence } from '../src/sequence.js';
const seq = new Sequence(SLIDES, onEnd);
// SLIDES = [{ text, duration? }, ...]
// onEnd — вызывается после последнего слайда
```

---

## ЧЕК-ЛИСТ: Добавить взаимодействие (зона → действие)

- [ ] Это флейвор (только текст) или действие (меняет состояние)?
- [ ] Флейвор → `src/zone-msgs.js`, не трогать сцену
- [ ] Действие → блок в `interactItem()` в файле сцены, в конце `return`
- [ ] После изменения инвентаря → `renderHotbar()`
- [ ] Сообщение через локальный `showMsg(text)`

---

## Инварианты — никогда не нарушать

### Инвентарь
- `selectedSlot` — единственный источник правды о выбранном предмете
- `itemOnItem(a,b)` → `string` = ошибка (оставить выбор) | `false` = успех | `null` = нет комбо
- Удалить предмет: `inventory[idx]=null` + `if(selectedSlot===idx) selectedSlot=-1` + `renderHotbar()`
- `renderHotbar()` уже вызывает `updateItemCursor()` — не дублировать

### ⚑ Отмена выбора предмета (top-level invariant)
Если предмет «в руке» (`selectedSlot >= 0`), игрок должен иметь возможность вернуть его в инвентарь **любым** из способов:
1. **Клик по этому же предмету** в хотбаре → toggle off
2. **Правый клик мыши** (в любом месте экрана)
3. **Клавиша `Escape`**
4. **+ штатное поведение**: успешное комбо / применение на зоне / смена сцены

Единая точка отмены — `deselectItem()` в `src/hotbar.js`. Глобальные слушатели `keydown(Escape)` и `contextmenu` вызывают её автоматически. Новые источники отмены должны идти через эту же функцию — не писать `state.selectedSlot = -1` руками.

### Переходы между сценами
- Открыть сцену → `leaveMain()` **первым делом**
- Закрыть сцену → `canLeave(id, S)` из `src/nav.js` перед закрытием
- `activeScreen` — строго ключ из `NAV_MAP`: `'main'|'scene2'|'buddha'|'scene3'|'scene4'|'menu'|'prologue'`

### Медитация
- Все сцены с медитацией используют ОБЩИЕ примитивы из `src/meditation-fx.js`:
  - `createMeditationFx({ paths, drag, sizeBase, ... })` — символы (тайские, лиловые)
  - `createDustField()` — homing/burst dust-частицы
  - `drawMeditationOverlay(ctx, W, H, phase)` — фиолетовый fade
  - `updateMeditationPhase(phase, isPraying)` — fade-in/out
- Палитра, шрифт, цвет overlay, формы движения символов — **только в meditation-fx.js**.
  Меняешь там — меняется во всех сценах.
- Конец медитации — через `standUp()` из `src/meditation.js` (cleanup передаёт fx.clear()/dust.clear()).
- scene4 открывается только если `inscriptionReady === true`.

### Сообщения — единый паттерн
**Каждая сцена** объявляет локальный алиас в начале:
```js
const showMsg = (t, d) => showMsgIn(msgEl, t, d);
```
Никаких `showS2Msg` / `showBMsg` / прямых `.textContent`.

### state.js — не расширять
Только 3 поля навсегда: `inventory`, `selectedSlot`, `activeScreen`.

### Scene state — через `useSceneState`
В файле сцены — единый паттерн из `src/save.js`:
```js
import { useSceneState } from '../src/save.js';
const [S, saveS] = useSceneState('myScene', {
  fooDone:  false,
  msgIdx:   0,
  collected: { a: false, b: false },
});
// после мутации S — saveS() (или сохранится автоматом при closeScene).
```
Старого `const S = SaveManager.getScene(id); S.foo ??= false; function saveS()...`
не использовать — он размножает дефолты по сценам.

### Save versioning
`src/save.js` хранит `SCHEMA_VERSION`. При изменении схемы save:
1. Увеличить `SCHEMA_VERSION` на 1.
2. Добавить функцию в `MIGRATIONS[N]` — она принимает save версии N-1
   и превращает его в версию N (delete убранные поля, переименовать
   структуры, долить дефолты).
3. НЕ удалять старые миграции — игроки могут быть на любой версии.

### Asset manifest
`src/assets.js` — единый реестр картинок. Добавление ассета:
1. Запись в `ASSETS = { 'bg/name': { path, preload: 'critical' } }`.
2. В коде: `bg.src = ASSET('bg/name')`.
3. Если `preload:'critical'` — добавить `<link rel="preload">` в index.html.
4. Проверить `window.__validateAssets()` в dev-console.

---

## Визуальный стиль

### Pixel-glow — единый визуальный язык свечения
**Источник правды:** `src/anims.js` → `drawPixelGlow`, `drawPixelGlow3`, `drawGlowTrail`.

Все «огоньки/искры/пыль/символы медитации» в проекте используют один и тот же
многослойный rect-glow, БЕЗ `shadowBlur` (он тяжёлый при 100+ частицах).

| Кейс | Helper | Слои |
|---|---|---|
| Светлячки (buddha bFlies/wishFlies), огоньки (tutorial embers, main dust) | `drawPixelGlow` | 4 (mul 5/3/1/0, alpha 0.07/0.16/0.42/1) |
| Споры (inside), фоновые искры (rotate-overlay) | `drawPixelGlow3` | 3 (mul 2/1/0, alpha 0.10/0.22/1) |
| Активация (scene2 камни) — плотный | `drawPixelGlow3(.., dense=true)` | 3 (alpha 0.18/0.45/1) |
| Затухающий хвост (комета, escaping firefly) | `drawGlowTrail(ctx, trail, sz, color, baseA)` | 2 |

**Правило:** новые анимации с пиксельным светом — ТОЛЬКО через эти функции.
Не писать inline `ctx.fillRect` с alpha-multiplier'ами по слоям.
Не использовать `ctx.shadowBlur` для свечения частиц (только для UI-акцентов на 1-2 элемента).

### Иконки — только пиксель-арт SVG
- Только `<rect>` элементы, `image-rendering:pixelated`
- Никаких `<path>`, `<circle>`, `<polygon>`, эмодзи
- Палитра: тёмные оттенки + один яркий акцент

**Текущие функции (`src/icons/items.js`, dispatch в `renderItemIcon`):**
| Предмет | Функция |
|---|---|
| `jar`, `jar_open` | `renderJarIcon(item)` |
| `stick`, `glowstick` | `renderStickIcon(glowing)` |
| `durian` | `renderDurianIcon()` |
| `dirt` | `renderDirtIcon()` |
| `fireflower` | `renderFireflowerIcon()` |
| `flower` | `renderFlowerIcon()` |
| `bottle`, `bottle_fuel` | `renderBottleIcon(filled)` |
| `molotov`, `molotov_lit` | `renderMolotovIcon(lit)` |
| `poster` | `renderPosterIcon()` |

Иконки ачивок — в `src/icons/achievements.js` (`ACH_ICON_MAP` + `renderAchIconByKey`).

### Загрузка и ошибки
```js
showLoading('текст')   // оверлей с анимацией
hideLoading()          // скрыть (fade)
showError('текст')     // ошибка — клик закрывает
```

---

## Тон игры

Тихий, поэтичный, философский, чуть ироничный. Персонаж наблюдает, а не объясняет.
- ✓ «Кот посмотрел на дуриан. Потом на тебя. Что-то понял.»
- ✗ «Нельзя использовать этот предмет здесь.»
- ✓ «Дерево не нуждается в твоей чешуе. Дерево вообще ни в чём не нуждается.»
- ✗ «Ничего не произошло.»

Минимум 2 варианта в массиве для каждой зоны.

---

## Ожидаемые размеры файлов

| Файл | Строк | Растёт? |
|---|---|---|
| `game.js` | ~30 | никогда |
| `src/state.js` | ~10 | никогда |
| `src/nav.js` | ~35 + N | +1 строка на сцену |
| `src/inventory.js` | ~135 | +5 строк на предмет |
| `src/icons/items.js` | ~500 | +30 строк на предмет |
| `src/icons/achievements.js` | ~700 | +25 строк на ачивку |
| `src/combos.js` | ~110 | +5 строк на комбо |
| `src/zone-msgs.js` | ~220 | +3 строки на зону×предмет |
| `src/dialogue.js` | ~600 | +N строк на диалог |
| `src/sequence.js` | ~70 | не растёт |
| `src/scene-base.js` | ~200 | не растёт |
| `src/ui/messages.js` | ~200 | не растёт |
| `src/ui/cursor.js` | ~100 | не растёт |
| `src/ui/overlays.js` | ~80 | не растёт |
| `src/edge-nav.js` | ~80 | не растёт |
| `src/meditation.js` | ~200 | не растёт |
| `src/zones.js` | ~80 | не растёт |
| `scenes/_TEMPLATE.js` | ~150 | никогда |
| `scenes/my_scene.js` | 120–250 | изолировано |
| `scenes/main.js` | ~500 | рефакторить если >700 |
| `scenes/tutorial.js` | ~1000 | использует hero.js, дальше не растёт |
| `scenes/buddha.js` | ~830 | стабильна |
| `scenes/achievements.js` | ~690 | стабильна |

> Старые legacy-сцены (main, tutorial, buddha, scene2/3/4, inside) — на ручном
> DOM-сборе (без buildSceneDOM). Новые — через `scenes/_TEMPLATE.js` factory.
>
> При правке медитации/символов/inscription → `src/meditation.js`, не main.

---

## Git workflow
```
git add <файл> && git commit -m 'описание' && git push origin main
```
Если push rejected: `git pull --rebase origin main` → затем push.

Кэш браузера завис → поднять версию в `index.html`:
```html
<script src="game.js?v=N" defer></script>  <!-- N++ -->
```

Не пушить: `CLAUDE_INSTRUCTIONS.md`, `.claude/`, `.DS_Store`.
Пушить: `CLAUDE.md` (часть проекта).

---

## Deployment — GitHub Pages

> URL: https://mystrange.github.io/monk-game/ — деплоится автоматически из ветки `main` (root).

**ОПАСНО:** Pages привязан к одной конкретной ветке. Если её удалить или переименовать
без переконфига — сайт упадёт в 404 (источник деплоя пропадает).

**Перед удалением/переименованием deploy-ветки:**
1. `gh api repos/MyStrange/monk-game/pages` — проверить из какой ветки сейчас деплоится
2. Если совпадает с удаляемой → сначала переключить:
   ```
   gh api -X PUT repos/MyStrange/monk-game/pages \
     -f 'source[branch]=NEW_BRANCH' -f 'source[path]=/'
   ```
3. Только потом удалять старую

**Если 404 уже случился (Pages config 404'нул):** пересоздать конфиг:
```
gh api -X POST repos/MyStrange/monk-game/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```
Деплой запустится автоматически (видно в `gh api repos/MyStrange/monk-game/actions/runs`).

---

## Параллельные Claude-сессии (важно)

Несколько Claude-чатов могут работать в одном репозитории через worktrees
(`.claude/worktrees/<name>/`). Каждый worktree — отдельная ветка.

**Правила чтобы не получать конфликты:**
- В `main` пушит **только основной чат** (тот что чинит архитектуру/баги).
- Каждая отдельная фича-локация — своя ветка (например `tutorial`).
- Фича-чат ничего не пушит в `main`. Только `git push origin <feature-branch>`.
- Когда фича готова — основной чат делает merge/rebase в main отдельным шагом.

Перед `git push` всегда проверять `git branch --show-current`.

**Старт каждой сессии в worktree (фича-чат):**
```
git fetch origin && git merge origin/main
```
Это держит фича-ветку всегда впереди main. Тогда мердж фичи в main у основного
чата всегда fast-forward — без конфликтов и cherry-pick'ов. Если игнорировать —
конфликты в общих файлах (`inventory.js`, `icons.js`, `combos.js`, `style.css`,
`index.html` preload) почти гарантированы при долгой работе параллельно.

---

## Правило обновления .md файлов
- **CLAUDE.md** — обновлять при изменении паттернов, инвариантов, новых сценах/предметах
- **CLAUDE_INSTRUCTIONS.md** — детали ассетов, спрайтов, зон (не пушить)
- Не переписывать полностью — только изменившиеся секции
