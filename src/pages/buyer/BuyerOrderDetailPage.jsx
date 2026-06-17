// src/pages/buyer/BuyerOrderDetailPage.jsx
// รายละเอียด order — timeline สถานะ, ยืนยันรับสินค้า, dispute, review

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import buyerApi from '../../api/buyer.api';
import { toImgUrl } from '../../utils/imageUrl';

const STATUS_ORDER = [
  'pending_seller',
  'ready_for_pickup',
  'driver_assigned',
  'picked_up',
  'delivered',
  'completed',
];

const STATUS_ICONS = {
  pending_seller:   '⏳',
  confirmed:        '✅',
  ready_for_pickup: '📦',
  driver_assigned:  '🚚',
  picked_up:        '🏃',
  delivered:        '📬',
  completed:        '🎉',
  cancelled:        '❌',
  disputed:         '⚠️',
};

/* ── Status Timeline ─────────────────────────────── */
function Timeline({ currentStatus }) {
  const { t } = useTranslation();
  if (currentStatus === 'cancelled' || currentStatus === 'disputed') {
    return (
      <div
        style={{
          padding: '12px 16px', margin: '0 16px 12px',
          borderRadius: 'var(--radius-md)',
          background: currentStatus === 'cancelled' ? '#fdecea' : '#fff8e1',
          color: currentStatus === 'cancelled' ? 'var(--color-danger)' : '#8a6d00',
          fontSize: 13, fontWeight: 600, textAlign: 'center',
        }}
      >
        {STATUS_ICONS[currentStatus]} {t(`order.status_${currentStatus}`)}
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div style={{ padding: '12px 16px', marginBottom: 4 }}>
      {STATUS_ORDER.map((s, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 4 }}>
            {/* Dot + line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 12 }}>
              <div
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: done || active ? 'var(--color-primary)' : 'var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: 'white', flexShrink: 0,
                }}
              >
                {done ? '✓' : active ? STATUS_ICONS[s] : '·'}
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <div
                  style={{
                    width: 2, height: 20,
                    background: done ? 'var(--color-primary)' : 'var(--color-border)',
                    marginTop: 2,
                  }}
                />
              )}
            </div>
            {/* Label */}
            <div
              style={{
                paddingTop: 3,
                fontSize: active ? 13 : 12,
                fontWeight: active ? 700 : 400,
                color: done || active ? 'var(--color-text-main)' : 'var(--color-text-hint)',
              }}
            >
              {t(`order.status_${s}`)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Review form ─────────────────────────────────── */
function ReviewForm({ orderId, sellerId, driverId, onDone }) {
  const { t } = useTranslation();
  const [sellerScore,  setSellerScore]  = useState(5);
  const [driverScore,  setDriverScore]  = useState(5);
  const [sellerComment, setSellerComment] = useState('');
  const [driverComment, setDriverComment] = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      await buyerApi.post('/ratings', {
        order_id:       orderId,
        seller_score:   sellerId ? sellerScore  : undefined,
        seller_comment: sellerId ? sellerComment.trim() || undefined : undefined,
        driver_score:   driverId ? driverScore  : undefined,
        driver_comment: driverId ? driverComment.trim() || undefined : undefined,
      });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  function StarRow({ score, onChange }) {
    return (
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            onClick={() => onChange(n)}
            style={{ fontSize: 24, cursor: 'pointer', color: n <= score ? '#faad14' : '#d9d9d9' }}
          >
            ★
          </span>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>⭐ {t('buyer.write_review')}</div>

      {sellerId && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 4 }}>ร้านค้า</div>
          <StarRow score={sellerScore} onChange={setSellerScore} />
          <textarea
            placeholder="ความคิดเห็น (ไม่บังคับ)"
            value={sellerComment}
            onChange={(e) => setSellerComment(e.target.value)}
            rows={2}
            style={{
              width: '100%', padding: 8, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', fontSize: 13,
              fontFamily: 'var(--font-main)', boxSizing: 'border-box',
              resize: 'none', outline: 'none',
            }}
          />
        </div>
      )}

      {driverId && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 4 }}>ขนส่ง</div>
          <StarRow score={driverScore} onChange={setDriverScore} />
          <textarea
            placeholder="ความคิดเห็น (ไม่บังคับ)"
            value={driverComment}
            onChange={(e) => setDriverComment(e.target.value)}
            rows={2}
            style={{
              width: '100%', padding: 8, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', fontSize: 13,
              fontFamily: 'var(--font-main)', boxSizing: 'border-box',
              resize: 'none', outline: 'none',
            }}
          />
        </div>
      )}

      {error && <div className="error-box" style={{ marginBottom: 10 }}>{error}</div>}

      <button onClick={handleSubmit} disabled={loading} className="btn-primary">
        {loading ? t('common.loading') + '…' : t('common.submit')}
      </button>
    </div>
  );
}

/* ── Main ────────────────────────────────────────── */
export default function BuyerOrderDetailPage({ orderId, onBack, onToast }) {
  const { t } = useTranslation();
  const [order, setOrder]          = useState(null);
  const [loading, setLoading]      = useState(true);
  const [completing, setComplete]  = useState(false);
  const [cancelling, setCancelling]= useState(false);
  const [disputing, setDispute]    = useState(false);
  const [showDispute, setShowD]    = useState(false);
  const [disputeReason, setReason] = useState('');
  const [showReview, setShowReview]= useState(false);
  const [reviewed, setReviewed]    = useState(false);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [slipPreview, setSlipPreview]     = useState(null);
  const [showSlipViewer, setShowSlipViewer] = useState(false);
  const slipInputRef = useRef(null);

  async function handleSlipUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlip(true);
    try {
      const fd = new FormData();
      fd.append('slip', file);
      await buyerApi.post(`/orders/${orderId}/payment-slip`, fd);
      setSlipPreview(null);
      if (onToast) onToast('✅ ส่งสลิปสำเร็จ รอ Seller ยืนยัน');
      loadOrder(); // reload เพื่อแสดง slip ล่าสุด
    } catch (err) {
      alert(err.response?.data?.error || 'ส่งสลิปไม่สำเร็จ');
    } finally {
      setUploadingSlip(false);
      e.target.value = '';
    }
  }

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await buyerApi.get(`/orders/${orderId}`);
      setOrder(res.data.order || res.data.data || res.data);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  async function handleComplete() {
    if (!window.confirm(t('buyer.confirm_complete'))) return;
    setComplete(true);
    try {
      await buyerApi.post(`/orders/${orderId}/complete`);
      if (onToast) onToast('🎉 ยืนยันรับสินค้าแล้ว!');
      loadOrder();
    } catch (err) {
      alert(err.response?.data?.message || t('common.error'));
    } finally {
      setComplete(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('ยืนยันยกเลิกคำสั่งซื้อ?')) return;
    setCancelling(true);
    try {
      await buyerApi.post(`/orders/${orderId}/cancel`);
      if (onToast) onToast('❌ ยกเลิกคำสั่งซื้อแล้ว');
      loadOrder();
    } catch (err) {
      if (onToast) onToast(err.response?.data?.message || 'ยกเลิกไม่สำเร็จ');
    } finally {
      setCancelling(false);
    }
  }

  async function handleDispute() {
    if (!disputeReason.trim()) { alert('กรุณาระบุเหตุผล'); return; }
    setDispute(true);
    try {
      await buyerApi.post(`/orders/${orderId}/dispute`, { reason: disputeReason.trim() });
      if (onToast) onToast('⚠️ ส่งเรื่องปฏิเสธรับสินค้าแล้ว');
      setShowD(false);
      loadOrder();
    } catch (err) {
      alert(err.response?.data?.message || t('common.error'));
    } finally {
      setDispute(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="top-bar">
          <button className="top-bar-back" onClick={onBack}>‹</button>
          <span className="top-bar-title">Order</span>
          <div style={{ width: 32 }} />
        </div>
        <div className="loading-center">⏳ {t('common.loading')}…</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <div className="top-bar">
          <button className="top-bar-back" onClick={onBack}>‹</button>
          <span className="top-bar-title">—</span>
          <div style={{ width: 32 }} />
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <div>{t('common.error')}</div>
          <button className="btn-secondary" style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }} onClick={onBack}>
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const status = order.status;
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled' || status === 'disputed';

  // Review: only show after completed + not reviewed
  if (showReview && !reviewed) {
    return (
      <div>
        <div className="top-bar">
          <button className="top-bar-back" onClick={() => setShowReview(false)}>‹</button>
          <span className="top-bar-title">{t('buyer.write_review')}</span>
          <div style={{ width: 32 }} />
        </div>
        <ReviewForm
          orderId={order.id}
          sellerId={order.seller_id}
          driverId={order.driver_id}
          onDone={() => { setReviewed(true); setShowReview(false); if (onToast) onToast('⭐ ' + t('buyer.review_submitted')); }}
        />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="top-bar">
        <button className="top-bar-back" onClick={onBack}>‹</button>
        <span className="top-bar-title">#{order.order_number}</span>
        <button
          onClick={loadOrder}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          🔄
        </button>
      </div>

      {/* Status timeline */}
      <Timeline currentStatus={status} />

      {/* Main info */}
      <div style={{ padding: '0 16px 16px' }}>

        {/* Shop */}
        {order.shop_name && (
          <div style={{ marginBottom: 12, padding: 12, background: 'white', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border)' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 2 }}>ร้านค้า</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>🏪 {order.shop_name}</div>
            {order.seller_address && (
              <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 2 }}>📍 {order.seller_address}</div>
            )}
          </div>
        )}

        {/* Items */}
        <div style={{ marginBottom: 12, padding: 12, background: 'white', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 8 }}>{t('order.items')}</div>
          {(order.items || []).map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: i < order.items.length - 1 ? '0.5px solid var(--color-border)' : 'none',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--color-text-main)' }}>
                {item.product_name || item.name_th || '—'} × {item.quantity} {item.unit || ''}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                ฿{Number((item.unit_price || 0) * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ padding: 12, background: 'white', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border)', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>{t('order.subtotal')}</span>
            <span style={{ fontSize: 13 }}>฿{Number(order.subtotal || 0).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>{t('order.shipping_fee')}</span>
            <span style={{ fontSize: 13 }}>฿{Number(order.shipping_fee || 0).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', borderTop: '0.5px solid var(--color-border)', marginTop: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{t('common.total')}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>
              ฿{Number(order.total || 0).toLocaleString()}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 6, paddingTop: 6, borderTop: '0.5px solid var(--color-border)' }}>
            {(!order.payment_method || order.payment_method === 'cod')
              ? '💵 ชำระปลายทาง (COD)'
              : order.payment_method === 'promptpay'
                ? '📱 พร้อมเพย์'
                : '🏦 โอนเงินผ่านธนาคาร'
            }
          </div>
        </div>

        {/* Payment slip section — แสดงเฉพาะ payment != cod */}
        {order.payment_method && order.payment_method !== 'cod' && (
          <div
            style={{
              padding: 14, background: 'white', borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${order.payment_confirmed_at ? '#a5d6a7' : order.payment_slip_url ? '#ffe082' : 'var(--color-border)'}`,
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              🧾 หลักฐานการชำระเงิน
            </div>

            {order.payment_confirmed_at ? (
              <div style={{ fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
                ✅ Seller ยืนยันรับเงินแล้ว
              </div>
            ) : order.payment_slip_url ? (
              <div>
                <div style={{ fontSize: 12, color: '#8a6d00', marginBottom: 8 }}>⏳ รอ Seller ยืนยัน</div>
                <img
                  src={toImgUrl(order.payment_slip_url)}
                  alt="payment slip"
                  onClick={() => setShowSlipViewer(true)}
                  style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'zoom-in' }}
                />
                <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 4 }}>แตะรูปเพื่อดูขยาย</div>
                <button
                  onClick={() => slipInputRef.current.click()}
                  disabled={uploadingSlip}
                  style={{
                    marginTop: 8, padding: '6px 14px', borderRadius: 8,
                    border: '1px solid var(--color-primary)', background: 'white',
                    color: 'var(--color-primary)', fontSize: 12, cursor: 'pointer',
                    fontFamily: 'var(--font-main)',
                  }}
                >
                  🔄 เปลี่ยนสลิป
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 10 }}>
                  กรุณาโอนเงินและอัปโหลดสลิปเพื่อให้ Seller ยืนยัน
                </div>
                <button
                  onClick={() => slipInputRef.current.click()}
                  disabled={uploadingSlip}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 16px', borderRadius: 10,
                    border: '1.5px dashed var(--color-primary)',
                    background: 'var(--color-primary-light)',
                    color: 'var(--color-primary)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-main)',
                  }}
                >
                  {uploadingSlip ? '⏳ กำลังส่งสลิป...' : '📷 อัปโหลดสลิปการโอน'}
                </button>
              </div>
            )}

            <input type="file" accept="image/*" ref={slipInputRef} style={{ display: 'none' }} onChange={handleSlipUpload} />
          </div>
        )}

        {/* Slip fullscreen viewer */}
        {showSlipViewer && order.payment_slip_url && (
          <div
            onClick={() => setShowSlipViewer(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <button onClick={() => setShowSlipViewer(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'white', fontSize: 28, cursor: 'pointer' }}>✕</button>
            <img src={toImgUrl(order.payment_slip_url)} alt="slip" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />
          </div>
        )}

        {/* Delivery address */}
        {order.delivery_address && (
          <div style={{ padding: 12, background: 'white', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border)', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 4 }}>ที่อยู่จัดส่ง</div>
            <div style={{ fontSize: 13 }}>📍 {order.delivery_address}</div>
          </div>
        )}

        {/* Note */}
        {order.note && (
          <div style={{ padding: 12, background: 'white', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border)', marginBottom: 12, fontSize: 13, color: 'var(--color-text-sub)' }}>
            📝 {order.note}
          </div>
        )}

        {/* Date */}
        <div style={{ fontSize: 12, color: 'var(--color-text-hint)', textAlign: 'center', marginBottom: 12 }}>
          สั่งซื้อเมื่อ {new Date(order.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Dispute dialog */}
      {showDispute && (
        <div
          style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 480,
            background: 'white', borderTop: '1px solid var(--color-border)',
            padding: 16, boxSizing: 'border-box',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.12)', zIndex: 700,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--color-danger)' }}>
            ⚠️ ปฏิเสธรับสินค้า
          </div>
          <textarea
            placeholder="ระบุเหตุผล (เช่น สินค้าเสียหาย, ไม่ตรงตามที่สั่ง)…"
            value={disputeReason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            style={{
              width: '100%', padding: 8, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', fontSize: 13,
              fontFamily: 'var(--font-main)', boxSizing: 'border-box',
              resize: 'none', outline: 'none', marginBottom: 10,
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowD(false)}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDispute}
              disabled={disputing}
              style={{
                flex: 2, padding: 12, borderRadius: 'var(--radius-md)',
                border: 'none', background: 'var(--color-danger)', color: 'white',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-main)',
              }}
            >
              {disputing ? t('common.loading') + '…' : '⚠️ ยืนยันปฏิเสธ'}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons — sticky bottom */}
      {!showDispute && (
        <div
          style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 480,
            padding: '12px 16px', background: 'white',
            borderTop: '0.5px solid var(--color-border)',
            boxSizing: 'border-box', zIndex: 600,
            display: 'flex', gap: 8,
          }}
        >
          {/* Delivered → ยืนยันรับ + ปฏิเสธ */}
          {status === 'delivered' && (
            <>
              <button
                onClick={() => setShowD(true)}
                style={{
                  flex: 1, padding: 12, borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-danger)',
                  background: 'white', color: 'var(--color-danger)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-main)',
                }}
              >
                ⚠️ {t('buyer.order_dispute')}
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="btn-primary"
                style={{ flex: 2 }}
              >
                {completing ? t('common.loading') + '…' : '✅ ' + t('buyer.order_complete')}
              </button>
            </>
          )}

          {/* Completed + no review yet */}
          {isCompleted && !reviewed && (
            <button
              onClick={() => setShowReview(true)}
              className="btn-primary"
            >
              ⭐ {t('buyer.write_review')}
            </button>
          )}

          {/* Completed + reviewed */}
          {isCompleted && reviewed && (
            <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text-hint)', textAlign: 'center', padding: '14px 0' }}>
              ✅ ส่ง review แล้ว
            </div>
          )}

          {/* Cancelled/disputed */}
          {isCancelled && (
            <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text-hint)', textAlign: 'center', padding: '14px 0' }}>
              {STATUS_ICONS[status]} {t(`order.status_${status}`)}
            </div>
          )}

          {/* pending_seller — ยังยกเลิกได้ */}
          {status === 'pending_seller' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                width: '100%', padding: 12, borderRadius: 12,
                border: '1.5px solid var(--color-danger)',
                background: '#fff', color: 'var(--color-danger)',
                fontSize: 13, fontWeight: 700,
                cursor: cancelling ? 'not-allowed' : 'pointer',
                fontFamily: 'Prompt, sans-serif',
                opacity: cancelling ? 0.6 : 1,
              }}
            >
              {cancelling ? 'กำลังยกเลิก...' : '❌ ยกเลิกคำสั่งซื้อ'}
            </button>
          )}

          {/* Other statuses (confirmed, ready_for_pickup, etc.) — รอดำเนินการ ยกเลิกไม่ได้แล้ว */}
          {!['pending_seller', 'delivered', 'completed', 'cancelled', 'disputed'].includes(status) && (
            <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-hint)', textAlign: 'center', padding: '14px 0' }}>
              ⏳ กำลังดำเนินการ — ยกเลิกไม่ได้แล้ว
            </div>
          )}
        </div>
      )}
    </div>
  );
}
