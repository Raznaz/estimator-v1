---
name: check-layout
description: 'Проверяет вёрстку конкретной страницы через Playwright (скриншот, адаптив, авто-эвристики overflow/наложений, консоль/сеть), показывает отчёт и итеративно правит CSS/разметку по комментариям пользователя. Используй, когда нужно проверить и починить вёрстку страницы.'
allowed_tools: mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_resize, mcp__playwright__browser_evaluate, mcp__playwright__browser_console_messages, mcp__playwright__browser_network_requests, Read, Edit, Glob, Grep, Bash
trigger: /check-layout
argument-hint: '[url или роут, напр. / или /room/ABCD]'
model: sonnet
---

# Проверка и правка вёрстки

Открывает страницу фронтенда в браузере через **Playwright MCP**, снимает состояние
вёрстки (скриншот, адаптив, авто-эвристики, консоль/сеть), показывает отчёт и
**итеративно** правит CSS Modules / компоненты по комментариям пользователя.

## Использование

```
/check-layout [роут]
```

- `[роут]` — путь страницы, напр. `/`, `/login`, `/register`, `/profile`, `/room/ABCD`.
- Если аргумент не задан — спроси у пользователя, какую страницу проверять.
- Роуты проекта: `/`, `/login`, `/register`, `/profile`, `/room/<CODE>`.

## Workflow

1. **Определить цель.** Собери URL: `http://localhost:3000` + роут.
   Для `/room/<CODE>` при необходимости уточни код комнаты у пользователя.

2. **Убедиться, что dev-сервер поднят.** Проверь доступность:

   !`curl -sf -o /dev/null http://localhost:3000 && echo UP || echo DOWN`

   Если `DOWN` — попроси пользователя запустить `npm run dev:front` (из корня репозитория).
   **Не запускай сервер сам** в фоне без явного подтверждения.

3. **Навигация.** `browser_navigate` на целевой URL.

4. **Сбор состояния** (на дефолтной desktop-ширине):
   - `browser_take_screenshot` — скриншот страницы (по возможности `fullPage`).
   - `browser_snapshot` — accessibility-дерево (для сопоставления элементов с кодом).
   - `browser_console_messages` — ошибки и варнинги консоли.
   - `browser_network_requests` — упавшие запросы (статус 4xx/5xx).
   - `browser_evaluate` — авто-эвристики вёрстки (сниппет ниже).

5. **Адаптив.** Через `browser_resize` пройди по ширинам (см. секцию «Адаптивные ширины»),
   на каждой сделай скриншот, отметь сломанный responsive.

6. **Отчёт пользователю.** Покажи скриншоты и список найденного:
   горизонтальный overflow, вылезающие/накладывающиеся элементы, ошибки консоли/сети,
   проблемы адаптива. **Ничего не чини на этом шаге** — жди комментариев.

7. **Приём комментариев.** Пользователь пишет, что и как поправить. Сопоставь каждый
   комментарий с конкретным элементом (по `snapshot`/DOM) → найди нужный CSS Module или
   компонент (см. «Поиск нужного файла»).

8. **Правка.** Внеси изменения через `Edit` в `*.module.css` / `*.tsx`.
   Держи правки минимальными и в стиле окружающего кода (CSS Modules, без Tailwind).

9. **Перепроверка.** `browser_navigate` (перезагрузка страницы) + повторный скриншот,
   покажи «было → стало». Повторяй шаги 7–9, пока пользователь не подтвердит, что всё ок.

## Авто-эвристики (browser_evaluate)

Передай этот сниппет в `browser_evaluate` — вернёт компактный отчёт по вёрстке:

```js
() => {
  const vw = document.documentElement.clientWidth;
  const sel = (el) => {
    if (el.id) return `#${el.id}`;
    const cls =
      el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
    return el.tagName.toLowerCase() + cls;
  };

  // 1. Горизонтальный overflow страницы
  const pageOverflow =
    document.documentElement.scrollWidth > vw
      ? { scrollWidth: document.documentElement.scrollWidth, clientWidth: vw }
      : null;

  // 2. Элементы, вылезающие за правый/левый край вьюпорта
  const overflowing = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      overflowing.push({ el: sel(el), left: Math.round(r.left), right: Math.round(r.right) });
    }
  }

  // 3. Подозрительные наложения соседних блоков
  const overlaps = [];
  const blocks = [...document.body.children].flatMap((c) => [...c.children]);
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i].getBoundingClientRect();
      const b = blocks[j].getBoundingClientRect();
      if (!a.width || !b.width) continue;
      const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      if (ox > 4 && oy > 4) {
        overlaps.push({
          a: sel(blocks[i]),
          b: sel(blocks[j]),
          overlap: `${Math.round(ox)}x${Math.round(oy)}`,
        });
      }
    }
  }

  return {
    viewport: vw,
    pageOverflow,
    overflowing: overflowing.slice(0, 20),
    overlaps: overlaps.slice(0, 20),
  };
};
```

- `pageOverflow` не `null` → на странице горизонтальный скролл (частый признак битой вёрстки).
- `overflowing` → элементы, выходящие за левый/правый край вьюпорта.
- `overlaps` → пары блоков с пересечением bounding-box (возможное наложение).

## Адаптивные ширины

Прогони `browser_resize` по брейкпоинтам, на каждом — скриншот + авто-эвристики:

- **mobile** — `375 × 812`: переполнение, читаемость, не вылезает ли контент.
- **tablet** — `768 × 1024`: перестроение колонок, отступы.
- **desktop** — `1280 × 800`: базовое состояние, макс. ширина контента.

## Поиск нужного файла

Стили — CSS Modules рядом с компонентом, импорт `import styles from './x.module.css'`.
Соответствие роут → файл:

- `/` → `frontend/src/app/page.module.css`
- `/profile` → `frontend/src/app/profile/page.module.css`
- `/room/<CODE>` → `frontend/src/app/room/[code]/page.module.css` (логика в `RoomClient.tsx`)
- формы login/register/profile → `frontend/src/components/forms.module.css`
- хедер → `frontend/src/components/AppHeader.module.css`
- глобальные токены/шрифты → `frontend/src/app/globals.css`

Для точного попадания: возьми имя CSS-класса из `snapshot`/DOM и найди его через `Grep`
по `frontend/src` — это укажет и на `.module.css`, и на компонент, где класс применён.

## Notes

- Скилл **не запускает dev-сервер сам** без подтверждения пользователя.
- Шаг «отчёт» ничего не меняет — правки только по комментариям пользователя.
- Правки минимальные, в стиле существующих CSS Modules (без Tailwind).
- После правок убедись, что не появилось новых ошибок в `browser_console_messages`,
  и при необходимости прогони `npm run lint -w frontend`.
- Для страниц с авторизацией/сокетом (владелец комнаты) часть состояния зависит от
  токенов в `localStorage` — их ставит создание комнаты или `/login`.
