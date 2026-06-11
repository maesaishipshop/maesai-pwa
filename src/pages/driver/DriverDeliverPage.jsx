// src/pages/driver/DriverDeliverPage.jsx
// Modal overlay — ยืนยันส่งสินค้าถึงมือ Buyer (picked_up → delivered)
// POST /api/orders/:id/deliver — FormData: photos[] + lat + lng
// แก้ไข: ลดเหลือ 1 รูป + GPS อัตโนมัติใน useEffect

import React, { useState, useRef, useEffect } from 'react';
import driverApi from '../../api/driver.api';

export default function DriverDeliverPage({ order, onDone, onBack, showToast }) {
  const [photo,      setPhoto]      = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [gps,        setGps]        = useState({ lat: null, lng: null });
  const fileRef = useRef();

  /* ── Auto GPS เมื่อ mount ─────────────────────────────────────── */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // ไม่แสดง error ถ้า GPS ไม่ได้ — GPS ไม่บังคับ
    );
  }, []);

  /* ── เลือกรูป ──────────────────────────────────────────────────── */
  function handlePhoto(file) {
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPhoto(null);
    setPreview(null);
  }

  /* ── Submit ────────────────────────────────────────────────────── */
  async function handleSubmit() {
    if (!photo) {
      showToast('⚠️ กรุณาถ่ายรูปยืนยันการส่งก่อน');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('photos', photo);
      if (gps.lat) fd.append('lat', gps.lat);
      if (gps.lng) fd.append('lng', gps.lng);

      await driverApi.post(`/orders/${order.id}/deliver`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onDone();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'เกิดข้อผิดพลาด';
      showToast(`❌ ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="top-bar">
        <button className="top-bar-back" onClick={onBack}>‹</button>
        <span className="top-bar-title">ยืนยันส่งสินค้า</span>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ padding: 16 }}>

        {/* Step indicator */}
        <div style={{
          background: '#f0faf5',
          color: '#2D9B6E',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 16,
        }}>
          🚚 ขั้นที่ 2/2: ส่งสินค้าให้ลูกค้า
        </div>

        {/* ข้อมูล order */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            Order #{order.order_number || order.id}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>
            👤 {order.buyer_name || 'ลูกค้า'}
          </div>
          {order.delivery_address && (
            <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 4 }}>
              📍 {order.delivery_address}
            </div>
          )}
          {/* ยอดเก็บเงินปลายทาง */}
          {order.total_amount > 0 && (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: '#fff7ed', borderRadius: 8,
              fontSize: 13, fontWeight: 700, color: '#c2410c',
            }}>
              💵 ยอดเก็บเงิน: ฿{Number(order.total_amount).toLocaleString()}
            </div>
          )}
        </div>

        {/* นำทาง */}
        {order.delivery_lat && order.delivery_lng && (
          <button
            className="btn-secondary"
            style={{ marginBottom: 16 }}
            onClick={() => window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_lat},${order.delivery_lng}&travelmode=driving`,
              '_blank'
            )}
          >
            📍 นำทางไปส่ง
          </button>
        )}

        {/* อัปโหลดรูป 1 ใบ */}
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-main)' }}>
          ถ่ายรูปยืนยัน
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 10 }}>
          📸 รูปยืนยันการส่ง (สินค้าหน้าบ้าน/จุดส่ง)
        </div>

        <div style={{ marginBottom: 16 }}>
          {preview ? (
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <img
                src={preview}
                alt="photo-deliver"
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8 }}
              />
              <button
                onClick={clearPhoto}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'rgba(0,0,0,0.5)', color: 'white',
                  border: 'none', borderRadius: '50%',
                  width: 26, height: 26, cursor: 'pointer', fontSize: 13,
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', height: 120,
                border: '2px dashed var(--color-border)',
                borderRadius: 8, background: '#fafafa',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
                flexDirection: 'column', gap: 4,
                fontFamily: 'var(--font-main)',
              }}
            >
              <span style={{ fontSize: 28 }}>📸</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-hint)' }}>แตะเพื่อถ่ายรูป</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => handlePhoto(e.target.files[0])}
          />
        </div>

        {/* GPS status (อ่านอย่างเดียว — auto แล้ว) */}
        <div style={{
          fontSize: 12,
          color: gps.lat ? '#2D9B6E' : 'var(--color-text-hint)',
          marginBottom: 16,
          padding: '6px 10px',
          background: gps.lat ? '#f0faf5' : '#f5f5f5',
          borderRadius: 8,
        }}>
          {gps.lat
            ? `📌 GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`
            : '⏳ กำลังดึง GPS…'}
        </div>

        {/* Submit */}
        <button
          className="btn-primary"
          disabled={submitting || !photo}
          onClick={handleSubmit}
          style={{ opacity: !photo ? 0.5 : 1 }}
        >
          {submitting ? 'กำลังส่ง…' : '✅ ยืนยันส่งสินค้าแล้ว'}
        </button>

      </div>
    </div>
  );
}
