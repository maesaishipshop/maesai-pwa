// src/components/admin/AdminBottomNav.jsx
// Maesai Market — Admin Bottom Navigation (5 tabs)

import React from 'react';

const TABS = [
  { key: 'dashboard', icon: '📊', label: 'หน้าแรก' },
  { key: 'orders',    icon: '🧾', label: 'Orders'  },
  { key: 'drivers',   icon: '🚗', label: 'Drivers' },
  { key: 'users',     icon: '👥', label: 'Users'   },
  { key: 'chat',      icon: '💬', label: 'แชท'     },
  { key: 'finance',   icon: '💰', label: 'การเงิน' },
];

export default function AdminBottomNav({ tab, setTab, pendingDrivers = 0, chatUnread = 0 }) {
  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white',
        borderTop: '0.5px solid var(--color-border)',
        display: 'flex',
        zIndex: 1000,
        maxWidth: 480, margin: '0 auto',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map((t) => {
        const active = tab === t.key;
        const badge  = (t.key === 'drivers' && pendingDrivers > 0) || (t.key === 'chat' && chatUnread > 0);
        const badgeCount = t.key === 'drivers' ? pendingDrivers : chatUnread;
        return (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '8px 4px', border: 'none', background: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-main)',
              color: active ? 'var(--color-primary)' : 'var(--color-text-hint)',
              position: 'relative',
            }}
          >
            <div style={{ fontSize: 20, lineHeight: 1, position: 'relative' }}>
              {t.icon}
              {badge && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: 'var(--color-danger)',
                  color: 'white', fontSize: 9, fontWeight: 700,
                  borderRadius: 99, padding: '1px 4px', minWidth: 14,
                  textAlign: 'center',
                }}>
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 10, marginTop: 3, fontWeight: active ? 700 : 400,
              color: active ? 'var(--color-primary)' : 'var(--color-text-hint)',
            }}>
              {t.label}
            </span>
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '25%', right: '25%',
                height: 2, background: 'var(--color-primary)', borderRadius: 1,
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
