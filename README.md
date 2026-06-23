# Estimator — Planning Poker

Инструмент командной оценки тикетов (Planning Poker / Scrum Poker) для refinement-сессий:
участники заходят в комнату, голосуют картами за стори-поинты по тикету, голоса синхронно
раскрываются у всех в реальном времени.

## Стек

- **Монорепо:** npm workspaces (`apps/*`, `packages/*`)
- **Frontend:** Next.js 16 (App Router, TypeScript, CSS Modules) — `apps/web`
- **Backend:** NestJS (TypeScript) — `apps/api`
- **БД:** PostgreSQL + Prisma ORM
- **Real-time:** Socket.IO (NestJS gateway + клиент)
- **Общий код:** `packages/shared` (типы, socket-события, шкалы оценки)

## Структура

```
apps/
  web/        # Next.js — UI комнаты и голосования
  api/        # NestJS — REST + WebSocket, Prisma
packages/
  shared/     # общие типы/события/константы (@estimator/shared)
```

## Быстрый старт

> Зависимости в заготовке НЕ установлены. Выполни шаги ниже.

```bash
# 1. Переменные окружения
cp .env.example .env

# 2. Установка зависимостей (всё монорепо)
npm install

# 3. Поднять PostgreSQL
npm run db:up

# 4. Сгенерировать Prisma Client и применить миграции
npm run prisma:generate
npm run prisma:migrate

# 5. Запуск (в отдельных терминалах)
npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:3000
```

## Полезные команды

| Команда | Действие |
|---|---|
| `npm run db:up` / `db:down` | Запустить / остановить PostgreSQL в Docker |
| `npm run dev:web` | Dev-сервер фронтенда |
| `npm run dev:api` | Dev-сервер бэкенда |
| `npm run build` | Сборка всех пакетов |
| `npm run lint` | Линт всех пакетов |
