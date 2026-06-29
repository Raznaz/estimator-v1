import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Space_Grotesk } from 'next/font/google';
import { AppHeader } from '@/components/AppHeader';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import { RoomHeaderProvider } from '@/lib/room-header-context';
import './globals.css';
import styles from './layout.module.css';

// Inter — тихий рабочий шрифт интерфейса; Space Grotesk — характерный
// дисплейный для заголовков и крупных чисел на картах. CSS-переменные
// потребляются токенами в globals.css (--font-body / --font-display).
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Estimator — Planning Poker',
  description: 'Командная оценка тикетов на refinement',
};

// Выполняется до гидрации: ставит сохранённую тему на <html>, чтобы не было
// тёмного мигания (FOUC) при перезагрузке на светлой теме. Дефолт — тёмная.
const themeInitScript = `
try {
  var t = localStorage.getItem('estimator-theme');
  if (t === 'light') document.documentElement.dataset.theme = 'light';
} catch (e) {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <AuthProvider>
          <ThemeProvider>
            <RoomHeaderProvider>
              <div className={styles.shell}>
                <AppHeader />
                <main className={styles.main}>{children}</main>
              </div>
            </RoomHeaderProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
