# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Planning Poker (Scrum Poker) — инструмент командной оценки тикетов на refinement.
Участники заходят в комнату, голосуют картами за стори-поинты по тикету, голоса
синхронно раскрываются у всех в реальном времени.

Текущее состояние: **каркас**. Структура, конфиги и Prisma-схема готовы; вся
бизнес-логика помечена `TODO` (REST-эндпоинты, обработчики gateway, UI). Зависимости
в репозитории не установлены — нужен `npm install`.

## Команды

```bash
npm install                 # установка всех workspace-зависимостей (из корня)
cp .env.example .env        # переменные окружения (нужно перед запуском)

npm run db:up               # поднять PostgreSQL в Docker
npm run db:down             # остановить PostgreSQL

npm run prisma:generate     # сгенерировать Prisma Client (-> apps/api)
npm run prisma:migrate      # prisma migrate dev (-> apps/api)

npm run dev:api             # NestJS dev на :3001 (nest start --watch)
npm run dev:web             # Next.js dev на :3000

npm run build               # сборка всех пакетов
npm run lint                # линт всех пакетов
```

Команды отдельного пакета — через `-w`, например `npm run build -w apps/api`.
Prisma Studio: `npm run prisma:studio -w apps/api`. Тестов в проекте пока нет.

## Архитектура

Монорепозиторий на **npm workspaces** (`apps/*`, `packages/*`), без Turborepo/Nx.

- **`apps/web`** — Next.js 16, App Router, TypeScript, **CSS Modules** (без Tailwind).
  Socket.IO-клиент в `src/lib/socket.ts` (ленивый singleton, `autoConnect: false`).
  Экран комнаты — `src/app/room/[code]/page.tsx`.
- **`apps/api`** — NestJS 11. REST-модули `rooms`/`tickets` + real-time `poker`.
  Prisma живёт здесь (`prisma/schema.prisma`). `PrismaModule` помечен `@Global`,
  поэтому `PrismaService` инжектится в любой модуль без повторного импорта.
- **`packages/shared`** (`@estimator/shared`) — **единый контракт между web и api**.

### Ключевой инвариант: shared как источник правды для real-time

`packages/shared/src/events.ts` определяет имена socket-событий (`ClientEvents`/
`ServerEvents`: `vote:cast`, `round:reveal`, `room:state`, …) и их payload-типы.
И NestJS-gateway (`apps/api/src/poker/poker.gateway.ts`), и клиент импортируют их
оттуда — **не дублируй имена событий или payload-типы в web/api**, меняй в shared.

`types.ts` зеркалит доменные сущности Prisma, но независим от Prisma Client
(используется и на фронте). `scales.ts` — шкалы оценки (Fibonacci, T-shirt и др.)
со спецкартами `?` и `☕`; значения карт всегда строки.

Пакет потребляется как исходники TS, а не предсобранный билд: `main`/`exports`
указывают на `src/index.ts`, в Next.js включён `transpilePackages: ['@estimator/shared']`,
а tsconfig'и обоих приложений резолвят его через `paths`.

### Доменная модель (Prisma)

`User → Room (owner) → Participant → Ticket → Round → Vote`. Голосование цикличное:
у тикета может быть несколько раундов (`Round.status`: VOTING/REVEALED), голос
уникален по паре `(roundId, participantId)`. Enum'ы (`ScaleType`, `RoomStatus` и др.)
дублируются как union-типы в `shared/types.ts` — держи их синхронными со схемой.

## Важно про версии

`apps/api` закрепляет `prisma`/`@prisma/client` на `^6` **намеренно**: Prisma 7
изменила синтаксис блока `generator client`, и текущая схема под неё не пройдёт
(`prisma format` на v7 падает с Validation Error). Переход на v7 требует правки схемы.
