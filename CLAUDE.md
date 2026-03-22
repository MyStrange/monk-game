# CLAUDE.md — Monk Game Rules

**Полная документация**: читай `CLAUDE_INSTRUCTIONS.md` перед любой правкой.

---

## Перед каждым изменением — проверь:

1. **Новый предмет?** → добавь в `ITEM_DEFS`, создавай через `makeItem(id)`
2. **Новая комбинация предметов?** → добавь в `ITEM_COMBO`, не трогай `itemOnItem()`
3. **Новое флейворное сообщение (без действия)?** → добавь в `ZONE_MSGS`, не добавляй в `itemOnZone()`
4. **Новая сцена?** → добавь в `SCENE_DEFS` с `canLeave`, используй `openScene*` / `closeScene*` шаблон
5. **После любого изменения инвентаря** → вызывай `renderHotbar()` (она уже вызывает `updateItemCursor()`)

---

## Инварианты — никогда не нарушать:

### Инвентарь
- Выбор предмета: `selectedSlot` — единственный источник правды
- `itemOnItem(a, b)` возвращает: `string` = ошибка, `false` = успех, `null` = нет комбо
- `itemOnZone(id, zone)` возвращает: `string` = показать сообщение, `null` = действие выполнено внутри
- Удаляй предмет из инвентаря: `inventory[idx]=null` + `if(selectedSlot===idx)selectedSlot=-1`
- Всегда после: `renderHotbar()` (внутри она сама вызывает `updateItemCursor()`)

### Переходы между сценами
- Перед открытием любой сцены: если `hero.praying`, вызови `standUp()`
- Перед закрытием сцены: проверь `canLeaveScene(id)`, если `false` — покажи `getLeaveBlockMsg(id)`
- `activeScreen` значения: `'main'` | `'scene2'` | `'buddha'` | `'scene3'` | `'scene4'`
- При закрытии сцены: останови её `animId` через `cancelAnimationFrame`

### Медитация
- Начало: `hero.praying=true` + `playPrayerSound()` + `setMeditationAudio(true)`
- Конец: всегда через `standUp()` — она чистит `pSyms`, `mParticles`, аудио
- `draggedSym=null` при любом выходе с главного экрана

### Сообщения
- Главная сцена: `showMsg(text)`
- Сцена 2 (корни): `showS2Msg(text)`
- Будда: `showBMsg(text)`
- Другие сцены: `showMsgIn(элемент, text, dur)`
- Никогда не манипулируй `.textContent` / `.style.display` напрямую

---

## Архитектура DATA LAYER (начало game.js):

```
ITEM_DEFS    → все предметы (id, label, icon, description, look)
SCENE_DEFS   → все сцены (canLeave, leaveBlockMsg)
ITEM_COMBO   → комбо предметов (condition, failMsg, apply)
ZONE_MSGS    → флейворные сообщения (itemId:zone → string[])
```

---

## Git workflow:
```
git add game.js && git commit -m 'описание' && git push
```
Пушить только изменившиеся файлы. Не пушить: `CLAUDE_INSTRUCTIONS.md`, `.claude/`, `.DS_Store`.
