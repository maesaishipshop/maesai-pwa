// src/pages/seller/SellerProductsPage.jsx
//
// Bug #1 fix: รูปสินค้าไม่แสดง
//   - GET /api/products/seller ส่งกลับ primary_image (scalar path) ไม่ใช่ images[]
//   - path เป็น /uploads/products/xxx.jpg ของ backend port 3000
//   - Frontend port 3001 → ต้อง prepend BACKEND_URL ก่อน
//   - product.name → product.name_th (field name จาก backend)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import sellerApi from '../../api/seller.api';
import ProductFormModal from '../../components/seller/ProductFormModal';
import { toImgUrl } from '../../utils/imageUrl';

/**
 * getVideoThumbnail(videoUrl)
 * Generate thumbnail จาก frame 0.5 วินาทีแรกของวิดีโอด้วย canvas
 * Return: data URL (image/jpeg) หรือ null ถ้า error
 */
function getVideoThumbnail(videoUrl) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    video.src = videoUrl;
    video.currentTime = 0.5;
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

const FILTER_TABS = [
  { key: 'all',      labelKey: 'common.all'              },
  { key: 'active',   labelKey: 'seller.product_active'   },
  { key: 'inactive', labelKey: 'seller.product_inactive' },
];

// ─────────────────────────────────────────────────────────────────
// VideoModal — จัดการวิดีโอแนะนำสินค้า (อัปโหลด / เปลี่ยน / ลบ)
// ─────────────────────────────────────────────────────────────────
function VideoModal({ product, onClose, onVideoUpdated }) {
  const [videoPath, setVideoPath]       = useState(product.video_path || null);
  const [poster, setPoster]             = useState(null);
  const [previewFile, setPreviewFile]   = useState(null);
  const [previewUrl, setPreviewUrl]     = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoError, setVideoError]     = useState('');
  const videoFileInputRef = useRef(null);

  // Generate thumbnail เมื่อมี videoPath
  useEffect(() => {
    if (!videoPath) { setPoster(null); return; }
    const url = toImgUrl(videoPath);
    getVideoThumbnail(url).then(setPoster);
  }, [videoPath]);

  // iOS safe: .click() ต้องเป็นบรรทัดแรกของ event handler
  function handleVideoButtonClick() {
    videoFileInputRef.current.click();
  }

  function handleVideoFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoError('');
    // ตรวจขนาด client-side (200MB)
    if (file.size > 200 * 1024 * 1024) {
      setVideoError('วิดีโอต้องไม่เกิน 200MB');
      e.target.value = '';
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!previewFile) return;
    setUploading(true);
    setUploadProgress(0);
    setVideoError('');
    try {
      const fd = new FormData();
      fd.append('video', previewFile);
      const res = await sellerApi.post(`/products/${product.id}/video`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      const newPath = res.data.video_path;
      // cleanup preview
      URL.revokeObjectURL(previewUrl);
      setPreviewFile(null);
      setPreviewUrl(null);
      setVideoPath(newPath);
      setPoster(null); // reset poster — useEffect จะ generate ใหม่
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
      onVideoUpdated(product.id, newPath);
    } catch (err) {
      const code = err.response?.status;
      if (code === 413) setVideoError('ไฟล์ใหญ่เกิน 200MB');
      else if (code === 400) setVideoError('ไฟล์ประเภทนี้ไม่รองรับ (ใช้ mp4, mov, webm)');
      else setVideoError(err.response?.data?.error || 'อัปโหลดไม่สำเร็จ');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDelete() {
    if (!window.confirm('ลบวิดีโอแนะนำสินค้านี้?')) return;
    setUploading(true);
    setVideoError('');
    try {
      await sellerApi.delete(`/products/${product.id}/video`);
      setVideoPath(null);
      setPoster(null);
      onVideoUpdated(product.id, null);
    } catch (err) {
      setVideoError(err.response?.data?.error || 'ลบวิดีโอไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  }

  function cancelPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
    setVideoError('');
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';
  }

  const productName = product.name_th || product.name_en || product.name_my || '—';
  const fileSizeMB  = previewFile ? (previewFile.size / 1024 / 1024).toFixed(1) : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 16, padding: 20,
          width: '100%', maxWidth: 360,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-main)' }}>
              🎥 วิดีโอสินค้า
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 2 }}>
              {productName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-hint)', lineHeight: 1, padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Error */}
        {videoError && (
          <div style={{ background: '#fdecea', color: 'var(--color-danger)', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
            ⚠️ {videoError}
          </div>
        )}

        {/* Preview ไฟล์ใหม่ที่เลือกแล้ว (ยังไม่อัปโหลด) */}
        {previewUrl && (
          <div style={{ marginBottom: 12 }}>
            <video
              src={previewUrl}
              controls
              playsInline
              muted
              style={{ width: '100%', height: 200, borderRadius: 10, background: '#000', display: 'block', objectFit: 'contain' }}
            />
            <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 4 }}>
              {previewFile?.name} — {fileSizeMB} MB
            </div>

            {/* Progress bar */}
            {uploading && (
              <div style={{ marginTop: 8 }}>
                <div style={{ background: 'var(--color-bg)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 99, transition: 'width 0.2s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-sub)', marginTop: 4, textAlign: 'center' }}>
                  {uploadProgress}% กำลังอัปโหลด...
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  flex: 2, padding: '8px 0', borderRadius: 8, border: 'none',
                  background: uploading ? 'var(--color-text-hint)' : 'var(--color-primary)',
                  color: 'white', fontSize: 13, fontWeight: 600,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-main)',
                }}
              >
                {uploading ? `⏳ ${uploadProgress}%` : '☁️ อัปโหลดวิดีโอ'}
              </button>
              <button
                onClick={cancelPreview}
                disabled={uploading}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8,
                  border: '1px solid var(--color-border)', background: 'white',
                  color: 'var(--color-text-sub)', fontSize: 13,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-main)',
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* มีวิดีโออยู่แล้ว + ไม่ได้อยู่ในโหมด preview */}
        {videoPath && !previewUrl && (
          <div style={{ marginBottom: 12 }}>
            <video
              src={toImgUrl(videoPath)}
              poster={poster || undefined}
              controls
              playsInline
              muted
              style={{ width: '100%', height: 200, borderRadius: 10, background: '#000', display: 'block', objectFit: 'contain' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={handleVideoButtonClick}
                disabled={uploading}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8,
                  border: '1px solid var(--color-primary)', background: 'white',
                  color: 'var(--color-primary)', fontSize: 13, fontWeight: 600,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-main)',
                }}
              >
                🔄 เปลี่ยนวิดีโอ
              </button>
              <button
                onClick={handleDelete}
                disabled={uploading}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8,
                  border: '1px solid var(--color-danger)', background: 'white',
                  color: 'var(--color-danger)', fontSize: 13, fontWeight: 600,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-main)',
                }}
              >
                {uploading ? '⏳ กำลังลบ...' : '🗑 ลบวิดีโอ'}
              </button>
            </div>
          </div>
        )}

        {/* ยังไม่มีวิดีโอ + ไม่ได้อยู่ในโหมด preview */}
        {!videoPath && !previewUrl && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🎬</div>
            <div style={{ fontSize: 14, color: 'var(--color-text-sub)', marginBottom: 16 }}>
              ยังไม่มีวิดีโอแนะนำสินค้า
            </div>
            <button
              onClick={handleVideoButtonClick}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: 'var(--color-primary)', color: 'white',
                fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-main)',
              }}
            >
              ➕ เพิ่มวิดีโอ
            </button>
          </div>
        )}

        {/* Hidden file input — iOS safe: .click() เรียกใน handleVideoButtonClick บรรทัดแรก */}
        <input
          ref={videoFileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
          hidden
          onChange={handleVideoFileChange}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ProductCard
// ─────────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete, onToggle, onVideoManage }) {
  const { t } = useTranslation();

  // Bug #1 fix: ใช้ primary_image (scalar) ไม่ใช่ images[0].image_path
  const imgUrl = toImgUrl(product.primary_image);

  // Bug #1 fix: backend ส่ง name_th ไม่ใช่ name
  const displayName = product.name_th || product.name_en || product.name_my || product.name || '—';

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '0.5px solid var(--color-border)',
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      {/* รูปสินค้า หรือ placeholder */}
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={displayName}
          style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        style={{
          width: 56, height: 56, borderRadius: 10,
          background: 'var(--color-primary-light)',
          display: imgUrl ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}
      >
        📦
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div
            style={{
              fontSize: 14, fontWeight: 600, color: 'var(--color-text-main)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 160,
            }}
          >
            {displayName}
          </div>
          <span
            className={`badge ${product.is_active ? 'badge-success' : 'badge-gray'}`}
            style={{ flexShrink: 0, marginLeft: 6 }}
          >
            {product.is_active ? t('seller.product_active') : t('seller.product_inactive')}
          </span>
        </div>

        <div style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600, marginTop: 3 }}>
          ฿{Number(product.price).toLocaleString()} / {product.unit}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-sub)', marginTop: 2 }}>
          {t('seller.stock')}: {product.stock} | MOQ: {product.moq}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => onToggle(product)}
            style={{
              padding: '5px 10px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', background: 'white',
              fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-main)',
              color: 'var(--color-text-sub)',
            }}
          >
            {product.is_active ? '⏸ ปิด' : '▶ เปิด'}
          </button>
          <button
            onClick={() => onEdit(product)}
            style={{
              padding: '5px 10px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', background: 'white',
              fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-main)',
              color: 'var(--color-text-sub)',
            }}
          >
            ✏️ {t('common.edit')}
          </button>
          <button
            onClick={() => onDelete(product.id)}
            style={{
              padding: '5px 10px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', background: 'white',
              fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-main)',
              color: 'var(--color-danger)',
            }}
          >
            🗑
          </button>
          {/* ปุ่ม 🎥 วิดีโอ — กดเพื่อจัดการวิดีโอ */}
          <button
            onClick={() => onVideoManage(product)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '5px 10px', borderRadius: 'var(--radius-sm)',
              border: product.video_path
                ? '1px solid #2D9B6E'
                : '1px solid var(--color-border)',
              background: product.video_path ? '#2D9B6E' : 'white',
              color: product.video_path ? 'white' : 'var(--color-text-hint)',
              fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-main)',
            }}
          >
            🎥{product.video_path ? ' วิดีโอ' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SellerProductsPage
// ─────────────────────────────────────────────────────────────────
export default function SellerProductsPage() {
  const { t } = useTranslation();
  const [products, setProducts]               = useState([]);
  const [filter, setFilter]                   = useState('all');
  const [loading, setLoading]                 = useState(true);
  const [modalOpen, setModal]                 = useState(false);
  const [editing, setEditing]                 = useState(null);
  const [videoModalProduct, setVideoModalProduct] = useState(null); // null = ปิด

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sellerApi.get('/products/seller');
      setProducts(res.data.products || res.data.data || res.data || []);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  async function handleDelete(id) {
    if (!window.confirm(t('seller.confirm_delete_product'))) return;
    try {
      await sellerApi.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert(e.response?.data?.message || t('common.error'));
    }
  }

  async function handleToggle(product) {
    try {
      await sellerApi.put(`/products/${product.id}`, { is_active: !product.is_active });
      setProducts((prev) =>
        prev.map((p) => p.id === product.id ? { ...p, is_active: !p.is_active } : p)
      );
    } catch (e) {
      alert(e.response?.data?.message || t('common.error'));
    }
  }

  // อัปเดต video_path ของ product เดียวใน list โดยไม่ต้อง refetch ทั้งหมด
  function handleVideoUpdated(productId, newVideoPath) {
    setProducts((prev) =>
      prev.map((p) => p.id === productId ? { ...p, video_path: newVideoPath } : p)
    );
    // อัปเดต videoModalProduct ด้วย เพื่อให้ modal แสดงสถานะใหม่ถูกต้อง
    setVideoModalProduct((prev) =>
      prev?.id === productId ? { ...prev, video_path: newVideoPath } : prev
    );
  }

  function openAdd()    { setEditing(null); setModal(true); }
  function openEdit(p)  { setEditing(p);    setModal(true); }
  function closeModal() { setModal(false);  setEditing(null); }
  function onSaved()    { loadProducts(); }

  const displayed = products.filter((p) => {
    if (filter === 'active')   return p.is_active;
    if (filter === 'inactive') return !p.is_active;
    return true;
  });

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="top-bar" style={{ background: 'white' }}>
        <span className="top-bar-title">{t('seller.my_products')}</span>
        <button
          onClick={openAdd}
          style={{
            background: 'var(--color-primary)', border: 'none', borderRadius: 10,
            width: 34, height: 34, fontSize: 20, color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          +
        </button>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex', gap: 6, padding: '12px 16px',
          background: 'white', borderBottom: '0.5px solid var(--color-border)',
          overflowX: 'auto',
        }}
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none',
              background: filter === tab.key ? 'var(--color-primary)' : 'var(--color-bg)',
              color: filter === tab.key ? 'white' : 'var(--color-text-sub)',
              fontSize: 12, fontWeight: filter === tab.key ? 600 : 400,
              cursor: 'pointer', fontFamily: 'var(--font-main)', whiteSpace: 'nowrap',
            }}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Product list */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div className="loading-center">⏳ {t('common.loading')}…</div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div>{t('seller.no_products')}</div>
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 24px', marginTop: 16 }}
              onClick={openAdd}
            >
              + {t('seller.add_product')}
            </button>
          </div>
        ) : (
          displayed.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onVideoManage={setVideoModalProduct}
            />
          ))
        )}
      </div>

      {/* ProductFormModal */}
      <ProductFormModal
        open={modalOpen}
        product={editing}
        onClose={closeModal}
        onSaved={onSaved}
      />

      {/* VideoModal */}
      {videoModalProduct && (
        <VideoModal
          product={videoModalProduct}
          onClose={() => setVideoModalProduct(null)}
          onVideoUpdated={handleVideoUpdated}
        />
      )}
    </div>
  );
}
