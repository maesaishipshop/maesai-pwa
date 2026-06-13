// src/pages/buyer/BuyerOrdersPage.jsx
// รายการ order ของ Buyer — filter tabs, status badge, tap to detail

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import buyerApi from '../../api/buyer.api';

const STATUS_TABS = [
  { key: '',                 labelKey: 'common.all'                   },
  { key: 'pending_seller',  labelKey: 'order.status_pending_seller'   },
  { key: 'ready_for_pickup',labelKey: 'order.status_ready_for_pickup' },
  { key: 'picked_up',       labelKey: 'order.status_picked_up'       },
  { key: 'delivered',       labelKey: 'order.status_delivered'       },
  { key: 'completed',       labelKey: 'order.status_completed'       },
  { key: 'cancelled',       labelKey: 'order.status_cancelled'       },
  { key: 'disputed',        labelKey: 'order.status_disputed'        },
];

const STATUS_BADGE = {
  pending_seller:   'badge-warning',
  ready_for_pickup: 'badge-info',
  driver_assigned:  'badge-info',
  picked_up:        'badge-info',
  delivered:        'badge-warning',
  completed:        'badge-success',
  cancelled:        'badge-danger',
  disputed:         'badge-danger',
};

function OrderCard({ order, onSelect }) {
  const { t } = useTranslation();
  const status = order.status;
  const total  = Number(order.total || 0);

  return (
    <div
      onClick={() => onSelect(order.id)}
      style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '0.5px solid var(--color-border)',
        padding: '14px 16px',
        marginBottom: 10,
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>#{order.order_number}</span>
        <span className={`badge ${STATUS_BADGE[status] || 'badge-gray'}`}>
          {t(`order.status_${status}`) || status}
        </span>
      </div>

      {/* Shop name */}
      {order.shop_name && (
        <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, marginBottom: 4 }}>
          🏪 {order.shop_name}
        </div>
      )}

      {/* First item summary */}
      <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>
        {order.first_item_name
          ? `${order.first_item_name}${order.item_count > 1 ? ` + ${order.item_count - 1} รายการ` : ''}`
          : '—'}
      </div>

      {/* Date */}
      <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginBottom: 8 }}>
        {new Date(order.created_at).toLocaleDateString('th-TH', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-hint)' }}>
          {t('order.shipping_fee')}: ฿{Number(order.shipping_fee || 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>
          ฿{total.toLocaleString()}
        </div>
      </div>

      {/* Delivered hint */}
      {status === 'delivered' && (
        <div
          style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 8,
            background: '#fff8e1', border: '1px solid #ffe082',
            fontSize: 12, color: '#8a6d00', textAlign: 'center',
          }}
        >
          📬 สินค้าถึงแล้ว — กดเพื่อยืนยันรับสินค้า
        </div>
      )}
    </div>
  );
}

export default function BuyerOrdersPage({ onSelectOrder, onPendingCountChange }) {
  const { t } = useTranslation();
  const [orders, setOrders]       = useState([]);
  const [activeStatus, setStatus] = useState('');
  const [loading, setLoading]     = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (activeStatus) params.status = activeStatus;
      const res = await buyerApi.get('/orders/buyer', { params });
      const data = res.data.orders || res.data.data || res.data || [];
      setOrders(data);
      if (onPendingCountChange) {
        const pendingCnt = data.filter((o) => o.status === 'pending_seller').length;
        onPendingCountChange(pendingCnt);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, onPendingCountChange]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="top-bar">
        <span className="top-bar-title">{t('buyer.my_orders')}</span>
        <button
          onClick={loadOrders}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          🔄
        </button>
      </div>

      {/* Status filter tabs */}
      <div
        className="scroll-x"
        style={{
          display: 'flex', gap: 6, padding: '12px 16px',
          background: 'white', borderBottom: '0.5px solid var(--color-border)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch', // iOS smooth momentum scroll
          scrollbarWidth: 'none',           // Firefox
        }}
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            style={{
              padding: '6px 13px', borderRadius: 20, border: 'none',
              background: activeStatus === tab.key ? 'var(--color-primary)' : 'var(--color-bg)',
              color: activeStatus === tab.key ? 'white' : 'var(--color-text-sub)',
              fontSize: 12, fontWeight: activeStatus === tab.key ? 600 : 400,
              cursor: 'pointer', fontFamily: 'var(--font-main)', whiteSpace: 'nowrap',
            }}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Order list */}
      <div style={{ padding: 16 }}>
        {loading ? (
          <div className="loading-center">⏳ {t('common.loading')}…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div>{t('buyer.no_orders')}</div>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onSelect={onSelectOrder}
            />
          ))
        )}
      </div>
    </div>
  );
}
