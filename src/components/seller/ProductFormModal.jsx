// src/components/seller/ProductFormModal.jsx
// Slide-up drawer for add/edit product
//
// Field mapping (frontend → backend):
//   name_th         → products.name_th          (REQUIRED)
//   price           → products.price             (REQUIRED)
//   unit            → products.unit              (REQUIRED)
//   category_id     → products.category_id       (optional)
//   moq             → products.moq               (optional, default 1)
//   stock           → products.stock             (optional, default 0)
//   weight_per_unit → products.weight_per_unit   (optional)
//   origin_country  → products.origin_country    (optional)  ← ไม่ใช่ country_of_origin
//   description     → products.description       (optional)
//   is_active       → products.is_active         (update only, ignored at create)
//
// NOTE: shipping_fee ไม่มีใน products table — ลบออกจาก form แล้ว
//       POST /api/products ใช้ multer แต่ express.json() global ทำงานก่อน
//       → ส่ง JSON body ได้ (req.files จะว่าง), รูปอัปโหลด แยกผ่าน POST /:id/images

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import sellerApi from '../../api/seller.api';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * getVideoThumbnail(videoUrl)
 * Generate thumbnail จาก frame 0.5 วินาทีแรกของวิดีโอ
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

const UNITS = ['ลัง', 'โหล', 'กก.', 'ชิ้น', 'ถุง', 'แพ็ค', 'กล่อง'];

// ค่าเริ่มต้น form — ใช้ชื่อ field ตรงกับ backend
const EMPTY_FORM = {
  name_th:          '',   // backend: name_th (REQUIRED)
  category_id:      '',
  price:            '',
  unit:             '',
  moq:              '',
  stock:            '',
  weight_per_unit:  '',
  origin_country:   '',   // backend: origin_country (ไม่ใช่ country_of_origin)
  description:      '',
  is_active:        true,
  // NOTE: shipping_fee ถูกลบออก — ไม่มีใน products table
};

export default function ProductFormModal({ open, product, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});
  const [categories, setCategories] = useState([]);
  const [images, setImages]         = useState([]);
  const [previews, setPreviews]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [apiError, setApiError]     = useState('');
  // Video upload state
  const [videoFile, setVideoFile]         = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [videoUploading, setVideoUploading]   = useState(false);
  const [videoError, setVideoError]           = useState('');
  const [currentVideoPath, setCurrentVideoPath] = useState(null); // video_path ที่มีอยู่แล้ว
  const [videoPoster, setVideoPoster]           = useState(null); // thumbnail ของวิดีโอที่มีอยู่แล้ว
  const videoInputRef = useRef(null);

  // โหลด categories ครั้งเดียว
  useEffect(() => {
    sellerApi.get('/products/categories').then((r) => {
      // API ส่ง { success: true, categories: [...] }
      // แต่ละ category มี { id, name_th, name_en, name_my, icon }
      const cats = r.data.categories || r.data.data || r.data || [];
      setCategories(Array.isArray(cats) ? cats : []);
    }).catch(() => {
      setCategories([]); // ถ้า API fail → ให้ user เลือก category ไม่ได้ แต่ไม่ crash
    });
  }, []);

  // เมื่อ open/product เปลี่ยน → reset form
  useEffect(() => {
    if (open) {
      if (product) {
        // Edit mode: map field names จาก backend response → form state
        setForm({
          name_th:         product.name_th          || '',
          category_id:     product.category_id      || '',
          price:           product.price            || '',
          unit:            product.unit             || '',
          moq:             product.moq              || '',
          stock:           product.stock            || '',
          weight_per_unit: product.weight_per_unit  || '',
          origin_country:  product.origin_country   || '',  // ไม่ใช่ country_of_origin
          description:     product.description      || '',
          is_active:       product.is_active !== false,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setImages([]);
      setPreviews([]);
      setErrors({});
      setApiError('');
      // Reset video state
      setVideoFile(null);
      setVideoPreviewUrl(null);
      setVideoError('');
      setVideoPoster(null);
      setCurrentVideoPath(product?.video_path || null);
    }
  }, [open, product]);

  /* ── Generate thumbnail เมื่อ currentVideoPath เปลี่ยน (มีวิดีโออยู่แล้ว) ── */
  useEffect(() => {
    if (!currentVideoPath) { setVideoPoster(null); return; }
    const url = `${BACKEND_URL}${currentVideoPath}`;
    getVideoThumbnail(url).then(setVideoPoster);
  }, [currentVideoPath]);

  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }));
  }

  function validate() {
    const e = {};
    // Backend validation: name_th, price, unit REQUIRED → NAME_PRICE_UNIT_REQUIRED
    if (!form.name_th.trim()) e.name_th = t('common.error');
    if (!form.price)          e.price   = t('common.error');
    if (!form.unit)           e.unit    = t('common.error');
    if (!form.moq)            e.moq     = t('common.error');
    if (!form.stock && form.stock !== 0) e.stock = t('common.error');
    // shipping_fee ถูกลบออก — ไม่มีใน products table
    return e;
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function handleVideoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoError('');
    // ตรวจขนาดไฟล์ฝั่ง client ก่อน (200MB)
    if (file.size > 200 * 1024 * 1024) {
      setVideoError('วิดีโอต้องไม่เกิน 200MB');
      e.target.value = '';
      return;
    }
    // สร้าง object URL สำหรับ preview
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  }

  async function handleVideoUpload() {
    if (!videoFile || !product?.id) return;
    setVideoUploading(true);
    setVideoError('');
    try {
      const fd = new FormData();
      fd.append('video', videoFile);
      const res = await sellerApi.post(`/products/${product.id}/video`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newPath = res.data.video_path;
      setCurrentVideoPath(newPath);
      setVideoFile(null);
      setVideoPreviewUrl(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
    } catch (err) {
      setVideoError(err.response?.data?.error || 'อัปโหลดวิดีโอไม่สำเร็จ');
    } finally {
      setVideoUploading(false);
    }
  }

  async function handleVideoDelete() {
    if (!product?.id) return;
    if (!window.confirm('ลบวิดีโอแนะนำสินค้านี้?')) return;
    setVideoUploading(true);
    setVideoError('');
    try {
      await sellerApi.delete(`/products/${product.id}/video`);
      setCurrentVideoPath(null);
      setVideoFile(null);
      setVideoPreviewUrl(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
    } catch (err) {
      setVideoError(err.response?.data?.error || 'ลบวิดีโอไม่สำเร็จ');
    } finally {
      setVideoUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);

    try {
      // Payload ใช้ field names ตรงกับ backend
      const payload = {
        name_th:         form.name_th.trim(),
        category_id:     form.category_id || null,
        price:           Number(form.price),
        unit:            form.unit,
        moq:             Number(form.moq),
        stock:           Number(form.stock),
        weight_per_unit: form.weight_per_unit ? Number(form.weight_per_unit) : null,
        origin_country:  form.origin_country.trim() || null,  // ไม่ใช่ country_of_origin
        description:     form.description.trim() || null,
        is_active:       form.is_active,
        // shipping_fee ลบออกแล้ว
      };

      let productId;
      if (product) {
        // Edit: PUT /api/products/:id
        await sellerApi.put(`/products/${product.id}`, payload);
        productId = product.id;
      } else {
        // Create: POST /api/products (JSON body — multer runs แต่ไม่มีไฟล์ → req.files=[])
        const res = await sellerApi.post('/products', payload);
        productId = res.data.product?.id || res.data.data?.id || res.data.id;
      }

      // Upload รูปแยกผ่าน POST /api/products/:id/images
      if (images.length > 0 && productId) {
        const fd = new FormData();
        images.forEach((img) => fd.append('images', img));
        await sellerApi.post(`/products/${productId}/images`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || '';
      if (errMsg === 'NAME_PRICE_UNIT_REQUIRED') {
        setApiError('กรุณากรอกชื่อสินค้า ราคา และหน่วยให้ครบ');
      } else {
        setApiError(errMsg || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'relative',
          background: 'white',
          borderRadius: '20px 20px 0 0',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '0 0 32px',
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            position: 'sticky', top: 0, background: 'white',
            borderBottom: '0.5px solid var(--color-border)',
            padding: '16px 16px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            zIndex: 1,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            {product ? t('product.edit_product') : t('seller.add_product')}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-hint)' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 16px 0' }}>

          {/* ชื่อสินค้า → name_th (REQUIRED) */}
          <div className="form-group">
            <label className="form-label">{t('seller.product_name')} *</label>
            <input
              className="input-field"
              value={form.name_th}
              onChange={(e) => setField('name_th', e.target.value)}
              style={errors.name_th ? { borderColor: 'var(--color-danger)' } : undefined}
            />
            {errors.name_th && <div className="form-error">{errors.name_th}</div>}
          </div>

          {/* หมวดหมู่ → category_id (optional) */}
          <div className="form-group">
            <label className="form-label">{t('seller.category')}</label>
            <select
              className="input-field"
              value={form.category_id}
              onChange={(e) => setField('category_id', e.target.value)}
            >
              <option value="">{t('seller.category')}</option>
              {/* categories API ส่ง { name_th, name_en, name_my } */}
              {(Array.isArray(categories) ? categories : []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_th || c.name_en || c.name_my || `Category ${c.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* ราคา + หน่วย (REQUIRED) */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">{t('seller.price')} (฿) *</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                style={errors.price ? { borderColor: 'var(--color-danger)' } : undefined}
              />
              {errors.price && <div className="form-error">{errors.price}</div>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">{t('seller.unit')} *</label>
              <select
                className="input-field"
                value={form.unit}
                onChange={(e) => setField('unit', e.target.value)}
                style={errors.unit ? { borderColor: 'var(--color-danger)' } : undefined}
              >
                <option value="">{t('seller.unit')}</option>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              {errors.unit && <div className="form-error">{errors.unit}</div>}
            </div>
          </div>

          {/* MOQ + Stock */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">{t('seller.moq')} *</label>
              <input
                className="input-field"
                type="number"
                min="1"
                value={form.moq}
                onChange={(e) => setField('moq', e.target.value)}
                style={errors.moq ? { borderColor: 'var(--color-danger)' } : undefined}
              />
              {errors.moq && <div className="form-error">{errors.moq}</div>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">{t('seller.stock')} *</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setField('stock', e.target.value)}
                style={errors.stock ? { borderColor: 'var(--color-danger)' } : undefined}
              />
              {errors.stock && <div className="form-error">{errors.stock}</div>}
            </div>
          </div>

          {/* น้ำหนัก + ประเทศต้นทาง → origin_country (ไม่ใช่ country_of_origin) */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">{t('seller.weight')} (กก.)</label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.01"
                value={form.weight_per_unit}
                onChange={(e) => setField('weight_per_unit', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">{t('seller.origin')}</label>
              <input
                className="input-field"
                value={form.origin_country}
                onChange={(e) => setField('origin_country', e.target.value)}
                placeholder="เช่น ไทย, จีน"
              />
            </div>
          </div>

          {/* คำอธิบาย */}
          <div className="form-group">
            <label className="form-label">{t('seller.description')}</label>
            <textarea
              className="input-field"
              rows={3}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              style={{ resize: 'none' }}
              placeholder={t('seller.description') + '…'}
            />
          </div>

          {/* รูปสินค้า */}
          <div className="form-group">
            <label className="form-label">รูปสินค้า (สูงสุด 5 รูป)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              style={{ fontSize: 13 }}
            />
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {previews.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    style={{
                      width: 64, height: 64,
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '0.5px solid var(--color-border)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* วิดีโอแนะนำสินค้า — แสดงเฉพาะ edit mode (product มี id แล้ว) */}
          {product?.id && (
            <div className="form-group">
              <label className="form-label">🎬 วิดีโอแนะนำสินค้า (สูงสุด 200MB)</label>

              {/* แสดงวิดีโอปัจจุบัน (ที่อยู่ใน server แล้ว) */}
              {currentVideoPath && !videoPreviewUrl && (
                <div style={{ marginBottom: 10 }}>
                  <video
                    src={`${BACKEND_URL}${currentVideoPath}`}
                    poster={videoPoster || undefined}
                    controls
                    playsInline
                    preload="metadata"
                    style={{ width: '100%', maxHeight: 160, borderRadius: 8, background: '#000', display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={handleVideoDelete}
                    disabled={videoUploading}
                    style={{
                      marginTop: 6, padding: '4px 12px', borderRadius: 6,
                      border: '1px solid var(--color-danger)', background: 'white',
                      color: 'var(--color-danger)', fontSize: 12, cursor: 'pointer',
                      fontFamily: 'var(--font-main)',
                    }}
                  >
                    {videoUploading ? '⏳ กำลังลบ...' : '🗑 ลบวิดีโอ'}
                  </button>
                </div>
              )}

              {/* Preview วิดีโอใหม่ที่เลือกแล้ว (ยังไม่อัปโหลด) */}
              {videoPreviewUrl && (
                <div style={{ marginBottom: 10 }}>
                  <video
                    src={videoPreviewUrl}
                    controls
                    playsInline
                    style={{ width: '100%', maxHeight: 160, borderRadius: 8, background: '#000', display: 'block' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={handleVideoUpload}
                      disabled={videoUploading}
                      style={{
                        padding: '5px 14px', borderRadius: 6,
                        border: 'none', background: 'var(--color-primary)',
                        color: 'white', fontSize: 12, cursor: 'pointer',
                        fontFamily: 'var(--font-main)',
                        opacity: videoUploading ? 0.6 : 1,
                      }}
                    >
                      {videoUploading ? '⏳ กำลังอัปโหลด...' : '☁️ อัปโหลดวิดีโอ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(videoPreviewUrl);
                        setVideoFile(null);
                        setVideoPreviewUrl(null);
                        if (videoInputRef.current) videoInputRef.current.value = '';
                      }}
                      disabled={videoUploading}
                      style={{
                        padding: '5px 12px', borderRadius: 6,
                        border: '1px solid var(--color-border)', background: 'white',
                        color: 'var(--color-text-sub)', fontSize: 12, cursor: 'pointer',
                        fontFamily: 'var(--font-main)',
                      }}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}

              {/* Input เลือกไฟล์วิดีโอ — ซ่อน input จริง ใช้ปุ่มแทน (iOS safe) */}
              {!videoPreviewUrl && (
                <button
                  type="button"
                  onClick={() => { videoInputRef.current?.click(); }}
                  style={{
                    padding: '7px 14px', borderRadius: 6,
                    border: '1px dashed var(--color-border)', background: 'var(--color-bg)',
                    color: 'var(--color-text-sub)', fontSize: 12, cursor: 'pointer',
                    fontFamily: 'var(--font-main)',
                  }}
                >
                  🎬 {currentVideoPath ? 'เปลี่ยนวิดีโอ' : 'เพิ่มวิดีโอ'}
                </button>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                onChange={handleVideoChange}
                style={{ display: 'none' }}
              />

              {videoError && (
                <div style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{videoError}</div>
              )}
            </div>
          )}

          {/* สถานะสินค้า */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setField('is_active', e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontSize: 14, color: 'var(--color-text-main)' }}>
                {t('seller.product_active')}
              </span>
            </label>
          </div>

          {apiError && (
            <div className="error-box" style={{ marginBottom: 16 }}>{apiError}</div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ flex: 2 }}
            >
              {loading ? t('common.loading') + '…' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
