# Estimator — Planning Poker

Инструмент командной оценки тикетов (Planning Poker / Scrum Poker) для refinement-сессий:
участники заходят в комнату, голосуют картами за стори-поинты по тикету, голоса синхронно
раскрываются у всех в реальном времени.

## Стек

- **Монорепо:** npm workspaces (`frontend`, `backend`)
- **Frontend:** Next.js 16 (App Router, TypeScript, CSS Modules) — `frontend`
- **Backend:** NestJS (TypeScript) — `backend`
- **БД:** PostgreSQL + Prisma ORM
- **Real-time:** Socket.IO (NestJS gateway + клиент)
- **Общий контракт:** типы, socket-события и шкалы оценки продублированы в
  `frontend/src/shared` и `backend/src/shared` (держать копии синхронными)

## Структура

```
frontend/     # Next.js — UI комнаты и голосования
  src/shared/ # копия контракта (типы/события/шкалы)
backend/      # NestJS — REST + WebSocket, Prisma
  src/shared/ # копия контракта (типы/события/шкалы)
  prisma/     # схема и миграции
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
npm run dev:backend    # http://localhost:3001
npm run dev:frontend   # http://localhost:3000
```

## Полезные команды

| Команда | Действие |
|---|---|
| `npm run db:up` / `db:down` | Запустить / остановить PostgreSQL в Docker |
| `npm run dev:frontend` | Dev-сервер фронтенда |
| `npm run dev:backend` | Dev-сервер бэкенда |
| `npm run build` | Сборка всех пакетов |
| `npm run lint` | Линт всех пакетов |
