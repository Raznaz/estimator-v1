import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Транспилируем общий пакет (исходники TS вместо предсобранного билда)
  transpilePackages: ['@estimator/shared'],
};

export default nextConfig;
