// src/ui/messages.js — сообщения сцены: showMsgIn, showChoiceIn, story-приоритет
//
// Два типа:
//   • regular (default) — одно активное сообщение, автоскрытие по таймеру,
//     новый вызов МГНОВЕННО заменяет предыдущий.
//   • story ({story:true}) — имеет приоритет. Пока висит, regular-вызовы
//     игнорируются и дёргают текущее сообщение (bounce).
//     Закрывается по клику (или через dur, если задано).
//
// Вызовы:
//   showMsgIn(el, text)                       // regular, 3200мс
//   showMsgIn(el, text, 5000)                 // regular, кастом dur
//   showMsgIn(el, text, {story:true})         // story, click-to-dismiss
//   showMsgIn(el, text, {story:true, dur:4000}) // story с автотаймером
//   showMsgIn(el, text, {story:true, onDismiss: fn}) // callback после закрытия

import { UI_TIMING } from '../constants.js';

const _msgState = new WeakMap();
function _getMsgState(el) {
  let s = _msgState.get(el);
  if (!s) { s = { current: null, storyActive: false, storyDismiss: null };
            _msgState.set(el, s); }
  return s;
}
// Мгновенное удаление — без fade-out, чтобы не было наложения двух сообщений
// и последующего дёрганья при смене подсказки.
function _removeItem(item) {
  if (!item) return;
  item.remove();
}
function _bounce(item) {
  if (!item) return;
  item.classList.remove('bounce');
  void item.offsetWidth; // reflow чтобы анимация перезапустилась
  item.classList.add('bounce');
}

export function showMsgIn(el, text, durOrOpts = {}) {
  if (!el) return;
  const opts  = typeof durOrOpts === 'number' ? { dur: durOrOpts } : durOrOpts;
  const story = !!opts.story;
  const s     = _getMsgState(el);

  // Story активна и это regular → bounce текущее сообщение, drop новое
  if (s.storyActive && !story) { _bounce(s.current); return; }

  // Убираем предыдущее (story или regular) — новый story заменяет всё
  if (s.storyDismiss) { s.storyDismiss(true); s.storyDismiss = null; }
  _removeItem(s.current);

  const item = document.createElement('div');
  item.className = 'scene-msg-item' + (story ? ' story' : '');
  item.textContent = text;
  el.appendChild(item);
  requestAnimationFrame(() => item.classList.add('visible'));
  s.current = item;

  if (story) {
    s.storyActive = true;
    const dur = opts.dur ?? null;
    let timer = null;
    let capListener = null;

    const dismiss = (silent = false) => {
      if (s.current !== item) return;
      if (timer) { clearTimeout(timer); timer = null; }
      if (capListener) {
        document.removeEventListener('click',    capListener, true);
        document.removeEventListener('touchend', capListener, true);
        capListener = null;
      }
      s.storyActive  = false;
      s.storyDismiss = null;
      s.current      = null;
      _removeItem(item);
      if (!silent && opts.onDismiss) opts.onDismiss();
    };
    s.storyDismiss = dismiss;

    if (dur != null) {
      timer = setTimeout(() => dismiss(), dur);
      // Глобальное правило: пока story-сообщение с дюрацией висит,
      // любой клик по странице ПОКАЧИВАЕТ окно (но не закрывает).
      // Это даёт пользователю визуальный фидбек «подожди, я ещё читаю».
      // Раньше такое было только в scene2 (камни), теперь везде.
      setTimeout(() => {
        capListener = () => _bounce(s.current);
        document.addEventListener('click',    capListener, true);
        document.addEventListener('touchend', capListener, true);
      }, UI_TIMING.STORY_CAP_DELAY);
    } else {
      // Без дюрации — закрывается по ЛЮБОМУ клику (click-to-dismiss).
      setTimeout(() => {
        capListener = () => dismiss();
        document.addEventListener('click',    capListener, true);
        document.addEventListener('touchend', capListener, true);
      }, UI_TIMING.STORY_CAP_DELAY);
    }
  } else {
    const dur = opts.dur ?? 3200;
    setTimeout(() => {
      if (s.current !== item) return;
      s.current = null;
      _removeItem(item);
    }, dur);
  }
}

// Проверить, показывается ли сейчас сюжетное сообщение
export function isStoryActive(el) {
  return !!el && _getMsgState(el).storyActive;
}

// Программно закрыть текущее сюжетное сообщение
export function dismissStoryIn(el) {
  const s = _getMsgState(el);
  if (s.storyDismiss) s.storyDismiss();
}

// ── Single choice block — вопрос + кнопки ответов ─────────────────────────
// Один элемент внизу: сверху prompt, под ним кнопки. Блокирует всё как story.
// options: [{text, value?}] — value передаётся в onPick, иначе text
// onPick(value, text) вызывается при выборе; блок удаляется автоматически.
export function showChoiceIn(el, prompt, options, onPick) {
  if (!el) return;
  const s = _getMsgState(el);
  // Убираем текущее (story или regular)
  if (s.storyDismiss) { s.storyDismiss(true); s.storyDismiss = null; }
  _removeItem(s.current);

  const box = document.createElement('div');
  box.className = 'scene-choice';

  const p = document.createElement('div');
  p.className = 'scene-choice-prompt';
  p.textContent = prompt;                   // \n → перенос (CSS white-space:pre-line)
  box.appendChild(p);

  const btns = document.createElement('div');
  btns.className = 'scene-choice-btns';

  // Гард от двойных кликов и повторного срабатывания во время фейда
  let picked = false;
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'scene-choice-btn';
    btn.textContent = opt.text;
    btn.onclick = () => {
      if (picked) return;
      picked = true;
      s.storyActive  = false;
      s.storyDismiss = null;
      s.current      = null;
      // Блокируем повторные клики, пока блок уезжает
      box.style.pointerEvents = 'none';
      box.classList.remove('visible');
      // Ждём завершения CSS-фейда (transition .25s), и только после удаления
      // блока запускаем onPick — иначе ответ появляется поверх уезжающего блока.
      setTimeout(() => {
        box.remove();
        onPick?.(opt.value ?? opt.text, opt.text);
      }, UI_TIMING.MSG_FADE_MS);
    };
    btns.appendChild(btn);
  });
  box.appendChild(btns);

  el.appendChild(box);
  requestAnimationFrame(() => box.classList.add('visible'));
  s.current      = box;
  s.storyActive  = true;
  s.storyDismiss = () => {
    s.storyActive = false;
    s.storyDismiss = null;
    s.current = null;
    box.classList.remove('visible');
    setTimeout(() => box.remove(), UI_TIMING.MSG_BOUNCE_MS - 150);
  };
}
