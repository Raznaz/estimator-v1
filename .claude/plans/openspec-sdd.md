# Внедрение Spec-Driven Development через OpenSpec

## Контекст

Сейчас в проекте нет процесса спецификаций. Требования живут в ad-hoc файлах
`.claude/plans/*.md` (`auth-cqrs.md`, `cicd-checklist.md`) и сыром шаблоне
`.claude/templates/feature.md`. Из-за этого:

- нет единого источника правды о поведении системы — только код и Swagger;
- нет фиксации «что значит готово» до написания кода, ревью идёт по голому diff;
- накопился дрейф: корневой `CLAUDE.md` утверждает «Тестов в проекте пока нет»,
  хотя есть Jest и 3 spec-файла, а CI гоняет `npm run test`;
- архитектурная неоднородность (`auth`/`users` на CQRS, `rooms`/`tickets` — нет)
  нигде не зафиксирована как решение.

**OpenSpec** (`@fission-ai/openspec`, v1.7.0, MIT) — легковесный SDD-фреймворк:
Markdown-спеки лежат рядом с кодом в папке `openspec/`, цикл работы
`propose → apply → archive` управляется slash-командами в чате Claude Code.
Ключевое для нас — он **brownfield-first**: спеки пишутся только на то, что
меняешь, документировать весь существующий код не требуется.

**Цель:** поставить OpenSpec, настроить под русский язык и стек проекта,
обкатать полный цикл на одной реальной фиче, встроить проверку спек в CI.

### Согласованные решения

| Вопрос | Решение |
|---|---|
| Профиль команд | `core` — 6 команд: `explore`, `propose`, `apply`, `update`, `sync`, `archive` |
| Язык артефактов | Русский; термины, пути, код — на английском |
| Установка CLI | devDependency в корне workspace + `npx openspec` |
| Пилотная фича | REST-эндпоинты `tickets` |

---

## Этап 1. Установка и инициализация

**Предусловие.** OpenSpec требует Node ≥ 20.19.0. В репозитории
`.nvmrc` = `20`, `engines.node` = `>=20`, а `.github/workflows/ci.yml` ставит
Node 22 — расхождение существует до этой задачи. В рамках этапа: проверить
`node -v` локально и **привести `.nvmrc`/`engines` к `>=20.19.0`**, чтобы
требование OpenSpec было явно зафиксировано.

1. Установить CLI в корень монорепо (не в workspace):
   ```bash
   npm install -D -E @fission-ai/openspec@1.7.0
   ```
2. Инициализировать, выбрав Claude Code и профиль `core`:
   ```bash
   npx openspec init --tools claude
   ```
   Что создаётся:
   - `openspec/specs/` — источник правды о поведении (пока пусто);
   - `openspec/changes/` — активные изменения;
   - `openspec/config.yaml` — конфиг;
   - `.claude/skills/openspec-*/SKILL.md` и `.claude/commands/opsx/*.md` —
     регистрация slash-команд.
3. **Проверить, не тронул ли `init` корневой `CLAUDE.md`** (`git diff CLAUDE.md`)
   и что новые `.claude/skills/openspec-*` не конфликтуют с существующими
   `commit`, `pr`, `check-layout`, `frontend-design` — имена не пересекаются,
   но убедиться.
4. Добавить в `package.json` (корень) удобные скрипты:
   ```json
   "spec:list": "openspec list",
   "spec:validate": "openspec validate --all --strict",
   "spec:view": "openspec view"
   ```
5. В `.claude/settings.json` добавить в `allow`: `Bash(npx openspec:*)` —
   иначе каждый вызов CLI будет спрашивать разрешение.
6. Всё содержимое `openspec/` **коммитится** в git. В `.gitignore` ничего не
   добавляем.

**Пауза + объяснение.** По правилу пошаговой работы: после этапа записать разбор
в `.claude/docs/openspec-workflow.md` (что где лежит, чем терминальные
`openspec ...` отличаются от чатовых `/opsx:...`) и остановиться на подтверждение.

---

## Этап 2. Настройка `openspec/config.yaml` под проект

Файл `openspec/config.yaml` — единственный рычаг кастомизации: поля `context` и
`rules` инжектятся в промпт при генерации артефактов. Наполняем его выжимкой из
`CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`:

```yaml
schema: spec-driven

context: |
  Язык: русский. Все артефакты (proposal.md, design.md, tasks.md, spec.md)
  пишутся на русском. На английском остаются: пути к файлам, имена
  сущностей/эндпоинтов/событий, примеры кода и ключевые слова
  SHALL / WHEN / THEN / GIVEN.

  Продукт: Planning Poker — командная оценка тикетов на refinement.

  Стек: монорепо на npm workspaces (frontend, backend), без Turborepo/Nx.
  - backend: NestJS 11, Prisma 6 (версия закреплена намеренно), PostgreSQL,
    Socket.IO, Swagger на /docs. Модули: auth, users, rooms, tickets, poker,
    health. auth и users построены на CQRS (command/query handlers),
    rooms и tickets — на обычных сервисах.
  - frontend: Next.js 16, App Router, React 19, CSS Modules (Tailwind не
    используется), TanStack Query для данных с API, socket-клиент — ленивый
    singleton.
  - Доменная модель: User → Room → Participant → Ticket → Round → Vote.

  Критический инвариант: контракт real-time (events.ts, types.ts, scales.ts)
  продублирован в frontend/src/shared/ и backend/src/shared/ и синхронизируется
  вручную. Любое изменение имени события, payload-типа или шкалы обязано
  затронуть обе копии.

rules:
  specs: |
    Один requirement — одно наблюдаемое поведение. Формулировка: «Система SHALL …».
    Сценарии покрывают не только happy path, но и ошибки: 401/403 без токена,
    404 на несуществующий ресурс, валидацию входных данных.
    Имена доменов (capability) в openspec/specs/ — kebab-case на английском и
    совпадают с модулями backend: auth-login, auth-session, rooms, tickets,
    poker-round, users-profile.
  tasks: |
    Задачи, меняющие HTTP-эндпоинты, обязаны включать пункт про Swagger-аннотации
    (@ApiOperation / @ApiResponse + модель ответа в dto/responses/) —
    см. backend/CLAUDE.md.
    Задачи, меняющие shared-контракт, обязаны включать отдельный пункт про правку
    обеих копий: frontend/src/shared/ и backend/src/shared/.
    Задачи на backend включают пункт про unit-тесты (Jest, *.spec.ts рядом с кодом).

operations:
  apply: |
    После реализации прогнать: npm run lint, npm run typecheck, npm run test,
    npm run build — из корня репозитория.
```

Проверка, что конфиг действительно подхватывается:
```bash
npx openspec instructions proposal --change <имя-изменения>
```

---

## Этап 3. Пилотный цикл на `tickets`

Обкатываем полный цикл на реальной, изолированной задаче: сейчас
`backend/src/tickets/tickets.controller.ts` не имеет ни одного роута, тикеты
создаются только через socket-хендлер `CREATE_TICKET` в
`backend/src/poker/poker.gateway.ts`. REST-эндпоинты нужны для управления
тикетами вне активной сессии.

Порядок (по `docs/team-workflow.md` — OpenSpec **не трогает git**, ветками
управляем сами):

1. `git switch -c spec/tickets-rest`
2. В чате: `/opsx:explore tickets` — дать агенту прочитать
   `backend/src/tickets/`, `poker.gateway.ts`, `rooms.controller.ts` (как
   образец REST + Swagger) и `prisma/schema.prisma`.
3. `/opsx:propose REST-эндпоинты управления тикетами комнаты`
   → создаётся `openspec/changes/tickets-rest-api/` с `proposal.md`,
   `design.md`, `tasks.md`, `specs/tickets/spec.md`.
4. **Ревью до кода** — главный смысл подхода. Проверить:
   - `proposal.md` — та ли задача, не раздут ли скоуп;
   - дельта-спека — требования вида
     `### Requirement: Список тикетов комнаты` /
     `Система SHALL возвращать тикеты комнаты в порядке создания`
     + сценарии `WHEN/THEN`, включая 401 и 404;
   - `tasks.md` — есть ли пункты про Swagger и тесты (их должен подставить `rules`).
   Правки вносить руками или через `/opsx:update`.
5. `npx openspec validate --all --strict` — структурная проверка.
6. `/opsx:apply` — реализация. Ожидаемые файлы:
   `backend/src/tickets/tickets.controller.ts`, `tickets.service.ts`,
   `backend/src/tickets/dto/` (+ `dto/responses/`),
   `backend/src/tickets/tickets.service.spec.ts`.
7. Коммит + PR: дельта-спека и код едут **вместе**, ревьюер читает
   `proposal.md` → спеку → diff.
8. После мерджа: `/opsx:archive` — дельта вливается в `openspec/specs/tickets/spec.md`,
   изменение уезжает в `openspec/changes/archive/`.

Ключевой принцип, который держим весь пилот: **никаких ретро-спек на весь
существующий код.** `openspec/specs/` наполняется только тем, что реально
проходит через цикл.

---

## Этап 4. Встраивание в CI и документацию

**CI.** В `.github/workflows/ci.yml` добавить шаг после `npm ci` и до `lint`:

```yaml
- name: Validate specs
  run: npx openspec validate --all --strict
  env:
    OPENSPEC_TELEMETRY: '0'
    DO_NOT_TRACK: '1'
```

Телеметрия по докам и так отключается в CI — переменные ставим явно.
Шаг дешёвый (только чтение Markdown) и ловит сломанные дельты и `MODIFIED`
требования, которых нет в основной спеке.

**Корневой `CLAUDE.md`** — новый раздел «Процесс разработки (SDD)»:
- цикл `/opsx:explore → /opsx:propose → ревью → /opsx:apply → PR → /opsx:archive`;
- `openspec/specs/` — источник правды о поведении; перед изменением модуля
  сначала читать спеку домена, если она есть;
- правило: новая фича или изменение поведения начинается с `/opsx:propose`,
  а не сразу с кода; багфиксы и рефакторинг без изменения поведения — можно без спеки;
- заодно **исправить устаревшее утверждение «Тестов в проекте пока нет»**:
  есть Jest, `backend/jest.config.js`, 3 spec-файла (`rooms.service.spec.ts`,
  `poker.service.spec.ts`, `scales.spec.ts`), CI гоняет `npm run test`.

**Старые артефакты:**
- `.claude/templates/feature.md` — удалить, его роль полностью занимают
  `proposal.md` + дельта-спека;
- `.claude/plans/auth-cqrs.md`, `.claude/plans/cicd-checklist.md` — оставить как
  исторические, не мигрировать (по `docs/existing-projects.md` старые доки
  используются как справочный материал, а не конвертируются);
- `.claude/docs/` остаётся для учебных разборов — это другой жанр, не спеки.

---

## Файлы, которые будут затронуты

| Файл | Что происходит |
|---|---|
| `package.json` (корень) | devDependency `@fission-ai/openspec`, скрипты `spec:*`, `engines.node` |
| `.nvmrc` | `20` → `20.19.0` (требование OpenSpec) |
| `openspec/config.yaml` | создаётся `init`, наполняется вручную (этап 2) |
| `openspec/specs/`, `openspec/changes/` | создаются `init`, наполняются циклом |
| `.claude/skills/openspec-*/`, `.claude/commands/opsx/` | генерируются `init`, коммитятся |
| `.claude/settings.json` | allow для `Bash(npx openspec:*)` |
| `.github/workflows/ci.yml` | шаг `Validate specs` |
| `CLAUDE.md` (корень) | раздел про SDD + фикс про тесты |
| `.claude/templates/feature.md` | удаляется |
| `.claude/docs/openspec-workflow.md` | новый учебный разбор |
| `backend/src/tickets/**` | пилотная реализация через `/opsx:apply` |

---

## Проверка результата

1. **Установка:** `npx openspec --version` → `1.7.0`.
2. **Регистрация команд:** в чате Claude Code набрать `/opsx` — автодополнение
   показывает `propose`, `apply`, `sync`, `archive`, `update`, `explore`.
   Если нет — `npx openspec update` и перезапуск Claude Code.
3. **Здоровье установки:** `npx openspec doctor` → без ошибок.
4. **Конфиг подхватывается:** `npx openspec instructions proposal --change tickets-rest-api`
   — в выводе видно русскоязычный `context` и правила про Swagger/shared.
5. **Артефакты на русском:** открыть `openspec/changes/tickets-rest-api/proposal.md`
   — текст русский, ключевые слова `SHALL/WHEN/THEN` и пути английские.
6. **Валидация:** `npx openspec validate --all --strict` → зелено.
7. **Дашборд:** `npx openspec view` — видны активное изменение и спека `tickets`.
8. **Пилот работает end-to-end:** после `/opsx:apply` —
   `npm run lint && npm run typecheck && npm run test && npm run build` зелёные;
   `npm run dev:backend`, открыть `http://localhost:3001/docs` — новые
   эндпоинты tickets присутствуют с описаниями; проверить их вручную
   (curl или Swagger UI) на соответствие каждому сценарию из спеки,
   включая 401 без токена и 404 на чужой/несуществующий тикет.
9. **Архивация:** после `/opsx:archive` — `openspec/specs/tickets/spec.md`
   существует и содержит требования из дельты; `openspec/changes/` пуст,
   изменение лежит в `openspec/changes/archive/`.
10. **CI:** пуш ветки → в GitHub Actions шаг `Validate specs` проходит.
