#!/usr/bin/env node
/**
 * Гейт готовности изменения OpenSpec к архивации.
 *
 * Закрывает дыру встроенных проверок: артефакт `specs` — glob, и его
 * завершённость определяется как «найден хотя бы один файл». Поэтому изменение
 * с четырьмя объявленными capability и одной написанной спекой проходит и
 * `openspec status`, и `openspec validate --strict`, а при архивации теряет
 * требования трёх capability.
 *
 * Проверяет:
 *   1. каждая capability из `## Capabilities` в proposal.md имеет spec-файл;
 *   2. каждый spec-файл объявлен в proposal.md;
 *   3. для эпика (больше одной capability) каждая capability помечена
 *      хотя бы на одной группе задач в tasks.md.
 *
 * Использование:
 *   node scripts/spec-readiness.mjs [change-name] [--json]
 *
 * Коды выхода: 0 — нарушений нет, 1 — есть хотя бы одно.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Коды нарушений — часть наблюдаемого контракта, зафиксированного в спеке. */
export const ERROR_CODES = {
  MISSING_SPEC: 'missing-spec',
  UNDECLARED_SPEC: 'undeclared-spec',
  UNCOVERED_CAPABILITY: 'uncovered-capability',
  UNKNOWN_CAPABILITY_TAG: 'unknown-capability-tag',
};

/**
 * Имя capability: kebab-case, допускается вложенный путь (`billing/invoices`) —
 * такую раскладку спек OpenSpec поддерживает при слиянии.
 */
const CAPABILITY_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

const isCapabilityName = (value) => CAPABILITY_NAME.test(value);

// ─────────────────────────────────────────────────────────────────────────────
// Ядро: чистые функции над текстом. Тестируются без файловой системы.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Достать объявленные capability из секции `## Capabilities` файла proposal.md.
 *
 * Считаются только пункты списка — намеренно. Подраздел изменяемых capability
 * часто содержит абзац вида «Нет. Единственная спека — `tickets` — не
 * затрагивается»: это проза с inline-кодом, а не объявление.
 *
 * @param {string} proposalText
 * @returns {string[]} имена в порядке появления, без повторов
 */
export function parseCapabilities(proposalText) {
  if (!proposalText) return [];

  const lines = proposalText.split(/\r?\n/);
  const names = [];
  let inSection = false;

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      // Секция заканчивается на следующем заголовке того же или высшего уровня.
      if (inSection && level <= 2) break;
      if (level === 2 && /^capabilities\b/i.test(heading[2].trim())) {
        inSection = true;
      }
      continue;
    }

    if (!inSection) continue;

    const listItem = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (!listItem) continue;

    const code = /`([^`]+)`/.exec(listItem[1]);
    if (!code) continue;

    const name = code[1].trim();
    // Плейсхолдеры шаблона: `<name>`, `<existing-name>`.
    if (name.includes('<') || name.includes('>')) continue;
    if (!isCapabilityName(name)) continue;
    if (!names.includes(name)) names.push(name);
  }

  return names;
}

/**
 * Достать пометки capability с групп задач в tasks.md.
 *
 * Пометка — inline-код в самом конце заголовка группы:
 *   `## 4. Импорт из JIRA — \`tickets-import\``
 * Требование «в конце» отсекает случайный инлайн-код в названии группы.
 *
 * @param {string} tasksText
 * @returns {string[]} имена в порядке появления, без повторов
 */
export function parseTaskCapabilityTags(tasksText) {
  if (!tasksText) return [];

  const tags = [];
  for (const line of tasksText.split(/\r?\n/)) {
    const heading = /^##\s+(.*)$/.exec(line);
    if (!heading) continue;

    const trailingCode = /`([^`]+)`\s*$/.exec(heading[1]);
    if (!trailingCode) continue;

    const name = trailingCode[1].trim();
    if (!isCapabilityName(name)) continue;
    if (!tags.includes(name)) tags.push(name);
  }

  return tags;
}

/**
 * Сверить объявленные capability, фактические спеки и пометки задач.
 *
 * @param {object} input
 * @param {string} input.name — имя изменения
 * @param {string[]} input.declared — capability из proposal.md
 * @param {string[]} input.specs — capability, для которых найден spec.md
 * @param {string[]} input.taskTags — пометки с групп задач
 * @param {boolean} [input.skipSpecs] — изменение отказалось от спек
 * @returns {{name: string, skipped: boolean, errors: {code: string, capability: string}[]}}
 */
export function checkChange({ name, declared, specs, taskTags, skipSpecs = false }) {
  if (skipSpecs) {
    return { name, skipped: true, errors: [] };
  }

  const errors = [];

  for (const capability of declared) {
    if (!specs.includes(capability)) {
      errors.push({ code: ERROR_CODES.MISSING_SPEC, capability });
    }
  }

  for (const capability of specs) {
    if (!declared.includes(capability)) {
      errors.push({ code: ERROR_CODES.UNDECLARED_SPEC, capability });
    }
  }

  // Покрытие задачами требуется только от эпика: при одной capability все
  // задачи и так относятся к ней, разметка была бы лишним обрядом.
  if (declared.length > 1) {
    for (const capability of declared) {
      if (!taskTags.includes(capability)) {
        errors.push({ code: ERROR_CODES.UNCOVERED_CAPABILITY, capability });
      }
    }
    for (const capability of taskTags) {
      if (!declared.includes(capability)) {
        errors.push({ code: ERROR_CODES.UNKNOWN_CAPABILITY_TAG, capability });
      }
    }
  }

  return { name, skipped: false, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Оболочка: файловая система и запуск.
// ─────────────────────────────────────────────────────────────────────────────

const readIfExists = (filePath) =>
  fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

/**
 * Активные изменения: папки в changes/ с файлом `.openspec.yaml`.
 * Архив завершённых изменений пропускается.
 */
export function listActiveChanges(changesDir) {
  if (!fs.existsSync(changesDir)) return [];

  return fs
    .readdirSync(changesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(changesDir, name, '.openspec.yaml')))
    .sort();
}

/**
 * Capability, для которых в изменении есть spec.md.
 * Ключ — относительный путь папки, чтобы поддержать вложенную раскладку.
 * Файл `specs/spec.md` без папки игнорируется: его отдельно ловит
 * `openspec validate` собственным сообщением.
 */
export function collectSpecCapabilities(specsDir) {
  if (!fs.existsSync(specsDir)) return [];

  const found = [];
  const walk = (dir, segments) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, [...segments, entry.name]);
      } else if (entry.name === 'spec.md' && segments.length > 0) {
        found.push(segments.join('/'));
      }
    }
  };
  walk(specsDir, []);

  return found.sort();
}

/** Изменение отказалось от спек: маркер в `.openspec.yaml`. */
export function readsSkipSpecs(metadataText) {
  return /^\s*skip_specs\s*:\s*true\s*$/m.test(metadataText);
}

/** Собрать данные одного изменения с диска и проверить его. */
export function inspectChange(changesDir, name) {
  const changeDir = path.join(changesDir, name);

  return checkChange({
    name,
    declared: parseCapabilities(readIfExists(path.join(changeDir, 'proposal.md'))),
    specs: collectSpecCapabilities(path.join(changeDir, 'specs')),
    taskTags: parseTaskCapabilityTags(readIfExists(path.join(changeDir, 'tasks.md'))),
    skipSpecs: readsSkipSpecs(readIfExists(path.join(changeDir, '.openspec.yaml'))),
  });
}

/**
 * Проверить все активные изменения или одно указанное.
 * @returns {{ok: boolean, changes: object[], error?: string}}
 */
export function runCheck(changesDir, changeName) {
  if (changeName) {
    if (!listActiveChanges(changesDir).includes(changeName)) {
      return { ok: false, changes: [], error: `Изменение не найдено: ${changeName}` };
    }
    const result = inspectChange(changesDir, changeName);
    return { ok: result.errors.length === 0, changes: [result] };
  }

  const changes = listActiveChanges(changesDir).map((name) => inspectChange(changesDir, name));
  return { ok: changes.every((change) => change.errors.length === 0), changes };
}

const HINTS = {
  [ERROR_CODES.MISSING_SPEC]: (c) =>
    `capability \`${c}\` объявлена в proposal.md, но файла specs/${c}/spec.md нет`,
  [ERROR_CODES.UNDECLARED_SPEC]: (c) =>
    `спека specs/${c}/spec.md есть, но capability \`${c}\` не объявлена в proposal.md`,
  [ERROR_CODES.UNCOVERED_CAPABILITY]: (c) =>
    `у capability \`${c}\` нет ни одной группы задач в tasks.md`,
  [ERROR_CODES.UNKNOWN_CAPABILITY_TAG]: (c) =>
    `группа задач помечена \`${c}\`, но такой capability в proposal.md нет`,
};

export function formatReport(result) {
  if (result.error) return `✗ ${result.error}`;

  const lines = [];
  for (const change of result.changes) {
    if (change.skipped) {
      lines.push(`— ${change.name}: пропущено (skip_specs)`);
      continue;
    }
    if (change.errors.length === 0) {
      lines.push(`✓ ${change.name}`);
      continue;
    }
    lines.push(`✗ ${change.name}`);
    for (const { code, capability } of change.errors) {
      lines.push(`    [${code}] ${HINTS[code](capability)}`);
    }
  }

  if (lines.length === 0) lines.push('Активных изменений нет.');
  return lines.join('\n');
}

function main(argv) {
  const args = argv.slice(2);
  const json = args.includes('--json');
  const changeName = args.find((arg) => !arg.startsWith('--'));

  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = runCheck(path.join(repoRoot, 'openspec', 'changes'), changeName);

  console.log(json ? JSON.stringify(result, null, 2) : formatReport(result));
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv);
}
