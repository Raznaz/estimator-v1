# syntax=docker/dockerfile:1
#
# Образ NestJS-бэкенда. Контекст сборки — КОРЕНЬ монорепы, а не backend/:
#   docker build -f backend/Dockerfile .
# Иначе npm workspaces не увидит корневые package.json и package-lock.json.

# ---------- 1. Зависимости ----------
# Отдельная стадия: слой пересобирается только при изменении package*.json,
# а не при каждой правке кода.
FROM node:22-alpine AS deps
WORKDIR /app

# openssl — обязателен для query engine Prisma на alpine.
# python3/make/g++ — сборка нативного bcrypt, если нет готового бинарника под musl.
RUN apk add --no-cache openssl python3 make g++

COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# Ставим только backend + корень воркспейса. Фронтовые зависимости не тянем.
RUN npm ci -w backend --include-workspace-root

# ---------- 2. Сборка ----------
FROM deps AS build
WORKDIR /app

COPY backend ./backend

# Prisma Client генерируется ДО tsc: сборка импортирует сгенерированные типы.
RUN npx prisma generate --schema backend/prisma/schema.prisma
RUN npm run build -w backend

# ---------- 3. Runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl
ENV NODE_ENV=production

# npm workspaces хойстит все зависимости в корневой node_modules — своей папки
# node_modules у backend нет. Переносим корневую целиком, вместе с dev-зависимостями:
# в них Prisma CLI, которым деплой прогоняет `prisma migrate deploy` в этом же образе.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
# prisma/ нужен в рантайме: миграции и schema.prisma для migrate deploy.
COPY --from=build /app/backend/prisma ./backend/prisma

WORKDIR /app/backend

# Пользователь node есть в базовом образе — не запускаем сервер от root.
USER node

EXPOSE 3001
CMD ["node", "dist/main.js"]
