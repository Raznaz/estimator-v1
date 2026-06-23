import type { Metadata } from 'next';
import type { ReactNode } from 'react';
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
        <div className={styles.shell}>
          <header className={styles.header}>
            <span className={styles.brand}>🃏 Estimator</span>
          </header>
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
