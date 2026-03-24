# CLAUDE.md — Monk Game Rules

> Ветка: `perfectmonk` | GitHub: https://github.com/MyStrange/monk-game

---

## ОБЯЗАТЕЛЬНО ПЕРЕД ЛЮБОЙ ПРАВКОЙ

1. При добавлении **сцены** → прочти `scenes/_TEMPLATE.js` целиком
2. При добавлении **предмета** → прочти `src/inventory.js` + `src/icons.js` + `src/zone-msgs.js`
3. При добавлении **диалога** → прочти `src/dialogue.js`
4. При добавлении **комбо** → прочти `src/combos.js`

---

## TOKEN BUDGET — что читать для каждой задачи

| Задача | Читать | Не читать |
|---|---|---|
| Новая сцена | `scenes/_TEMPLATE.js` + 1 строка `src/nav.js` | остальное |
| Новый предмет | `src/inventory.js`, `src/icons.js`, `src/zone-msgs.js` | сцены |
| Диалог/текст | `src/dialogue.js` | — |
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
- [ ] Добавить `<link rel="preload">` для фона в `index.html` если новый ассет

**Паттерн сцены с картинкой:**
```js
const bg = document.createElement('img');
bg.src = 'assets/bg/X.jpeg';
bg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';
const canvas = document.createElement('canvas');
canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
el.appendChild(bg); el.appendChild(canvas); // bg ПЕРВЫМ
```
Загрузка: `showLoading` → `img.onload` → `hideLoading`.

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

### Переходы между сценами
- Открыть сцену → `leaveMain()` **первым делом**
- Закрыть сцену → `canLeave(id, S)` из `src/nav.js` перед закрытием
- `activeScreen` — строго ключ из `NAV_MAP`: `'main'|'scene2'|'buddha'|'scene3'|'scene4'|'menu'|'prologue'`

### Медитация
- Конец медитации — только через `standUp()` (чистит `pSyms`, `mParticles`, аудио)
- `draggedSym = null` при любом выходе → делает `leaveMain()`
- scene4 открывается только если `inscriptionReady === true`

### Сообщения — единый паттерн
**Каждая сцена** объявляет локальный алиас в начале:
```js
const showMsg = (t, d) => showMsgIn(msgEl, t, d);
```
Никаких `showS2Msg` / `showBMsg` / прямых `.textContent`.

### state.js — не расширять
Только 3 поля навсегда: `inventory`, `selectedSlot`, `activeScreen`.
Флаги сцены → в файле сцены через `SaveManager.getScene(id)`.

---

## Визуальный стиль

### Иконки — только пиксель-арт SVG
- Только `<rect>` элементы, `image-rendering:pixelated`
- Никаких `<path>`, `<circle>`, `<polygon>`, эмодзи
- Палитра: тёмные оттенки + один яркий акцент

**Текущие функции:**
| Предмет | Функция |
|---|---|
| `jar`, `jar_open` | `renderJarIcon(item)` |
| `stick`, `glowstick` | `renderStickIcon(glowing)` |
| `durian` | `renderDurianIcon()` |
| `dirt` | `renderDirtIcon()` |
| `fireflower` | `renderFireflowerIcon()` |

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
| `src/inventory.js` | ~80 | +5 строк на предмет |
| `src/icons.js` | ~500 | +30 строк на предмет |
| `src/combos.js` | ~120 | +5 строк на комбо |
| `src/zone-msgs.js` | ~150 | +3 строки на зону×предмет |
| `src/dialogue.js` | ~150 | +N строк на диалог |
| `src/sequence.js` | ~50 | не растёт |
| `scenes/_TEMPLATE.js` | ~150 | никогда |
| `scenes/my_scene.js` | 120–250 | изолировано |
| `scenes/main.js` | ~600 | рефакторить если >700 |

> Если `main.js` > 700 строк → вынести медитацию в `src/meditation.js`

---

## Git workflow
```
git add <файл> && git commit -m 'описание' && git push origin perfectmonk
```
Если push rejected: `git pull --rebase origin perfectmonk` → затем push.

Кэш браузера завис → поднять версию в `index.html`:
```html
<script src="game.js?v=N" defer></script>  <!-- N++ -->
```

Не пушить: `CLAUDE_INSTRUCTIONS.md`, `.claude/`, `.DS_Store`.
Пушить: `CLAUDE.md` (часть проекта).

---

## Правило обновления .md файлов
- **CLAUDE.md** — обновлять при изменении паттернов, инвариантов, новых сценах/предметах
- **CLAUDE_INSTRUCTIONS.md** — детали ассетов, спрайтов, зон (не пушить)
- Не переписывать полностью — только изменившиеся секции
