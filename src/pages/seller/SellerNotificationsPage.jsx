// src/pages/seller/SellerNotificationsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import sellerApi from '../../api/seller.api';

const TYPE_ICON = {
  new_order:          '📦',
  order_cancelled:    '❌',
  order_completed:    '✅',
  driver_assigned:    '🚚',
  order_disputed:     '⚠️',
  account_suspended:  '🚫',
  account_unsuspended:'✅',
  new_rating:         '⭐',
  default:            '🔔',
};

export default function SellerNotificationsPage({ soundEnabled, onToggleSound, onBack }) {
  const { t } = useTranslation();
  const [items, setItems]    = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sellerApi.get('/notifications');
      setItems(res.data.data || res.data.notifications || res.data || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id) {
    try {
      await sellerApi.post(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      // silent
    }
  }

  async function markAllRead() {
    try {
      await Promise.all(items.filter((n) => !n.is_read).map((n) => sellerApi.post(`/notifications/${n.id}/read`)));
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      // silent
    }
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)   return `${diff} วินาทีที่แล้ว`;
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400)return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(diff / 86400)} วันที่แล้ว`;
  }

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="top-bar">
        <button className="top-bar-back" onClick={onBack}>‹</button>
        <span className="top-bar-title">
          {t('seller.notifications')}
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 8, background: 'var(--color-danger)', color: 'white',
                borderRadius: 10, padding: '1px 7px', fontSize: 11,
              }}
            >
              {unreadCount}
            </span>
          )}
        </span>
        <div style={{ width: 40 }} />
      </div>

      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', background: 'white', borderBottom: '0.5px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>
            {t('seller.notification_sound')}
          </span>
          <button
            onClick={onToggleSound}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: soundEnabled ? 'var(--color-primary)' : '#d1d5db',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span
              style={{
                position: 'absolute', top: 3,
                left: soundEnabled ? 22 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: 'white', transition: 'left 0.2s',
              }}
            />
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-main)' }}
          >
            อ่านทั้งหมด
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-center">⏳ {t('common.loading')}…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <div>ยังไม่มีการแจ้งเตือน</div>
        </div>
      ) : (
        <div>
          {items.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              style={{
                display: 'flex', gap: 12, padding: '14px 16px',
                background: n.is_read ? 'white' : 'var(--color-primary-light)',
                borderBottom: '0.5px solid var(--color-border-light)',
                cursor: n.is_read ? 'default' : 'pointer',
              }}
            >
              <div
                style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: n.is_read ? 'var(--color-bg)' : 'rgba(45,155,110,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}
              >
                {TYPE_ICON[n.type] || TYPE_ICON.default}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: 'var(--color-text-main)', marginBottom: 2 }}>
                  {n.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-sub)', lineHeight: 1.4 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 4 }}>
                  {timeAgo(n.created_at)}
                </div>
              </div>
              {!n.is_read && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', marginTop: 5, flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
