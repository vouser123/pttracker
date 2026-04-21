// app/(protected)/ProtectedPageHeader.js — shared protected-route header chrome for title, connectivity, optional actions, messages, and nav
import NavMenu from '../../components/NavMenu';
import styles from './ProtectedPageHeader.module.css';

export default function ProtectedPageHeader({
  title,
  isOnline,
  unreadCount = 0,
  onOpenMessages,
  actions = [],
  navMenuProps,
}) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.actions}>
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className={styles.iconButton}
            onPointerUp={action.onPointerUp}
            aria-label={action.ariaLabel ?? action.label}
            title={action.label}
          >
            {action.icon}
          </button>
        ))}
        <span
          className={`${styles.connectivityIndicator} ${isOnline ? '' : styles.connectivityIndicatorOffline}`}
          role="status"
          aria-label={isOnline ? 'Online' : 'Offline'}
          title={isOnline ? 'Online' : 'Offline'}
        >
          {isOnline ? '🛜' : '🚫'}
        </span>
        {onOpenMessages && (
          <div className={styles.messageButtonWrap}>
            <button
              type="button"
              className={styles.iconButton}
              onPointerUp={onOpenMessages}
              aria-label="Open messages"
              title="Open messages"
            >
              ✉️
              {unreadCount > 0 && <span className={styles.messagesBadge}>{unreadCount}</span>}
            </button>
          </div>
        )}
        {navMenuProps && <NavMenu {...navMenuProps} />}
      </div>
    </header>
  );
}
