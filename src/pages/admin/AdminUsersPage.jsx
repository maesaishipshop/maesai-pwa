// src/pages/admin/AdminUsersPage.jsx
// Maesai Market — Admin Users (Step 15-6)
// Tab: Sellers / Buyers
// GET /api/admin/users/sellers, /api/admin/users/buyers

import React, { useState, useEffect, useCallback, useRef } from 'react';
import adminApi from '../../api/admin.api';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  });
}

function UserCard({ user, userType, onSuspend, onUnsuspend, loading }) {
  const isSuspended   = user.is_suspended   || user.suspended_at;
  const isBlacklisted = user.is_blacklisted;

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {user.shop_name || user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 2 }}>
            📱 {user.phone || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 2 }}>
            สมัคร {fmt(user.created_at)}
          </div>
          <div style={{ marginTop: 6 }}>
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
              background: isBlacklisted ? '#fee2e2' : isSuspended ? '#fef3c7' : '#d1fae5',
              color: isBlacklisted ? '#dc2626' : isSuspended ? '#b45309' : '#059669',
            }}>
              {isBlacklisted ? '🚫 Blacklist' : isSuspended ? '⏸ ระงับ' : '✅ ปกติ'}
            </span>
          </div>
        </div>

        {/* Action */}
        <div style={{ marginLeft: 12 }}>
          {isSuspended || isBlacklisted ? (
            <button
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: 12 }}
              disabled={loading}
              onClick={() => onUnsuspend(user.id)}
            >
              ปลดระงับ
            </button>
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
              onClick={() => onSuspend(user.id)}
            >
              ระงับ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UserList({ userType, showToast }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const searchTimer = useRef(null);

  const endpoint = userType === 'seller' ? '/admin/users/sellers' : '/admin/users/buyers';

  const load = useCallback(async (q) => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (q) params.search = q;
      const res = await adminApi.get(endpoint, { params });
      const data = res.data.sellers || res.data.buyers || res.data.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      showToast('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [endpoint, showToast]);

  useEffect(() => { load(''); }, [load]);

  function handleSearchChange(val) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val), 500);
  }

  async function handleSuspend(userId) {
    const reason = window.prompt('ระบุเหตุผลในการระงับ:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await adminApi.post(`/admin/users/${userType}/${userId}/suspend`, {
        type: 'permanent',
        reason,
      });
      showToast('✅ ระงับผู้ใช้สำเร็จ');
      load(search);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || '';
      showToast('❌ ระงับไม่สำเร็จ: ' + (msg || 'เกิดข้อผิดพลาด'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnsuspend(userId) {
    if (!window.confirm('ปลดระงับผู้ใช้นี้ใช่หรือไม่?')) return;
    setActionLoading(true);
    try {
      await adminApi.post(`/admin/users/${userType}/${userId}/unsuspend`);
      showToast('✅ ปลดระงับสำเร็จ');
      load(search);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || '';
      showToast('❌ ปลดระงับไม่สำเร็จ: ' + (msg || 'เกิดข้อผิดพลาด'));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          type="search"
          placeholder="🔍 ค้นหาชื่อ / เบอร์โทร"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)', fontSize: 13,
            fontFamily: 'var(--font-main)', boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-hint)' }}>กำลังโหลด…</div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>ไม่พบผู้ใช้</div>
        </div>
      ) : (
        users.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            userType={userType}
            loading={actionLoading}
            onSuspend={handleSuspend}
            onUnsuspend={handleUnsuspend}
          />
        ))
      )}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export default function AdminUsersPage({ showToast }) {
  const [activeTab, setActiveTab] = useState('seller');

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="top-bar">
        <span className="top-bar-title">👥 Users</span>
      </div>

      {/* Tab: Seller / Buyer */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'white' }}>
        {[
          { key: 'seller', label: '🏪 Sellers' },
          { key: 'buyer',  label: '🛍️ Buyers'  },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '12px 0', border: 'none',
              borderBottom: activeTab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              background: 'white', cursor: 'pointer',
              fontFamily: 'var(--font-main)',
              fontSize: 13, fontWeight: activeTab === t.key ? 700 : 400,
              color: activeTab === t.key ? 'var(--color-primary)' : 'var(--color-text-sub)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        <UserList key={activeTab} userType={activeTab} showToast={showToast} />
      </div>
    </div>
  );
}
