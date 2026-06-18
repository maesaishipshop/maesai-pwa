// src/pages/buyer/BuyerProductDetailPage.jsx
// รายละเอียดสินค้า — รูปหลายรูป, info seller, qty (MOQ), place order

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import buyerApi from '../../api/buyer.api';
import { toImgUrl } from '../../utils/imageUrl';

/**
 * getVideoThumbnail(videoUrl)
 * Generate thumbnail จาก frame 0.5 วินาทีแรกของวิดีโอ
 * ใช้ canvas API — ทำงานได้ทั้ง mp4 และ mov (iOS Safari รองรับ)
 * Return: data URL (image/jpeg) หรือ null ถ้า error
 */
function getVideoThumbnail(videoUrl) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    video.src = videoUrl;
    video.currentTime = 0.5; // seek ไป 0.5 วินาที
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth  || 320;
      canvas.height = video.videoHeight || 240;
      canvas.getContext('2d').drawImage(video, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
      video.remove();
    }, { once: true });
    video.addEventListener('error', () => resolve(null), { once: true });
  });
}

/* ── Lightbox (fullscreen overlay) ──────────────── */
function ImageLightbox({ images, initialIdx, onClose }) {
  const [idx, setIdx]   = useState(initialIdx);
  const touchStartX     = useRef(null);
  const total           = images.length;

  // ล็อก body scroll ตอน lightbox เปิด
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // keyboard ESC / arrow
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  setIdx((i) => (i - 1 + total) % total);
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % total);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total, onClose]);

  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > 50)  setIdx((i) => (i - 1 + total) % total);
    if (delta < -50) setIdx((i) => (i + 1) % total);
  }

  const url = toImgUrl(images[idx]?.image_path || images[idx]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* ปุ่มปิด */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', border: 'none',
          color: 'white', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1,
        }}
      >
        ✕
      </button>

      {/* รูปหลัก — stopPropagation ป้องกัน click ผ่านไปปิด */}
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%', maxWidth: 480,
          height: '75vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}
      >
        <img
          src={url}
          alt="product fullscreen"
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        {/* Arrow buttons */}
        {total > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + total) % total); }}
              style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', border: 'none',
                color: 'white', fontSize: 22,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ‹
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % total); }}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', border: 'none',
                color: 'white', fontSize: 22,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Dot indicator + counter */}
      {total > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 12 }}
        >
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            {idx + 1} / {total}
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {images.map((_, i) => (
              <div
                key={i}
                onClick={() => setIdx(i)}
                style={{
                  width: i === idx ? 16 : 6, height: 6, borderRadius: 3,
                  background: i === idx ? 'white' : 'rgba(255,255,255,0.35)',
                  transition: 'width 0.2s', cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Image gallery ───────────────────────────────── */
function ImageGallery({ images }) {
  const [idx, setIdx]         = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState(null); // null = ปิด
  const touchStartX            = useRef(null);

  if (!images || images.length === 0) {
    return (
      <div
        style={{
          height: 240, background: 'var(--color-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 56, color: 'var(--color-text-hint)',
        }}
      >
        📦
      </div>
    );
  }

  const total   = images.length;
  const prev    = () => setIdx((i) => (i - 1 + total) % total);
  const next    = () => setIdx((i) => (i + 1) % total);
  const current = images[idx];
  const url     = toImgUrl(current?.image_path || current);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > 50)  prev();
    if (delta < -50) next();
  }

  return (
    <div>
      {/* Lightbox */}
      {lightboxIdx !== null && (
        <ImageLightbox
          images={images}
          initialIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      {/* Main image + swipe + arrows */}
      <div
        style={{ position: 'relative', height: 240, background: '#000', overflow: 'hidden' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={url}
          alt="product"
          onClick={() => setLightboxIdx(idx)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'zoom-in' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        {/* Arrow buttons — แสดงเฉพาะเมื่อมีมากกว่า 1 รูป */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)', border: 'none',
                color: 'white', fontSize: 18, lineHeight: 1,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ‹
            </button>
            <button
              onClick={next}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)', border: 'none',
                color: 'white', fontSize: 18, lineHeight: 1,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ›
            </button>
            {/* Dot indicator */}
            <div
              style={{
                position: 'absolute', bottom: 8, left: 0, right: 0,
                display: 'flex', justifyContent: 'center', gap: 5,
              }}
            >
              {images.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setIdx(i)}
                  style={{
                    width: i === idx ? 16 : 6, height: 6, borderRadius: 3,
                    background: i === idx ? 'white' : 'rgba(255,255,255,0.5)',
                    transition: 'width 0.2s',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 16px', overflowX: 'auto' }}>
          {images.map((img, i) => {
            const thumbUrl = toImgUrl(img?.image_path || img);
            return (
              <div
                key={i}
                onClick={() => setIdx(i)}
                style={{
                  width: 52, height: 52, flexShrink: 0,
                  borderRadius: 8, overflow: 'hidden',
                  border: i === idx ? '2px solid var(--color-primary)' : '2px solid transparent',
                  cursor: 'pointer', background: 'var(--color-bg)',
                }}
              >
                <img
                  src={thumbUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Info row ────────────────────────────────────── */
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--color-border)' }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)' }}>{value}</span>
    </div>
  );
}

/* ── Main ────────────────────────────────────────── */
export default function BuyerProductDetailPage({ productId, onBack, onOrderPlaced, onChatSeller, onOpenChatRoom, onNavigate }) {
  const { t } = useTranslation();
  const [product, setProduct]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [qty, setQty]                 = useState(1);
  const [ordering, setOrdering]       = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError]             = useState('');
  const [showOrder, setShowOrder]     = useState(false);
  const [note, setNote]               = useState('');
  const [addressRequired, setAddressRequired] = useState(false);
  const [videoPoster, setVideoPoster] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' | 'promptpay' | 'bank_transfer'
  const [sellerPayment, setSellerPayment] = useState(null); // ข้อมูล payment ของ seller
  const [showPaymentModal, setShowPaymentModal] = useState(false); // modal ข้อมูลการโอน

  /* ── Load product ────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    buyerApi.get(`/products/${productId}`)
      .then((r) => {
        const p = r.data.product || r.data.data || r.data;
        setProduct(p);
        setQty(p.moq || 1);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [productId]);

  /* ── Generate video thumbnail เมื่อมี video_path ── */
  useEffect(() => {
    if (!product?.video_path) { setVideoPoster(null); return; }
    const videoUrl = toImgUrl(product.video_path);
    getVideoThumbnail(videoUrl).then(setVideoPoster);
  }, [product?.video_path]);

  /* ── ดึงข้อมูล payment ของ seller (เฉพาะเมื่อมี seller_id) ── */
  useEffect(() => {
    if (!product?.seller_id) return;
    buyerApi.get(`/sellers/${product.seller_id}/public`)
      .then((r) => {
        const s = r.data.seller;
        setSellerPayment({
          cod_fee:            s.cod_fee           || 0,
          promptpay_number:   s.promptpay_number  || null,
          promptpay_qr_image: s.promptpay_qr_image|| null,
          bank_name:          s.bank_name         || null,
          bank_account:       s.bank_account      || null,
          bank_account_name:  s.bank_account_name || null,
        });
      })
      .catch(() => {});
  }, [product?.seller_id]);

  /* ── Place order ─────────────────────────────── */
  async function handleOrder() {
    if (!product) return;
    const moq   = Number(product.moq || 1);
    const stock = Number(product.stock || 0);
    if (qty < moq) {
      setError(t('buyer.qty_below_moq').replace('{{moq}}', moq).replace('{{unit}}', product.unit || ''));
      return;
    }
    if (stock > 0 && qty > stock) {
      setError(t('buyer.qty_over_stock'));
      return;
    }
    setError('');
    setOrdering(true);
    const payload = {
      seller_id:      product.seller_id,
      items:          [{ product_id: product.id, quantity: qty }],
      note:           note.trim() || undefined,
      payment_method: paymentMethod,
    };
    try {
      const res = await buyerApi.post('/orders', payload);
      const orderId = res.data.order?.id || res.data.data?.id || res.data.id;
      setShowOrder(false);
      if (paymentMethod !== 'cod') {
        // เปิด modal ให้อัปโหลดสลิปทันทีหลัง order สร้างสำเร็จ
        setShowPaymentModal(false); // ปิด modal เดิมก่อน
        if (onOrderPlaced) onOrderPlaced(orderId);
      } else {
        if (onOrderPlaced) onOrderPlaced(orderId);
      }
    } catch (err) {
      const errorCode = err.response?.data?.error || err.response?.data?.message;
      if (errorCode === 'DELIVERY_ADDRESS_REQUIRED') {
        setAddressRequired(true);
        setError('');
      } else {
        setAddressRequired(false);
        setError(err.response?.data?.message || 'สั่งซื้อไม่สำเร็จ');
      }
    } finally {
      setOrdering(false);
    }
  }

  /* ── Slip file picker ────────────────────────── */
  /* ── Loading ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="page-container">
        <div className="top-bar">
          <button className="top-bar-back" onClick={onBack}>‹</button>
          <span className="top-bar-title">{t('common.loading')}…</span>
          <div style={{ width: 32 }} />
        </div>
        <div className="loading-center">⏳ {t('common.loading')}…</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-container">
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

  const name  = product.name_th || product.name_en || product.name_my || '—';
  const stock = Number(product.stock || 0);
  const moq   = Number(product.moq || 1);

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Top bar */}
      <div className="top-bar">
        <button className="top-bar-back" onClick={onBack}>‹</button>
        <span className="top-bar-title" style={{ fontSize: 14 }}>{name}</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Images */}
      <ImageGallery images={product.images || []} />

      {/* Video แนะนำสินค้า — แสดงเฉพาะเมื่อมี video_path */}
      {product.video_path && (
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)', marginBottom: 8 }}>
            🎬 วิดีโอแนะนำสินค้า
          </div>
          <video
            src={toImgUrl(product.video_path)}
            poster={videoPoster || undefined}
            controls
            playsInline
            preload="metadata"
            style={{
              width: '100%',
              maxHeight: 260,
              borderRadius: 'var(--radius-md)',
              background: '#000',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* Main info */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-main)', marginBottom: 4 }}>
          {name}
        </div>

        {/* Category + stock badge */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {product.category_name && (
            <span style={{ fontSize: 11, background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', borderRadius: 10, padding: '2px 8px' }}>
              {product.category_name}
            </span>
          )}
          {stock === 0 ? (
            <span style={{ fontSize: 11, background: '#fdecea', color: 'var(--color-danger)', borderRadius: 10, padding: '2px 8px', fontWeight: 600 }}>
              {t('product.out_of_stock')}
            </span>
          ) : (
            <span style={{ fontSize: 11, background: '#e8f5ef', color: 'var(--color-primary)', borderRadius: 10, padding: '2px 8px' }}>
              {t('buyer.stock')}: {stock} {product.unit}
            </span>
          )}
        </div>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>
            ฿{Number(product.price || 0).toLocaleString()}
          </span>
          <span style={{ fontSize: 14, color: 'var(--color-text-sub)' }}>/ {product.unit}</span>
        </div>

        {/* Details */}
        <InfoRow label={`MOQ`}                value={`${moq} ${product.unit || ''}`} />
        <InfoRow label={t('product.weight')}  value={product.weight_per_unit ? `${product.weight_per_unit} ${t('common.kg')}` : null} />
        <InfoRow label={t('product.origin')}  value={product.origin_country} />

        {/* Description */}
        {product.description && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)', marginBottom: 4 }}>{t('product.description')}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-sub)', lineHeight: 1.6 }}>{product.description}</div>
          </div>
        )}

        {/* Promotions */}
        {product.promotions && product.promotions.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>🎁 โปรโมชั่น</div>
            {product.promotions.map((promo, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12, padding: '6px 10px',
                  background: '#fffbe6', borderRadius: 8,
                  border: '1px solid #ffe58f',
                  marginBottom: 4, color: '#8a6d00',
                }}
              >
                {promo.name_th || promo.name_en || promo.description || 'โปรโมชั่น'}
              </div>
            ))}
          </div>
        )}

        {/* Seller info */}
        <div
          style={{
            marginTop: 16, padding: 12, borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg)', border: '0.5px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>🏪 {t('buyer.seller_info')}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-main)', fontWeight: 600 }}>
            {product.shop_name || product.seller_name || '—'}
          </div>
          {product.address && (
            <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 3 }}>
              📍 {product.address}
            </div>
          )}
          {product.seller_id && (onOpenChatRoom || onChatSeller) && (
            <button
              disabled={chatLoading}
              onClick={async () => {
                if (!onOpenChatRoom) {
                  // Fallback: ส่ง seller_id ตรงๆ (BuyerChatPage จะสร้างห้องเอง)
                  onChatSeller(product.seller_id);
                  return;
                }
                // POST สร้าง/เปิดห้องก่อน แล้วค่อย navigate พร้อม room object
                setChatLoading(true);
                try {
                  const res = await buyerApi.post('/chat/rooms', {
                    type:     'seller_buyer',
                    targetId: product.seller_id,
                  });
                  const room = res.data.room || res.data.data || res.data;
                  if (room) {
                    // Enrich ด้วยชื่อร้านที่เราทราบอยู่แล้ว (ไม่ต้อง fetch ซ้ำ)
                    onOpenChatRoom({
                      ...room,
                      shop_name:   product.shop_name || product.seller_name,
                      seller_name: product.shop_name || product.seller_name,
                    });
                  }
                } catch (err) {
                  console.error('[Chat] สร้างห้องไม่สำเร็จ:', err.response?.data || err.message);
                } finally {
                  setChatLoading(false);
                }
              }}
              style={{
                marginTop: 8, padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-primary)', background: 'white',
                color: 'var(--color-primary)', fontSize: 12, fontWeight: 600,
                cursor: chatLoading ? 'wait' : 'pointer',
                fontFamily: 'var(--font-main)',
                opacity: chatLoading ? 0.6 : 1,
              }}
            >
              {chatLoading ? '⏳ กำลังเชื่อมต่อ...' : `💬 ${t('buyer.chat_with_seller')}`}
            </button>
          )}
        </div>
      </div>

      {/* Order panel */}
      {showOrder && (
        <div
          style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 480,
            background: 'white', borderTop: '1px solid var(--color-border)',
            padding: 16, boxSizing: 'border-box',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.12)', zIndex: 600,
            maxHeight: '85vh', overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>📦 สั่งซื้อ</div>

          {/* Qty */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>{t('buyer.qty')}</span>
            <button
              onClick={() => setQty((q) => Math.max(moq, q - moq))}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer', fontSize: 16 }}
            >
              −
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{qty}</span>
            <button
              onClick={() => setQty((q) => q + moq)}
              style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontSize: 16 }}
            >
              +
            </button>
            <span style={{ fontSize: 12, color: 'var(--color-text-hint)' }}>{product.unit}</span>
          </div>

          {/* Note */}
          <textarea
            placeholder="หมายเหตุ (ไม่บังคับ)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            style={{
              width: '100%', padding: 8, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', fontSize: 13,
              fontFamily: 'var(--font-main)', boxSizing: 'border-box',
              resize: 'none', outline: 'none', marginBottom: 8,
            }}
          />

          {/* Payment method selector */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>💳 วิธีชำระเงิน</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* COD */}
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  border: paymentMethod === 'cod' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: paymentMethod === 'cod' ? 'var(--color-primary-light)' : 'white',
                  cursor: 'pointer',
                }}
              >
                <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} style={{ accentColor: 'var(--color-primary)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>💵 เก็บเงินปลายทาง (COD)</div>
                  {sellerPayment?.cod_fee > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>
                      + ค่าธรรมเนียม ฿{Number(sellerPayment.cod_fee).toLocaleString()}
                    </div>
                  )}
                </div>
              </label>

              {/* PromptPay — แสดงเฉพาะมีเบอร์หรือ QR */}
              {(sellerPayment?.promptpay_number || sellerPayment?.promptpay_qr_image) && (
                <label
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    border: paymentMethod === 'promptpay' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: paymentMethod === 'promptpay' ? 'var(--color-primary-light)' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <input type="radio" name="payment" value="promptpay" checked={paymentMethod === 'promptpay'} onChange={() => setPaymentMethod('promptpay')} style={{ accentColor: 'var(--color-primary)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>📱 พร้อมเพย์</div>
                    {sellerPayment?.promptpay_number && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>{sellerPayment.promptpay_number}</div>
                    )}
                  </div>
                </label>
              )}

              {/* Bank transfer — แสดงเฉพาะมีข้อมูลธนาคาร */}
              {sellerPayment?.bank_name && sellerPayment?.bank_account && (
                <label
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    border: paymentMethod === 'bank_transfer' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: paymentMethod === 'bank_transfer' ? 'var(--color-primary-light)' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <input type="radio" name="payment" value="bank_transfer" checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')} style={{ accentColor: 'var(--color-primary)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>🏦 โอนเงินผ่านธนาคาร</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>{sellerPayment.bank_name} · {sellerPayment.bank_account}</div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Total estimate */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
            <span style={{ color: 'var(--color-text-sub)' }}>ยอดสินค้า</span>
            <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
              ฿{(qty * Number(product.price)).toLocaleString()}
            </span>
          </div>
          {paymentMethod === 'cod' && sellerPayment?.cod_fee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: 'var(--color-text-sub)' }}>ค่าธรรมเนียม COD</span>
              <span style={{ color: 'var(--color-text-sub)' }}>฿{Number(sellerPayment.cod_fee).toLocaleString()}</span>
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginBottom: 10 }}>
            * ค่าขนส่งร้านค้ากำหนด — จ่ายตอนส่งมอบสินค้า
          </div>

          {/* Banner: ยังไม่มีที่อยู่จัดส่ง */}
          {addressRequired && (
            <div
              onClick={() => {
                setShowOrder(false);
                if (onNavigate) onNavigate('profile', { returnTo: 'home' });
              }}
              style={{
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              <p style={{ color: '#DC2626', fontWeight: 700, fontSize: 13, margin: '0 0 2px' }}>
                ⚠️ ยังไม่มีที่อยู่จัดส่ง
              </p>
              <p style={{ color: '#DC2626', fontSize: 12, margin: 0 }}>
                แตะที่นี่เพื่อตั้งที่อยู่จัดส่ง →
              </p>
            </div>
          )}

          {error && <div className="error-box" style={{ marginBottom: 10 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setShowOrder(false); setPaymentMethod('cod'); }}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              {t('common.cancel')}
            </button>
            {paymentMethod !== 'cod' ? (
              <button
                onClick={() => { setError(''); setShowPaymentModal(true); }}
                disabled={stock === 0}
                className="btn-primary"
                style={{ flex: 2 }}
              >
                📋 ดูข้อมูลการโอน
              </button>
            ) : (
              <button
                onClick={handleOrder}
                disabled={ordering || stock === 0}
                className="btn-primary"
                style={{ flex: 2 }}
              >
                {ordering ? t('common.loading') + '…' : '✅ ' + t('buyer.place_order')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Payment info modal (แสดงข้อมูลการโอน + slip upload) */}
      {showPaymentModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 700,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: 'white', borderRadius: '16px 16px 0 0',
              padding: 20, boxSizing: 'border-box',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
              {paymentMethod === 'promptpay' ? '📱 ข้อมูลพร้อมเพย์' : '🏦 ข้อมูลบัญชีธนาคาร'}
            </div>

            {/* PromptPay info */}
            {paymentMethod === 'promptpay' && sellerPayment && (
              <div style={{ marginBottom: 16 }}>
                {sellerPayment.promptpay_number && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 2 }}>เบอร์พร้อมเพย์</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)' }}>{sellerPayment.promptpay_number}</div>
                  </div>
                )}
                {sellerPayment.promptpay_qr_image && (
                  <div style={{ textAlign: 'center', marginBottom: 10 }}>
                    <img
                      src={toImgUrl(sellerPayment.promptpay_qr_image)}
                      alt="QR PromptPay"
                      style={{ width: 200, height: 200, objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: 8 }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 4 }}>สแกน QR เพื่อโอนเงิน</div>
                  </div>
                )}
              </div>
            )}

            {/* Bank transfer info */}
            {paymentMethod === 'bank_transfer' && sellerPayment && (
              <div
                style={{ background: 'var(--color-bg)', borderRadius: 10, padding: 14, marginBottom: 16 }}
              >
                <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 4 }}>ธนาคาร</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{sellerPayment.bank_name || '—'}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 4 }}>เลขบัญชี</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 1, marginBottom: 8 }}>{sellerPayment.bank_account || '—'}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 4 }}>ชื่อบัญชี</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{sellerPayment.bank_account_name || '—'}</div>
              </div>
            )}

            {/* ยอดที่ต้องโอน */}
            <div
              style={{
                background: '#e8f5ef', borderRadius: 10, padding: 12, marginBottom: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--color-primary-dark)' }}>ยอดที่ต้องโอน (ค่าสินค้า)</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-primary)' }}>
                ฿{(qty * Number(product.price)).toLocaleString()}
              </span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 16 }}>
              * อัปโหลดสลิปการโอนหลังจากสั่งซื้อสำเร็จ ใน หน้าคำสั่งซื้อ → รายละเอียด Order
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                ยกเลิก
              </button>
              <button
                onClick={() => { setShowPaymentModal(false); handleOrder(); }}
                disabled={ordering || stock === 0}
                className="btn-primary"
                style={{ flex: 2 }}
              >
                {ordering ? t('common.loading') + '…' : '✅ ยืนยันสั่งซื้อ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky buy button */}
      {!showOrder && (
        <div
          style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 480,
            padding: '12px 16px', background: 'white',
            borderTop: '0.5px solid var(--color-border)',
            boxSizing: 'border-box', zIndex: 600,
          }}
        >
          <button
            onClick={() => { setError(''); setAddressRequired(false); setShowOrder(true); }}
            disabled={stock === 0}
            className="btn-primary"
          >
            {stock === 0 ? t('product.out_of_stock') : `🛒 ${t('buyer.place_order')}`}
          </button>
        </div>
      )}
    </div>
  );
}
