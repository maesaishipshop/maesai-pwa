// src/pages/admin/AdminDriversPage.jsx
// Maesai Market — Admin Drivers (Step 15-6)
// A. รออนุมัติ  — GET /api/admin/users/drivers?status=pending
// B. ทั้งหมด    — GET /api/admin/users/drivers

import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../api/admin.api';

const STATUS_FILTER = [
  { key: 'all',         label: 'ทั้งหมด'    },
  { key: 'active',      label: 'ใช้งาน'    },
  { key: 'suspended',   label: 'ระงับ'     },
  { key: 'blacklisted', label: 'Blacklist' },
];

/* ── DriverCard — inline confirm แทน window.confirm ─── */
function DriverCard({ driver, onApprove, onBlacklist, isPending, loading, confirmId, setConfirmId }) {
  const approveKey   = `approve-${driver.id}`;
  const blacklistKey = `blacklist-${driver.id}`;
  const isApproving   = confirmId === approveKey;
  const isBlacklisting = confirmId === blacklistKey;

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

        {/* ── Info ── */}
        {/* Bug fix: service คืน full_name (concat) ไม่ใช่ first_name/last_name แยก */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {driver.full_name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 2 }}>
            📱 {driver.phone}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>
            🚗 {driver.vehicle_type || '—'} · {driver.vehicle_plate || '—'}
          </div>
          {!isPending && driver.rating > 0 && (
            <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>
              ⭐ {Number(driver.rating).toFixed(1)}
            </div>
          )}
          {!isPending && (
            <div style={{ fontSize: 11, marginTop: 4 }}>
              <span style={{
                padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                background: driver.is_blacklisted ? '#fee2e2' : driver.is_suspended ? '#fef3c7' : '#d1fae5',
                color:      driver.is_blacklisted ? '#dc2626' : driver.is_suspended ? '#b45309' : '#059669',
              }}>
                {driver.is_blacklisted ? '🚫 Blacklist' : driver.is_suspended ? '⏸ ระงับ' : '✅ ใช้งานได้'}
              </span>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div style={{ marginLeft: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>

          {isPending ? (
            isApproving ? (
              /* Inline approve confirm */
              <div style={{
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: 'var(--radius-sm)', padding: '8px 10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  ยืนยันอนุมัติ?
                </span>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    onClick={() => onApprove(driver.id)}
                    disabled={loading}
                    style={{
                      padding: '5px 12px', fontSize: 12, fontWeight: 700,
                      background: 'var(--color-primary)', color: 'white',
                      border: 'none', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', fontFamily: 'var(--font-main)',
                    }}
                  >
                    ✅ ใช่
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    disabled={loading}
                    style={{
                      padding: '5px 10px', fontSize: 12,
                      background: 'white', color: 'var(--color-text-sub)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', fontFamily: 'var(--font-main)',
                    }}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: 12 }}
                disabled={loading}
                onClick={() => setConfirmId(approveKey)}
              >
                ✅ อนุมัติ
              </button>
            )
          ) : !driver.is_blacklisted ? (
            isBlacklisting ? (
              /* Inline blacklist confirm */
              <div style={{
                background: '#fff1f2', border: '1px solid #fca5a5',
                borderRadius: 'var(--radius-sm)', padding: '8px 10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  Blacklist จริงหรือ?
                </span>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    onClick={() => onBlacklist(driver.id)}
                    disabled={loading}
                    style={{
                      padding: '5px 12px', fontSize: 12, fontWeight: 700,
                      background: 'var(--color-danger)', color: 'white',
                      border: 'none', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', fontFamily: 'var(--font-main)',
                    }}
                  >
                    🚫 ยืนยัน
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    disabled={loading}
                    style={{
                      padding: '5px 10px', fontSize: 12,
                      background: 'white', color: 'var(--color-text-sub)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', fontFamily: 'var(--font-main)',
                    }}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              <button
                style={{
                  padding: '6px 14px', fontSize: 12,
                  border: '1px solid var(--color-danger)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'white', color: 'var(--color-danger)',
                  cursor: 'pointer', fontFamily: 'var(--font-main)',
                }}
                disabled={loading}
                onClick={() => setConfirmId(blacklistKey)}
              >
                🚫 Blacklist
              </button>
            )
          ) : null}

        </div>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────── */
export default function AdminDriversPage({ showToast, onApproved }) {
  const [pending,       setPending]       = useState([]);
  const [all,           setAll]           = useState([]);
  const [loadingPend,   setLoadingPend]   = useState(false);
  const [loadingAll,    setLoadingAll]    = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [allFilter,     setAllFilter]     = useState('all');
  // confirmId: 'approve-{id}' | 'blacklist-{id}' | null
  const [confirmId, setConfirmId] = useState(null);

  // Bug note: service คืน res.data.data (ไม่ใช่ res.data.drivers)
  //           status ต้องใช้ 'pending_approval' (ไม่ใช่ 'pending')

  /* ── Load pending ──────────────────────────────── */
  // Bug fix: ใช้ 'pending_approval' (service: if status === 'pending_approval')
  const loadPending = useCallback(async () => {
    setLoadingPend(true);
    try {
      const res = await adminApi.get('/admin/users/drivers', {
        params: { status: 'pending_approval', limit: 50 },
      });
      const data = res.data.data || res.data.drivers || [];
      setPending(Array.isArray(data) ? data : []);
    } catch {
      showToast('โหลด Driver รออนุมัติไม่สำเร็จ');
    } finally {
      setLoadingPend(false);
    }
  }, [showToast]);

  /* ── Load all drivers ──────────────────────────── */
  const loadAll = useCallback(async (status) => {
    setLoadingAll(true);
    try {
      const params = { limit: 100 };
      if (status !== 'all') params.status = status;
      const res = await adminApi.get('/admin/users/drivers', { params });
      const data = res.data.data || res.data.drivers || [];
      setAll(Array.isArray(data) ? data : []);
    } catch {
      showToast('โหลด Driver ทั้งหมดไม่สำเร็จ');
    } finally {
      setLoadingAll(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPending();
    loadAll('all');
  }, [loadPending, loadAll]);

  useEffect(() => {
    loadAll(allFilter);
  }, [allFilter, loadAll]);

  /* ── Approve ────────────────────────────────────── */
  async function handleApprove(driverId) {
    setActionLoading(true);
    setConfirmId(null); // ปิด inline confirm ทันที
    try {
      await adminApi.post(`/admin/users/drivers/${driverId}/approve`);

      // 1. Optimistic remove จาก pending ทันที (UX ไม่กระตุก)
      setPending((prev) => prev.filter((d) => d.id !== driverId));

      showToast('✅ อนุมัติ Driver สำเร็จ');

      // 2. Sync pending จาก server จริง (เผื่อมีการเปลี่ยนแปลงอื่น)
      loadPending();

      // 3. Refresh "Driver ทั้งหมด" (driver ที่เพิ่งอนุมัติจะปรากฏใน list)
      loadAll(allFilter);

      // 4. Update badge ใน AdminApp (nav badge)
      if (onApproved) onApproved();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || '';
      showToast('❌ อนุมัติไม่สำเร็จ: ' + (msg || 'เกิดข้อผิดพลาด'));
    } finally {
      setActionLoading(false);
    }
  }

  /* ── Blacklist ──────────────────────────────────── */
  async function handleBlacklist(driverId) {
    setActionLoading(true);
    setConfirmId(null); // ปิด inline confirm ทันที
    try {
      await adminApi.post(`/admin/users/drivers/${driverId}/blacklist`);
      showToast('🚫 Blacklist Driver สำเร็จ');
      // Optimistic update status ใน all list
      setAll((prev) =>
        prev.map((d) => d.id === driverId ? { ...d, is_blacklisted: true } : d)
      );
      loadAll(allFilter); // sync กับ server
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || '';
      showToast('❌ Blacklist ไม่สำเร็จ: ' + (msg || 'เกิดข้อผิดพลาด'));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="top-bar">
        <span className="top-bar-title">🚗 Drivers</span>
        <button
          onClick={() => { loadPending(); loadAll(allFilter); setConfirmId(null); }}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          🔄
        </button>
      </div>

      <div style={{ padding: 16 }}>

        {/* ── Section A: รออนุมัติ ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            ⏳ รออนุมัติ
            {pending.length > 0 && (
              <span style={{
                background: 'var(--color-danger)', color: 'white',
                fontSize: 10, fontWeight: 700, borderRadius: 99,
                padding: '2px 8px',
              }}>
                {pending.length}
              </span>
            )}
          </div>

          {loadingPend ? (
            <div style={{ color: 'var(--color-text-hint)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              กำลังโหลด…
            </div>
          ) : pending.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: 'var(--radius-lg)',
              border: '0.5px solid var(--color-border)',
              padding: 20, textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>ไม่มี Driver รออนุมัติ</div>
            </div>
          ) : (
            pending.map((d) => (
              <DriverCard
                key={d.id}
                driver={d}
                isPending
                loading={actionLoading}
                confirmId={confirmId}
                setConfirmId={setConfirmId}
                onApprove={handleApprove}
                onBlacklist={handleBlacklist}
              />
            ))
          )}
        </div>

        {/* ── Section B: Driver ทั้งหมด ── */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
            👥 Driver ทั้งหมด ({all.length})
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {STATUS_FILTER.map((f) => (
              <button
                key={f.key}
                onClick={() => { setAllFilter(f.key); setConfirmId(null); }}
                style={{
                  flex: 1, padding: '6px 4px',
                  borderRadius: 'var(--radius-sm)',
                  border: allFilter === f.key ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: allFilter === f.key ? 'var(--color-primary-light)' : 'white',
                  color: allFilter === f.key ? 'var(--color-primary)' : 'var(--color-text-sub)',
                  fontSize: 11, fontWeight: allFilter === f.key ? 700 : 400,
                  cursor: 'pointer', fontFamily: 'var(--font-main)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loadingAll ? (
            <div style={{ color: 'var(--color-text-hint)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              กำลังโหลด…
            </div>
          ) : all.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🚗</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>ไม่พบ Driver</div>
            </div>
          ) : (
            all.map((d) => (
              <DriverCard
                key={d.id}
                driver={d}
                isPending={false}
                loading={actionLoading}
                confirmId={confirmId}
                setConfirmId={setConfirmId}
                onApprove={handleApprove}
                onBlacklist={handleBlacklist}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}
