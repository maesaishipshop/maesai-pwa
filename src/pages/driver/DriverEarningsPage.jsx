// src/pages/driver/DriverEarningsPage.jsx
// Tab รายได้ — GET /api/drivers/earnings

import React, { useState, useEffect, useCallback } from 'react';
import driverApi from '../../api/driver.api';

function EarningBox({ label, amount, color = 'var(--color-primary)', sub }) {
  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-lg)',
      border: '0.5px solid var(--color-border)',
      padding: '16px 20px', flex: 1,
    }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{`฿${Number(amount || 0).toLocaleString()}`}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  });
}

export default function DriverEarningsPage({ showToast }) {
  const [earnings, setEarnings] = useState(null);
  const [loading,  setLoading]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await driverApi.get('/drivers/earnings');
      setEarnings(res.data.earnings || res.data.data || res.data);
    } catch (_) {
      showToast('โหลดข้อมูลรายได้ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>กำลังโหลด…</div>
      </div>
    );
  }

  const e = earnings || {};
  const payouts = e.recent_payouts || e.payouts || [];

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="top-bar">
        <span className="top-bar-title">💰 รายได้ของฉัน</span>
        <button
          onClick={load}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          🔄
        </button>
      </div>

      <div style={{ padding: 16 }}>

        {/* รายได้ summary */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <EarningBox label="วันนี้"      amount={e.today}   color="var(--color-primary)" />
          <EarningBox label="สัปดาห์นี้" amount={e.week}    color="#7c3aed" />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <EarningBox label="รวมทั้งหมด" amount={e.total}   color="#059669" />
          <EarningBox
            label="รอรับเงิน"
            amount={e.pending}
            color="#d97706"
            sub="ส่งแล้ว ยังไม่โอน"
          />
        </div>

        {/* จำนวนงาน */}
        {(e.total_trips !== undefined || e.trips_today !== undefined) && (
          <div style={{
            background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)',
            padding: '12px 16px', marginBottom: 20,
            display: 'flex', gap: 24,
          }}>
            {e.trips_today !== undefined && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-primary-dark)' }}>งานวันนี้</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>
                  {e.trips_today} งาน
                </div>
              </div>
            )}
            {e.trips_week !== undefined && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-primary-dark)' }}>สัปดาห์นี้</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>
                  {e.trips_week} งาน
                </div>
              </div>
            )}
            {e.total_trips !== undefined && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-primary-dark)' }}>รวมทั้งหมด</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>
                  {e.total_trips} งาน
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payout history */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-main)', marginBottom: 10 }}>
          ประวัติการรับเงิน
        </div>

        {payouts.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: 'var(--radius-lg)',
            border: '0.5px solid var(--color-border)',
            padding: 24, textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💳</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>ยังไม่มีประวัติการรับเงิน</div>
          </div>
        ) : (
          payouts.map((p, i) => (
            <div key={i} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {p.note || p.description || 'ค่าขนส่ง'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 2 }}>
                    {formatDate(p.created_at || p.paid_at)}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-primary)' }}>
                  +฿{Number(p.amount || 0).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}

      </div>
    </div>
  );
}
