// src/components/buyer/BuyerBottomNav.jsx

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// BACKEND_URL = '' → รูปใช้ relative path (/uploads/...) → proxy forward ให้
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

function toImgUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BACKEND_URL}${path}`;
}

// แสดงรูปโปรไฟล์วงกลม ถ้าโหลดไม่ได้ → fallback เป็น emoji
function ProfileIcon({ profileImage, isActive }) {
  const [imgError, setImgError] = useState(false);
  const imgUrl = toImgUrl(profileImage);

  if (imgUrl && !imgError) {
    return (
      <img
        src={imgUrl}
        alt=""
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          objectFit: 'cover',
          border: isActive
            ? '2px solid var(--color-primary)'
            : '1.5px solid var(--color-border)',
          display: 'block',
        }}
        onError={() => setImgError(true)}
      />
    );
  }
  return <span className="bottom-nav-icon">👤</span>;
}

const TABS = [
  { key: 'home',    icon: '🛍️', labelKey: 'buyer.browse'   },
  { key: 'orders',  icon: '📋', labelKey: 'buyer.orders'   },
  { key: 'chat',    icon: '💬', labelKey: 'nav.chat'       },
  { key: 'profile', icon: '👤', labelKey: 'buyer.profile'  },
];

export default function BuyerBottomNav({
  activeTab,
  onTabChange,
  pendingCount = 0,
  unreadChat = 0,
  profileImage,
}) {
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {/* tab โปรไฟล์: ใช้รูปจริงถ้ามี */}
              {tab.key === 'profile' ? (
                <ProfileIcon profileImage={profileImage} isActive={isActive} />
              ) : (
                <span className="bottom-nav-icon">{tab.icon}</span>
              )}

              {tab.key === 'orders' && pendingCount > 0 && (
                <span
                  style={{
                    position: 'absolute', top: -2, right: -6,
                    background: 'var(--color-danger)', color: 'white',
                    borderRadius: '50%', minWidth: 16, height: 16,
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', fontFamily: 'var(--font-main)',
                  }}
                >
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
              {tab.key === 'chat' && unreadChat > 0 && (
                <span
                  style={{
                    position: 'absolute', top: -2, right: -6,
                    background: 'var(--color-danger)', color: 'white',
                    borderRadius: '50%', minWidth: 16, height: 16,
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', fontFamily: 'var(--font-main)',
                  }}
                >
                  {unreadChat > 9 ? '9+' : unreadChat}
                </span>
              )}
            </div>
            {t(tab.labelKey)}
          </button>
        );
      })}
    </nav>
  );
}
