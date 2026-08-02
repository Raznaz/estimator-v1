# syntax=docker/dockerfile:1
#
# Образ Next.js-фронтенда. Контекст сборки — КОРЕНЬ монорепы:
#   docker build -f frontend/Dockerfile --build-arg NEXT_PUBLIC_API_URL=... .

# ---------- 1. Зависимости ----------
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/

RUN npm ci -w frontend --include-workspace-root

# ---------- 2. Сборка ----------
FROM deps AS build
WORKDIR /app

# ВАЖНО: переменные NEXT_PUBLIC_* Next вшивает в JS-бандл на этапе сборки,
# в рантайме подменить их уже нельзя. Поэтому адрес API приходит build-аргументом,
# и для смены адреса нужно пересобрать образ.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY frontend ./frontend
RUN npm run build -w frontend

# ---------- 3. Runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# standalone-сборка кладёт сервер в frontend/server.js, а нужные ему зависимости —
# в node_modules рядом. Копируем её целиком в корень /app.
COPY --from=build /app/frontend/.next/standalone ./
# Статику standalone не включает — копируем отдельно.
COPY --from=build /app/frontend/.next/static ./frontend/.next/static

USER node

EXPOSE 3000
CMD ["node", "frontend/server.js"]
