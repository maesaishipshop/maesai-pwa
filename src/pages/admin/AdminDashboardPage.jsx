// src/pages/admin/AdminDashboardPage.jsx
// Maesai Market — Admin Dashboard (Step 15-6)
// GET /api/admin/dashboard

import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../api/admin.api';

function StatCard({ icon, label, value, sub, color = 'var(--color-primary)', badge, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: `0.5px solid var(--color-border)`,
        padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: 8, right: 8,
          background: 'var(--color-danger)',
          color: 'white', fontSize: 10, fontWeight: 700,
          borderRadius: 99, padding: '2px 7px',
        }}>
          {badge}
        </span>
      )}
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 2 }}>{sub}</div>}
      <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: 'var(--color-text-hint)',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function AdminDashboardPage({ showToast, onNavigate }) {
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [maintenance, setMaintenance] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/admin/dashboard');
      setStats(res.data.data || res.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '';
      showToast('โหลด Dashboard ไม่สำเร็จ: ' + msg);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    adminApi.get('/admin/maintenance')
      .then(r => setMaintenance(r.data.maintenance_mode))
      .catch(() => {});
  }, []);

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>กำลังโหลด…</div>
      </div>
    );
  }

  const s = stats || {};
  const sales    = s.sales    || {};
  const comm     = s.commission || {};
  const users    = s.users    || {};
  const pending  = s.pending  || {};
  const byStatus = s.orders_by_status || {};

  async function handleToggleMaintenance() {
    const newVal = !maintenance;
    try {
      await adminApi.put('/admin/maintenance', { enabled: newVal });
      setMaintenance(newVal);
    } catch (err) {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="top-bar">
        <span className="top-bar-title">📊 Admin Dashboard</span>
        <button
          onClick={load}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          🔄
        </button>
      </div>

      <div style={{ padding: 16 }}>

        {/* ── Maintenance Mode Toggle ── */}
        <div className="card" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem' }}>
          <div>
            <div style={{ fontWeight: 600, fontFamily: 'Prompt' }}>🔧 Maintenance Mode</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontFamily: 'Prompt' }}>
              {maintenance ? '🔴 ระบบปิดให้บริการอยู่' : '🟢 ระบบเปิดให้บริการปกติ'}
            </div>
          </div>
          <button
            onClick={handleToggleMaintenance}
            className={maintenance ? 'btn-danger' : 'btn-primary'}
            style={{ minWidth: '80px' }}
          >
            {maintenance ? 'ปิด' : 'เปิด'}
          </button>
        </div>

        {/* ── ยอดขายวันนี้ ── */}
        <Section title="ยอดขายวันนี้">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StatCard
              icon="🛒" label="คำสั่งซื้อวันนี้"
              value={sales.today?.count ?? '—'}
              sub={`฿${Number(sales.today?.amount || 0).toLocaleString()}`}
            />
            <StatCard
              icon="💵" label="Commission วันนี้"
              value={`฿${Number(comm.today || 0).toLocaleString()}`}
              color="#059669"
              sub={`เดือนนี้ ฿${Number(comm.this_month || 0).toLocaleString()}`}
            />
          </div>
        </Section>

        {/* ── สิ่งที่รอดำเนินการ ── */}
        <Section title="รอดำเนินการ">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StatCard
              icon="🚗" label="Driver รออนุมัติ"
              value={pending.driver_approvals ?? 0}
              color={pending.driver_approvals > 0 ? 'var(--color-danger)' : 'var(--color-text-main)'}
              badge={pending.driver_approvals}
              onClick={() => onNavigate('drivers')}
            />
            <StatCard
              icon="⚠️" label="Dispute รอแก้ไข"
              value={pending.disputes ?? 0}
              color={pending.disputes > 0 ? '#d97706' : 'var(--color-text-main)'}
              onClick={() => onNavigate('orders')}
            />
            <StatCard
              icon="💸" label="Payout รอจ่าย"
              value={pending.payouts?.count ?? 0}
              sub={`฿${Number(pending.payouts?.amount || 0).toLocaleString()}`}
              color="#7c3aed"
              onClick={() => onNavigate('finance')}
            />
            <StatCard
              icon="📣" label="ร้องเรียนค้างอยู่"
              value={pending.complaints ?? 0}
              color={pending.complaints > 0 ? 'var(--color-danger)' : 'var(--color-text-main)'}
              onClick={() => onNavigate('complaints')}
            />
          </div>
        </Section>

        {/* ── Orders by status ── */}
        <Section title="สถานะ Orders">
          <div style={{
            background: 'white', borderRadius: 'var(--radius-lg)',
            border: '0.5px solid var(--color-border)', overflow: 'hidden',
          }}>
            {[
              { key: 'pending_seller', label: '⏳ รอ Seller รับ',     color: '#f59e0b' },
              { key: 'ready_for_pickup', label: '📦 รอ Driver รับ',   color: '#7c3aed' },
              { key: 'driver_assigned',  label: '🚗 Driver กำลังไป', color: '#0891b2' },
              { key: 'picked_up',      label: '🏃 กำลังส่ง',         color: '#0284c7' },
              { key: 'delivered',      label: '📬 ส่งแล้ว รอยืนยัน', color: '#16a34a' },
              { key: 'completed',      label: '🎉 เสร็จสิ้น',        color: 'var(--color-primary)' },
              { key: 'disputed',       label: '⚠️ Dispute',           color: '#dc2626' },
              { key: 'cancelled',      label: '❌ ยกเลิก',            color: '#6b7280' },
            ].map((row, i, arr) => (
              <div
                key={row.key}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 16px',
                  borderBottom: i < arr.length - 1 ? '0.5px solid var(--color-border)' : 'none',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: byStatus[row.key] ? row.color : 'var(--color-text-hint)' }}>
                  {byStatus[row.key] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Users ── */}
        <Section title="ผู้ใช้งาน">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <StatCard icon="🏪" label="Sellers"  value={users.sellers?.total ?? 0} sub={`active ${users.sellers?.active ?? 0}`} />
            <StatCard icon="🛍️" label="Buyers"   value={users.buyers?.total  ?? 0} sub={`active ${users.buyers?.active  ?? 0}`} />
            <StatCard icon="🚗" label="Drivers"  value={users.drivers?.total ?? 0} sub={`active ${users.drivers?.active ?? 0}`} />
          </div>
        </Section>

      </div>
    </div>
  );
}
