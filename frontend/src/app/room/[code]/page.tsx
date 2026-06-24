import styles from './page.module.css';

interface RoomPageProps {
  params: Promise<{ code: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;

  return (
    <div className={styles.room}>
      <div className={styles.board}>
        <div className={styles.ticket}>
          {/* TODO: текущий тикет на оценке */}
          Комната <strong>{code}</strong>
        </div>
        <div className={styles.cards}>
          {/* TODO: рендер карт из выбранной шкалы (@/shared SCALES) */}
          {/* TODO: клик по карте -> socket emit ClientEvents.CAST_VOTE */}
        </div>
      </div>
      <aside className={styles.sidebar}>
        {/* TODO: список участников и статус их голосов */}
        Участники
      </aside>
    </div>
  );
}
