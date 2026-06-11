// src/pages/seller/SellerApp.jsx
// Container: manages tabs, socket.io, profile, notifications

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import sellerApi from '../../api/seller.api';

import SellerBottomNav          from '../../components/seller/SellerBottomNav';
import SellerHomePage           from './SellerHomePage';
import SellerProductsPage       from './SellerProductsPage';
import SellerOrdersPage         from './SellerOrdersPage';
import SellerProfilePage        from './SellerProfilePage';
import SellerNotificationsPage  from './SellerNotificationsPage';
import SellerChatPage           from './SellerChatPage';

/* ── Notification beep via Web Audio API ────────── */
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // Web Audio not supported
  }
}

/* ── Toast component ─────────────────────────────── */
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!msg) return null;
  return (
    <div className="toast" style={{ zIndex: 9000 }}>
      📦 {msg}
    </div>
  );
}

/* ── Main SellerApp ──────────────────────────────── */
// Bug fix: รับ accessToken prop จาก App.js
// → connect socket ใน useEffect ที่ depend on accessToken (ไม่ใช่ mount ทันที)
// → ป้องกัน socket connect ด้วย token = null เพราะ getToken() ยังไม่ถูก set
export default function SellerApp({ onLogout, accessToken }) {
  const { t } = useTranslation();
  const [tab, setTab]               = useState('home');
  const [profile, setProfile]       = useState(null);
  const [pendingCount, setPending]  = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [soundEnabled, setSound]    = useState(() => localStorage.getItem('mm_seller_sound') !== 'false');
  const [toast, setToast]           = useState('');
  const socketRef                   = useRef(null);
  // tabRef: ใช้ใน socket listener เพื่อหลีกเลี่ยง stale closure ของ tab state
  const tabRef                      = useRef(tab);

  // sync tabRef ทุกครั้งที่ tab เปลี่ยน เพื่อให้ socket listener อ่านค่าล่าสุดได้
  useEffect(() => { tabRef.current = tab; }, [tab]);

  /* ── Load seller profile ─────────────────────── */
  const loadProfile = useCallback(async () => {
    try {
      const res = await sellerApi.get('/sellers/profile');
      const parsed = res.data.data || res.data.seller || res.data;
      setProfile(parsed);
    } catch (e) {
      // silent
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  /* ── Load initial pending count ──────────────── */
  useEffect(() => {
    sellerApi.get('/orders/seller', { params: { status: 'pending_seller', limit: 50 } })
      .then((r) => {
        const data = r.data.orders || r.data.data || r.data || [];
        setPending(Array.isArray(data) ? data.length : 0);
      })
      .catch(() => {});
  }, []);

  /* ── Fetch unread chat count on startup ──────── */
  // เรียก GET /chat/rooms ทันทีที่มี accessToken เพื่อแสดง badge แชทที่ยังไม่อ่าน
  useEffect(() => {
    if (!accessToken) return;
    sellerApi.get('/chat/rooms')
      .then((r) => {
        const list = r.data.rooms || [];
        const total = list.reduce((sum, room) => sum + (room.unread_count || room.unread_seller || 0), 0);
        setChatUnread(total);
      })
      .catch(() => {});
  }, [accessToken]);

  /* ── Socket.io ───────────────────────────────── */
  // Bug fix: useEffect depend on accessToken prop
  // → ไม่ connect ถ้า accessToken ยังเป็น null
  // → connect ทันทีที่ App.js pass token ลงมาหลัง login สำเร็จ
  useEffect(() => {
    // ตรวจสอบว่ามี token จริงก่อน connect
    if (!accessToken) {
      return;
    }

    // disconnect socket เดิมถ้ามี (กรณี token เปลี่ยน)
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
    const socket = io(SOCKET_URL, {
      auth:       { token: accessToken, userType: 'seller' },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect_error', (err) => console.warn('[Socket] Connect error:', err.message));

    socket.on('new_order', (data) => {
      setPending((c) => c + 1);
      const msg = t('seller.new_order_alert') + (data?.order_number ? ` #${data.order_number}` : '');
      setToast(msg);
      if (soundEnabled) playBeep();
    });

    socket.on('order_cancelled', () => {
      setToast('Order ถูกยกเลิก');
    });

    socket.on('notification', (data) => {
      if (data?.title) setToast(data.title);
    });

    // Badge แชท real-time — รับจาก personal room (user_seller_${id})
    // ไม่ต้อง join chat room ก่อน — backend emit มาให้โดยตรง
    socket.on('new_chat_notification', () => {
      if (tabRef.current !== 'chat') {
        setChatUnread((prev) => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]); // re-connect เมื่อ token เปลี่ยน

  /* ── Sound toggle ────────────────────────────── */
  function toggleSound() {
    setSound((v) => {
      const next = !v;
      localStorage.setItem('mm_seller_sound', String(next));
      return next;
    });
  }

  /* ── Render correct page ─────────────────────── */
  function renderPage() {
    if (tab === 'notifications') {
      return (
        <SellerNotificationsPage
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onBack={() => setTab('home')}
        />
      );
    }
    if (tab === 'home') {
      return <SellerHomePage profile={profile} onTabChange={setTab} />;
    }
    if (tab === 'products') {
      return <SellerProductsPage />;
    }
    if (tab === 'orders') {
      return <SellerOrdersPage onPendingCountChange={setPending} />;
    }
    if (tab === 'profile') {
      return <SellerProfilePage profile={profile} onProfileUpdated={loadProfile} />;
    }
    if (tab === 'chat') {
      return (
        <SellerChatPage
          socket={socketRef.current}
          onUnreadChange={setChatUnread}
        />
      );
    }
    return null;
  }

  const showBottomNav = tab !== 'notifications';

  return (
    <div className="page-container">
      {/* Bell icon overlay on pages that have top-bar (not notifications) */}
      {tab !== 'notifications' && tab !== 'home' && (
        <NotificationBell
          count={pendingCount}
          onClick={() => setTab('notifications')}
        />
      )}

      {renderPage()}

      {showBottomNav && (
        <SellerBottomNav
          activeTab={tab}
          onTabChange={(newTab) => {
            // ล้าง badge แชทเมื่อเปิด tab chat
            if (newTab === 'chat') setChatUnread(0);
            setTab(newTab);
          }}
          pendingCount={pendingCount}
          chatUnread={chatUnread}
          profileImage={profile?.profile_image_path}
        />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  );
}

/* ── Notification Bell ───────────────────────────── */
function NotificationBell({ count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 500,
        background: 'white', border: '0.5px solid var(--color-border)',
        borderRadius: 12, width: 38, height: 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      🔔
      {count > 0 && (
        <span
          style={{
            position: 'absolute', top: -2, right: -2,
            background: 'var(--color-danger)', color: 'white',
            borderRadius: '50%', minWidth: 16, height: 16,
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
