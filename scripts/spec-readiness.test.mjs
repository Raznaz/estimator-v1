import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';

import {
  ERROR_CODES,
  checkChange,
  collectSpecCapabilities,
  listActiveChanges,
  parseCapabilities,
  parseTaskCapabilityTags,
  readsSkipSpecs,
  runCheck,
} from './spec-readiness.mjs';

const SCRIPT = fileURLToPath(new URL('./spec-readiness.mjs', import.meta.url));

/** Коды нарушений результата — в удобном для сравнения виде. */
const codes = (result) => result.errors.map((e) => `${e.code}:${e.capability}`);

// ─── Разбор proposal.md ──────────────────────────────────────────────────────

describe('parseCapabilities', () => {
  it('собирает имена из обоих подразделов', () => {
    const text = [
      '## Capabilities',
      '',
      '### New Capabilities',
      '',
      '- `tickets`: управление тикетами',
      '- `tickets-import`: импорт из JIRA',
      '',
      '### Modified Capabilities',
      '',
      '- `rooms`: меняется поведение закрытия',
      '',
      '## Impact',
      '',
      '- `backend/src/tickets/tickets.controller.ts` — правки',
    ].join('\n');

    assert.deepEqual(parseCapabilities(text), ['tickets', 'tickets-import', 'rooms']);
  });

  it('игнорирует плейсхолдеры шаблона', () => {
    const text = [
      '## Capabilities',
      '',
      '### New Capabilities',
      '- `<name>`: <brief description>',
      '### Modified Capabilities',
      '- `<existing-name>`: <what requirement is changing>',
    ].join('\n');

    assert.deepEqual(parseCapabilities(text), []);
  });

  it('не принимает прозу «Нет.» с inline-кодом за объявление', () => {
    const text = [
      '## Capabilities',
      '',
      '### New Capabilities',
      '',
      '- `archive-readiness`: проверка полноты артефактов',
      '',
      '### Modified Capabilities',
      '',
      'Нет. Единственная существующая спека — `tickets` — не затрагивается.',
    ].join('\n');

    assert.deepEqual(parseCapabilities(text), ['archive-readiness']);
  });

  it('не выходит за границы секции Capabilities', () => {
    const text = ['## Impact', '', '- `some-capability`: не отсюда'].join('\n');
    assert.deepEqual(parseCapabilities(text), []);
  });

  it('отбрасывает имена не в kebab-case и не дублирует', () => {
    const text = [
      '## Capabilities',
      '- `Tickets_Import`: неверный регистр и подчёркивание',
      '- `tickets`: годится',
      '- `tickets`: повтор',
      '- без inline-кода',
    ].join('\n');

    assert.deepEqual(parseCapabilities(text), ['tickets']);
  });

  it('принимает вложенный путь capability', () => {
    const text = ['## Capabilities', '- `billing/invoices`: счета'].join('\n');
    assert.deepEqual(parseCapabilities(text), ['billing/invoices']);
  });

  it('на пустом входе возвращает пустой список', () => {
    assert.deepEqual(parseCapabilities(''), []);
  });
});

// ─── Разбор tasks.md ─────────────────────────────────────────────────────────

describe('parseTaskCapabilityTags', () => {
  it('берёт пометку из конца заголовка группы', () => {
    const text = [
      '## 1. Ядро — `tickets`',
      '',
      '- [ ] 1.1 Что-то сделать',
      '',
      '## 2. Импорт — `tickets-import`',
      '',
      '- [ ] 2.1 Ещё что-то',
    ].join('\n');

    assert.deepEqual(parseTaskCapabilityTags(text), ['tickets', 'tickets-import']);
  });

  it('игнорирует inline-код в середине заголовка', () => {
    const text = '## 2. Оболочка `--json` и запуск';
    assert.deepEqual(parseTaskCapabilityTags(text), []);
  });

  it('игнорирует заголовки без пометки и пункты задач', () => {
    const text = ['## 1. Ядро проверки', '- [ ] 1.1 Задача с `tickets` внутри'].join('\n');
    assert.deepEqual(parseTaskCapabilityTags(text), []);
  });
});

// ─── Сверка ──────────────────────────────────────────────────────────────────

describe('checkChange — спеки', () => {
  it('эпик с полным покрытием проходит', () => {
    const result = checkChange({
      name: 'epic',
      declared: ['tickets', 'tickets-import'],
      specs: ['tickets', 'tickets-import'],
      taskTags: ['tickets', 'tickets-import'],
    });

    assert.deepEqual(result.errors, []);
    assert.equal(result.skipped, false);
  });

  it('заявленная capability без спеки даёт missing-spec', () => {
    const result = checkChange({
      name: 'epic',
      declared: ['tickets', 'tickets-import'],
      specs: ['tickets'],
      taskTags: ['tickets', 'tickets-import'],
    });

    assert.deepEqual(codes(result), [`${ERROR_CODES.MISSING_SPEC}:tickets-import`]);
  });

  it('спека без объявления даёт undeclared-spec', () => {
    const result = checkChange({
      name: 'change',
      declared: ['tickets'],
      specs: ['tickets', 'lishnyaya'],
      taskTags: [],
    });

    assert.deepEqual(codes(result), [`${ERROR_CODES.UNDECLARED_SPEC}:lishnyaya`]);
  });

  it('опечатка в имени папки даёт обе ошибки сразу', () => {
    const result = checkChange({
      name: 'change',
      declared: ['tickets'],
      specs: ['tikets'],
      taskTags: [],
    });

    assert.deepEqual(codes(result).sort(), [
      `${ERROR_CODES.MISSING_SPEC}:tickets`,
      `${ERROR_CODES.UNDECLARED_SPEC}:tikets`,
    ]);
  });
});

describe('checkChange — покрытие задачами', () => {
  it('capability без группы задач даёт uncovered-capability', () => {
    const result = checkChange({
      name: 'epic',
      declared: ['tickets', 'tickets-import'],
      specs: ['tickets', 'tickets-import'],
      taskTags: ['tickets'],
    });

    assert.deepEqual(codes(result), [`${ERROR_CODES.UNCOVERED_CAPABILITY}:tickets-import`]);
  });

  it('пометка на несуществующую capability даёт unknown-capability-tag', () => {
    const result = checkChange({
      name: 'epic',
      declared: ['tickets', 'tickets-import'],
      specs: ['tickets', 'tickets-import'],
      taskTags: ['tickets', 'tickets-import', 'tickets-export'],
    });

    assert.deepEqual(codes(result), [`${ERROR_CODES.UNKNOWN_CAPABILITY_TAG}:tickets-export`]);
  });

  it('единственная capability не требует пометок', () => {
    const result = checkChange({
      name: 'simple',
      declared: ['tickets'],
      specs: ['tickets'],
      taskTags: [],
    });

    assert.deepEqual(result.errors, []);
  });

  it('skip_specs пропускает изменение целиком', () => {
    const result = checkChange({
      name: 'tooling',
      declared: [],
      specs: ['ostatok'],
      taskTags: ['chuzhoy-tag'],
      skipSpecs: true,
    });

    assert.equal(result.skipped, true);
    assert.deepEqual(result.errors, []);
  });
});

describe('readsSkipSpecs', () => {
  it('распознаёт маркер и его отсутствие', () => {
    assert.equal(readsSkipSpecs('schema: spec-driven\nskip_specs: true\n'), true);
    assert.equal(readsSkipSpecs('schema: spec-driven\nskip_specs: false\n'), false);
    assert.equal(readsSkipSpecs('schema: spec-driven\n'), false);
  });
});

// ─── Файловые фикстуры ───────────────────────────────────────────────────────

const tempRoots = [];

/** Собрать во временной папке дерево openspec/changes/ и вернуть путь к нему. */
function makeFixture(changes) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-readiness-'));
  tempRoots.push(root);
  const changesDir = path.join(root, 'changes');

  for (const [name, change] of Object.entries(changes)) {
    const dir = path.join(changesDir, name);
    fs.mkdirSync(dir, { recursive: true });

    if (change.metadata !== null) {
      fs.writeFileSync(path.join(dir, '.openspec.yaml'), change.metadata ?? 'schema: spec-driven\n');
    }
    if (change.proposal !== undefined) {
      fs.writeFileSync(path.join(dir, 'proposal.md'), change.proposal);
    }
    if (change.tasks !== undefined) {
      fs.writeFileSync(path.join(dir, 'tasks.md'), change.tasks);
    }
    for (const capability of change.specs ?? []) {
      const specDir = path.join(dir, 'specs', capability);
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), '## Purpose\n\nЗаглушка.\n');
    }
  }

  return changesDir;
}

after(() => {
  for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
});

const proposalWith = (...names) =>
  ['## Capabilities', '', '### New Capabilities', '', ...names.map((n) => `- \`${n}\`: описание`)].join(
    '\n',
  );

describe('файловый слой', () => {
  it('находит активные изменения и игнорирует архив и папки без метаданных', () => {
    const changesDir = makeFixture({
      alpha: { proposal: proposalWith('alpha-cap'), specs: ['alpha-cap'] },
      beta: { proposal: proposalWith('beta-cap'), specs: ['beta-cap'] },
      archive: { metadata: null },
      musor: { metadata: null },
    });

    assert.deepEqual(listActiveChanges(changesDir), ['alpha', 'beta']);
  });

  it('собирает capability по вложенным папкам со spec.md', () => {
    const changesDir = makeFixture({
      alpha: { specs: ['tickets', 'billing/invoices'] },
    });

    assert.deepEqual(collectSpecCapabilities(path.join(changesDir, 'alpha', 'specs')), [
      'billing/invoices',
      'tickets',
    ]);
  });

  it('архивное изменение с недостающей спекой не влияет на результат', () => {
    const changesDir = makeFixture({
      alpha: { proposal: proposalWith('alpha-cap'), specs: ['alpha-cap'] },
    });
    const archived = path.join(changesDir, 'archive', '2026-01-01-staroe');
    fs.mkdirSync(archived, { recursive: true });
    fs.writeFileSync(path.join(archived, '.openspec.yaml'), 'schema: spec-driven\n');
    fs.writeFileSync(path.join(archived, 'proposal.md'), proposalWith('poteryannaya'));

    const result = runCheck(changesDir);
    assert.equal(result.ok, true);
    assert.deepEqual(
      result.changes.map((c) => c.name),
      ['alpha'],
    );
  });

  it('проверка одного изменения не смотрит на соседей', () => {
    const changesDir = makeFixture({
      alpha: { proposal: proposalWith('alpha-cap'), specs: ['alpha-cap'] },
      beta: { proposal: proposalWith('beta-cap'), specs: [] },
    });

    assert.equal(runCheck(changesDir, 'alpha').ok, true);
    assert.equal(runCheck(changesDir, 'beta').ok, false);
    assert.equal(runCheck(changesDir).ok, false);
  });

  it('несуществующее изменение даёт ошибку', () => {
    const changesDir = makeFixture({ alpha: { proposal: proposalWith('alpha-cap'), specs: ['alpha-cap'] } });
    const result = runCheck(changesDir, 'net-takogo');

    assert.equal(result.ok, false);
    assert.match(result.error, /net-takogo/);
  });

  it('отсутствие активных изменений — успех', () => {
    const changesDir = makeFixture({});
    const result = runCheck(changesDir);

    assert.equal(result.ok, true);
    assert.deepEqual(result.changes, []);
  });

  it('изменение с skip_specs пропускается', () => {
    const changesDir = makeFixture({
      tooling: {
        metadata: 'schema: spec-driven\nskip_specs: true\n',
        proposal: '## Capabilities\n\nНет.\n',
      },
    });

    const result = runCheck(changesDir);
    assert.equal(result.ok, true);
    assert.equal(result.changes[0].skipped, true);
  });

  it('отсутствующий proposal.md означает пустой набор объявленных capability', () => {
    const changesDir = makeFixture({ alpha: { specs: ['osirotevshaya'] } });
    const result = runCheck(changesDir, 'alpha');

    assert.equal(result.ok, false);
    assert.deepEqual(codes(result.changes[0]), [`${ERROR_CODES.UNDECLARED_SPEC}:osirotevshaya`]);
  });
});

// ─── Запуск как процесса ─────────────────────────────────────────────────────

describe('запуск скрипта', () => {
  const run = (args) => {
    try {
      const stdout = execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
      return { status: 0, stdout };
    } catch (err) {
      return { status: err.status, stdout: err.stdout ?? '' };
    }
  };

  it('на репозитории проходит и в обычном, и в машиночитаемом режиме', () => {
    const plain = run([]);
    const json = run(['--json']);

    assert.equal(plain.status, 0);
    assert.equal(json.status, 0);

    const parsed = JSON.parse(json.stdout);
    assert.equal(parsed.ok, true);
    assert.ok(parsed.changes.every((change) => change.errors.length === 0));
  });

  it('на несуществующем изменении отдаёт код 1 в обоих режимах', () => {
    assert.equal(run(['net-takogo']).status, 1);

    const json = run(['net-takogo', '--json']);
    assert.equal(json.status, 1);

    const parsed = JSON.parse(json.stdout);
    assert.equal(parsed.ok, false);
    assert.match(parsed.error, /net-takogo/);
  });
});
