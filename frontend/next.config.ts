import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Самодостаточная сборка для Docker-образа: server.js + только нужные
  // зависимости вместо всех node_modules (~150 МБ вместо ~1 ГБ).
  output: 'standalone',
  // В монорепе npm workspaces зависимости лежат в корне — указываем его явно,
  // иначе трейсинг standalone-сборки их не найдёт.
  outputFileTracingRoot: path.join(process.cwd(), '..'),
};

export default nextConfig;
