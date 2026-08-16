import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-config-prettier';

/**
 * Корневой flat-config ESLint 9 (заменил legacy `.eslintrc.json`, который ESLint 9
 * уже не читает). Применяется к backend: ESLint ищет конфиг от текущей папки вверх,
 * поэтому `eslint src` из backend/ находит этот файл.
 *
 * У frontend свой `frontend/eslint.config.mjs` с правилами Next — сюда он не входит.
 *
 * @type {import('eslint').Linter.Config[]}
 */
const config = [
  {
    ignores: [
      'node_modules/',
      '**/node_modules/',
      'dist/',
      '**/dist/',
      '.next/',
      '**/.next/',
      'build/',
      // У фронтенда собственный конфиг — не линтим его отсюда.
      'frontend/',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node-окружение: backend запускается в Node, не в браузере.
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // Неиспользуемые аргументы с префиксом _ — осознанная заглушка, не ошибка.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Служебные Node-скрипты репозитория (гейт спек и его тесты на node:test).
  // Корневой `npm run lint` идёт по workspaces и сюда не заходит — блок нужен,
  // чтобы `npx eslint scripts/` не спотыкался о Node-глобалы.
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
      },
    },
  },

  // Глобалы Jest — только для тестовых файлов.
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
      },
    },
  },

  // Отключает правила форматирования, за которые отвечает Prettier.
  // Должен идти последним, чтобы перекрыть предыдущие наборы.
  prettier,
];

export default config;
