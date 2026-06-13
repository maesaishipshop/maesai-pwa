// src/pages/admin/AdminApp.jsx
// Maesai Market — Admin App Container (Step 15-6)
// ไม่ใช้ Socket.io — ใช้ polling แทน

import React, { useState, useEffect, useCallback } from 'react';
import adminApi, { clearToken } from '../../api/admin.api';

import AdminBottomNav      from '../../components/admin/AdminBottomNav';
import AdminDashboardPage  from './AdminDashboardPage';
import AdminOrdersPage     from './AdminOrdersPage';
import AdminDriversPage    from './AdminDriversPage';
import AdminUsersPage      from './AdminUsersPage';
import AdminFinancePage    from './AdminFinancePage';
import AdminChatPage          from './AdminChatPage';
import AdminComplaintsPage   from './AdminComplaintsPage';

/* ── Toast ─────────────────────────────────────────── */
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  if (!msg) return null;
  return (
    <div className="toast" style={{ zIndex: 9000, background: '#1a1a2e' }}>
      {msg}
    </div>
  );
}

/* ── AdminApp ───────────────────────────────────────── */
export default function AdminApp({ onLogout }) {
  const [tab,            setTab]            = useState(() => sessionStorage.getItem('mm_admin_tab') || 'dashboard');
  const [toast,          setToast]          = useState('');
  const [pendingDrivers, setPendingDrivers] = useState(0);
  const [chatUnread,     setChatUnread]     = useState(0);

  function showToast(msg) { setToast(msg); }

  // persist tab ลง sessionStorage — กันหน้าเด้งกลับ dashboard ตอน refresh
  useEffect(() => { sessionStorage.setItem('mm_admin_tab', tab); }, [tab]);

  /* ── Logout listener ─────────────────────────────── */
  useEffect(() => {
    const handler = () => {
      clearToken();
      if (onLogout) onLogout();
    };
    window.addEventListener('admin:logout', handler);
    return () => window.removeEventListener('admin:logout', handler);
  }, [onLogout]);

  /* ── Polling: badge สำหรับ Driver รออนุมัติ ─────── */
  // Bug fix: service ต้องรับ 'pending_approval' ไม่ใช่ 'pending'
  //          service คืน res.data.total + res.data.data (ไม่ใช่ drivers)
  const pollPendingDrivers = useCallback(async () => {
    try {
      const res = await adminApi.get('/admin/users/drivers', {
        params: { status: 'pending_approval', limit: 1 },
      });
      const total = res.data.total ?? res.data.data?.length ?? 0;
      setPendingDrivers(total);
    } catch (_) {}
  }, []);

  useEffect(() => {
    pollPendingDrivers();
    const id = setInterval(pollPendingDrivers, 30000); // poll ทุก 30 วิ
    return () => clearInterval(id);
  }, [pollPendingDrivers]);

  /* ── Polling: badge แชทที่ยังไม่อ่าน ────────────── */
  // poll GET /chat/rooms ทุก 30 วิ เพื่ออัปเดต badge แม้ไม่ได้เปิด tab แชท
  useEffect(() => {
    const fetchChatUnread = async () => {
      try {
        const res = await adminApi.get('/chat/rooms');
        const rooms = res.data?.rooms || [];
        const total = rooms.reduce((sum, r) => sum + (r.unread_admin || 0), 0);
        setChatUnread(total);
      } catch {}
    };

    fetchChatUnread(); // รันทันทีตอน mount
    const id = setInterval(fetchChatUnread, 30000); // poll ทุก 30 วิ
    return () => clearInterval(id);
  }, []);

  /* ── Render tab ──────────────────────────────────── */
  function renderTab() {
    switch (tab) {
      case 'dashboard': return <AdminDashboardPage showToast={showToast} onNavigate={setTab} />;
      case 'orders':    return <AdminOrdersPage    showToast={showToast} />;
      case 'drivers':   return <AdminDriversPage   showToast={showToast} onApproved={pollPendingDrivers} />;
      case 'users':     return <AdminUsersPage     showToast={showToast} />;
      case 'finance':   return <AdminFinancePage   showToast={showToast} />;
      case 'chat':       return <AdminChatPage        onUnreadChange={setChatUnread} />;
      case 'complaints': return <AdminComplaintsPage  onNavigate={setTab} />;
      default:           return null;
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {renderTab()}

      <AdminBottomNav
        tab={tab}
        setTab={(newTab) => {
          if (newTab === 'chat') setChatUnread(0); // ล้าง badge เมื่อเปิด tab แชท
          setTab(newTab);
        }}
        pendingDrivers={pendingDrivers}
        chatUnread={chatUnread}
      />

      {toast && (
        <Toast msg={toast} onDone={() => setToast('')} />
      )}
    </div>
  );
}
