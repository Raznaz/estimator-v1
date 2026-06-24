---
name: pr
description: 'Open a GitHub Pull Request from explicit arguments — $0 (target branch) and $1 (PR title). Use when the user asks to create a PR with a specific title and/or branch.'
allowed_tools: Bash(git *), Bash(gh *), Bash(bash *)
trigger: /pr
effort: low
model: haiku
argument-hint: '[branch name] [title]'
---

# /pr (create Pull Request)

Открой Pull Request на GitHub по явно переданным аргументам — **ветке** и **заголовку PR**. Скилл следует GitHub Flow репозитория: `main` всегда деплоится, PR всегда таргетит `main`, в `main` напрямую не коммитим.

Разделение со связанным скиллом [`/commit`](../commit/SKILL.md): `/commit` делает **локальную** часть (выбор/создание ветки → коммит), а `/pr` — всё **удалённое**: `git push` → проверка и показ коммитов → описание → создание PR. Используй `/pr`, когда работа уже закоммичена локально.

## Аргументы

- **$0** (ветка, опционально) — если передана, переключись на неё (`git switch <ветка>`); если не существует локально — сообщи и останься на текущей. Если ветка не передана — возьми текущую (`git branch --show-current`).
- **$1** (заголовок) — нормализуй к Conventional Commits (`<type>(<scope>): <subject>`), если он ему не соответствует. Типы: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## Подготовка

1. Проверь, что ветка готова к PR (не `main`/`develop`, есть коммиты сверх `main`):
   !`bash .claude/skills/pr/scripts/validate.sh`
2. Получи список изменённых файлов относительно базовой ветки и **покажи его пользователю**:
   !`git diff --name-status main...HEAD`
3. Получи список коммитов относительно базовой ветки и **покажи его пользователю** — чтобы было видно, что именно попадёт в PR:
   !`git log main..HEAD --oneline`
4. **Push — зона ответственности этого скилла.** Убедись, что ветка запушена в `origin`. Если апстрима нет или есть незапушенные коммиты — запушь:
   `git push -u origin <ветка>`

## Задача

1. Если для этой ветки уже есть **открытый** PR — не дублируй; верни его URL:
   `gh pr list --state open --head "$(git branch --show-current)" --json url -q '.[0].url'`
   ⚠️ Не используй `gh pr view` для этой проверки — он возвращает PR в любом состоянии, включая `MERGED`/`CLOSED`, и после мержа ошибочно блокирует создание нового PR. Если команда выше вернула пустую строку — открытого PR нет, переходи к созданию.
2. Иначе заполни шаблон описания из [template.md](./template.md), опираясь на diff и коммиты выше. Ориентируйся на пример хорошего описания — [good-pr.md](./examples/good-pr.md).
3. Создай PR, таргетящий `main`:
   ```
   gh pr create --base main --head <ветка> --title "$1" --body "<заполненный шаблон>"
   ```

Верни URL созданного (или существующего) PR.

## Notes

- Не добавляй `Co-Authored-By` или атрибуцию «Generated with Claude Code» в PR.
- PR всегда таргетит `main`; из `main` PR не открываем.
- Скилл отвечает за push и открытие PR — он **не коммитит** изменения. Ветку и коммит делает [`/commit`](../commit/SKILL.md).
- Если рабочее дерево грязное — предупреди: незакоммиченные изменения в PR не попадут.
- DO **NOT** stage or commit `.env`, `.env.local`.
