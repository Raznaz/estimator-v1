# frontend — CLAUDE.md

Next.js-клиент Planning Poker. Общий контекст проекта и инвариант контракта —
в корневом `CLAUDE.md`.

## Стек

- **Next.js 16**, App Router, TypeScript.
- **CSS Modules** (без Tailwind) — стили рядом с компонентом (`*.module.css`).

## Ключевые места

- **Socket.IO-клиент**: `src/lib/socket.ts` — ленивый singleton, `autoConnect: false`
  (подключение вызывается явно).
- **Экран комнаты**: `src/app/room/[code]/page.tsx`. Прочие экраны:
  `login`, `register`, `profile`, главная (`page.tsx`).
- Контракт импортируется локально через `@/shared` (без `transpilePackages`).

## Контракт real-time

`src/shared/` (`events.ts` / `types.ts` / `scales.ts`) — **копия бэкенда**, держать
синхронной вручную. Правила и состав — в корневом `CLAUDE.md`.

## Команды

```bash
npm run dev:frontend         # dev на :3000
npm run build -w frontend
npm run lint -w frontend
```
