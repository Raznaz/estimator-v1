# План: авторизация (users + auth) с JWT, профилем и аватарами

## Context

Сейчас в API нет аутентификации. Пользователи создаются неявно при входе в комнату
(`PokerService` TODO создаёт `User` по имени). Нужно добавить полноценную регистрацию/логин
зарегистрированных пользователей, при этом **сохранив возможность играть анонимно** (гость).
Зарегистрированный пользователь дополнительно сможет редактировать профиль (имя, email,
пароль) и ставить аватар — свой (загрузка файла) или один из 20 готовых (DiceBear).

Решения, согласованные с пользователем:
- Объём: **backend + frontend**.
- Гость = `User` без пароля (`passwordHash` и `email` остаются nullable).
- Токены: **access + refresh**, refresh хранится в БД (хеш) — отзываемый.
- Профиль: `GET /users/me`, изменение имени/email, смена пароля.
- Аватары: пресеты через **DiceBear** (20 фикс. seed'ов) + **загрузка своего файла** (multer).
- Фронт: формы login/register + хранение токена + проброс в API/socket. Без жёстких редиректов
  (аноним пускается везде).

---

## Backend

### 1. Зависимости (`backend/package.json`)
Добавить: `@nestjs/cqrs`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`,
`@nestjs/serve-static` (раздача загруженных аватаров).
Dev: `@types/passport-jwt`, `@types/bcrypt`, `@types/multer`.
`@nestjs/platform-express` (для `FileInterceptor`) уже стоит.

### 2. Prisma (`backend/prisma/schema.prisma` + новая миграция)
Расширить модель `User`:
```prisma
passwordHash String?   // null => гость / OAuth в будущем
avatarUrl    String?   // DiceBear-URL или /static/avatars/<file>
refreshTokens RefreshToken[]
```
Новая модель:
```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  tokenHash String                  // bcrypt-хеш refresh-токена
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  @@index([userId])
}
```
Миграция: `npm run prisma:migrate -w backend` (имя напр. `add_auth_avatar`). Затем `prisma:generate`.
> Помнить: Postgres на **порту 5433** (см. .env), Prisma закреплён на `^6` намеренно.

### Подход: CQRS для межмодульного взаимодействия
Модули общаются **не прямой инъекцией сервисов**, а через `CommandBus`/`QueryBus` из `@nestjs/cqrs`.
Каждый модуль импортирует `CqrsModule` и регистрирует свои хендлеры; команды/запросы — это публичный
контракт модуля, который экспортируется (через `shared`-папку модуля: `users/cqrs/`). Так:
- `auth` обращается к `users` через `CreateUserCommand` / `GetUserByEmailQuery` / `GetUserByIdQuery`
  (а не инжектит `UsersService`);
- `poker` создаёт гостя через `CreateGuestUserCommand` (а не импортирует `UsersModule`-сервис);
- контроллеры — тонкие: только валидируют DTO и диспатчат команду/запрос в шину.

`CqrsModule` подключается в каждом модуле, где есть хендлеры (или глобально в `AppModule`). Доменная
логика и работа с `PrismaService` живут внутри хендлеров; общий `UserRepository` (тонкая обёртка над
Prisma) переиспользуется хендлерами модуля `users`.

### 3. Модуль `users` (`backend/src/users/`)
- `users.module.ts` — импортирует `CqrsModule`; провайдеры: `UserRepository` + все command/query-хендлеры.
  Экспортирует хендлеры и публичные command/query-классы (через barrel `users/cqrs/index.ts`),
  чтобы `auth`/`poker` могли их диспатчить.
- `repository/user.repository.ts` — обёртка над `PrismaService`: `create`, `findById`, `findByEmail`,
  `update`, `setAvatar`. Хелпер `toPublicUser()` (id, name, email, avatarUrl, createdAt) — **никогда не
  отдавать `passwordHash`**. Хеширование/сверка пароля — общий helper `users/lib/password.ts` (`bcrypt`).
- `cqrs/commands/` (+ их `*.handler.ts`):
  - `CreateUserCommand` (name, email, passwordHash?) — создаёт пользователя; используется и регистрацией, и гостями.
  - `CreateGuestUserCommand` (name) — найти/создать гостя без пароля (для poker).
  - `UpdateProfileCommand` (userId, name?, email?, avatarUrl?).
  - `ChangePasswordCommand` (userId, oldPassword, newPassword).
  - `SetAvatarCommand` (userId, avatarUrl).
- `cqrs/queries/` (+ хендлеры): `GetUserByIdQuery`, `GetUserByEmailQuery` (возвращает с `passwordHash`
  — только для auth), `GetMyProfileQuery` (публичный профиль), `GetAvatarPresetsQuery` (20 DiceBear-URL).
- `users.controller.ts` (`@Controller('users')`, под `JwtAuthGuard`) — диспатчит в `CommandBus`/`QueryBus`:
  - `GET /users/me` → `GetMyProfileQuery`.
  - `PATCH /users/me` (`UpdateProfileDto`: name?, email?, avatarUrl?) → `UpdateProfileCommand`;
    `avatarUrl` валидируется как пресет DiceBear ИЛИ ранее загруженный путь.
  - `POST /users/me/password` (`ChangePasswordDto`) → `ChangePasswordCommand`.
  - `POST /users/me/avatar` (`FileInterceptor('file')`) → сохранить файл в `backend/uploads/avatars/`,
    затем `SetAvatarCommand` с `avatarUrl = /static/avatars/<id>.<ext>` (валидация mime/размера).
  - `GET /users/avatars/presets` (публичный) → `GetAvatarPresetsQuery`.
- `dto/` — `update-profile.dto.ts`, `change-password.dto.ts` (class-validator: `@IsEmail`, `@IsString`, `@MinLength`).

### 4. Модуль `auth` (`backend/src/auth/`)
- `auth.module.ts` — импортирует `CqrsModule`, `UsersModule` (для регистрации его хендлеров в общей шине),
  `JwtModule.registerAsync` (секрет/TTL из `ConfigService`), `PassportModule`. Провайдеры: command-хендлеры,
  `JwtStrategy`, `RefreshTokenRepository`. Экспорт `JwtAuthGuard`.
- `cqrs/commands/` (+ хендлеры) — оркеструют через шину команды/запросы модуля `users`:
  - `RegisterCommand` (name, email, password) → `GetUserByEmailQuery` (проверка уникальности) →
    хеш пароля → `CreateUserCommand` → выпуск пары токенов.
  - `LoginCommand` (email, password) → `GetUserByEmailQuery` → `bcrypt.compare` → токены.
  - `RefreshTokenCommand` (refreshToken) — найти валидный `RefreshToken`, сверить хеш и `expiresAt`,
    **ротация**: удалить старый, выпустить новую пару.
  - `LogoutCommand` (userId, refreshToken) — удалить запись refresh (отзыв).
  - общий приватный helper `issueTokens(user)` — подписать access (короткий TTL, payload `{sub, email}`)
    и refresh (длинный TTL), сохранить bcrypt-хеш refresh через `RefreshTokenRepository`.
- `auth.controller.ts` (`@Controller('auth')`) — тонкий, диспатчит команды:
  `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` (под guard).
  Ответы — `{ user, accessToken, refreshToken }`.
- `dto/` — `register.dto.ts`, `login.dto.ts`.
- `strategies/jwt.strategy.ts` — `passport-jwt`, извлечение Bearer, `validate` → `{ userId, email }`.
- `guards/jwt-auth.guard.ts` — `AuthGuard('jwt')`. Плюс `decorators/current-user.decorator.ts`
  (`@CurrentUser()` достаёт `request.user`).

### 5. Интеграция в `app.module.ts` и `main.ts`
- В `AppModule` добавить `CqrsModule` (если решим регистрировать глобально), `UsersModule`, `AuthModule`,
  `ServeStaticModule.forRoot(...)` (раздача `uploads/` по префиксу `/static`).
- `main.ts` без существенных изменений (ValidationPipe и CORS уже есть; CORS `credentials:true` сохраняем).
- `.env.example` (правит пользователь — файл защищён): добавить `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`,
  `JWT_REFRESH_SECRET`, `JWT_REFRESH_TTL`. **В плане отметить — попросить пользователя дописать.**

### 6. Гостевой вход в poker (`backend/src/poker/`)
- `PokerModule` импортирует `CqrsModule`; `PokerService`/gateway создаёт гостя через
  `commandBus.execute(new CreateGuestUserCommand(name))` — без прямой инъекции `UsersService`.
- В `poker.gateway` принимать опциональный `auth.token` из socket handshake: если валиден — использовать
  userId зарегистрированного юзера (через `GetUserByIdQuery`); иначе гость по `userName`. (JOIN_ROOM сейчас
  TODO — закладываем хук, не переписываем всю логику комнаты.)

---

## Shared-контракт (две синхронные копии: `backend/src/shared/` и `frontend/src/shared/`)
> Каждое изменение — в обе папки (инвариант проекта).
- `types.ts` — в `interface User` добавить `avatarUrl?: string | null;`.
- `events.ts` — в `JoinRoomPayload` добавить опциональный `token?: string;`.
- Новый `avatars.ts` — массив из 20 объектов `{ id, url }` (DiceBear, напр.
  `https://api.dicebear.com/9.x/fun-emoji/svg?seed=<id>`), плюс хелпер `isPresetAvatar(url)` для валидации на бэке.
  Экспортнуть из `shared/index.ts` (обе копии).

---

## Frontend (Next.js 16, App Router, CSS Modules)

### 7. Зависимости (`frontend/package.json`)
Доп. библиотеки не обязательны (нативный `fetch`, React-формы без RHF). При желании — без новых зависимостей.

### 8. API-слой и auth-состояние (`frontend/src/lib/`)
- `lib/api.ts` — fetch-обёртка: базовый URL из `NEXT_PUBLIC_API_URL`, подстановка `Authorization: Bearer`,
  автоматический `POST /auth/refresh` при 401 и повтор запроса; при провале — очистка сессии.
- `lib/auth-context.tsx` — клиентский `AuthProvider` (Context): хранит `user` + токены в `localStorage`,
  методы `login/register/logout/updateUser`, гидрация при старте. Без внешнего state-менеджера.
- `app/layout.tsx` — обернуть `children` в `<AuthProvider>` (вынести в клиентский компонент-обёртку,
  т.к. layout серверный). В шапку добавить блок пользователя (аватар/имя или ссылки «Войти/Регистрация»).

### 9. socket.ts (`frontend/src/lib/socket.ts`)
Передавать токен: `io(API_URL, { autoConnect:false, transports:['websocket'], auth: { token } })`
(или `socket.auth = { token }` перед `connect()`), беря токен из auth-хранилища.

### 10. Страницы и компоненты
- `app/login/page.tsx` + `login.module.css` — форма email/password → `api` login → редирект на `/`.
- `app/register/page.tsx` — форма name/email/password → register.
- `app/profile/page.tsx` + `profile.module.css` — клиентская страница (доступна только при наличии токена,
  иначе подсказка войти — без жёсткого редиректа): редактирование имени/email, смена пароля, выбор аватара.
- `components/AvatarPicker.tsx` — сетка 20 пресетов из `@/shared/avatars` + кнопка загрузки своего файла
  (`POST /users/me/avatar`), показ текущего `avatarUrl`.
- Стили — CSS Modules в стиле существующих (тёмная тема, `var(--color-*)`, `var(--radius)`).

---

## Критические файлы
- Создать: `backend/src/users/*` (repository, `cqrs/commands`, `cqrs/queries`, хендлеры, controller, dto),
  `backend/src/auth/*` (`cqrs/commands` + хендлеры, strategy, guard, controller, dto, refresh-repo),
  `backend/src/shared/avatars.ts`,
  `frontend/src/shared/avatars.ts`, `frontend/src/lib/api.ts`, `frontend/src/lib/auth-context.tsx`,
  `frontend/src/app/{login,register,profile}/page.tsx` (+ `.module.css`),
  `frontend/src/components/AvatarPicker.tsx`.
- Изменить: `backend/prisma/schema.prisma` (+миграция), `backend/src/app.module.ts`,
  `backend/src/poker/{poker.module.ts,poker.service.ts,poker.gateway.ts}`,
  `backend/src/shared/{types.ts,events.ts,index.ts}`, `frontend/src/shared/{types.ts,events.ts,index.ts}`,
  `frontend/src/lib/socket.ts`, `frontend/src/app/layout.tsx`.
- Переиспользовать: `PrismaService` (`@Global`), паттерн модулей `rooms/`, `SCALES`/shared-стиль файлов,
  существующие CSS-переменные.

---

## Verification
1. `cd backend && npm install` (новые зависимости), `npm run prisma:generate -w backend`.
2. `npm run db:up`, `npm run prisma:migrate -w backend` — миграция применяется (Postgres на 5433).
   **Перед этим**: пользователю дописать JWT_* переменные в `.env` (файл защищён).
3. `npm run dev:backend`. Проверить curl/HTTP-клиентом:
   - `POST /auth/register` → 201, в ответе `user`+`accessToken`+`refreshToken`, в БД нет plain-пароля.
   - `POST /auth/login` с теми же кредами → токены; с неверным паролем → 401.
   - `GET /users/me` с Bearer → профиль; без токена → 401.
   - `PATCH /users/me` (имя/email/avatarUrl-пресет) → обновление; `POST /users/me/password` → меняет пароль,
     старый перестаёт логинить.
   - `GET /users/avatars/presets` → 20 URL. `POST /users/me/avatar` (файл) → `avatarUrl`, файл доступен по `/static/...`.
   - `POST /auth/refresh` старым refresh → новая пара; повторный старый refresh → 401 (ротация/отзыв).
4. `npm run dev:frontend`: пройти register → login, увидеть аватар/имя в шапке, открыть `/profile`,
   сменить аватар (пресет и загрузка), сменить имя/пароль. Зайти в комнату как гость (без логина) —
   вход работает по имени. Залогиненным — socket подключается с токеном.
5. `npm run build` и `npm run lint` — без ошибок в обоих пакетах.
