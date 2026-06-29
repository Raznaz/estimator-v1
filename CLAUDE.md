# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Специфика пакетов вынесена в `frontend/CLAUDE.md` и `backend/CLAUDE.md` — они
подхватываются автоматически при работе внутри подпапки. Здесь — только общее.

## Что это

Planning Poker (Scrum Poker) — инструмент командной оценки тикетов на refinement.
Участники заходят в комнату, голосуют картами за стори-поинты по тикету, голоса
синхронно раскрываются у всех в реальном времени.

Реализованы модули `auth`, `users`, `rooms`, `tickets`, `poker` и базовый UI
(login/register/profile, экран комнаты). Часть бизнес-логики ещё дорабатывается.

## Команды

```bash
npm install                 # установка всех workspace-зависимостей (из корня)
cp .env.example .env        # переменные окружения (нужно перед запуском)

npm run db:up               # поднять PostgreSQL в Docker
npm run db:down             # остановить PostgreSQL

npm run prisma:generate     # сгенерировать Prisma Client (-> backend)
npm run prisma:migrate      # prisma migrate dev (-> backend)

npm run dev:backend         # NestJS dev на :3001 (nest start --watch)
npm run dev:frontend        # Next.js dev на :3000

npm run build               # сборка всех пакетов
npm run lint                # линт всех пакетов
```

Команды отдельного пакета — через `-w`, например `npm run build -w backend`.
Тестов в проекте пока нет.

## Архитектура

Монорепозиторий на **npm workspaces** (`frontend`, `backend`), без Turborepo/Nx.

- **`frontend`** — Next.js, App Router, CSS Modules. Подробнее — `frontend/CLAUDE.md`.
- **`backend`** — NestJS, REST + real-time poker, Prisma. Подробнее — `backend/CLAUDE.md`.

### Ключевой инвариант: контракт real-time продублирован в обеих папках

Контракт между клиентом и сервером (socket-события, доменные типы, шкалы) лежит в
**двух копиях**: `frontend/src/shared/` и `backend/src/shared/`. Отдельного
workspace-пакета нет — каждая сторона импортирует контракт локально
(`@/shared` во фронте, относительный `../shared` в gateway).

> **Держи копии синхронными вручную.** Меняя имя события, payload-тип или шкалу —
> правь оба файла. Каждый `shared`-файл начинается с предупреждения о дублировании.

- `events.ts` — имена socket-событий (`ClientEvents`/`ServerEvents`: `vote:cast`,
  `round:reveal`, `room:state`, …) и их payload-типы. Используются и NestJS-gateway
  (`backend/src/poker/poker.gateway.ts`), и клиентом.
- `types.ts` — доменные сущности, зеркалят Prisma-схему, но независимы от Prisma Client.
- `scales.ts` — шкалы оценки (Fibonacci, T-shirt и др.) со спецкартами `?` и `☕`;
  значения карт всегда строки.

Контракт потребляется как обычные исходники TS внутри каждого приложения, поэтому
`backend` собирается штатным `tsc` без проблем с `rootDir`, а `frontend` — Next без
`transpilePackages`.
