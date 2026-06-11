// src/pages/seller/SellerHomePage.jsx
// Bug #2 fix: ลบ /sellers/dashboard (ไม่มีใน backend)
//   - เรียก /orders/seller?limit=50 เพื่อดึง orders มาคำนวณ stats เอง
//   - เรียก /orders/seller?status=pending_seller&limit=3 แยก สำหรับแสดง pending list
//   - แต่ละ order ใน list response มีแค่ first_item_name + item_count (ไม่มี items[])
//     → OrderCard แสดง first_item_name แทน loop items

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import sellerApi from '../../api/seller.api';

function StatCard({ label, value, unit = '', color = 'var(--color-primary)' }) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '0.5px solid var(--color-border)',
        padding: '14px 16px',
        flex: '1 1 calc(50% - 6px)',
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--color-text-sub)', marginBottom: 6, lineHeight: 1.3 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
        {unit && (
          <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 3, color: 'var(--color-text-sub)' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// Bug #2 fix: OrderCard ใช้ first_item_name + item_count แทน items[]
// เพราะ GET /orders/seller (list endpoint) ไม่มี items[] ใน response
function OrderCard({ order, onAccept, onReject, accepting, rejecting }) {
  const { t } = useTranslation();
  const total     = Number(order.total || 0);
  const itemCount = Number(order.item_count || 0);

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '0.5px solid var(--color-border)',
        padding: '14px 16px',
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)' }}>
          #{order.order_number}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-hint)' }}>
          {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 8 }}>
        {t('seller.buyer')}: {order.buyer_name || '—'}
      </div>

      {/* Bug #2 fix: แสดง first_item_name + item_count แทน loop items[] */}
      {order.first_item_name && (
        <div style={{ fontSize: 12, color: 'var(--color-text-main)', marginBottom: 2 }}>
          • {order.first_item_name}
          {itemCount > 1 && (
            <span style={{ color: 'var(--color-text-hint)' }}>
              {' '}+{itemCount - 1} {t('seller.items')}
            </span>
          )}
        </div>
      )}
      {!order.first_item_name && (
        <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 2 }}>
          {itemCount} {t('seller.items')}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>
          ฿{total.toLocaleString()}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onReject(order.id)}
            disabled={rejecting}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-danger)',
              background: 'white',
              color: 'var(--color-danger)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-main)',
              cursor: 'pointer',
            }}
          >
            {t('seller.reject_order')}
          </button>
          <button
            onClick={() => onAccept(order.id)}
            disabled={accepting}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--color-primary)',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-main)',
              cursor: 'pointer',
            }}
          >
            {t('seller.accept_order')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Bug #2 fix: คำนวณ dashboard stats จาก orders ที่ดึงมา
// เพราะ /sellers/dashboard ไม่มีใน backend
function computeStats(allOrders) {
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todayOrders = allOrders.filter(
    (o) => new Date(o.created_at).getTime() >= todayStart
  );

  const todayRevenue = todayOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );
  const todayRevenueNet = todayOrders.reduce(
    (sum, o) => sum + Number(o.total || 0) - Number(o.commission_amount || 0),
    0
  );
  // pending_payout = orders ที่ส่งถึงแล้ว (delivered) แต่ยังไม่ได้โอน
  const pendingPayout = allOrders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total || 0) - Number(o.commission_amount || 0), 0);

  return {
    today_orders:      todayOrders.length,
    today_revenue:     todayRevenue,
    today_revenue_net: todayRevenueNet,
    pending_payout:    pendingPayout,
  };
}

export default function SellerHomePage({ profile, onTabChange }) {
  const { t } = useTranslation();
  const [stats, setStats]           = useState(null);
  const [pendingOrders, setPending] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [actionId, setActionId]     = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Bug #2 fix: ดึง 2 endpoint แยกกัน
      // 1. orders ทั้งหมด limit=50 → คำนวณ stats
      // 2. pending_seller limit=3 → แสดงในหน้า home
      const [allOrdersRes, pendingRes] = await Promise.allSettled([
        sellerApi.get('/orders/seller', { params: { limit: 50 } }),
        sellerApi.get('/orders/seller', { params: { status: 'pending_seller', limit: 3 } }),
      ]);

      if (allOrdersRes.status === 'fulfilled') {
        const allOrders = allOrdersRes.value.data?.orders || [];
        setStats(computeStats(allOrders));
      } else {
        // ถ้า API fail ให้ใช้ zero stats
        setStats({ today_orders: 0, today_revenue: 0, today_revenue_net: 0, pending_payout: 0 });
      }

      if (pendingRes.status === 'fulfilled') {
        const data = pendingRes.value.data;
        setPending(data?.orders || data?.data || []);
      }
    } catch (e) {
      // silent — keep existing state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAccept(orderId) {
    setActionId(orderId);
    try {
      await sellerApi.post(`/orders/${orderId}/accept`);
      setPending((prev) => prev.filter((o) => o.id !== orderId));
    } catch (e) {
      alert(e.response?.data?.message || t('common.error'));
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(orderId) {
    if (!window.confirm(t('seller.confirm_reject'))) return;
    setActionId(orderId);
    try {
      await sellerApi.post(`/orders/${orderId}/reject`);
      setPending((prev) => prev.filter((o) => o.id !== orderId));
    } catch (e) {
      alert(e.response?.data?.message || t('common.error'));
    } finally {
      setActionId(null);
    }
  }

  const shopName = profile?.shop_name || 'Maesai Market';

  return (
    <div style={{ paddingBottom: 80 }}>
      <div
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
          padding: '20px 16px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
              {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 2 }}>
              {shopName}
            </div>
          </div>
          <button
            onClick={loadData}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 10,
              width: 36,
              height: 36,
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            🔄
          </button>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <div className="loading-center">⏳ {t('common.loading')}…</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              <StatCard
                label={t('seller.today_orders')}
                value={stats?.today_orders ?? '—'}
                color="var(--color-primary)"
              />
              <StatCard
                label={t('seller.revenue_today')}
                value={stats?.today_revenue != null ? Number(stats.today_revenue).toLocaleString() : '—'}
                unit="฿"
                color="var(--color-primary-dark)"
              />
              <StatCard
                label={t('seller.revenue_net')}
                value={stats?.today_revenue_net != null ? Number(stats.today_revenue_net).toLocaleString() : '—'}
                unit="฿"
                color="#3B82F6"
              />
              <StatCard
                label={t('seller.pending_payout')}
                value={stats?.pending_payout != null ? Number(stats.pending_payout).toLocaleString() : '—'}
                unit="฿"
                color="var(--color-warning)"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="section-title" style={{ margin: 0 }}>
                {t('seller.pending_orders_section')}
                {pendingOrders.length > 0 && (
                  <span
                    style={{
                      marginLeft: 8,
                      background: 'var(--color-danger)',
                      color: 'white',
                      borderRadius: 10,
                      padding: '1px 7px',
                      fontSize: 11,
                    }}
                  >
                    {pendingOrders.length}
                  </span>
                )}
              </div>
              {pendingOrders.length > 0 && (
                <button
                  onClick={() => onTabChange('orders')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-main)',
                  }}
                >
                  {t('common.all')} ›
                </button>
              )}
            </div>

            {pendingOrders.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '28px 16px',
                  color: 'var(--color-text-hint)',
                  fontSize: 13,
                  background: 'white',
                  borderRadius: 'var(--radius-lg)',
                  border: '0.5px solid var(--color-border)',
                }}
              >
                ✅ {t('seller.no_orders')}
              </div>
            ) : (
              pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  accepting={actionId === order.id}
                  rejecting={actionId === order.id}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
