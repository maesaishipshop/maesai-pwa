// src/pages/driver/DriverApp.jsx
// Container หลักของ Driver — tabs, socket.io, profile, notifications

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import driverApi, { clearToken } from '../../api/driver.api';

import DriverBottomNav    from '../../components/driver/DriverBottomNav';
import DriverHomePage     from './DriverHomePage';
import DriverHistoryPage  from './DriverHistoryPage';
import DriverEarningsPage from './DriverEarningsPage';
import DriverProfilePage  from './DriverProfilePage';
import DriverChatPage     from './DriverChatPage';

/* ── Toast ────────────────────────────────────────── */
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

/* ── Notification beep ───────────────────────────── */
function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.7);
  } catch (_) {}
}

/* ── DriverApp ───────────────────────────────────── */
export default function DriverApp({ onLogout, accessToken }) {
  const [tab, setTab]               = useState(() => sessionStorage.getItem('mm_driver_tab') || 'home');
  const [profile, setProfile]       = useState(null);
  const [newOrderCount, setNewOrder] = useState(0); // badge งานใหม่
  const [chatUnread, setChatUnread] = useState(0);  // badge แชทที่ยังไม่อ่าน
  const [toast, setToast]           = useState('');
  const socketRef                   = useRef(null);
  // tabRef: ใช้ใน socket listener เพื่อหลีกเลี่ยง stale closure ของ tab state
  const tabRef                      = useRef(tab);

  function showToast(msg) { setToast(msg); }

  // sync tabRef ทุกครั้งที่ tab เปลี่ยน เพื่อให้ socket listener อ่านค่าล่าสุดได้
  useEffect(() => { tabRef.current = tab; }, [tab]);

  // persist tab ลง sessionStorage — กันหน้าเด้งกลับ home ตอน refresh
  useEffect(() => { sessionStorage.setItem('mm_driver_tab', tab); }, [tab]);

  /* ── Load driver profile ─────────────────────── */
  const loadProfile = useCallback(async () => {
    try {
      const res = await driverApi.get('/drivers/profile');
      setProfile(res.data.driver || res.data.data || res.data);
    } catch (_) {}
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  /* ── Fetch unread chat count on startup ──────── */
  // เรียก GET /chat/rooms ทันทีที่มี accessToken เพื่อแสดง badge แชทที่ยังไม่อ่าน
  useEffect(() => {
    if (!accessToken) return;
    driverApi.get('/chat/rooms')
      .then((r) => {
        const list = r.data.rooms || [];
        const total = list.reduce((sum, room) => sum + (room.unread_count || room.unread_driver || 0), 0);
        setChatUnread(total);
      })
      .catch(() => {});
  }, [accessToken]);

  /* ── Socket.io ───────────────────────────────── */
  useEffect(() => {
    if (!accessToken) return;

    if (socketRef.current) socketRef.current.disconnect();

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
    const socket = io(SOCKET_URL, {
      auth:       { token: accessToken, userType: 'driver' },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect_error', (e) => {
      console.warn('[Socket] Connect error:', e.message);
      if (e.message === 'TOKEN_EXPIRED') {
        window.dispatchEvent(new CustomEvent('driver:logout'));
      }
    });

    // งานใหม่พร้อมรับ — เพิ่ม badge + เสียง
    socket.on('new_order_available', (data) => {
      setNewOrder((c) => c + 1);
      showToast(`🚗 งานใหม่! ${data?.order_number ? `#${data.order_number}` : ''}`);
      playBeep();
    });

    // สถานะ order เปลี่ยน
    socket.on('order_status_updated', (data) => {
      showToast(`📦 อัปเดต order ${data?.order_number ? `#${data.order_number}` : ''}`);
    });

    // การแจ้งเตือนทั่วไป
    socket.on('notification', (data) => {
      if (data?.title) showToast(data.title);
    });

    // Badge แชท real-time — รับจาก personal room (user_driver_${id})
    // ไม่ต้อง join chat room ก่อน — backend emit มาให้โดยตรง
    socket.on('new_chat_notification', () => {
      if (tabRef.current !== 'chat') {
        setChatUnread((prev) => prev + 1);
      }
    });

    return () => { socket.disconnect(); };
  }, [accessToken]);

  /* ── Tab change ──────────────────────────────── */
  function handleTabChange(newTab) {
    if (newTab === 'home') setNewOrder(0);   // ล้าง badge งานใหม่
    if (newTab === 'chat') setChatUnread(0); // ล้าง badge แชท
    setTab(newTab);
  }

  /* ── Logout ──────────────────────────────────── */
  function handleLogout() {
    clearToken();
    if (onLogout) onLogout();
  }

  /* ── Render page ─────────────────────────────── */
  function renderPage() {
    if (tab === 'home') {
      return (
        <DriverHomePage
          socket={socketRef.current}
          showToast={showToast}
          onNewOrderClear={() => setNewOrder(0)}
        />
      );
    }
    if (tab === 'history') {
      return <DriverHistoryPage showToast={showToast} />;
    }
    if (tab === 'earnings') {
      return <DriverEarningsPage showToast={showToast} />;
    }
    if (tab === 'profile') {
      return (
        <DriverProfilePage
          profile={profile}
          onProfileUpdated={loadProfile}
          onLogout={handleLogout}
          showToast={showToast}
        />
      );
    }
    if (tab === 'chat') {
      return (
        <DriverChatPage
          socket={socketRef.current}
          onUnreadChange={setChatUnread}
        />
      );
    }
    return null;
  }

  return (
    <div className="page-container">
      {renderPage()}

      <DriverBottomNav
        activeTab={tab}
        onTabChange={handleTabChange}
        newOrderCount={newOrderCount}
        chatUnread={chatUnread}
        profileImage={profile?.profile_image_path}
      />

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  );
}
