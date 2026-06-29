# backend — CLAUDE.md

NestJS-сервер Planning Poker. Общий контекст проекта и инвариант контракта —
в корневом `CLAUDE.md`.

## Стек

- **NestJS 11**. REST-модули `auth`, `users`, `rooms`, `tickets` + real-time `poker`.
- **Prisma** живёт здесь (`prisma/schema.prisma`). `PrismaModule` помечен `@Global`,
  поэтому `PrismaService` инжектится в любой модуль без повторного импорта.
- Контракт импортируется относительным `../shared` в gateway.

## Доменная модель (Prisma)

`User → Room (owner) → Participant → Ticket → Round → Vote`. Голосование цикличное:
у тикета может быть несколько раундов (`Round.status`: VOTING/REVEALED), голос
уникален по паре `(roundId, participantId)`. Enum'ы (`ScaleType`, `RoomStatus` и др.)
дублируются как union-типы в `src/shared/types.ts` — держи их синхронными со схемой.

## Контракт real-time

`src/shared/` (`events.ts` / `types.ts` / `scales.ts`) — **копия фронтенда**, держать
синхронной вручную. Правила и состав — в корневом `CLAUDE.md`.

## Важно про версии

`prisma`/`@prisma/client` закреплены на `^6` **намеренно**: Prisma 7 изменила
синтаксис блока `generator client`, и текущая схема под неё не пройдёт
(`prisma format` на v7 падает с Validation Error). Переход на v7 требует правки схемы.

## Команды

```bash
npm run dev:backend          # dev на :3001 (nest start --watch)
npm run prisma:studio -w backend
npm run build -w backend
npm run lint -w backend
```
