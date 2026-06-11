// src/pages/driver/DriverHomePage.jsx
// Tab งาน — แสดง "งานที่รับอยู่" + "งานใหม่ที่รอรับ"

import React, { useState, useEffect, useCallback } from 'react';
import driverApi from '../../api/driver.api';
import DriverPickupPage  from './DriverPickupPage';
import DriverDeliverPage from './DriverDeliverPage';

/* ── Status badge ─────────────────────────────────── */
const STATUS_LABEL = {
  driver_assigned: { label: 'รับงานแล้ว',   color: '#2563eb', bg: '#eff6ff' },
  picked_up:       { label: 'รับของแล้ว',   color: '#7c3aed', bg: '#f5f3ff' },
  ready_for_pickup:{ label: 'รอรับงาน',     color: '#d97706', bg: '#fffbeb' },
};

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] || { label: status, color: '#666', bg: '#f0f0f0' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700,
      padding: '2px 8px', borderRadius: 99,
      fontFamily: 'var(--font-main)',
    }}>
      {s.label}
    </span>
  );
}

/* ── Card งานที่รับอยู่ ───────────────────────────── */
function ActiveOrderCard({ order, onPickup, onDeliver, onNavigate }) {
  const isAssigned = order.status === 'driver_assigned';
  const isPickedUp = order.status === 'picked_up';

  function openMaps(lat, lng, label) {
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-main)' }}>
          #{order.order_number || order.id}
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* ต้นทาง */}
      <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>
        🏪 <span style={{ fontWeight: 600 }}>{order.seller_name || 'ร้านค้า'}</span>
        {order.seller_address && (
          <span style={{ color: 'var(--color-text-hint)', marginLeft: 4 }}>
            — {order.seller_address}
          </span>
        )}
      </div>

      {/* ปลายทาง */}
      <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 8 }}>
        📍 <span style={{ fontWeight: 600 }}>{order.buyer_name || 'ลูกค้า'}</span>
        {order.delivery_address && (
          <span style={{ color: 'var(--color-text-hint)', marginLeft: 4 }}>
            — {order.delivery_address}
          </span>
        )}
      </div>

      {/* ค่าขนส่ง */}
      <div style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700, marginBottom: 10 }}>
        💰 ค่าขนส่ง ฿{Number(order.delivery_fee || 0).toLocaleString()}
      </div>

      {/* ปุ่ม action */}
      {isAssigned && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            style={{ flex: 1, fontSize: 12 }}
            onClick={() => openMaps(order.seller_lat, order.seller_lng, 'ร้านค้า')}
          >
            📍 นำทางไปร้าน
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, fontSize: 12 }}
            onClick={() => onPickup(order)}
          >
            ✅ รับของแล้ว
          </button>
        </div>
      )}

      {isPickedUp && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            style={{ flex: 1, fontSize: 12 }}
            onClick={() => openMaps(order.delivery_lat, order.delivery_lng, 'ปลายทาง')}
          >
            📍 นำทางไปส่ง
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, fontSize: 12 }}
            onClick={() => onDeliver(order)}
          >
            ✅ ส่งแล้ว
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Card งานใหม่ที่รอรับ ─────────────────────────── */
function AvailableOrderCard({ order, onAccept, accepting }) {
  return (
    <div className="card" style={{ marginBottom: 12, border: '1.5px solid var(--color-primary-light)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-main)' }}>
          #{order.order_number || order.id}
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-primary)' }}>
          ฿{Number(order.delivery_fee || 0).toLocaleString()}
        </span>
      </div>

      {/* สินค้า */}
      {order.items && order.items.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>
          📦 {order.items.map((i) => `${i.product_name} ×${i.quantity}`).join(', ')}
          {order.total_weight_kg && (
            <span style={{ color: 'var(--color-text-hint)', marginLeft: 4 }}>
              ({order.total_weight_kg} กก.)
            </span>
          )}
        </div>
      )}

      {/* ต้นทาง → ปลายทาง */}
      <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>
        🏪 {order.seller_name || 'ร้านค้า'}
        {order.seller_address && <span style={{ color: 'var(--color-text-hint)' }}> — {order.seller_address}</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 10 }}>
        📍 {order.buyer_name || 'ลูกค้า'}
        {order.delivery_address && <span style={{ color: 'var(--color-text-hint)' }}> — {order.delivery_address}</span>}
      </div>

      <button
        className="btn-primary"
        disabled={accepting === order.id}
        onClick={() => onAccept(order.id)}
        style={{ fontSize: 13 }}
      >
        {accepting === order.id ? 'กำลังรับงาน…' : '🚗 รับงาน'}
      </button>
    </div>
  );
}

/* ── Main DriverHomePage ──────────────────────────── */
export default function DriverHomePage({ socket, showToast, onNewOrderClear }) {
  const [activeOrders,    setActiveOrders]    = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loadingActive,   setLoadingActive]   = useState(false);
  const [loadingAvail,    setLoadingAvail]    = useState(false);
  const [accepting,       setAccepting]       = useState(null); // order id ที่กำลัง accept
  const [pickupOrder,     setPickupOrder]     = useState(null); // order ที่เปิด PickupPage
  const [deliverOrder,    setDeliverOrder]    = useState(null); // order ที่เปิด DeliverPage

  /* ── Load งานที่รับอยู่ ──────────────────────── */
  const loadActive = useCallback(async () => {
    setLoadingActive(true);
    try {
      const res = await driverApi.get('/orders/driver', {
        params: { status: 'driver_assigned,picked_up', limit: 20 },
      });
      const data = res.data.orders || res.data.data || [];
      setActiveOrders(Array.isArray(data) ? data : []);
    } catch (_) {}
    finally { setLoadingActive(false); }
  }, []);

  /* ── Load งานใหม่ที่รอรับ ────────────────────── */
  const loadAvailable = useCallback(async () => {
    setLoadingAvail(true);
    try {
      const res = await driverApi.get('/orders/available');
      const data = res.data.orders || res.data.data || [];
      setAvailableOrders(Array.isArray(data) ? data : []);
    } catch (_) {}
    finally { setLoadingAvail(false); }
  }, []);

  useEffect(() => {
    loadActive();
    loadAvailable();
  }, [loadActive, loadAvailable]);

  /* ── Socket: งานใหม่ → reload available ─────── */
  useEffect(() => {
    if (!socket) return;
    const handler = () => { loadAvailable(); };
    socket.on('new_order_available', handler);
    return () => { socket.off('new_order_available', handler); };
  }, [socket, loadAvailable]);

  /* ── รับงาน ──────────────────────────────────── */
  async function handleAccept(orderId) {
    setAccepting(orderId);
    try {
      await driverApi.post(`/orders/${orderId}/driver-accept`);
      showToast('✅ รับงานสำเร็จ!');
      // reload ทั้ง 2 section
      loadActive();
      loadAvailable();
      if (onNewOrderClear) onNewOrderClear();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || '';
      if (msg === 'ORDER_ALREADY_TAKEN') showToast('⚠️ งานนี้มีคนรับไปแล้ว');
      else showToast('❌ รับงานไม่สำเร็จ');
      loadAvailable(); // refresh
    } finally {
      setAccepting(null);
    }
  }

  /* ── หลัง pickup / deliver สำเร็จ ───────────── */
  function handlePickupDone() {
    setPickupOrder(null);
    showToast('✅ ยืนยันรับของสำเร็จ');
    loadActive();
  }

  function handleDeliverDone() {
    setDeliverOrder(null);
    showToast('✅ ยืนยันส่งของสำเร็จ');
    loadActive();
  }

  /* ── Modal overlay: PickupPage ───────────────── */
  if (pickupOrder) {
    return (
      <DriverPickupPage
        order={pickupOrder}
        onDone={handlePickupDone}
        onBack={() => setPickupOrder(null)}
        showToast={showToast}
      />
    );
  }

  /* ── Modal overlay: DeliverPage ──────────────── */
  if (deliverOrder) {
    return (
      <DriverDeliverPage
        order={deliverOrder}
        onDone={handleDeliverDone}
        onBack={() => setDeliverOrder(null)}
        showToast={showToast}
      />
    );
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="top-bar">
        <span className="top-bar-title">🚗 งานของฉัน</span>
        <button
          onClick={() => { loadActive(); loadAvailable(); }}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          🔄
        </button>
      </div>

      <div style={{ padding: 16 }}>

        {/* ── Section A: งานที่รับอยู่ ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-main)', marginBottom: 10 }}>
            📦 งานที่รับอยู่ ({activeOrders.length})
          </div>

          {loadingActive ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-hint)', fontSize: 13, padding: 24 }}>
              กำลังโหลด…
            </div>
          ) : activeOrders.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: 'var(--radius-lg)',
              border: '0.5px solid var(--color-border)',
              padding: 24, textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>ยังไม่มีงานที่กำลังทำอยู่</div>
            </div>
          ) : (
            activeOrders.map((o) => (
              <ActiveOrderCard
                key={o.id}
                order={o}
                onPickup={() => setPickupOrder(o)}
                onDeliver={() => setDeliverOrder(o)}
              />
            ))
          )}
        </div>

        {/* ── Section B: งานใหม่ที่รอรับ ── */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-main)', marginBottom: 10 }}>
            🆕 งานใหม่ที่รอรับ ({availableOrders.length})
          </div>

          {loadingAvail ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-hint)', fontSize: 13, padding: 24 }}>
              กำลังโหลด…
            </div>
          ) : availableOrders.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: 'var(--radius-lg)',
              border: '0.5px solid var(--color-border)',
              padding: 24, textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>ยังไม่มีงานใหม่ในขณะนี้</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginTop: 4 }}>
                ระบบจะแจ้งเตือนอัตโนมัติเมื่อมีงานใหม่
              </div>
            </div>
          ) : (
            availableOrders.map((o) => (
              <AvailableOrderCard
                key={o.id}
                order={o}
                onAccept={handleAccept}
                accepting={accepting}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}
