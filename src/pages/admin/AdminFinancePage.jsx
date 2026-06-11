// src/pages/admin/AdminFinancePage.jsx
// Maesai Market — Admin Finance (Step 15-6)
// A. Escrow รอจ่าย  — GET /api/admin/payouts/pending
// B. Payout ล่าสุด  — GET /api/admin/payouts/summary

import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../api/admin.api';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function RecipientBadge({ type }) {
  const m = {
    seller: { label: '🏪 Seller', color: '#3b82f6', bg: '#eff6ff' },
    driver: { label: '🚗 Driver', color: '#7c3aed', bg: '#f5f3ff' },
    platform: { label: '🏢 Platform', color: '#059669', bg: '#f0fdf4' },
  };
  const cfg = m[type] || { label: type, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

/* ── Payout Card ─────────────────────────────────────────── */
function PayoutCard({ payout, onApprove, loading }) {
  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <RecipientBadge type={payout.recipient_type} />
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
            #{payout.order_number || payout.order_id}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 2 }}>
            {payout.recipient_name || payout.seller_name || payout.driver_name || '—'}
          </div>
          {payout.bank_account && (
            <div style={{ fontSize: 11, color: 'var(--color-text-hint)' }}>
              🏦 {payout.bank_name} · {payout.bank_account}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 2 }}>
            {fmt(payout.created_at)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 6 }}>
            ฿{Number(payout.amount || 0).toLocaleString()}
          </div>
          <button
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: 12 }}
            disabled={loading}
            onClick={() => onApprove(payout.id)}
          >
            💸 จ่าย
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminFinancePage({ showToast }) {
  const [pending,     setPending]     = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [loadingPend, setLoadingPend] = useState(false);
  const [loadingSum,  setLoadingSum]  = useState(false);
  const [actionLoad,  setActionLoad]  = useState(false);
  const [recipFilter, setRecipFilter] = useState('all');

  /* ── Load pending payouts ─────────────────────── */
  const loadPending = useCallback(async (recipientType) => {
    setLoadingPend(true);
    try {
      const params = { limit: 100 };
      if (recipientType && recipientType !== 'all') params.recipient_type = recipientType;
      const res = await adminApi.get('/admin/payouts/pending', { params });
      const data = res.data.payouts || res.data.pending || res.data.data || [];
      setPending(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '';
      showToast('โหลด Payout รอจ่ายไม่สำเร็จ: ' + msg);
    } finally {
      setLoadingPend(false);
    }
  }, [showToast]);

  /* ── Load summary ─────────────────────────────── */
  const loadSummary = useCallback(async () => {
    setLoadingSum(true);
    try {
      const res = await adminApi.get('/admin/payouts/summary');
      setSummary(res.data.summary || res.data.data || res.data);
    } catch {
      /* summary is optional, don't toast */
    } finally {
      setLoadingSum(false);
    }
  }, []);

  useEffect(() => {
    loadPending('all');
    loadSummary();
  }, [loadPending, loadSummary]);

  useEffect(() => {
    loadPending(recipFilter);
  }, [recipFilter, loadPending]);

  /* ── Approve payout ─────────────────────────────── */
  async function handleApprove(payoutId) {
    if (!window.confirm('ยืนยันการจ่ายเงินนี้ใช่หรือไม่?')) return;
    setActionLoad(true);
    try {
      await adminApi.post(`/admin/payouts/${payoutId}/approve`);
      showToast('✅ จ่ายเงินสำเร็จ');
      loadPending(recipFilter);
      loadSummary();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || '';
      showToast('❌ จ่ายเงินไม่สำเร็จ: ' + (msg || 'เกิดข้อผิดพลาด'));
    } finally {
      setActionLoad(false);
    }
  }

  const totalPending = pending.reduce((s, p) => s + Number(p.amount || 0), 0);

  const sm = summary || {};

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="top-bar">
        <span className="top-bar-title">💰 การเงิน</span>
        <button
          onClick={() => { loadPending(recipFilter); loadSummary(); }}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          🔄
        </button>
      </div>

      <div style={{ padding: 16 }}>

        {/* ── Summary ── */}
        {!loadingSum && (sm.total_paid || sm.this_month || sm.platform_revenue) && (
          <div style={{
            background: 'var(--color-primary-light)', borderRadius: 'var(--radius-lg)',
            padding: '14px 16px', marginBottom: 20,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          }}>
            {sm.total_paid !== undefined && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-primary-dark)' }}>จ่ายแล้วทั้งหมด</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>
                  ฿{Number(sm.total_paid || 0).toLocaleString()}
                </div>
              </div>
            )}
            {sm.this_month !== undefined && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-primary-dark)' }}>เดือนนี้</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>
                  ฿{Number(sm.this_month || 0).toLocaleString()}
                </div>
              </div>
            )}
            {sm.platform_revenue !== undefined && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-primary-dark)' }}>รายได้ Platform</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>
                  ฿{Number(sm.platform_revenue || 0).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Section A: รอจ่าย ── */}
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            💸 Escrow รอจ่าย ({pending.length})
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-primary)' }}>
            ฿{totalPending.toLocaleString()}
          </div>
        </div>

        {/* Recipient filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[
            { key: 'all',    label: 'ทั้งหมด' },
            { key: 'seller', label: '🏪 Seller' },
            { key: 'driver', label: '🚗 Driver' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setRecipFilter(f.key)}
              style={{
                flex: 1, padding: '6px 4px',
                borderRadius: 'var(--radius-sm)',
                border: recipFilter === f.key ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: recipFilter === f.key ? 'var(--color-primary-light)' : 'white',
                color: recipFilter === f.key ? 'var(--color-primary)' : 'var(--color-text-sub)',
                fontSize: 11, fontWeight: recipFilter === f.key ? 700 : 400,
                cursor: 'pointer', fontFamily: 'var(--font-main)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loadingPend ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-hint)' }}>กำลังโหลด…</div>
        ) : pending.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: 'var(--radius-lg)',
            border: '0.5px solid var(--color-border)',
            padding: 24, textAlign: 'center', marginBottom: 20,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>
              {recipFilter === 'all' ? 'ไม่มี Payout รอจ่าย' : `ไม่มี Payout รอจ่าย (${recipFilter})`}
            </div>
          </div>
        ) : (
          <>
            {pending.map((p) => (
              <PayoutCard
                key={p.id}
                payout={p}
                loading={actionLoad}
                onApprove={handleApprove}
              />
            ))}
          </>
        )}

      </div>
    </div>
  );
}
