// src/pages/admin/AdminOrdersPage.jsx
// Maesai Market — Admin Orders (Step 15-6)
// GET /api/admin/orders

import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../api/admin.api';

/* ── Status config ────────────────────────────────────── */
const STATUS_FILTERS = [
  { key: 'all',              label: 'ทั้งหมด'    },
  { key: 'pending_seller',   label: 'รอรับ'      },
  { key: 'confirmed',        label: 'รับแล้ว'    },
  { key: 'ready_for_pickup', label: 'รอ Driver'  },
  { key: 'picked_up',        label: 'กำลังส่ง'   },
  { key: 'delivered',        label: 'ส่งแล้ว'    },
  { key: 'completed',        label: 'เสร็จ'      },
  { key: 'disputed',         label: 'Dispute'    },
  { key: 'cancelled',        label: 'ยกเลิก'    },
];

function statusLabel(s) {
  const m = {
    pending_seller:   '⏳ รอ Seller',
    confirmed:        '✅ รับแล้ว',
    ready_for_pickup: '📦 รอ Driver',
    driver_assigned:  '🚗 Driver กำลังไป',
    picked_up:        '🏃 กำลังส่ง',
    delivered:        '📬 ส่งแล้ว',
    completed:        '🎉 เสร็จ',
    disputed:         '⚠️ Dispute',
    cancelled:        '❌ ยกเลิก',
  };
  return m[s] || s;
}

function statusColor(s) {
  if (s === 'completed') return 'var(--color-primary)';
  if (s === 'disputed')  return 'var(--color-danger)';
  if (s === 'cancelled') return '#6b7280';
  if (s === 'delivered') return '#16a34a';
  if (s === 'picked_up') return '#0284c7';
  return '#7c3aed';
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── Order Card ────────────────────────────────────────── */
function OrderCard({ order, onClick }) {
  return (
    <div
      className="card"
      style={{ marginBottom: 8, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          #{order.order_number || order.id}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: statusColor(order.status),
          background: '#f8f8f8',
          padding: '2px 8px', borderRadius: 99,
        }}>
          {statusLabel(order.status)}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>
        🏪 {order.seller_name} → 🛍️ {order.buyer_name}
      </div>
      {order.driver_name && order.driver_name.trim() !== '' && (
        <div style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>
          🚗 {order.driver_name}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-primary)' }}>
          ฿{Number(order.total || 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-hint)' }}>
          {fmt(order.created_at)}
        </div>
      </div>
    </div>
  );
}

/* ── Order Detail Modal ────────────────────────────────── */
function OrderModal({ orderId, onClose, showToast }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminApi.get(`/admin/orders/${orderId}`);
        setData(res.data);
      } catch (err) {
        showToast('โหลดรายละเอียดไม่สำเร็จ');
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, onClose, showToast]);

  async function handleResolveDispute(decision) {
    if (!window.confirm(`ตัดสิน Dispute: ${decision} ใช่หรือไม่?`)) return;
    setResolving(true);
    try {
      await adminApi.post(`/admin/payouts/disputes/${orderId}/resolve`, { decision });
      showToast('✅ ตัดสิน Dispute สำเร็จ');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || '';
      showToast('❌ ตัดสิน Dispute ไม่สำเร็จ: ' + msg);
    } finally {
      setResolving(false);
    }
  }

  const o = data?.order || {};
  const items  = data?.items  || [];
  const photos = data?.photos || [];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000,
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        background: 'white', borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: 480, margin: '0 auto',
        maxHeight: '90vh', overflow: 'auto', paddingBottom: 32,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 16px 12px', borderBottom: '0.5px solid var(--color-border)',
          position: 'sticky', top: 0, background: 'white', zIndex: 1,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            #{o.order_number || orderId}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-hint)' }}>กำลังโหลด…</div>
        ) : (
          <div style={{ padding: 16 }}>

            {/* Status badge */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: statusColor(o.status),
                background: '#f8f8f8', padding: '4px 16px', borderRadius: 99,
              }}>
                {statusLabel(o.status)}
              </span>
            </div>

            {/* Parties */}
            <div style={{
              background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
              padding: 12, marginBottom: 12, fontSize: 12,
            }}>
              <div style={{ marginBottom: 4 }}>🏪 <b>{o.seller_name}</b> {o.seller_phone && `• ${o.seller_phone}`}</div>
              <div style={{ marginBottom: 4 }}>🛍️ <b>{o.buyer_name}</b> {o.buyer_phone && `• ${o.buyer_phone}`}</div>
              {(o.driver_first_name) && (
                <div>🚗 <b>{o.driver_first_name} {o.driver_last_name}</b>
                  {o.driver_phone && ` • ${o.driver_phone}`}
                  {o.vehicle_plate && ` (${o.vehicle_plate})`}
                </div>
              )}
            </div>

            {/* Items */}
            {items.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-hint)', marginBottom: 8 }}>
                  รายการสินค้า
                </div>
                {items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 0', borderBottom: '0.5px solid var(--color-border)',
                    fontSize: 13,
                  }}>
                    <span>{item.product_name} × {item.quantity} {item.unit}</span>
                    <span style={{ fontWeight: 600 }}>฿{Number(item.subtotal || 0).toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontWeight: 700 }}>
                  <span>ค่าส่ง</span>
                  <span>฿{Number(o.shipping_fee || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontWeight: 800, fontSize: 15, color: 'var(--color-primary)' }}>
                  <span>ยอดรวม</span>
                  <span>฿{Number(o.total || 0).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Delivery Photos */}
            {photos.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-hint)', marginBottom: 8 }}>
                  รูปยืนยัน ({photos.length} รูป)
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {photos.map((p, i) => (
                    <img
                      key={i}
                      src={p.file_path || p.url}
                      alt={`photo-${i}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Dispute resolution */}
            {o.status === 'disputed' && (
              <div style={{
                background: '#fff7ed', borderRadius: 'var(--radius-md)',
                border: '1px solid #fed7aa', padding: 16, marginTop: 8,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#c2410c', marginBottom: 12 }}>
                  ⚠️ ตัดสิน Dispute
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1 }}
                    disabled={resolving}
                    onClick={() => handleResolveDispute('APPROVED')}
                  >
                    ✅ อนุมัติ Buyer
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    disabled={resolving}
                    onClick={() => handleResolveDispute('REJECTED')}
                  >
                    ❌ ปฏิเสธ Buyer
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 8, textAlign: 'center' }}>
                  APPROVED = คืนเงิน Buyer | REJECTED = จ่ายให้ Seller+Driver
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────── */
export default function AdminOrdersPage({ showToast }) {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter,  setFilter]  = useState('all');
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [selected, setSelected] = useState(null);

  const LIMIT = 20;

  const load = useCallback(async (status, pg) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (status !== 'all') params.status = status;
      const res = await adminApi.get('/admin/orders', { params });
      const fetched = res.data.orders || [];
      setOrders(pg === 1 ? fetched : (prev) => [...prev, ...fetched]);
      setTotal(res.data.total || 0);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '';
      showToast('โหลด Orders ไม่สำเร็จ: ' + msg);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    setPage(1);
    setOrders([]);
    load(filter, 1);
  }, [filter, load]);

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    load(filter, nextPage);
  }

  const hasMore = orders.length < total;

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="top-bar">
        <span className="top-bar-title">🧾 Orders</span>
        <button onClick={() => load(filter, 1)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>
          🔄
        </button>
      </div>

      {/* Filter scroll */}
      <div style={{ overflowX: 'auto', padding: '0 16px 0', paddingTop: 8 }}>
        <div style={{ display: 'flex', gap: 6, paddingBottom: 8, whiteSpace: 'nowrap' }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '5px 12px',
                borderRadius: 99,
                border: filter === f.key ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: filter === f.key ? 'var(--color-primary-light)' : 'white',
                color: filter === f.key ? 'var(--color-primary)' : 'var(--color-text-sub)',
                fontSize: 11, fontWeight: filter === f.key ? 700 : 400,
                cursor: 'pointer', fontFamily: 'var(--font-main)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 16px' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 8 }}>
          ทั้งหมด {total.toLocaleString()} รายการ
        </div>

        {loading && orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-hint)' }}>กำลังโหลด…</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>ไม่มี order ที่ตรงกัน</div>
          </div>
        ) : (
          <>
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} onClick={() => setSelected(o.id)} />
            ))}
            {hasMore && (
              <button
                className="btn-secondary"
                style={{ marginTop: 8 }}
                disabled={loading}
                onClick={loadMore}
              >
                {loading ? 'กำลังโหลด…' : `โหลดเพิ่ม (${total - orders.length} รายการ)`}
              </button>
            )}
          </>
        )}
      </div>

      {selected && (
        <OrderModal
          orderId={selected}
          onClose={() => setSelected(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
