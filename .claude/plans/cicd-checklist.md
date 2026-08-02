# CI/CD + прод на VPS — чек-лист по этапам

Полный план: `~/.claude/plans/cozy-strolling-sprout.md`.
Здесь — разбивка на исполняемые этапы. Каждый этап делается отдельно,
после него — объяснение и проверка, только потом переходим к следующему.

Легенда: `[ ]` не начато · `[~]` в работе · `[x]` готово

---

## Этап 1. Подготовка кода к контейнерам
Мелкие правки в существующих файлах. Без них образы соберутся, но упадут в проде.

- [x] `backend/src/app.module.ts` — `envFilePath` не обязателен в проде
- [x] `backend/src/main.ts` — `CORS_ORIGIN` как список через запятую
- [x] `backend/src/health/health.controller.ts` — health проверяет БД (перенесён в свою папку)
- [x] `frontend/src/lib/socket.ts` — фолбэк на polling
- [x] `frontend/next.config.ts` — `output: 'standalone'`
- [x] скрипты `typecheck` / `start:prod` / `test` в трёх package.json

**Проверка:** `npm run typecheck` ✅, `npm run build` ✅ (standalone-вывод создаётся).
`npm run lint` падает на backend — известная проблема, чинится в этапе 4.

---

## Этап 2. Docker-образы
- [x] `backend/Dockerfile` — 831 МБ
- [x] `frontend/Dockerfile` — 279 МБ
- [x] `.dockerignore`

**Проверка:** оба образа собираются ✅, контейнер фронта отвечает HTTP 200 ✅,
Prisma CLI внутри backend-образа работает ✅.

Сборка (контекст — корень монорепы):
```bash
docker build -f backend/Dockerfile -t estimator-backend:local .
docker build -f frontend/Dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
  -t estimator-frontend:local .
```

---

## Этап 3. Прод-стек локально
- [x] `docker-compose.prod.yml`
- [x] `Caddyfile`
- [x] `.env.prod.example`
- [x] `docker-compose.local.yml` — override для локальной проверки (изолированный проект)
- [x] `.env.prod` добавлен в `.gitignore`

**Проверка (пройдена):** стек поднят локально, миграции применены,
`/health` → `{"status":"ok","database":"up"}`, регистрация HTTP 201,
WebSocket-апгрейд через Caddy → `101 Switching Protocols`,
в браузере: комната → тикет → голос → раскрытие, среднее 5.0,
голос из второй вкладки долетел в первую.

Локальный запуск:
```bash
docker build -f backend/Dockerfile -t estimator-backend:local .
docker build -f frontend/Dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:8081 \
  -t estimator-frontend:local .
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml \
  --env-file .env.local up -d
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml \
  --env-file .env.local run --rm backend npx prisma migrate deploy
# фронт → http://localhost:8080, API → http://localhost:8081
```

---

## Этап 4. ESLint flat-config
- [x] корневой `eslint.config.mjs` вместо `.eslintrc.json` (удалён)
- [x] devDeps: `@eslint/js@^9`, `eslint-config-prettier@^10`

**Проверка:** `npm run lint` → exit 0 ✅. Backend линтится без ошибок,
frontend — 4 предупреждения `react-hooks/set-state-in-effect` (существующие,
намеренные: гидрация из localStorage).

---

## Этап 5. Каркас тестов
- [x] Jest + ts-jest в backend (`backend/jest.config.js`)
- [x] `backend/tsconfig.build.json` — тесты не попадают в `dist` и в прод-образ
- [x] `poker.service.spec.ts` — расчёт средней оценки (6 тестов)
- [x] `shared/scales.spec.ts` — инварианты шкал (14 тестов)
- [x] `rooms.service.spec.ts` — сервис с мокнутой Prisma (7 тестов)
- [x] Jest-глобалы добавлены в `eslint.config.mjs`

**Проверка:** `npm run test` → 27 passed ✅, `npm run lint` → exit 0 ✅,
`dist` без spec-файлов ✅.

---

## Этап 6. GitHub Actions
- [x] `.github/workflows/ci.yml` — lint + typecheck + test + build на PR
- [x] `.github/workflows/deploy.yml` — сборка образов в GHCR + деплой по SSH

Job `deploy` включается переменной репозитория `DEPLOY_ENABLED=true`.
Пока её нет, workflow только собирает и публикует образы.

**Проверка:** YAML валиден ✅, все шаги CI проходят локально ✅.
Реальный прогон — после пуша ветки и открытия PR.

Нужны в настройках репозитория (этап 7):
| Тип | Имя | Пример |
|---|---|---|
| Variable | `NEXT_PUBLIC_API_URL` | `https://api.example.com` |
| Variable | `APP_DOMAIN` | `example.com` |
| Variable | `API_DOMAIN` | `api.example.com` |
| Variable | `DEPLOY_ENABLED` | `true` |
| Secret | `SSH_HOST` | IP сервера |
| Secret | `SSH_USER` | `deploy` |
| Secret | `SSH_PRIVATE_KEY` | приватный deploy-ключ |

---

## Этап 7. Сервер *(нужен купленный VPS и домен)*
- [ ] `infra/bootstrap.sh` — настройка сервера
- [ ] `infra/backup.sh` + cron
- [ ] `infra/README.md` — пошаговая инструкция
- [ ] секреты и переменные в GitHub

**Проверка:** первый авто-деплой из `main`, сайт по HTTPS.

---

## Этап 8. Уборка
- [ ] удалить `render.yaml`
- [ ] обновить `CLAUDE.md` (прод-контур, правильные имена dev-скриптов)
- [ ] защита ветки `main` в настройках репозитория

---

## Покупки (можно параллельно, до этапа 7)
- [ ] VPS Hetzner CX22, Ubuntu 24.04, ~4,5 €/мес
- [ ] домен, ~12 $/год
- [ ] DNS-записи: `@`, `www`, `api` → IP сервера
