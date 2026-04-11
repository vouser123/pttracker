// components/NavMenu.js — shared slide-in site navigation menu
import { useState } from 'react';
import styles from './NavMenu.module.css';

const NAV_PAGES = [
  { id: 'index', href: '/', label: '📱 PT Tracker', adminOnly: false },
  { id: 'pt_view', href: '/pt-view', label: '📊 View History', adminOnly: false },
  { id: 'pt_editor', href: '/program', label: '📋 Program Editor', adminOnly: true },
  { id: 'rehab_coverage', href: '/rehab', label: '📈 Coverage Analysis', adminOnly: false },
];

export default function NavMenu({ user, isAdmin, onSignOut, currentPage, actions = [], onAction }) {
  const [isOpen, setIsOpen] = useState(false);

  function close() {
    setIsOpen(false);
  }
  function toggle() {
    setIsOpen((o) => !o);
  }

  async function handleSignOut() {
    close();
    if (onSignOut) await onSignOut();
  }

  function handleAction(action) {
    close();
    if (onAction) onAction(action);
  }

  function handleRefresh() {
    close();
    window.location.reload();
  }

  // Exclude the current page from nav links; hide admin-only links for patients
  const navLinks = NAV_PAGES.filter((p) => p.id !== currentPage && (!p.adminOnly || isAdmin));

  return (
    <>
      {/* Trigger button — rendered inline, place inside header-actions */}
      <button
        type="button"
        className={styles['hamburger-btn']}
        onPointerUp={toggle}
        aria-label="Open menu"
        aria-expanded={isOpen}
        aria-controls="hamburgerMenu"
      >
        ☰
      </button>

      {/* Background overlay — tap to close */}
      <div
        className={`${styles['hamburger-overlay']} ${isOpen ? styles.active : ''}`}
        onPointerUp={close}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <nav
        id="hamburgerMenu"
        className={`${styles['hamburger-menu']} ${isOpen ? styles.active : ''}`}
        aria-label="Site navigation"
      >
        <div className={styles['hamburger-header']}>
          <h3>Menu</h3>
          <button
            type="button"
            className={styles['hamburger-close']}
            onPointerUp={close}
            aria-label="Close menu"
          >
            Close
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className={styles['hamburger-user-info']}>
            {/* Always "Signed in as" — matches vanilla JS hamburger-menu.js. Do NOT change to role name. */}
            <strong>Signed in as</strong>
            {user.email}
          </div>
        )}

        {/* Page-specific actions (e.g. Refresh Data) */}
        {actions.map((item) => (
          <button
            type="button"
            key={item.action}
            className={styles['hamburger-item']}
            onPointerUp={() => handleAction(item.action)}
          >
            <span className={styles['hamburger-icon']}>{item.icon}</span>
            {item.label}
          </button>
        ))}

        {/* Refresh — always present; reloads the page to re-fetch latest data */}
        <button type="button" className={styles['hamburger-item']} onPointerUp={handleRefresh}>
          <span className={styles['hamburger-icon']}>🔄</span>
          Refresh
        </button>

        {/* Nav links to other pages */}
        {navLinks.map((page) => (
          <a key={page.id} className={styles['hamburger-item']} href={page.href}>
            {page.label}
          </a>
        ))}

        {/* Sign out */}
        <button type="button" className={styles['hamburger-item']} onPointerUp={handleSignOut}>
          <span className={styles['hamburger-icon']}>🚪</span>
          Sign Out
        </button>
      </nav>
    </>
  );
}
