import styles from './Header.module.css';

export default function Header({ centerTitle, centerSub, rightContent, rightLabel, rightSub }) {
  return (
    <header className={styles.header + ' fade-up'}>
      <div className={styles.brand}>
        <div className={styles.logo}>🏏</div>
        <div>
          <h1 className={styles.brandName}>IPL Auction 2026</h1>
          <div className={styles.brandSub}>Professional Live Auction Management System</div>
        </div>
      </div>

      {centerTitle && (
        <div className={styles.headerCenter}>
          <h2 className={styles.pageTitle}>{centerTitle}</h2>
          {centerSub && <div className={styles.muted}>{centerSub}</div>}
        </div>
      )}

      <div className={styles.status}>
        {rightContent}
        {rightLabel && (
          <div>
            <strong>{rightLabel}</strong>
            {rightSub && <><br /><span className={styles.muted}>{rightSub}</span></>}
          </div>
        )}
      </div>
    </header>
  );
}
