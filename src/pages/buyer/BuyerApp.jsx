// src/pages/buyer/BuyerApp.jsx
// Container: tabs, socket.io, profile, notifications

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import buyerApi from '../../api/buyer.api';

import BuyerBottomNav         from '../../components/buyer/BuyerBottomNav';
import BuyerHomePage          from './BuyerHomePage';
import BuyerOrdersPage        from './BuyerOrdersPage';
import BuyerOrderDetailPage   from './BuyerOrderDetailPage';
import BuyerChatPage          from './BuyerChatPage';
import BuyerProfilePage       from './BuyerProfilePage';

/* ── Toast ────────────────────────────────────────── */
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  if (!msg) return null;
  return (
    <div className="toast" style={{ zIndex: 9000 }}>
      {msg}
    </div>
  );
}

/* ── Main BuyerApp ───────────────────────────────── */
export default function BuyerApp({ onLogout, accessToken }) {
  const { t } = useTranslation();
  const [tab, setTab]                   = useState(() => sessionStorage.getItem('mm_buyer_tab') || 'home');
  const [profile, setProfile]           = useState(null);
  const [pendingCount, setPending]      = useState(0);
  const [unreadChat, setUnreadChat]     = useState(0);
  const [toast, setToast]               = useState('');
  const [detailOrderId, setDetailId]    = useState(null); // null = list, id = detail
  const [chatSellerId, setChatSeller]   = useState(null); // null = room list (flow จาก BuyerHomePage)
  const [chatRoom, setChatRoom]         = useState(null); // room object (flow จาก BuyerProductDetailPage)
  const [profileReturnTo, setReturnTo]  = useState(null); // tab ที่จะกลับหลังจากออกจาก Profile
  const socketRef                       = useRef(null);
  // tabRef: ใช้ใน socket listener เพื่อหลีกเลี่ยง stale closure ของ tab state
  const tabRef                          = useRef(tab);

  /* ── Generic navigate(page, options?) ───────────── */
  function navigate(page, options = {}) {
    if (page === 'profile' && options.returnTo) {
      setReturnTo(options.returnTo);
    }
    handleTabChange(page);
  }

  // sync tabRef ทุกครั้งที่ tab เปลี่ยน
  useEffect(() => { tabRef.current = tab; }, [tab]);

  // persist tab ลง sessionStorage — กันหน้าเด้งกลับ home ตอน refresh
  useEffect(() => { sessionStorage.setItem('mm_buyer_tab', tab); }, [tab]);

  /* ── Load profile ────────────────────────────── */
  const loadProfile = useCallback(async () => {
    try {
      const res = await buyerApi.get('/buyers/profile');
      setProfile(res.data.data || res.data.buyer || res.data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  /* ── Load pending count ──────────────────────── */
  useEffect(() => {
    buyerApi.get('/orders/buyer', { params: { status: 'pending_seller', limit: 50 } })
      .then((r) => {
        const data = r.data.orders || r.data.data || r.data || [];
        setPending(Array.isArray(data) ? data.length : 0);
      })
      .catch(() => {});
  }, []);

  /* ── Fetch unread chat count on startup ──────── */
  // เรียก GET /chat/rooms ทันทีที่มี accessToken เพื่อแสดง badge แชทที่ยังไม่อ่าน
  // แม้ user ยังไม่ได้เปิด tab แชท
  useEffect(() => {
    if (!accessToken) return;
    buyerApi.get('/chat/rooms')
      .then((r) => {
        const list = r.data.rooms || [];
        const total = list.reduce((sum, room) => sum + (room.unread_count || room.unread_buyer || 0), 0);
        setUnreadChat(total);
      })
      .catch(() => {});
  }, [accessToken]);

  /* ── Socket.io ───────────────────────────────── */
  useEffect(() => {
    if (!accessToken) return;

    if (socketRef.current) socketRef.current.disconnect();

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
    const socket = io(SOCKET_URL, {
      auth:       { token: accessToken, userType: 'buyer' },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    // connect_error: ถ้า server ส่ง TOKEN_EXPIRED (refreshToken หมดอายุ)
    // → force logout ทันที ไม่รอ HTTP interceptor
    socket.on('connect_error', (e) => {
      console.warn('[Socket] Connect error:', e.message);
      if (e.message === 'TOKEN_EXPIRED') {
        window.dispatchEvent(new CustomEvent('buyer:logout'));
      }
    });

    // Order status update → refresh counts
    socket.on('order_status_updated', (data) => {
      const msg = t('buyer.order_status_updated') + (data?.order_number ? ` #${data.order_number}` : '');
      setToast('📦 ' + msg);
    });

    // Badge แชท real-time — รับจาก personal room (user_buyer_${id})
    // ใช้ tabRef เพื่อไม่เพิ่ม badge ถ้าอยู่ใน chat tab อยู่แล้ว
    socket.on('new_chat_notification', () => {
      if (tabRef.current !== 'chat') {
        setUnreadChat((c) => c + 1);
      }
    });

    // General notification
    socket.on('notification', (data) => {
      if (data?.title) setToast(data.title);
    });

    return () => { socket.disconnect(); };
  }, [accessToken, t]);

  /* ── Tab → page router ───────────────────────── */
  function renderPage() {
    if (tab === 'home') {
      return (
        <BuyerHomePage
          profile={profile}
          onViewOrder={(id) => { setDetailId(id); setTab('orders'); }}
          onChatSeller={(sellerId) => { setChatSeller(sellerId); setTab('chat'); }}
          onOpenChatRoom={(room) => { setChatRoom(room); setTab('chat'); }}
          onNavigate={navigate}
        />
      );
    }
    if (tab === 'orders') {
      if (detailOrderId) {
        return (
          <BuyerOrderDetailPage
            orderId={detailOrderId}
            onBack={() => setDetailId(null)}
            onToast={setToast}
          />
        );
      }
      return (
        <BuyerOrdersPage
          onSelectOrder={(id) => setDetailId(id)}
          onPendingCountChange={setPending}
        />
      );
    }
    if (tab === 'chat') {
      return (
        <BuyerChatPage
          socket={socketRef.current}
          initSellerId={chatSellerId}
          initialRoom={chatRoom}
          onUnreadChange={setUnreadChat}
          onBack={() => { setChatSeller(null); setChatRoom(null); }}
        />
      );
    }
    if (tab === 'profile') {
      return (
        <BuyerProfilePage
          profile={profile}
          setProfile={setProfile}
          onProfileUpdated={loadProfile}
          onLogout={onLogout}
          returnTo={profileReturnTo}
          onNavigate={navigate}
        />
      );
    }
    return null;
  }

  /* ── Handle tab change — reset sub-states ────── */
  function handleTabChange(newTab) {
    if (newTab === 'orders') setDetailId(null);
    if (newTab === 'chat') {
      setChatSeller(null);
      setChatRoom(null);
      setUnreadChat(0);
    }
    // เมื่อ user เปลี่ยน tab เองผ่าน BottomNav → ล้าง returnTo
    if (newTab !== 'profile') setReturnTo(null);
    setTab(newTab);
  }

  return (
    <div className="page-container">
      {renderPage()}

      <BuyerBottomNav
        activeTab={tab}
        onTabChange={handleTabChange}
        pendingCount={pendingCount}
        unreadChat={unreadChat}
        profileImage={profile?.profile_image_path}
      />

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  );
}
