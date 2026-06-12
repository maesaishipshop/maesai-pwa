// src/components/seller/SellerBottomNav.jsx

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toImgUrl } from '../../utils/imageUrl';

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
  { key: 'home',     icon: '🏠', labelKey: 'seller.dashboard'  },
  { key: 'products', icon: '📦', labelKey: 'seller.my_products' },
  { key: 'orders',   icon: '📋', labelKey: 'seller.orders'      },
  { key: 'chat',     icon: '💬', labelKey: 'nav.chat'           },
  { key: 'profile',  icon: '👤', labelKey: 'seller.profile'     },
];

export default function SellerBottomNav({
  activeTab,
  onTabChange,
  pendingCount = 0,
  chatUnread = 0,
  profileImage,
}) {
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const badge =
          tab.key === 'orders' ? pendingCount :
          tab.key === 'chat'   ? chatUnread   : 0;
        // orders badge → แดง, chat badge → แดง (สม่ำเสมอกัน)
        const badgeColor = 'var(--color-danger)';

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

              {badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -6,
                    background: badgeColor,
                    color: 'white',
                    borderRadius: '50%',
                    minWidth: 16,
                    height: 16,
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    fontFamily: 'var(--font-main)',
                  }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            {t(tab.labelKey) || tab.labelKey}
          </button>
        );
      })}
    </nav>
  );
}
