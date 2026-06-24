import styles from './page.module.css';

export default function HomePage() {
  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>Planning Poker для вашей команды</h1>
      <p className={styles.subtitle}>
        Создайте комнату, пригласите команду и оценивайте тикеты в реальном времени.
      </p>
      <div className={styles.actions}>
        <div className={styles.card}>
          {/* TODO: форма создания комнаты */}
          Создать комнату
        </div>
        <div className={styles.card}>
          {/* TODO: форма входа по коду комнаты */}
          Войти по коду
        </div>
      </div>
    </section>
  );
}
