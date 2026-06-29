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

## Swagger / OpenAPI

REST-API документируется через `@nestjs/swagger`. UI — на `/docs`, JSON-схема — на
`/docs-json` (поднимаются вместе с backend, см. `src/main.ts`). Включён CLI-плагин
(`nest-cli.json`: `introspectComments` + `classValidatorShim`), поэтому `@ApiProperty`
на DTO **запросов** генерируются автоматически из `class-validator` и JSDoc — руками их
проставлять не нужно.

**При добавлении или изменении REST-эндпоинта обязательно обновляй документацию:**

- На каждом методе — `@ApiOperation({ summary })` и `@ApiResponse`-декораторы для **всех**
  исходов: успех (`@ApiOkResponse`/`@ApiCreatedResponse`/`@ApiNoContentResponse`) и каждая
  ошибка, которую бросает хендлер (`@ApiBadRequestResponse` 400, `@ApiUnauthorizedResponse`
  401, `@ApiNotFoundResponse` 404, `@ApiConflictResponse` 409 и т.д.).
- У контроллера — `@ApiTags('<module>')`; на эндпоинтах за `JwtAuthGuard` — `@ApiBearerAuth()`.
- Успешные ответы типизируй ссылкой на модель (`type: XxxResponse`). Модели ответов лежат
  в `src/<module>/dto/responses/*.dto.ts` и зеркалят типы из `src/shared/`. **Не добавляй
  `@ApiProperty` в `src/shared/`** — это дублируемый frontend/backend контракт, он должен
  оставаться framework-agnostic; вместо этого заводи/обновляй модель в `dto/responses/`.
- Для ошибок переиспользуй `src/common/dto/api-error-response.dto.ts` (`type: ApiErrorResponse`).
- Новый модуль с REST — добавь его тег в `DocumentBuilder` в `src/main.ts`.

Проверка: `npm run build -w backend`, затем открой `/docs` и убедись, что эндпоинт виден
с нужными кодами ответов и схемами. WebSocket-gateway (`poker`) Swagger'ом не покрывается.
