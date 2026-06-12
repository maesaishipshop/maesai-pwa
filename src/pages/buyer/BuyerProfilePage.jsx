// src/pages/buyer/BuyerProfilePage.jsx
// โปรไฟล์ Buyer — แก้ไขชื่อ, ที่อยู่จัดส่ง GPS (always-visible), บัญชีธนาคาร, เปลี่ยนรหัสผ่าน

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import buyerApi, { clearToken } from '../../api/buyer.api';

// BACKEND_URL = '' → รูปใช้ relative path (/uploads/...) → proxy forward ให้
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

/* ── Map embed (OpenStreetMap) ───────────────────── */
function MapEmbed({ lat, lng }) {
  // normalize → Number, guard NaN / null / ''
  const validLat = lat && !isNaN(Number(lat)) ? Number(lat) : null;
  const validLng = lng && !isNaN(Number(lng)) ? Number(lng) : null;

  if (!validLat || !validLng) {
    return (
      <div
        style={{
          height: 140, borderRadius: 12, background: '#f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-text-hint)', fontSize: 13,
          border: '0.5px solid var(--color-border)',
        }}
      >
        🗺 ยังไม่ได้ปักหมุดที่อยู่
      </div>
    );
  }

  const bbox = `${validLng - 0.01},${validLat - 0.01},${validLng + 0.01},${validLat + 0.01}`;
  return (
    <iframe
      title="delivery-location"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${validLat},${validLng}`}
      style={{ width: '100%', height: 160, border: 'none', borderRadius: 12 }}
    />
  );
}

/* ── Section card ────────────────────────────────── */
// onClick  — ถ้าส่งมา section จะ clickable (cursor pointer, ✏️ มุมขวาหัวการ์ด)
// editHint — ข้อความ hint สีเทาใต้ content เช่น "แตะเพื่อแก้ไขข้อมูล"
function Section({ title, children, onClick, editHint }) {
  return (
    <div
      style={{
        background: 'white', borderRadius: 'var(--radius-lg)',
        border: '0.5px solid var(--color-border)',
        marginBottom: 12, overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '0.5px solid var(--color-border)',
          fontSize: 13, fontWeight: 700, color: 'var(--color-text-main)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span>{title}</span>
        {onClick && (
          <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 400 }}>✏️ แก้ไข</span>
        )}
      </div>
      <div style={{ padding: 16 }}>
        {children}
        {editHint && (
          <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 10, textAlign: 'center' }}>
            {editHint}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Input field ─────────────────────────────────── */
function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)', fontSize: 14,
          fontFamily: 'var(--font-main)', boxSizing: 'border-box',
          outline: 'none',
        }}
      />
    </div>
  );
}

/* ── Main ────────────────────────────────────────── */
export default function BuyerProfilePage({ profile, setProfile, onProfileUpdated, onLogout, returnTo, onNavigate }) {
  const { t } = useTranslation();

  // Profile image upload
  const fileInputRef               = useRef(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgErr, setImgErr]        = useState('');
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
      const res = await buyerApi.put('/buyers/profile-image', fd);
      const newPath = res.data.profile_image_path;
      // อัปเดต profile state ทันที — ไม่ต้อง re-fetch
      if (setProfile) setProfile((prev) => ({ ...prev, profile_image_path: newPath }));
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
      e.target.value = '';   // reset input ให้เลือกรูปเดิมซ้ำได้
    }
  }

  // Profile edit form (name + bank — ซ่อนใน edit mode)
  const [editing, setEditing]  = useState(false);
  const [form, setForm]        = useState({});
  const [saving, setSaving]    = useState(false);
  const [saveErr, setSaveErr]  = useState('');

  // ─── Delivery address form ───────────────────────────────────────────────────
  const [addrForm, setAddrForm]       = useState({ address: '', lat: '', lng: '', postal_code: '', contact_phone: '' });
  const [editingAddress, setEditingAddress] = useState(false); // toggle view/edit
  const [locating, setLocating]       = useState(false);
  const [addrSaving, setAddrSaving]   = useState(false);
  const [addrErr, setAddrErr]         = useState('');
  const [addrOk, setAddrOk]           = useState('');

  // sync addrForm เมื่อ profile โหลดมาแล้ว (BuyerApp fetch async)
  // ใช้ field จริงที่ backend ส่งมา: delivery_address, delivery_lat, delivery_lng
  useEffect(() => {
    if (!profile) return;
    setAddrForm({
      address:       profile.delivery_address || '',
      lat:           profile.delivery_lat     || null,
      lng:           profile.delivery_lng     || null,
      postal_code:   profile.postal_code      || '',
      contact_phone: profile.contact_phone    || '',
    });
  }, [profile]);

  // Password form
  const [showPw, setShowPw]    = useState(false);
  const [pwForm, setPwForm]    = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwSaving, setPwSave]  = useState(false);
  const [pwErr, setPwErr]      = useState('');
  const [pwOk, setPwOk]        = useState('');

  /* ── Start edit (name + bank only) ──────────────── */
  function startEdit() {
    setForm({
      full_name:           profile?.name         || '',  // backend field: name
      bank_name:           profile?.bank_name           || '',
      bank_account_number: profile?.bank_account || '',  // backend field: bank_account
      bank_account_name:   profile?.bank_account_name   || '',
    });
    setSaveErr('');
    setEditing(true);
  }

  /* ── Save profile (name + bank) — field ชื่อตรงกับ backend controller ── */
  async function handleSave() {
    setSaveErr('');
    setSaving(true);
    try {
      await buyerApi.put('/buyers/profile', {
        name:                form.full_name,           // backend: name (ไม่ใช่ full_name)
        bank_name:           form.bank_name,
        bank_account:        form.bank_account_number, // backend: bank_account (ไม่ใช่ bank_account_number)
        bank_account_name:   form.bank_account_name,
        // ส่งที่อยู่ปัจจุบันไปด้วย ป้องกัน COALESCE ล้างค่าเดิมทิ้ง
        delivery_address: addrForm.address,
        delivery_lat:     addrForm.lat ? Number(addrForm.lat) : null,
        delivery_lng:     addrForm.lng ? Number(addrForm.lng) : null,
      });
      setEditing(false);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setSaveErr(err.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  /* ── Save address only ───────────────────────────── */
  async function handleSaveAddress() {
    setAddrErr('');
    setAddrOk('');
    setAddrSaving(true);

    // normalize ก่อน PUT — เก็บไว้ใช้ update state หลัง save
    const savedAddress      = addrForm.address;
    const savedLat          = addrForm.lat ? Number(addrForm.lat) : '';
    const savedLng          = addrForm.lng ? Number(addrForm.lng) : '';
    const savedPostalCode   = addrForm.postal_code   || '';
    const savedContactPhone = addrForm.contact_phone || '';

    try {
      await buyerApi.put('/buyers/profile', {
        delivery_address: savedAddress,   // backend: delivery_address
        delivery_lat:     savedLat || null,
        delivery_lng:     savedLng || null,
        postal_code:      savedPostalCode   || null,  // migration 019
        contact_phone:    savedContactPhone || null,  // migration 019
        // ส่ง name + bank ไปด้วย ป้องกัน COALESCE ล้างค่าเดิมทิ้ง
        name:             profile?.name,
        bank_name:        profile?.bank_name,
        bank_account:     profile?.bank_account,      // backend: bank_account
        bank_account_name: profile?.bank_account_name,
      });

      // 1. อัปเดต addrForm ทันที — view mode แสดงถูกต้องโดยไม่รอ re-fetch
      setAddrForm({
        address:       savedAddress,
        lat:           savedLat,
        lng:           savedLng,
        postal_code:   savedPostalCode,
        contact_phone: savedContactPhone,
      });

      // 2. อัปเดต profile state ใน BuyerApp โดยตรง (ไม่ต้อง re-fetch)
      //    ทำให้ useEffect([profile]) sync กลับมาด้วยค่าที่ถูกต้อง ไม่ reset addrForm ทับ
      if (setProfile) {
        setProfile((prev) => ({
          ...prev,
          delivery_address: savedAddress,
          delivery_lat:     savedLat || null,
          delivery_lng:     savedLng || null,
          postal_code:      savedPostalCode   || null,
          contact_phone:    savedContactPhone || null,
        }));
      }

      setAddrOk('บันทึกที่อยู่สำเร็จ! ✅');
      setEditingAddress(false);
      // ไม่เรียก onProfileUpdated() แล้ว — ป้องกัน useEffect reset addrForm ทับ
      setTimeout(() => setAddrOk(''), 3000);
    } catch (err) {
      setAddrErr(err.response?.data?.message || t('common.error'));
    } finally {
      setAddrSaving(false);
    }
  }

  /* ── Cancel address edit — คืนค่าจาก profile (field จริงจาก backend) ── */
  function handleCancelAddress() {
    setAddrForm({
      address:       profile?.delivery_address || '',
      lat:           profile?.delivery_lat     || null,
      lng:           profile?.delivery_lng     || null,
      postal_code:   profile?.postal_code      || '',
      contact_phone: profile?.contact_phone    || '',
    });
    setAddrErr('');
    setEditingAddress(false);
  }

  /* ── GPS — ใช้กับ addrForm ───────────────────────── */
  function handleGetLocation() {
    if (!navigator.geolocation) { alert('Browser ไม่รองรับ GPS'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAddrForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setLocating(false);
      },
      () => { alert('ไม่สามารถระบุตำแหน่งได้ — ลองอีกครั้งหรือกรอกที่อยู่เอง'); setLocating(false); }
    );
  }

  /* ── Password ────────────────────────────────────── */
  async function handleChangePassword() {
    setPwErr(''); setPwOk('');
    if (pwForm.new_password !== pwForm.confirm) { setPwErr(t('auth.password_not_match')); return; }
    if (pwForm.new_password.length < 6)         { setPwErr(t('auth.password_min')); return; }
    setPwSave(true);
    try {
      await buyerApi.post('/buyers/change-password', {
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      setPwOk('เปลี่ยนรหัสผ่านสำเร็จ!');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      setShowPw(false);
    } catch (err) {
      setPwErr(err.response?.data?.message || t('common.error'));
    } finally {
      setPwSave(false);
    }
  }

  /* ── Logout ──────────────────────────────────────── */
  function handleLogout() {
    if (!window.confirm(t('buyer.logout_confirm'))) return;
    clearToken();
    window.dispatchEvent(new CustomEvent('buyer:logout'));
    if (onLogout) onLogout();
  }

  /* ── View mode ───────────────────────────────────── */
  if (!editing) {
    return (
      <div style={{ paddingBottom: 100 }}>
        <div className="top-bar">
          <span className="top-bar-title">{t('buyer.profile')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {returnTo && onNavigate && (
              <button
                onClick={() => onNavigate(returnTo)}
                style={{
                  background: 'none', border: 'none', fontSize: 13,
                  color: 'var(--color-text-sub)', cursor: 'pointer',
                  fontFamily: 'var(--font-main)', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                ← กลับไปสั่งซื้อ
              </button>
            )}
            <button
              onClick={startEdit}
              style={{
                background: 'var(--color-primary-light)',
                border: '1.5px solid var(--color-primary)',
                borderRadius: 'var(--radius-sm)',
                padding: '5px 12px',
                fontSize: 13, color: 'var(--color-primary)', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-main)',
              }}
            >
              ✏️ {t('buyer.edit_profile')}
            </button>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          {/* Avatar — กดที่รูป → image viewer  |  กดปุ่ม 📷 → เปิด file picker */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div
              style={{ position: 'relative', display: 'inline-block', margin: '0 auto 8px' }}
            >
              <div
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'var(--color-primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, overflow: 'hidden',
                  cursor: profile?.profile_image_path ? 'zoom-in' : 'default',
                }}
                onClick={() => { if (profile?.profile_image_path) setShowImageViewer(true); }}
              >
                {profile?.profile_image_path ? (
                  <img
                    src={`${BACKEND_URL}${profile.profile_image_path}`}
                    alt="profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : '👤'}
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
            {imgErr && <div style={{ fontSize: 11, color: 'var(--color-danger)', marginBottom: 4 }}>{imgErr}</div>}
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-main)' }}>
              {profile?.name || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-hint)' }}>
              {profile?.phone || ''}
            </div>
          </div>

          {/* Info — clickable section: กดทั้ง card เพื่อเข้า edit mode */}
          <Section title="📋 ข้อมูลส่วนตัว" onClick={startEdit} editHint="แตะเพื่อแก้ไขข้อมูล">
            <Row label={t('buyer.full_name')} value={profile?.name  || '—'} editable />
            <Row label="เบอร์โทร"            value={profile?.phone || '—'} />
          </Section>

          {/* ปุ่มใหญ่ใต้ section — ทำให้เห็น call-to-action ชัดเจน */}
          <button
            onClick={startEdit}
            style={{
              width: '100%', padding: '11px 0',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-primary)',
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
              marginBottom: 12,
            }}
          >
            ✏️ แก้ไขข้อมูลส่วนตัว
          </button>

          {/* Delivery address — view/edit toggle */}
          <Section title="📍 ที่อยู่จัดส่ง">
            {!editingAddress ? (
              /* ── View mode — อ่านจาก addrForm เท่านั้น ห้ามใช้ profile.* ── */
              <>
                {/* Map — แสดงเมื่อ addrForm.lat และ addrForm.lng มีค่า */}
                {addrForm.lat && addrForm.lng ? (
                  <>
                    <MapEmbed lat={addrForm.lat} lng={addrForm.lng} />
                    <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 6, marginBottom: 4 }}>
                      📌 {addrForm.lat}, {addrForm.lng}
                    </div>
                  </>
                ) : (
                  <MapEmbed lat={null} lng={null} />
                )}

                {/* ที่อยู่ข้อความ — เช็ค addrForm.address โดยตรง */}
                {addrForm.address && addrForm.address.trim() !== '' ? (
                  <div style={{ fontSize: 13, color: 'var(--color-text-main)', padding: '8px 0' }}>
                    {addrForm.address}
                  </div>
                ) : null}

                {/* รหัสไปรษณีย์ + เบอร์ติดต่อ (ถ้ามี) */}
                {(addrForm.postal_code || addrForm.contact_phone) && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-sub)', paddingBottom: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {addrForm.postal_code   && <span>📮 {addrForm.postal_code}</span>}
                    {addrForm.contact_phone && <span>📞 {addrForm.contact_phone}</span>}
                  </div>
                )}

                {/* ยังไม่มีที่อยู่ — แสดงเมื่อทั้ง address และ lat ไม่มีค่า */}
                {!(addrForm.address && addrForm.address.trim() !== '') && !addrForm.lat && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-hint)', padding: '8px 0' }}>
                    ยังไม่มีที่อยู่จัดส่ง
                  </div>
                )}

                {/* success message หลัง save */}
                {addrOk && (
                  <div style={{ color: 'var(--color-primary)', fontSize: 13, marginBottom: 4, fontWeight: 500 }}>
                    {addrOk}
                  </div>
                )}

                {/* Edit button — แสดงเสมอ */}
                <button
                  onClick={() => setEditingAddress(true)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)', background: 'white',
                    color: 'var(--color-text-main)', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'var(--font-main)', marginTop: 6,
                  }}
                >
                  ✏️ แก้ไขที่อยู่
                </button>
              </>
            ) : (
              /* ── Edit mode ── */
              <>
                {/* Map preview — เห็น GPS feedback แบบ real-time */}
                <MapEmbed lat={addrForm.lat} lng={addrForm.lng} />

                {/* GPS button */}
                <button
                  onClick={handleGetLocation}
                  disabled={locating}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-primary)',
                    background: locating ? 'var(--color-bg)' : 'var(--color-primary-light)',
                    color: 'var(--color-primary)', fontSize: 13, fontWeight: 600,
                    cursor: locating ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-main)', marginTop: 10, marginBottom: 10,
                  }}
                >
                  {locating ? '⏳ กำลังระบุตำแหน่ง…' : '📍 ใช้ตำแหน่งปัจจุบัน'}
                </button>

                {/* GPS coordinates (หลังกด GPS) */}
                {addrForm.lat && addrForm.lng && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginBottom: 8 }}>
                    📌 GPS: {Number(addrForm.lat).toFixed(5)}, {Number(addrForm.lng).toFixed(5)}
                  </div>
                )}

                {/* Address text input */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 4 }}>
                    ที่อยู่ละเอียด (กรอกเองได้ถ้า GPS ไม่แม่น)
                  </label>
                  <input
                    type="text"
                    value={addrForm.address}
                    onChange={(e) => setAddrForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="เช่น 123/4 ถ.นิมมาน ซอย 1 ต.สุเทพ อ.เมือง เชียงใหม่"
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)', fontSize: 14,
                      fontFamily: 'var(--font-main)', boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* รหัสไปรษณีย์ + เบอร์ติดต่อ (migration 019) */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 4 }}>
                      รหัสไปรษณีย์
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={addrForm.postal_code}
                      onChange={(e) => setAddrForm((f) => ({ ...f, postal_code: e.target.value }))}
                      placeholder="เช่น 50200"
                      maxLength={10}
                      style={{
                        width: '100%', padding: '10px 12px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)', fontSize: 14,
                        fontFamily: 'var(--font-main)', boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 4 }}>
                      เบอร์โทรติดต่อ (สำหรับไรเดอร์)
                    </label>
                    <input
                      type="tel"
                      value={addrForm.contact_phone}
                      onChange={(e) => setAddrForm((f) => ({ ...f, contact_phone: e.target.value }))}
                      placeholder="เช่น 0812345678"
                      maxLength={20}
                      style={{
                        width: '100%', padding: '10px 12px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)', fontSize: 14,
                        fontFamily: 'var(--font-main)', boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Error */}
                {addrErr && <div className="error-box" style={{ marginBottom: 8 }}>{addrErr}</div>}

                {/* Save + Cancel */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleCancelAddress}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleSaveAddress}
                    disabled={addrSaving}
                    className="btn-primary"
                    style={{ flex: 2 }}
                  >
                    {addrSaving ? t('common.loading') + '…' : '💾 บันทึก'}
                  </button>
                </div>
              </>
            )}
          </Section>

          {/* Bank info — clickable section */}
          <Section title="🏦 บัญชีธนาคาร" onClick={startEdit} editHint="แตะเพื่อแก้ไขข้อมูล">
            <Row label={t('profile.bank_name')}         value={profile?.bank_name         || '—'} editable />
            <Row label={t('profile.bank_account')}      value={profile?.bank_account      || '—'} editable />
            <Row label={t('profile.bank_account_name')} value={profile?.bank_account_name || '—'} editable />
          </Section>

          {/* Change password */}
          {showPw && (
            <Section title="🔒 เปลี่ยนรหัสผ่าน">
              <Field
                label={t('profile.current_password')}
                type="password"
                value={pwForm.current_password}
                onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
                placeholder="รหัสผ่านปัจจุบัน"
              />
              <Field
                label={t('auth.new_password')}
                type="password"
                value={pwForm.new_password}
                onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                placeholder="รหัสผ่านใหม่"
              />
              <Field
                label={t('auth.confirm_password')}
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="ยืนยันรหัสผ่านใหม่"
              />
              {pwErr && <div className="error-box" style={{ marginBottom: 10 }}>{pwErr}</div>}
              {pwOk  && <div style={{ color: 'var(--color-primary)', fontSize: 13, marginBottom: 10 }}>✅ {pwOk}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowPw(false)} className="btn-secondary" style={{ flex: 1 }}>
                  {t('common.cancel')}
                </button>
                <button onClick={handleChangePassword} disabled={pwSaving} className="btn-primary" style={{ flex: 2 }}>
                  {pwSaving ? t('common.loading') + '…' : t('common.save')}
                </button>
              </div>
            </Section>
          )}

          {!showPw && (
            <button
              onClick={() => setShowPw(true)}
              style={{
                width: '100%', padding: 12, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'white',
                fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-main)',
                color: 'var(--color-text-main)', marginBottom: 10,
              }}
            >
              🔒 {t('profile.change_password')}
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: 12, borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-danger)', background: 'white',
              color: 'var(--color-danger)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
            }}
          >
            🚪 {t('common.logout')}
          </button>
        </div>

        {/* Image viewer modal */}
        {showImageViewer && profile?.profile_image_path && (
          <ImageViewer
            src={`${BACKEND_URL}${profile.profile_image_path}`}
            onClose={() => setShowImageViewer(false)}
          />
        )}
      </div>
    );
  }

  /* ── Edit mode (name + bank only — address แก้ได้ที่ view mode) ── */
  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="top-bar">
        <button className="top-bar-back" onClick={() => setEditing(false)}>‹</button>
        <span className="top-bar-title">{t('buyer.edit_profile')}</span>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ padding: 16 }}>
        <Section title="📋 ข้อมูลส่วนตัว">
          <Field
            label={t('buyer.full_name')}
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            placeholder="ชื่อ-นามสกุล"
          />
        </Section>

        <Section title="🏦 บัญชีธนาคาร (สำหรับ refund)">
          <Field
            label={t('profile.bank_name')}
            value={form.bank_name}
            onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
            placeholder="เช่น กสิกรไทย, ไทยพาณิชย์"
          />
          <Field
            label={t('profile.bank_account')}
            value={form.bank_account_number}
            onChange={(e) => setForm((f) => ({ ...f, bank_account_number: e.target.value }))}
            placeholder="เลขที่บัญชี 10-12 หลัก"
          />
          <Field
            label={t('profile.bank_account_name')}
            value={form.bank_account_name}
            onChange={(e) => setForm((f) => ({ ...f, bank_account_name: e.target.value }))}
            placeholder="ชื่อบัญชี"
          />
        </Section>

        <div
          style={{
            background: 'var(--color-primary-light)', borderRadius: 'var(--radius-sm)',
            padding: '10px 14px', marginBottom: 12,
            fontSize: 12, color: 'var(--color-primary-dark)',
          }}
        >
          💡 ที่อยู่จัดส่ง แก้ไขได้ที่หน้าโปรไฟล์หลัก — ไม่ต้องกด "แก้ไข"
        </div>

        {saveErr && <div className="error-box" style={{ marginBottom: 12 }}>{saveErr}</div>}

        <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ marginBottom: 8 }}>
          {saving ? t('common.loading') + '…' : t('common.save')}
        </button>
        <button onClick={() => setEditing(false)} className="btn-secondary">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

/* ── Image viewer modal ──────────────────────────── */
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

/* ── Display row ─────────────────────────────────── */
// editable — ถ้า true จะแสดง ✏️ เล็กๆ ทางขวา (ใช้ใน section ที่ clickable)
function Row({ label, value, editable }) {
  return (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '7px 0',
        borderBottom: '0.5px solid var(--color-border)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--color-text-hint)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-main)', fontWeight: 500, textAlign: 'right', maxWidth: '55vw' }}>
          {value}
        </span>
        {editable && (
          <span style={{ fontSize: 10, color: 'var(--color-text-hint)', flexShrink: 0 }}>✏️</span>
        )}
      </div>
    </div>
  );
}
