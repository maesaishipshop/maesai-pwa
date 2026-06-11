// src/pages/driver/DriverHistoryPage.jsx
// Tab ประวัติ — งานที่ทำเสร็จแล้ว (completed, disputed)
// GET /api/orders/driver?status=completed,disputed

import React, { useState, useEffect, useCallback } from 'react';
import driverApi from '../../api/driver.api';

const FILTERS = [
  { key: 'today',  label: 'วันนี้'    },
  { key: 'week',   label: 'สัปดาห์นี้' },
  { key: 'all',    label: 'ทั้งหมด'   },
];

function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isThisWeek(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── History Card ─────────────────────────────────── */
function HistoryCard({ order }) {
  const isDisputed = order.status === 'disputed';
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-main)' }}>
          #{order.order_number || order.id}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: isDisputed ? 'var(--color-danger)' : 'var(--color-primary)',
          background: isDisputed ? '#fff0f0' : 'var(--color-primary-light)',
          padding: '2px 8px', borderRadius: 99,
        }}>
          {isDisputed ? '⚠️ ข้อพิพาท' : '✅ ส่งสำเร็จ'}
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 2 }}>
        🏪 {order.seller_name || 'ร้านค้า'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 6 }}>
        📍 {order.delivery_address || order.buyer_name || 'ปลายทาง'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
          💰 ฿{Number(order.delivery_fee || 0).toLocaleString()}
        </div>
        {order.driver_rating && (
          <div style={{ fontSize: 12, color: '#f59e0b' }}>
            {'⭐'.repeat(order.driver_rating)} {order.driver_rating}/5
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 4 }}>
        {formatDate(order.delivered_at || order.updated_at)}
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────── */
export default function DriverHistoryPage({ showToast }) {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter,  setFilter]  = useState('week');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await driverApi.get('/orders/driver', {
        params: { status: 'completed,disputed', limit: 100 },
      });
      const data = res.data.orders || res.data.data || [];
      setOrders(Array.isArray(data) ? data : []);
    } catch (_) {
      showToast('โหลดประวัติไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  /* ── Filter ──────────────────────────────────── */
  const filtered = orders.filter((o) => {
    const date = o.delivered_at || o.updated_at;
    if (filter === 'today') return isToday(date);
    if (filter === 'week')  return isThisWeek(date);
    return true;
  });

  const totalEarnings = filtered.reduce((sum, o) => sum + Number(o.delivery_fee || 0), 0);

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="top-bar">
        <span className="top-bar-title">📋 ประวัติการส่ง</span>
        <button
          onClick={loadOrders}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          🔄
        </button>
      </div>

      <div style={{ padding: 16 }}>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                flex: 1, padding: '8px 4px',
                borderRadius: 'var(--radius-sm)',
                border: filter === f.key ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: filter === f.key ? 'var(--color-primary-light)' : 'white',
                color: filter === f.key ? 'var(--color-primary)' : 'var(--color-text-sub)',
                fontSize: 12, fontWeight: filter === f.key ? 700 : 400,
                cursor: 'pointer', fontFamily: 'var(--font-main)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Summary */}
        {filtered.length > 0 && (
          <div style={{
            background: 'var(--color-primary-light)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px', marginBottom: 16,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-primary-dark)' }}>จำนวนงาน</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>
                {filtered.length} งาน
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--color-primary-dark)' }}>รายได้รวม</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>
                ฿{totalEarnings.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-hint)', padding: 40 }}>
            กำลังโหลด…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>
              ยังไม่มีประวัติ{filter === 'today' ? 'วันนี้' : filter === 'week' ? 'สัปดาห์นี้' : ''}
            </div>
          </div>
        ) : (
          filtered.map((o) => <HistoryCard key={o.id} order={o} />)
        )}

      </div>
    </div>
  );
}
