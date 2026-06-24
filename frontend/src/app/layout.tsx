import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'Estimator — Planning Poker',
  description: 'Командная оценка тикетов на refinement',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          <div className={styles.shell}>
            <AppHeader />
            <main className={styles.main}>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
