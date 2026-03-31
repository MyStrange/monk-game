# CONTENT.md — Monk Game Content
# Extracted from game.js (3208 lines). Last updated: 2026-03-24.
# This file is the complete content reference for rewriting the game from scratch.

---

## 1. ITEMS

All items are defined in `ITEM_DEFS`. No `look` or `icon` fields on base defs (removed).

| id | label | description |
|---|---|---|
| `stick` | палка | Кривая, но надёжная. Из таких делают посохи и неприятности. |
| `glowstick` | светопалка | Палка впитала свет из банки. Светится тихо и ровно. |
| `jar` | банка | Пустая стеклянная банка с крышкой. Поймай в неё что-нибудь. |
| `jar_open` | банка | Банка без крышки. Крышка ушла вместе со светом. |
| `dirt` | земля | Свежая земля. Тёплая. Кот закопал сюда что-то с усилием. |
| `durian` | дуриан | Рис с кусочками дуриана. Запах невозможный. Кот оценит. |
| `fireflower` | огнецвет | Цветок, светящийся изнутри. Тёплый на ощупь. Не горит. |

### Runtime item property extensions (added via makeItem overrides or direct assignment):

**jar / jar_open:**
- `caught` (int 0-10): number of fireflies caught
- `glowing` (bool): jar emits light (after releasing 10 fireflies)
- `released` (bool): fireflies have been released once (prevents re-catching)
- `hasWater` (bool): jar contains water (scooped from water zone)
- When `hasWater=true`, label becomes `'с водой'`, description becomes `'Открытая банка с водой. Холодная. Не расплещи.'`
- After catching 10 fireflies and releasing them: `description` becomes `'Светляковая жижка. Внутри мерцает тихий свет — след от десяти светлячков.'`

**dirt** (when picked up from ground, not via makeItem):
- Created inline: `{id:'dirt', name:'земля', icon:'🫧', label:'земля', description:'Свежая земля. Кот постарался.'}`

**durian** (when picked up from buddha table, not via makeItem):
- Created inline: `{id:'durian', name:'дуриан', icon:'🍛', label:'дуриан', description:'Рис с кусочками дуриана. Запах невозможный. Кот, наверное, оценит.'}`

**fireflower** (when picked up from scene3, not via makeItem):
- Created inline: `{id:'fireflower', name:'огненный цветок', icon:'🌺', label:'огнецвет', description:'Цветок, который светится изнутри. Тёплый на ощупь. Не горит.'}`

---

## 2. ITEM COMBOS (ITEM_COMBO)

Key format: alphabetically sorted ids joined with `+`.

### `jar+stick`
- **condition:** jar exists AND (jar.glowing OR jar.caught > 0)
- **failMsg:** `'В банке ничего нет. Нечем светить.'`
- **apply:** Transforms stick → glowstick in inventory. Transforms jar → jar_open with caught=0, glowing=false, released=false, hasWater=false. Shows message: `'Палка впитала свет. Крышка куда-то делась — банка теперь открытая.'`

---

## 3. ZONE FLAVOR MESSAGES (ZONE_MSGS)

Format: `itemId:zone` → array of strings (rotates on repeat, capped at last entry except noted).

Note: `getZoneMsg` special behavior: if itemId is `jar` or `jar_open` AND item.glowing is true, uses `jar_glowing:zone` prefix instead.

### jar (empty, not glowing)
- `jar:cat` → `['Коты, конечно, жидкость, но не этот.', 'Ну нет. Он туда не пойдёт.', 'Смотрит на банку. Потом на тебя. Моргает.', 'Ты всё ещё пробуешь? Кот флегматично присутствует.', 'Он остался. Просто игнорирует.']`
- `jar:monk` → `['Ты у него денег просишь? У монаха, серьёзно?', 'Не реагирует. Вообще.', 'Он всё уже отпустил. В том числе это.', 'Тишина — тоже ответ.']`
- `jar:statue` → `['Будда смотрит на банку. Банка смотрит на Будду.', 'Тишина. Очень красноречивая.', 'Думаешь, он оценил? Вряд ли.']`
- `jar:bush` → `['Банка и куст. Ничего не произошло.', 'Снова ничего. Куст держится.']`
- `jar:tree` → `['Дерево большое. Банка маленькая. Свет один.']`
- `jar:rock` → `['Банка ещё пригодится. Не надо её разбивать.', 'Точно не сюда.', 'Пустая банка камню не поможет.']` (used as fallback for rock1/rock2/rock3 via `getZoneMsg`)
- `jar:bottle` → `['Банка смотрит на банку. Что-то в этом есть.']`

### jar_glowing (jar or jar_open with glowing=true)
- `jar_glowing:cat` → `['Банка светит коту в лицо. Кот щурится.', 'Кот смотрит на свет. Долго.', 'Кот моргнул. Что-то изменилось. Или нет.']`
- `jar_glowing:monk` → `['Монах открыл один глаз. Посмотрел на свет. Закрыл.', 'Свет из банки упал на его руки.', 'Монах улыбнулся. Едва заметно.']`
- `jar_glowing:statue` → `['Отражение света на камне. Красиво и бессмысленно.', 'Будда и банка со светом. Кто кому светит — непонятно.']`
- `jar_glowing:water` → `['Свет из банки упал в воду. Вода стала чуть другой.', 'Отражение светится. Оба настоящие.']`
- `jar_glowing:bush` → `['Куст в свете светлячков выглядит иначе. Как будто живёт.']`
- `jar_glowing:tree` → `['Дерево большое. Банка маленькая. Свет один.']`
- `jar_glowing:rock1` → `['Что-то в камне отзывается на свет.', 'Камень холодный. Свет тёплый. Баланс.']`
- `jar_glowing:rock2` → `['Что-то в камне отзывается. Или показалось.', 'Второй камень принимает свет.']`
- `jar_glowing:rock3` → `['Третий камень. Третий свет. Совпадение?']`
- `jar_glowing:_` → `'Свет из банки. Тихо.'` (fallback for any other zone)

### stick
- `stick:cat` → `['Кот посмотрел на палку. Не впечатлился.', 'Зевнул. Демонстративно.', 'Перевёл взгляд. Остался.', 'Нет.']`
- `stick:monk` → `['Открыл один глаз. Закрыл.', 'Больше не откроет. Это было последнее предупреждение.', 'Глубокое молчание. Ты проиграл.']`
- `stick:statue` → `['Ты поднял палку — и сам же убрал. Правильно.', 'Снова? Нет.']`
- `stick:water` → `['Палка и вода. Вода победила, как всегда.', 'Круги на воде. Красиво, если честно.', 'Ничего нового.']`
- `stick:bush` → `['Поковырял кусты палкой. Там пусто.', 'Всё так же пусто.', 'Куст тебя не боится.']`
- `stick:rock` → `['Постучал палкой по камню. Камень не оценил.', 'Звук глухой. Как будто камню всё равно.', 'Ничего.']` (used as fallback `rock:_` style for rock1/rock2/rock3)

### rock fallback
- `rock:_` → `['Обычный камень. Холодный.', 'Поверхность шершавая.', 'Что-то в нём есть.']`

---

## 4. BARE ZONE MESSAGES (clicks without item)

### Main scene — specific zones

**Bush (zone `bush`):** Calls `pickUpStick()`:
- If already picked up: `'Здесь больше ничего нет.'`
- If hands full (item selected): `'Руки заняты.'`
- On first pickup: `'Ты нашёл палку в кустах. Зачем-то взял её.'`

**Cat (zone `cat`):** Cycles through `catMsgs` array:
1. `'Кот смотрит сквозь тебя.'`
2. `'Моргнул. Это был знак. Ты не понял — какой.'`
3. `'Думает о чём-то своём. Или просто греется.'`
4. `'Чешет ухо. Это лучшее, что ты сегодня видел.'`
5. `'Повернул голову. Посмотрел. Отвернулся.'`
6. `'Ты ему неинтересен. Это освобождает.'`
(cycles, index `catMsgIdx % 6`)

**Monk (zone `monk`):** Cycles through `monkMsgs` array:
1. `'Монах сидит. Может, слышит тебя. Не подаёт вида.'`
2. `'Не открыл глаза. Это, наверное, хороший знак.'`
3. `'Дышит медленно. Попробуй так же — вдруг поможет.'`
4. `'Сидит здесь уже давно. Три часа или три года — не поймёшь.'`
5. `'Кажется, чуть улыбнулся. Или показалось.'`
6. `'Думает о пустоте. Ты думаешь о нём. Занятная цепочка.'`
(cycles, index `monkMsgIdx % 6`)

**Dirt zone (after cat buries):**
- If hands full: `'Руки заняты.'`
- On pickup: `'Ты подобрал горстку земли.'`

**Cat burying sequence (after giving durian to cat):**
- Immediately: `'Кот даже не принюхивается, он сразу орёт.'`
- After 2200ms: `'Начинает неистово закапывать.'`
- After 180 frames (~3 seconds) of burying animation: `'Кот закончил закапывать. Осталась кучка земли.'`

**Statue (zone `statue`):** Opens Buddha scene (no text).

**Tree (zone `tree`):** Opens Scene 2 (no text).

### Scene 2 — rocks (no item selected)
Cycles through: `['Холодный камень.', 'Тяжёлый.', 'Не двигается.']` (index `n%3`, same counter for each rock by name).

### Scene 2 — jar pickup (no item)
`'Ты подобрал стеклянную банку. Она пустая.'`

If hands full: `'Руки заняты.'`

### Scene 2 — item interactions on rocks

**jar (empty, no water)** on rock1/rock2/rock3:
`['Банка ещё пригодится. Не надо её разбивать.', 'Точно не сюда.', 'Пустая банка камню не поможет.'][n%3]`

**jar_open / jar with hasWater=true** on rock1/rock2/rock3:
- Sets `rockStates[zone]=true`, removes jar from inventory.
- Message: `'Вода впитывается в камень. Банка трескается от холода — и рассыпается.'`

**dirt** on rock1/rock2/rock3:
- Sets `rockStates[zone]=true`, removes dirt from inventory.
- Message: `'Земля ложится на камень. Что-то меняется.'`

**glowstick** on rock1/rock2/rock3:
- Sets `rockStates[zone]=true`.
- Message: `'Свет из палки переходит в камень. Камень начинает тихо светиться.'`

### Scene 2 — bottle zone

**stick** on bottle (when jar exists and has water or has been released):
- Converts stick → glowstick; jar → jar_open (empty).
- Message: `'Палка коснулась банки — и впитала весь свет. Банка снова пустая.'`
- If no jar: returns `'Тут нечем светить.'`
- If jar empty (no water, not released, no caught): returns `'В банке ничего нет. Нечем светить.'`

### Water zone

**jar_open or jar** on water:
- If jar has lid and is not glowing and not released: `'У банки крышка. Воду не зачерпнёшь.'`
- If already has water: `'Банка уже с водой.'`
- On success: sets hasWater=true, shows `'Ты зачерпнул воды. Банка стала тяжелее.'`

### Buddha screen — firefly catching messages (shown as jar.caught increases 1–9)
1. `'В детстве это было важно. Не помню почему.'`
2. `'Помню только — темно, трава тёплая, и очень надо поймать.'`
3. `'Сейчас тоже ловлю. Зачем — примерно так же непонятно.'`
4. `'Как и всё, что делаем.'`
5. `'Вот они в банке. Насколько им плохо прямо сейчас?'`
6. `'Если страдают — значит привязаны.'`
7. `'Без боли не было бы облегчения. Без клетки — свободы.'`
8. `'Может, я делаю им одолжение. Может, это и есть буддизм.'`
9. `'Или я просто оправдываю то что поймал их банкой.'`

**On 10th firefly (release trigger):**
`'Ладно. Летите. Не знаю кому из нас это нужнее.'`

**After wish animation completes:**
`'Они улетели. В банке осталось немного их света.'`

### Buddha screen — glowstick on ear
Shown before dialog starts (with 2800ms delay before dialog):
`'Палка осветила что-то внутри. Туда раньше не заглядывали. Ну и правильно делали.'`

### Buddha screen — durian pickup
`'Ты взял миску. Запах странный, но терпимо.'`

### Buddha screen — after dialog ends (durian added via makeItem)
`'Палка осталась там — она была нужна им, не тебе. На столе стоит миска с рисом. Запах странный.'`

### Scene 3 — fire flower pickup
`'Ты сорвал огненный цветок. Он тёплый. Почти живой.'`

### Scene 4 — on open
`'Ты поднялся. Сверху всё выглядит иначе.'`

---

## 5. MEDITATION MESSAGES (MEDITATE_MSGS)

Shown when clicking zones while hero is meditating (praying=true). Indexed by `interactCounts['meditate:zone'] % arr.length`.

### cat
- `'Кот тоже медитирует. Вы оба знаете.'`
- `'В состоянии покоя кот — просто форма, принявшая кота.'`
- `'Между вами нет разницы. Оба сидите. Оба дышите.'`
- `'Кот достиг просветления раньше. Он просто не говорит об этом.'`

### monk
- `'Два монаха. Один знает что делает. Второй — нет.'`
- `'Вы медитируете вместе, не зная об этом.'`
- `'Монах чувствует твоё присутствие. Ему это не мешает.'`
- `'Пустота смотрит на пустоту.'`

### statue
- `'В медитации статуя кажется ближе.'`
- `'Ты и Будда сейчас занимаетесь одним и тем же.'`
- `'Разница между тобой и статуей — только материал.'`
- `'Улыбка становится яснее. Или это игра света.'`

### tree
- `'Дерево медитирует тысячу лет. Ты только начал.'`
- `'За деревом что-то есть. Ты это чувствуешься.'`

### water
- `'Вода не думает. Ты думаешь о воде. Это твоя проблема.'`
- `'В медитации отражение точнее оригинала.'`

### bush
- `'Куст тоже часть этого момента.'`
- `'Ты взял из него всё что мог.'`

### orb (energy orbs — collected during meditation)
Indexed by `Math.min(meditationEnergy-1, 3)` (capped at last element):
- `'Энергия.'`
- `'Ещё.'`
- `'Собираешь.'`
- `'Хорошо.'`

---

## 6. DIALOGUE / CHARACTER MESSAGES

### catMsgs (cycling, main scene bare cat click)
See Section 4.

### monkMsgs (cycling, main scene bare monk click)
See Section 4.

### bubbleMsgs (speech bubbles that float up when fireflies are caught in buddha scene)
Sequential, capped at last entry after index exceeds length:
`['ой', 'держись', 'есть!', 'сюда', 'попался', 'тихо', 'ещё один', 'лети-лети', 'не улетай', '...']`

### DIALOG (firefly philosopher dialogue — fly-room scene)
Two fireflies А and Б debate Buddhist philosophy at a table with rice. Player taps to advance.

Speaker A = left firefly (yellow/gold border), Speaker B = right firefly (blue border).
Empty speaker `''` = narrator line (centered, dimmed).
`last:true` on final line = hide "tap to continue" hint.

```
А: Если дерево падает в лесу и никто не слышит — это карма?
Б: Это физика.
А: А карма?
Б: Карма — это когда ты был тем деревом в прошлой жизни.
А: И упал?
Б: И никто не слышал.
А: Грустно.
Б: Зато тихо.

А: Я думал: если всё иллюзия — этот рис тоже иллюзия?
Б: Попробуй не есть.
А: *(пауза)* Нет, буду есть.
Б: Вот и ответ.

А: Чего ты хочешь?
Б: Ничего.
А: Это нирвана?
Б: Нет, я просто наелся.

А: Есть теория: мы живём снова и снова, пока не научимся.
Б: Чему?
А: Не знаю. Чему-то важному.
Б: И сколько жизней уже?
А: Столько, что мы всё ещё светлячки в ухе Будды.
Б: *(долгая пауза)* Может, урок простой. Мы просто не смотрим туда.
А: Я смотрю в миску. Вполне себе красиво.

А: Смерть — это дверь.
Б: Куда?
А: На другую сторону.
Б: Там есть рис с фруктами?
А: Не знаю.
Б: Тогда зачем торопиться.
А: Ты не торопишься.
Б: Именно. Я наслаждаюсь процессом.
А: Это буддизм?
Б: Это рис. Но иногда разницы нет.

[narrator]: *(Встают одновременно. Смотрят на миску.)*
А: Осталось немного.
Б: Всегда остаётся немного.
А: Это метафора?
Б: Нет. Просто не доели.
[narrator]: *(Убегают. Миска остаётся.)*
[narrator, last=true]: В ухе тихо. На столе — почти пустая миска с дурианом. Запах странный.
```

**After dialog ends:** durian is added to inventory via `addItem(makeItem('durian'))`, `durianReady=false`.

---

## 7. ACHIEVEMENTS (ACHIEVEMENT_DEFS)

Three categories: `stub` (persistence), `exp` (exploration), `void` (empty clicks).

### stub — repeated clicks on same zone (tracked via `max(zoneClickCounts)`)
| id | title | desc | threshold |
|---|---|---|---|
| `stub_1` | Путь паломника | Пять раз на одно место. Оно всё ещё там. | 5 |
| `stub_2` | Колесо сансары | Пятнадцать кликов по одному месту. Ты и есть колесо. | 15 |
| `stub_3` | Просветление повторением | Тридцать раз. Место устало. Ты — нет. | 30 |

### exp — unique zones visited (tracked via `zonesVisited.size`)
| id | title | desc | threshold |
|---|---|---|---|
| `exp_1` | Первые шаги | Три разных места. Лес запомнил. | 3 |
| `exp_2` | Любопытный ум | Пять мест. Всё разное, но одно и то же. | 5 |
| `exp_3` | Знаток пустоты | Ты обошёл всё. Теперь можно начинать сначала. | 7 |

### void — clicks in empty space (tracked via `emptyClickCount`)
| id | title | desc | threshold |
|---|---|---|---|
| `void_1` | Зов пустоты | Ты нажал туда, где ничего нет. Три раза. | 3 |
| `void_2` | Мастер ничто | Десять кликов в пустоту. Пустота благодарна. | 10 |
| `void_3` | Дзен пустого клика | Двадцать пять раз. Это и есть путь без пути. | 25 |

**Storage:** `localStorage.setItem('monk_ach', JSON.stringify([...unlockedAchs]))` (key `monk_ach`).

**Toast:** shown for 3800ms when unlocked.

**Achievement screen:** accessible via `ach-btn` button, shows all achievements with icons. Count shown as `N / 9`.

---

## 8. SCENES

### Main scene (`main`)
- **Background:** `assets/bg/main.png` (2000×1116 logical pixels)
- **`canLeave`:** always true
- **Sprites on canvas:**
  - Cat sprite at x=940, y=GROUND_Y-CAT_H (GROUND_Y=920)
  - Red monk sprite at x=1120, y=GROUND_Y-MONK_H
  - Hero (walking or sitting)
  - 50 ambient fireflies floating in upper half
- **Click zones (all in BG pixel coords):**
  - `statue`: x=680, y=160, w=160, h=200 (Buddha face on pedestal area)
  - `tree`: x=1600, y=300, w=200, h=580
  - `cat`: x=940, y=cat.y, w=CAT_W, h=CAT_H (dynamic, based on sprite)
  - `monk`: x=1120, y=redMonk.y, w=MONK_W, h=MONK_H (dynamic)
  - `bush`: x=0, y=580, w=500, h=420 (left foreground, large hit area)
  - `water`: x=0, y=920, w=1800, h=170 (full-width water strip)
  - `dirt`: x=870, y=890, w=100, h=80 (appears after cat buries)
- **Key state flags:**
  - `stickPickedUp` (bool): stick already taken from bush
  - `catBurying` (bool): cat is in burying animation
  - `catBuryTimer` (int): frames since burying started, triggers completion at >180
  - `dirtReady` (bool): dirt pile available to pick up
  - `dirtPickedUp` (bool): dirt has been picked up
  - `hero.praying` (bool): meditation active
  - `inscriptionCharge` (int 0-5): symbols delivered to pedestal
  - `inscriptionReady` (bool): all 5 delivered, clicking pedestal opens scene4
  - `meditationEnergy` (int): orbs collected
- **Inscription zone** (only visible in meditation): x=700, y=760, w=180, h=110 (on pedestal)
- **Special meditation mechanics:**
  - Thai characters float up from hero during meditation (pSyms array)
  - Characters: `'ธมอนภวตสกรคทยชพระศษสหฬ'`
  - Player can grab symbols with mouse/touch and drag to inscription zone
  - After 5 symbols delivered, inscriptionReady=true, clicking zone opens Scene 4
  - Glowing inscription symbol: `'ᩮ'`
  - Charge dots appear in a ring around inscription

### Scene 2 — Tree Roots (`scene2`)
- **Background image:** `assets/bg/tree.png` (1376×768)
- **`canLeave`:** always true
- **Canvas overlay** for interactive elements
- **Elements:**
  - Bottle (jar to pick up): position BOT_PX=283, BOT_PY=317, BOT_PW=94, BOT_PH=119 (in image pixels, scaled to canvas)
  - Uses `bottleImg` sprite (`assets/items/bottle.png`)
  - 3 clickable rocks with fractional positions:
    - `rock1`: fx=0.13, fy=0.78, fw=0.22, fh=0.22 (lower-left)
    - `rock2`: fx=0.60, fy=0.42, fw=0.18, fh=0.20 (upper-center)
    - `rock3`: fx=0.80, fy=0.62, fw=0.20, fh=0.22 (lower-right)
- **Key state flags:**
  - `jarPickedUp` (bool): jar already taken
  - `rockStates` = `{rock1:false, rock2:false, rock3:false}`: tracks if rock has been activated
- **Keyboard shortcut:** pressing E/У while in scene2 calls `pickUpJar()`

### Buddha Scene (`buddha`)
- **Background image:** `assets/bg/buddha.jpeg`
- **`canLeave`:** blocked if jar has caught > 0 fireflies
- **`leaveBlockMsg`:** `'В банке ещё светлячки. Выпусти их сначала.'`
- **Elements:**
  - 30 ambient fireflies on `bCanvas` (canvas overlay)
  - Wish animation on `wishCanvas` (separate canvas layer)
  - Message box `bMsgEl`
- **Interactive zones (proportional):**
  - Ear hit zone: cx > bW*0.60 && cx < bW*0.73 && cy > bH*0.44 && cy < bH*0.60 (only if !earUsed)
  - Durian pickup: cx > bW*0.38 && cx < bW*0.62 && cy > bH*0.38 && cy < bH*0.52 (only if durianReady && !durianPickedUp)
  - Firefly click: any alive firefly within radius (f.sz*5 + 14px) — requires jar selected and !jar.released
- **Key state flags:**
  - `earUsed` (bool): glowstick has been used on ear
  - `dialogActive` (bool): fly-room dialog is running
  - `dialogStep` (int): current line in DIALOG array
  - `durianReady` (bool): bowl of rice+durian is available on table (set true after dialog ends — **actually set false after dialog, durian goes to inventory directly**)
  - `durianPickedUp` (bool): player took durian from table (if durianReady path)
  - `bFlies[]`: array of 30 live firefly objects
  - `wishPlaying` (bool): release animation in progress
- **Sequence:**
  1. Player selects jar, clicks fireflies one by one (30 visible)
  2. After each catch, bubble message shown (bubbleMsgs array)
  3. Catch messages shown at each count (1-9), then release message at 10
  4. Wish animation plays (10 fireflies rise to top of screen)
  5. jar.glowing=true, jar.released=true, message shown
  6. Player selects glowstick, clicks ear hit zone
  7. earUsed=true, glowstick removed from inventory
  8. 2800ms delay → startFireflyDialog() → fly-room scene opens
  9. Player taps through DIALOG (41 lines)
  10. Dialog ends → durian added to inventory via makeItem('durian')
  11. Player can take durian bowl back to main scene → give to cat

### Fly-Room Scene (sub-scene of Buddha)
- **z-index:** 65 (overlays buddha-screen)
- **Background image:** `assets/bg/flyroom.jpeg`
- **Canvas overlay** for animated firefly glows at ~35% x / 65% x, 68% y
- Two firefly glow points (А left, Б right)
- Speech bubbles positioned above fireflies
- Tap hint: `'нажми чтобы продолжить'`
- Back button (just hides, doesn't reset dialog)

### Scene 3 — Fire Flower Field (`scene3`)
- **No background image** (procedurally drawn)
- **Dynamically created** DOM element
- **`canLeave`:** always true
- **Visual:** Night sky (dusk, purple-orange gradient), stars, palm silhouettes, plumeria flowers, jungle foliage, central fire flower
- **Key state flags:**
  - `fireFlowerPicked` (bool): flower has been taken
  - `scene3Unlocked` (bool): scene has been opened at least once
- **Access:** Only through `openScene4()` — wait, actually `openScene3()` is called when... checking: The inscription zone click calls `openScene4()`. Scene3 is accessed via the inscription charge system. Looking at the code more carefully: `openScene3` is defined but `openScene4` is what gets called from the inscription + meditation system. Scene3 access: the back-btn calls `closeScene3`. Scene3 opens when clicking the inscription after inscriptionCharge reaches 5... actually re-reading: `openScene4()` is called from inscription. `openScene3` seems to be the fire flower field which can only be reached... this needs clarification. The inscription zone calls `openScene4()`. The `scene3Unlocked` flag is set by `openScene3()`. Scene3 opens from... no direct call in the tap handler. It may be a dead path or was replaced. **The fire flower scene (scene3) does not appear to be directly reachable in the current code** — inscription tap calls `openScene4()`, not `openScene3()`.
- **Fire flower hit area:** `Math.abs(cx - s3W*0.5) < 40 && Math.abs(cy - s3H*0.58) < 40`

### Scene 4 — Aerial View / Flight (`scene4`)
- **Background image:** `assets/bg/above_main.jpeg` (covers full screen, object-fit:cover, top-aligned)
- **Canvas overlay** for 28 animated fireflies
- **`canLeave`:** always true
- **Key state flags:**
  - `scene4Unlocked` (bool): scene visited at least once
- **Access:** clicking inscription zone when `inscriptionReady === true` (5 symbols delivered)
- **On open message:** `'Ты поднялся. Сверху всё выглядит иначе.'`
- **Canvas animation:** 28 fireflies moving with deterministic seed-based positions and ticks
- **No interactable elements** beyond back button

---

## 9. GAME LOGIC SUMMARY

### Item pickup flow

| Item | Scene | Trigger | Flag preventing double-pickup |
|---|---|---|---|
| `stick` | main | click `bush` zone (no item selected, not praying) | `stickPickedUp` |
| `jar` | scene2 | click bottle sprite / press E key | `jarPickedUp` |
| `dirt` | main | click `dirt` zone after cat buries | `dirtPickedUp` |
| `durian` | buddha | after fly-room dialog ends, via `addItem(makeItem('durian'))` | via dialog flow (only runs once) |
| `durian` (table) | buddha | click table area when `durianReady && !durianPickedUp` | `durianPickedUp` |
| `fireflower` | scene3 | click fire flower (center ~50%, 58%) | `fireFlowerPicked` |

### Scene transitions

**Opening a scene:**
1. Call `leaveMain()` — stops meditation (`standUp()`), clears `draggedSym=null`
2. Set `activeScreen` to scene id
3. Show scene element, initialize canvas sizes

**Closing a scene:**
1. Check `canLeaveScene(id)` — if false, show block message
2. Set `activeScreen='main'`
3. Hide scene element
4. Cancel animation frame (`cancelAnimationFrame`, set id to null)

**Special: buddha scene** blocked if jar.caught > 0 (must release fireflies first).

**Special: scene4** only reachable when `inscriptionReady === true`.

### Meditation system

**Entering:** `hero.praying = true` (via pray button, ArrowDown/S key, or `mobilePrayToggle`)
- Calls `playPrayerSound()` (singing bowl sound)
- `meditationPhase` transitions 0→1 over ~67 frames
- Thai characters spawn every 28 ticks from hero position, float upward
- Energy orbs spawn every 120 ticks (max 8 at once)
- Crossfades ambient audio → meditation audio (2.8s)
- Inscription zone becomes visible on pedestal

**While meditating:**
- Clicking zones shows `MEDITATE_MSGS` instead of normal zone behavior
- Clicking orbs collects them (meditationEnergy++, spawns prayer symbols)
- Dragging symbols to inscription zone increments `inscriptionCharge`
- At `inscriptionCharge === 5`: `inscriptionReady = true`
- Clicking inscription zone when ready → `openScene4()`

**Leaving:** `standUp()` — sets `hero.praying=false`, clears `pSyms=[]`, `mParticles=[]`, crossfades meditation audio → ambient audio

### Symbol delivery system
- Player drags floating Thai character symbols with mouse/touch
- Drop on `INSCRIPTION_ZONE` (x=700, y=760, w=180, h=110)
- Each delivery: `inscriptionCharge++`, resonance flash animation, `inscriptionGlow=1.0`
- At 5 symbols: `inscriptionGlow=2.0`, `inscriptionReady=true`, 3 extra flash animations

### Buddha scene — ear + dialog sequence
1. Player has `glowstick` selected
2. Clicks ear zone (bW*0.60-0.73, bH*0.44-0.60)
3. `earUsed=true`, glowstick removed from inventory
4. Message shown, 2800ms timer → `startFireflyDialog()`
5. fly-room scene opens with background image loading (shows "светлячки думают" if not loaded)
6. Player taps through 41 dialog lines
7. After final line: fly-room hides, `addItem(makeItem('durian'))`, success message

### Wish animation trigger condition
- Fires when `jar.caught >= 10` (10th firefly caught)
- 10 animated fireflies rise from jar hotbar position to top of screen
- After animation: `jar.glowing=true`, `jar.released=true`

---

## 10. UI / HOTBAR

- **5 slots** (`SLOTS = 5`)
- `inventory` array of 5, null = empty
- `selectedSlot` = -1 (none selected) or 0-4
- Hotbar hidden if all slots empty (`display:none`)

### Hotbar interactions
- **Click same slot as selected** → deselect
- **Click different slot when something selected** → `itemOnItem(a, b)`:
  - Returns `string` → show message, keep selection
  - Returns `false` → success (apply combo), deselect
  - Returns `null` → no combo, switch selection to clicked slot
- **Click slot when nothing selected** → select

### Long press (mobile, 600ms)
Opens item context menu showing `item.description`

### Right-click (desktop)
Opens item context menu showing `item.description`

### Context menu
Shows `item.description || item.name`, positioned near cursor, auto-hides after 3500ms.

### Item cursor follower (desktop only)
SVG icon follows mouse when item selected. Hidden on mobile (`pointer:coarse`).

---

## 11. AUDIO

All audio is generated via Web Audio API (no audio files).

### Sound system
- `masterGain`: output bus, volume 0.18 normally, 0.28 during meditation
- `ambientGain`: normal mode layer (gain 1.0 → 0.08 during meditation)
- `meditationGain`: meditation layer (gain 0 → 1.0 during meditation)
- Mute toggle: `toggleSound()` → sets masterGain to 0 or 0.18, stores in `soundMuted`
- Starts on first user interaction (click/touch/keydown)

### Ambient music (normal mode — via ambientGain)

**Drone layer (sine oscillators with LFO modulation):**
- 55 Hz (gain 0.28, LFO ~0.07-0.11 Hz)
- 110 Hz (gain 0.16, LFO ~0.07-0.11 Hz)
- 164.8 Hz (gain 0.08, LFO ~0.07-0.11 Hz)

**Pentatonic pad layer (triangle wave with reverb):**
- Notes: 220, 246.9, 293.7, 329.6, 392, 440, 493.9 Hz
- Random note, random duration (4.5-8s), with small detune
- Convolver reverb (synthesized 2.5s IR)
- Scheduled every 2200-5700ms, 3 simultaneous voices at start

**Occasional ambient bells:**
- Frequencies: 880, 1046.5, 1318.5, 659.3 Hz
- With overtone at freq*2.756
- Scheduled every 10-26 seconds after 6-14s initial delay
- Decay ~4.5s

### Meditation music (via meditationGain)

**Deep subharmonic drones (sine):**
- 27.5 Hz (gain 0.55, LFO 0.03 Hz)
- 41.25 Hz (gain 0.38, LFO 0.05 Hz)
- 55 Hz (gain 0.22, LFO 0.07 Hz)

**528 Hz "healing" shimmer:**
- Sine, gain 0.14, LFO at 0.06 Hz (gain 0.10)

**432/435 Hz binaural pair:**
- 432 Hz (gain 0.08), 435 Hz (gain 0.06)

**Meditation bells (random interval):**
- Frequencies: 528, 639, 741, 852, 1046.5, 1318.5 Hz
- Random pick per bell
- With overtone at freq*1.5 (gain 0.018, decay 2.5s)
- Scheduled every 2200-5200ms, starts 800ms after meditation begins

### Sound effects

**Prayer sound** (`playPrayerSound()` — triggered on sitting down):
- Singing bowl simulation: 4 harmonics (220, 440, 660, 880 Hz)
- Gains: 0.20, 0.10, 0.055, 0.03
- Decays: 4.0, 3.0, 2.2, 1.6 seconds
- All sine wave oscillators

**Cat meow** (`playCatMeow()` — triggered when durian given to cat):
- Layer 1: sawtooth oscillator, pitch envelope 480→860→1020→680→520 Hz over 0.6s
- Bandpass filter (1100 Hz, Q=2.5), gain envelope 0→0.22→0
- Layer 2: sine overtone 1600→2100→1400 Hz, gain 0.06, 0.6s total

---

## 12. ASSETS LIST

### Background images
| File | Used in |
|---|---|
| `assets/bg/main.png` | Main scene background (2000×1116) |
| `assets/bg/tree.png` | Scene 2 background (1376×768) |
| `assets/bg/buddha.jpeg` | Buddha scene background |
| `assets/bg/above_main.jpeg` | Scene 4 background (aerial view) |
| `assets/bg/flyroom.jpeg` | Fly-room dialog background |

### Sprite sheets
| File | Sprite | Frames | Frame size |
|---|---|---|---|
| `assets/sprites/cat.png` | Cat animation | 5 frames | 400×330 per frame |
| `assets/sprites/monk_red.png` | Red monk animation | 5 frames | 400×464 per frame |
| `assets/sprites/hero_left.png` | Hero walking left | 5 frames | 275×348 per frame |
| `assets/sprites/hero_right.png` | Hero walking right | 5 frames | 275×348 per frame |
| `assets/sprites/hero_sit.png` | Hero sitting/meditating | 5 frames | 275×204 per frame |

### Item sprites
| File | Used for |
|---|---|
| `assets/items/bottle.png` | Jar (bottle) in scene 2, displayed on shelf |

### Audio
No audio files — all sound is procedurally generated via Web Audio API.

### Preloaded (declared in index.html)
- `assets/bg/main.png` (BG — critical, game won't start without it)
- All sprite images loaded dynamically after page load, 6-second fallback timeout

---

## APPENDIX: SPRITE SIZES (display dimensions)

All display sizes are computed relative to BG canvas (BG_W=2000, BG_H=1116):

| Sprite | Display H | Display W |
|---|---|---|
| Cat | 145 px (BG units) | ~176 px (145 * 400/330) |
| Red monk | 240 px | ~207 px (240 * 400/464) |
| Hero walking right | 420 px | ~330 px (420 * 344/348 * 275/348) |
| Hero walking left | 420 px | ~325 px |
| Hero sitting | 240 px | ~323 px (240 * 275/204) |

GROUND_Y = 920 (BG units)

Hero x-range: 20 to BG_W - HERO_WALK_W - 20 (clamped)

---

## APPENDIX: KEYBOARD CONTROLS

| Key(s) | Action |
|---|---|
| ArrowLeft / A / Ф | Walk left |
| ArrowRight / D / Д | Walk right |
| ArrowDown / S / Ы | Sit (enter meditation) |
| ArrowUp / W / Ц | Stand up (exit meditation) |
| E / У | Interact (pick up jar in scene2) |
| Escape | Close active scene, deselect item, exit meditation |
