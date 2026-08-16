## 1. DTO и модели ответов

- [ ] 1.1 Создать `backend/src/tickets/dto/create-ticket.dto.ts` — `roomId` (обязателен, строка) и `title` (необязателен), валидация через `class-validator`. `@ApiProperty` руками не проставлять: работает CLI-плагин Nest.
- [ ] 1.2 Создать `backend/src/tickets/dto/list-tickets-query.dto.ts` — обязательный query-параметр `roomId`; отсутствие даёт `400`.
- [ ] 1.3 Создать `backend/src/tickets/dto/set-estimate.dto.ts` — обязательное непустое `value` (строка).
- [ ] 1.4 Создать модель ответа `backend/src/tickets/dto/responses/ticket-response.dto.ts`, зеркалящую тип `Ticket` из `backend/src/shared/types.ts`. `@ApiProperty` в `shared/` не добавлять — контракт остаётся framework-agnostic.

## 2. Доменное событие и развязка модулей

- [ ] 2.1 Создать событие `RoomTicketsChangedEvent` с полем `roomCode` в `backend/src/tickets/events/room-tickets-changed.event.ts` и экспортировать его из `tickets` (решение 1 в `design.md`).
- [ ] 2.2 Добавить `CqrsModule` в `imports` и событие в `exports` `backend/src/tickets/tickets.module.ts`. Обратную зависимость на `PokerModule` НЕ вводить: `poker` уже импортирует `tickets`, обратная связь дала бы цикл.
- [ ] 2.3 Создать обработчик `@EventsHandler(RoomTicketsChangedEvent)` в `backend/src/poker/`: инжектит `PokerGateway`, зовёт `PokerService.buildRoomState(roomCode)` и рассылает `ROOM_STATE` в комнату. Зарегистрировать в `providers` `poker.module.ts`.
- [ ] 2.4 Проверить, что `PokerGateway` доступен обработчику как провайдер внутри `PokerModule`; при необходимости добавить его в `providers`/`exports`.

## 3. Логика сервиса

- [ ] 3.1 Добавить в `TicketsService` приватный метод проверки прав: загрузить комнату по `roomId`, бросить `NotFoundException` если её нет и `ForbiddenException` если `room.ownerId !== userId`. Повторяет `assertOwner` из `poker.service.ts` — осознанный дубль, зафиксированный в `design.md`.
- [ ] 3.2 Добавить приватную валидацию оценки: значение должно входить в `SCALES[room.scaleType]` из `backend/src/shared/scales.ts` и не совпадать ни с одной из `SPECIAL_CARDS` (`?`, `☕`); иначе `BadRequestException`.
- [ ] 3.3 Добавить метод фиксации финальной оценки: проверка прав, валидация значения, запись `finalEstimate` и перевод `status` в `ESTIMATED`. Повторная фиксация перезаписывает значение.
- [ ] 3.4 Существующие `create()` и `listByRoom()` не переписывать — переиспользовать, обернув проверками прав и существования комнаты на уровне вызова.
- [ ] 3.5 Публиковать `RoomTicketsChangedEvent` через `EventBus` после успешного создания тикета и после успешной фиксации оценки. При ошибке (403/404/400) событие НЕ публикуется; чтение списка событие не публикует.

## 4. Контроллер и Swagger

- [ ] 4.1 Реализовать `POST /tickets` в `backend/src/tickets/tickets.controller.ts`: `JwtAuthGuard`, `@CurrentUser`, возврат созданного тикета со статусом `201`.
- [ ] 4.2 Реализовать `GET /tickets?roomId=` — список в порядке `order` по возрастанию, доступен любому аутентифицированному участнику комнаты.
- [ ] 4.3 Реализовать `PATCH /tickets/:id/estimate` — возврат обновлённого тикета со статусом `200`.
- [ ] 4.4 Проставить Swagger: `@ApiTags('tickets')` на контроллере; на каждом методе `@ApiOperation({ summary })`, `@ApiBearerAuth()`, модель успешного ответа через `type: TicketResponse`, и `@ApiResponse`-декоратор на КАЖДЫЙ исход из спеки — `@ApiUnauthorizedResponse` (401), `@ApiForbiddenResponse` (403), `@ApiNotFoundResponse` (404), `@ApiBadRequestResponse` (400) с `type: ApiErrorResponse` из `backend/src/common/dto/api-error-response.dto.ts`.
- [ ] 4.5 Добавить тег `tickets` в `DocumentBuilder` в `backend/src/main.ts`.

## 5. Тесты

- [ ] 5.1 Создать `backend/src/tickets/tickets.service.spec.ts` (Jest, рядом с кодом) по образцу `backend/src/rooms/rooms.service.spec.ts`.
- [ ] 5.2 Покрыть создание тикета: успех с заголовком, автозаголовок при пустом `title`, позиция в конце очереди, `403` для не-владельца, `404` для несуществующей комнаты.
- [ ] 5.3 Покрыть список: порядок по `order` по возрастанию, пустой список, `404` для несуществующей комнаты.
- [ ] 5.4 Покрыть фиксацию оценки: успех (`finalEstimate` + статус `ESTIMATED`), перезапись существующей оценки, `403` для не-владельца, `404` для несуществующего тикета.
- [ ] 5.5 Покрыть валидацию оценки: значение вне шкалы комнаты, значение из чужой шкалы, спецкарта `?`, пустое значение — все дают `400`.
- [ ] 5.6 Покрыть публикацию события: `RoomTicketsChangedEvent` публикуется после успешного создания и успешной фиксации оценки и НЕ публикуется при ошибке и при чтении списка.

## 6. Проверка

- [ ] 6.1 Прогнать из корня репозитория: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- [ ] 6.2 Поднять `npm run db:up` и `npm run dev:back`, открыть `http://localhost:3001/docs` и убедиться, что все три эндпоинта видны с полным набором кодов ответов и моделями.
- [ ] 6.3 Проверить вручную сквозной сценарий синхронизации: подключиться к комнате в браузере, создать тикет через REST и убедиться, что подключённый клиент получил обновлённое состояние без перезагрузки.
