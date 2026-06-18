// src/pages/seller/SellerProfilePage.jsx

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import sellerApi, { clearToken } from '../../api/seller.api';
import { toImgUrl } from '../../utils/imageUrl';

// ── QR Image viewer ─────────────────────────────────────────────
function QrViewer({ src, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'white', fontSize: 28, cursor: 'pointer' }}
      >✕</button>
      <img
        src={src}
        alt="QR PromptPay"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
      />
    </div>
  );
}

function MapEmbed({ lat, lng }) {
  // normalize → Number, guard NaN / null / ''
  const validLat = lat && !isNaN(Number(lat)) ? Number(lat) : null;
  const validLng = lng && !isNaN(Number(lng)) ? Number(lng) : null;

  if (!validLat || !validLng) {
    return (
      <div
        style={{
          height: 160, borderRadius: 12, background: '#f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-text-hint)', fontSize: 13,
          border: '0.5px solid var(--color-border)',
        }}
      >
        🗺 ยังไม่ได้ปักหมุดตำแหน่ง
      </div>
    );
  }

  const bbox = `${validLng - 0.01},${validLat - 0.01},${validLng + 0.01},${validLat + 0.01}`;
  return (
    <iframe
      title="shop-location"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${validLat},${validLng}`}
      style={{ width: '100%', height: 180, border: 'none', borderRadius: 12 }}
    />
  );
}

export default function SellerProfilePage({ profile, onProfileUpdated }) {
  const { t } = useTranslation();

  // Profile image upload
  const fileInputRef                    = useRef(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgErr, setImgErr]             = useState('');
  // Image viewer — กดที่รูปโปรไฟล์เพื่อดูรูปขยาย
  const [showImageViewer, setShowImageViewer] = useState(false);

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    setImgErr('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      await sellerApi.put('/sellers/profile-image', fd);
      // refetch profile เพื่อให้ข้อมูลตรง
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      if (err.response?.status === 413) {
        setImgErr('รูปภาพใหญ่เกินไป กรุณาเลือกรูปขนาดไม่เกิน 10MB');
      } else if (err.response?.status === 401) {
        setImgErr('Session หมดอายุ กรุณา login ใหม่');
      } else {
        setImgErr('อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่');
      }
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  }

  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({});
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [pwForm, setPwForm]     = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwError, setPwError]   = useState('');
  const [pwLoading, setPwLoad]  = useState(false);
  const [showPw, setShowPw]     = useState(false);

  // QR PromptPay upload
  const qrInputRef                = useRef(null);
  const [uploadingQr, setUploadQr] = useState(false);
  const [qrErr, setQrErr]          = useState('');
  const [showQrViewer, setShowQrViewer] = useState(false);

  async function handleQrChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadQr(true);
    setQrErr('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      await sellerApi.post('/sellers/profile/qr', fd);
      if (onProfileUpdated) onProfileUpdated();
    } catch {
      setQrErr('อัปโหลด QR ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setUploadQr(false);
      e.target.value = '';
    }
  }

  function startEdit() {
    setForm({
      phone:            profile?.phone            || '',
      shop_name:        profile?.shop_name        || '',
      address:          profile?.address          || '',
      shop_description: profile?.shop_description || '',
      contact_phone:    profile?.contact_phone    || '',
      bank_name:        profile?.bank_name        || '',
      bank_account:        profile?.bank_account || '',
      bank_account_name:   profile?.bank_account_name   || '',
      lat: profile?.lat || '',
      lng: profile?.lng || '',
      cod_fee:          profile?.cod_fee != null ? String(profile.cod_fee) : '0',
      promptpay_number: profile?.promptpay_number || '',
    });
    setError('');
    setEditing(true);
  }

  async function handleSave() {
    // Validation
    if (!form.shop_name?.trim()) {
      setError('กรุณากรอกชื่อร้าน');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sellerApi.put('/sellers/profile', {
        phone:             form.phone         || null,
        shop_name:         form.shop_name,
        address:           form.address,
        shop_description:  form.shop_description,
        contact_phone:     form.contact_phone || null,
        bank_name:         form.bank_name,
        bank_account:      form.bank_account,
        bank_account_name: form.bank_account_name,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        cod_fee:           form.cod_fee !== '' ? Number(form.cod_fee) : 0,
        promptpay_number:  form.promptpay_number || null,
      });
      setEditing(false);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      // อ่าน message ภาษาไทยจาก backend ก่อน ถ้าไม่มีค่อย fallback
      const errData = err.response?.data;
      setError(errData?.message || errData?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  function getGps() {
    if (!navigator.geolocation) { alert('GPS ไม่รองรับ'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((p) => ({ ...p, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })),
      () => alert('ไม่สามารถดึง GPS ได้')
    );
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.new_password !== pwForm.confirm) { setPwError(t('auth.password_not_match')); return; }
    if (pwForm.new_password.length < 6)          { setPwError(t('auth.password_min'));       return; }
    setPwLoad(true);
    try {
      await sellerApi.put('/sellers/change-password', {
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      setShowPw(false);
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      alert('เปลี่ยนรหัสผ่านสำเร็จ');
    } catch (err) {
      setPwError(err.response?.data?.message || t('common.error'));
    } finally {
      setPwLoad(false);
    }
  }

  function handleLogout() {
    if (!window.confirm(t('seller.logout_confirm'))) return;
    sellerApi.post('/auth/seller/logout').catch(() => {});
    clearToken();
    window.dispatchEvent(new CustomEvent('seller:logout'));
  }

  const p = profile || {};

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* paddingRight เผื่อพื้นที่กระดิ่งแจ้งเตือน (fixed top:16 right:16 width:38px) ไม่ให้ทับปุ่ม "แก้ไข" */}
      <div className="top-bar" style={{ paddingRight: 60 }}>
        <span className="top-bar-title">{t('seller.profile')}</span>
        {!editing && (
          <button
            onClick={startEdit}
            style={{
              background: 'var(--color-primary-light)',
              border: '1.5px solid var(--color-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 12px',
              color: 'var(--color-primary)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
            }}
          >
            ✏️ {t('seller.edit_profile')}
          </button>
        )}
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          {/* Avatar — กดที่รูป → image viewer  |  กดปุ่ม 📷 → เปิด file picker */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: 72, height: 72, borderRadius: 18,
                background: 'var(--color-primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, overflow: 'hidden',
                cursor: p.profile_image_path ? 'zoom-in' : 'default',
              }}
              onClick={() => { if (p.profile_image_path) setShowImageViewer(true); }}
            >
              {p.profile_image_path ? (
                <img
                  src={toImgUrl(p.profile_image_path)}
                  alt="profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : '🏪'}
            </div>
            {/* Camera button มุมขวาล่าง — iOS fix: .click() เป็น call แรกใน handler */}
            <div
              onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, border: '2px solid white', cursor: 'pointer',
              }}
            >
              {uploadingImg ? '⏳' : '📷'}
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ position: 'absolute', width: 1, height: 1, padding: 0, opacity: 0, overflow: 'hidden' }}
            onChange={handleImageChange}
          />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-main)' }}>{p.shop_name || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 3 }}>{p.phone || ''}</div>
            {p.rating > 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-warning)', marginTop: 2 }}>
                ⭐ {Number(p.rating).toFixed(1)}
              </div>
            )}
            {imgErr && <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 2 }}>{imgErr}</div>}
          </div>
        </div>

        {!editing ? (
          <>
            {/* ข้อมูลร้าน — clickable: กดทั้ง card เพื่อเข้า edit mode */}
            <div
              className="card"
              style={{ marginBottom: 0, cursor: 'pointer' }}
              onClick={startEdit}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div className="section-title" style={{ margin: 0 }}>ข้อมูลร้าน</div>
                <span style={{ fontSize: 12, color: 'var(--color-primary)' }}>✏️ แก้ไข</span>
              </div>
              <InfoRow label="ที่อยู่"    value={p.address}          editable />
              <InfoRow label="คำอธิบาย"  value={p.shop_description}  editable />
              {p.contact_phone && (
                <InfoRow label="📞 เบอร์ติดต่อ" value={p.contact_phone} editable />
              )}
              <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 10, textAlign: 'center' }}>
                แตะเพื่อแก้ไขข้อมูล
              </div>
            </div>

            {/* ปุ่มใหญ่ใต้ section */}
            <button
              onClick={startEdit}
              style={{
                width: '100%', padding: '11px 0',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-primary)',
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-main)',
                marginTop: 8, marginBottom: 12,
              }}
            >
              ✏️ แก้ไขข้อมูลร้าน
            </button>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 10 }}>{t('seller.location')}</div>
              <MapEmbed lat={p.lat} lng={p.lng} />
              {p.lat && p.lng && (
                <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 6 }}>
                  {Number(p.lat).toFixed(5)}, {Number(p.lng).toFixed(5)}
                </div>
              )}
            </div>

            {/* การชำระเงิน — รวม COD / พร้อมเพย์ / โอนธนาคาร */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="section-title" style={{ margin: 0 }}>💳 การรับชำระเงิน</div>
                <button
                  onClick={startEdit}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer', fontFamily: 'var(--font-main)' }}
                >
                  ✏️ แก้ไข
                </button>
              </div>

              {/* COD fee */}
              <div style={{ paddingBottom: 10, borderBottom: '1px solid var(--color-border)', marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>💵 เก็บเงินปลายทาง (COD)</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {p.cod_fee > 0 ? `ค่าธรรมเนียม ฿${Number(p.cod_fee).toLocaleString()}` : 'ไม่มีค่าธรรมเนียม'}
                </div>
              </div>

              {/* PromptPay */}
              <div style={{ paddingBottom: 10, borderBottom: '1px solid var(--color-border)', marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>📱 พร้อมเพย์</div>
                {p.promptpay_number ? (
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{p.promptpay_number}</div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 6 }}>ยังไม่ได้ตั้งค่า</div>
                )}
                {p.promptpay_qr_image ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src={toImgUrl(p.promptpay_qr_image)}
                      alt="QR PromptPay"
                      onClick={() => setShowQrViewer(true)}
                      style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'zoom-in' }}
                    />
                    <button
                      onClick={() => qrInputRef.current.click()}
                      style={{ background: 'none', border: '1px solid var(--color-primary)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'var(--color-primary)', cursor: 'pointer', fontFamily: 'var(--font-main)' }}
                    >
                      {uploadingQr ? '⏳' : '🔄 เปลี่ยนรูป QR'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => qrInputRef.current.click()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px', borderRadius: 8,
                      border: '1.5px dashed var(--color-primary)',
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)', fontSize: 12,
                      cursor: 'pointer', fontFamily: 'var(--font-main)',
                    }}
                  >
                    {uploadingQr ? '⏳ กำลังอัปโหลด...' : '📷 อัปโหลดรูป QR พร้อมเพย์'}
                  </button>
                )}
                {qrErr && <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 4 }}>{qrErr}</div>}
                <input type="file" accept="image/*" ref={qrInputRef} style={{ display: 'none' }} onChange={handleQrChange} />
              </div>

              {/* โอนธนาคาร */}
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 6 }}>🏦 โอนธนาคาร</div>
                <InfoRow label="ธนาคาร"    value={p.bank_name} />
                <InfoRow label="เลขบัญชี"  value={p.bank_account} />
                <InfoRow label="ชื่อบัญชี" value={p.bank_account_name} />
                {!p.bank_name && !p.bank_account && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-hint)' }}>ยังไม่ได้ตั้งค่า</div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowPw((v) => !v)}
              className="btn-secondary"
              style={{ marginBottom: 10 }}
            >
              🔒 {t('profile.change_password')}
            </button>

            {showPw && (
              <form onSubmit={handleChangePassword} className="card" style={{ marginBottom: 12 }}>
                <PwInput label={t('profile.current_password')} value={pwForm.current_password} onChange={(v) => setPwForm((p) => ({ ...p, current_password: v }))} />
                <PwInput label={t('auth.password')}            value={pwForm.new_password}     onChange={(v) => setPwForm((p) => ({ ...p, new_password: v }))} />
                <PwInput label={t('auth.confirm_password')}    value={pwForm.confirm}           onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))} />
                {pwError && <div className="form-error" style={{ marginBottom: 10 }}>{pwError}</div>}
                <button type="submit" className="btn-primary" disabled={pwLoading} style={{ marginTop: 4 }}>
                  {pwLoading ? t('common.loading') + '…' : t('common.save')}
                </button>
              </form>
            )}

            <button onClick={handleLogout} className="btn-danger" style={{ marginTop: 8 }}>
              {t('common.logout')}
            </button>
          </>
        ) : (
          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 12 }}>แก้ไขข้อมูลร้าน</div>
              <FormField label="เบอร์โทรศัพท์"        type="tel" value={form.phone}     onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
              <FormField label="ชื่อร้านค้า"          value={form.shop_name}     onChange={(v) => setForm((p) => ({ ...p, shop_name: v }))} />
              <FormField label="ที่อยู่"               value={form.address}       onChange={(v) => setForm((p) => ({ ...p, address: v }))} />
              <FormField label="คำอธิบายร้าน"          value={form.shop_description} onChange={(v) => setForm((p) => ({ ...p, shop_description: v }))} />
              <FormField label="เบอร์โทรติดต่อร้าน"   type="tel" value={form.contact_phone} onChange={(v) => setForm((p) => ({ ...p, contact_phone: v }))} />
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 12 }}>{t('seller.location')}</div>
              {/* Map preview — แสดงเสมอ (placeholder ถ้ายังไม่มี GPS) */}
              <MapEmbed lat={form.lat} lng={form.lng} />
              {/* GPS button */}
              <button type="button" className="btn-secondary" style={{ marginTop: 10, marginBottom: 0 }} onClick={getGps}>
                📍 {t('seller.get_location')}
              </button>
              {/* Good coordinates read-only display (หลังกด GPS) */}
              {form.lat && form.lng && (
                <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 6 }}>
                  📌 GPS: {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}
                </div>
              )}
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="section-title" style={{ marginBottom: 12 }}>💳 การรับชำระเงิน</div>

              {/* COD */}
              <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--color-text-sub)', fontWeight: 600 }}>💵 เก็บเงินปลายทาง (COD)</div>
              <FormField
                label="ค่าธรรมเนียม COD (฿)"
                type="number"
                value={form.cod_fee}
                onChange={(v) => setForm((p) => ({ ...p, cod_fee: v }))}
              />
              <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: -8, marginBottom: 16 }}>
                ค่าธรรมเนียมที่เพิ่มเมื่อลูกค้าเลือกจ่ายปลายทาง (0 = ไม่มีค่าธรรมเนียม)
              </div>

              {/* PromptPay */}
              <div style={{ paddingTop: 4, borderTop: '1px solid var(--color-border)', marginBottom: 4 }}>
                <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--color-text-sub)', fontWeight: 600 }}>📱 พร้อมเพย์</div>
                <FormField
                  label="เบอร์พร้อมเพย์"
                  type="tel"
                  value={form.promptpay_number}
                  onChange={(v) => setForm((p) => ({ ...p, promptpay_number: v }))}
                />
                <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: -8, marginBottom: 8 }}>
                  รูป QR พร้อมเพย์: อัปโหลดได้ที่หน้าโปรไฟล์หลังบันทึก
                </div>
              </div>

              {/* โอนธนาคาร */}
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--color-text-sub)', fontWeight: 600 }}>🏦 โอนธนาคาร</div>
                <FormField label="ธนาคาร"    value={form.bank_name}           onChange={(v) => setForm((p) => ({ ...p, bank_name: v }))} />
                <FormField label="เลขบัญชี"  value={form.bank_account}        onChange={(v) => setForm((p) => ({ ...p, bank_account: v }))} />
                <FormField label="ชื่อบัญชี" value={form.bank_account_name}   onChange={(v) => setForm((p) => ({ ...p, bank_account_name: v }))} />
              </div>
            </div>

            {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setEditing(false)} style={{ flex: 1 }}>
                {t('common.cancel')}
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ flex: 2 }}>
                {loading ? t('common.loading') + '…' : t('common.save')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image viewer modal */}
      {showImageViewer && p.profile_image_path && (
        <ImageViewer
          src={toImgUrl(p.profile_image_path)}
          onClose={() => setShowImageViewer(false)}
        />
      )}

      {/* QR viewer modal */}
      {showQrViewer && p.promptpay_qr_image && (
        <QrViewer
          src={toImgUrl(p.promptpay_qr_image)}
          onClose={() => setShowQrViewer(false)}
        />
      )}
    </div>
  );
}

function ImageViewer({ src, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.9)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'imgViewerFadeIn 0.2s ease',
      }}
    >
      <style>{`@keyframes imgViewerFadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
      {/* ปุ่ม ✕ มุมขวาบน */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none',
          color: 'white', fontSize: 28, cursor: 'pointer',
          lineHeight: 1, padding: 8,
        }}
      >
        ✕
      </button>
      {/* รูปภาพ — stopPropagation ป้องกัน close เมื่อกดที่รูปโดยตรง */}
      <img
        src={src}
        alt="profile"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%', maxHeight: '85vh',
          objectFit: 'contain', borderRadius: 4,
        }}
      />
    </div>
  );
}

function InfoRow({ label, value, editable }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', marginBottom: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-sub)', width: 80, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-main)', flex: 1 }}>{value}</span>
        {editable && <span style={{ fontSize: 10, color: 'var(--color-text-hint)', flexShrink: 0 }}>✏️</span>}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text' }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="input-field" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PwInput({ label, value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="input-field" type="password" value={value} onChange={(e) => onChange(e.target.value)} placeholder="••••••" />
    </div>
  );
}
