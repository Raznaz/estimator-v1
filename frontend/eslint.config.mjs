import next from 'eslint-config-next';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...next,
  {
    ignores: ['.next/', 'node_modules/', 'next-env.d.ts'],
  },
  {
    rules: {
      // Гидрация из localStorage после монтирования (на сервере его нет) —
      // setState в useEffect здесь намеренный паттерн, не ошибка.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
