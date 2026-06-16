// src/pages/driver/DriverProfilePage.jsx
// Tab โปรไฟล์ Driver — ดูข้อมูล, อัปเดต GPS, เปลี่ยนรหัสผ่าน, logout

import React, { useState, useRef } from 'react';
import driverApi, { clearToken } from '../../api/driver.api';
import { toImgUrl } from '../../utils/imageUrl';

function InfoRow({ label, value, editable }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '0.5px solid var(--color-border)' }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-hint)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-main)', fontWeight: 500 }}>{value}</span>
        {editable && <span style={{ fontSize: 10, color: 'var(--color-text-hint)', flexShrink: 0 }}>✏️</span>}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--color-border)', marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ padding: '11px 16px', borderBottom: '0.5px solid var(--color-border)', fontSize: 13, fontWeight: 700 }}>{title}</div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

export default function DriverProfilePage({ profile, onProfileUpdated, onLogout, showToast }) {
  // Profile image upload
  const fileInputRef                    = useRef(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  // Bank account edit mode
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm]       = useState({ bank_name: '', bank_account: '', bank_account_name: '' });
  const [bankSaving, setBankSaving]   = useState(false);

  function startEditBank() {
    setBankForm({
      bank_name:         profile?.bank_name         || '',
      bank_account:      profile?.bank_account      || '',
      bank_account_name: profile?.bank_account_name || '',
    });
    setEditingBank(true);
  }

  async function handleSaveBank() {
    setBankSaving(true);
    try {
      await driverApi.put('/drivers/profile', {
        bank_name:         bankForm.bank_name,
        bank_account:      bankForm.bank_account,
        bank_account_name: bankForm.bank_account_name,
      });
      showToast('✅ อัปเดตบัญชีธนาคารสำเร็จ');
      setEditingBank(false);
      if (onProfileUpdated) onProfileUpdated();
    } catch {
      showToast('❌ บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setBankSaving(false);
    }
  }

  // iOS fix: ต้องเรียก .click() เป็นบรรทัดแรกทันที ห้ามมี async/await หรือ logic นำหน้า
  function handleAvatarClick() {
    fileInputRef.current.click();
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await driverApi.put('/drivers/profile-image', fd);
      showToast('✅ อัปเดตรูปโปรไฟล์สำเร็จ');
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      if (err.response?.status === 413) {
        showToast('❌ รูปภาพใหญ่เกินไป กรุณาเลือกรูปขนาดไม่เกิน 10MB');
      } else if (err.response?.status === 401) {
        showToast('❌ Session หมดอายุ กรุณา login ใหม่');
      } else {
        showToast('❌ อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่');
      }
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  }

  const [showPw,     setShowPw]     = useState(false);
  const [pwForm,     setPwForm]     = useState({ old_password: '', new_password: '', confirm: '' });
  const [pwSaving,   setPwSaving]   = useState(false);

  const p = profile || {};

  /* ── เปลี่ยนรหัสผ่าน ─────────────────────────── */
  async function handleChangePassword() {
    if (pwForm.new_password !== pwForm.confirm) {
      showToast('❌ รหัสผ่านใหม่ไม่ตรงกัน'); return;
    }
    if (pwForm.new_password.length < 6) {
      showToast('❌ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return;
    }
    setPwSaving(true);
    try {
      await driverApi.put('/drivers/change-password', {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      });
      showToast('✅ เปลี่ยนรหัสผ่านสำเร็จ');
      setPwForm({ old_password: '', new_password: '', confirm: '' });
      setShowPw(false);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || '';
      if (msg === 'WRONG_PASSWORD') showToast('❌ รหัสผ่านเดิมไม่ถูกต้อง');
      else showToast('❌ เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setPwSaving(false);
    }
  }

  /* ── Logout ──────────────────────────────────── */
  function handleLogout() {
    if (!window.confirm('ออกจากระบบ?')) return;
    driverApi.post('/auth/driver/logout').catch(() => {});
    clearToken();
    window.dispatchEvent(new CustomEvent('driver:logout'));
    if (onLogout) onLogout();
  }

  const pwInput = (field, label, placeholder) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 4 }}>{label}</label>
      <input
        type="password"
        value={pwForm[field]}
        onChange={(e) => setPwForm((f) => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)', fontSize: 14,
          fontFamily: 'var(--font-main)', boxSizing: 'border-box',
        }}
      />
    </div>
  );

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="top-bar">
        <span className="top-bar-title">👤 โปรไฟล์</span>
      </div>

      <div style={{ padding: 16 }}>

        {/* Avatar — กดที่รูป → image viewer  |  กดปุ่ม 📷 → เปิด file picker */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{ position: 'relative', display: 'inline-block', margin: '0 auto 10px' }}
          >
            {/* iOS fix: handleAvatarClick เป็น named function, .click() เป็น call แรก */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#FEF3C7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, overflow: 'hidden',
              cursor: 'pointer',
            }}
            onClick={handleAvatarClick}
            >
              {p.profile_image_path ? (
                <img
                  src={toImgUrl(p.profile_image_path)}
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
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {p.first_name || p.name || '—'} {p.last_name || ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-hint)' }}>{p.phone || ''}</div>
          {p.rating > 0 && (
            <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
              ⭐ {Number(p.rating).toFixed(1)} คะแนน
            </div>
          )}
        </div>

        {/* ข้อมูลส่วนตัว */}
        <Card title="📋 ข้อมูลคนขับ">
          <InfoRow label="ชื่อ-นามสกุล" value={`${p.first_name || ''} ${p.last_name || ''}`.trim() || '—'} />
          <InfoRow label="เบอร์โทร"      value={p.phone} />
          <InfoRow label="ประเภทรถ"      value={p.vehicle_type} />
          <InfoRow label="ทะเบียนรถ"     value={p.vehicle_plate} />
          <InfoRow label="สถานะ"         value={p.is_active ? '✅ ใช้งานได้' : '⏳ รออนุมัติ'} />
        </Card>

        {/* บัญชีธนาคาร — clickable เพื่อแก้ไข */}
        {!editingBank ? (
          <div
            style={{
              background: 'white', borderRadius: 'var(--radius-lg)',
              border: '0.5px solid var(--color-border)', marginBottom: 12, overflow: 'hidden',
              cursor: 'pointer',
            }}
            onClick={startEditBank}
          >
            <div style={{
              padding: '11px 16px', borderBottom: '0.5px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>🏦 บัญชีรับเงิน</span>
              <span style={{ fontSize: 12, color: 'var(--color-primary)' }}>✏️ แก้ไข</span>
            </div>
            <div style={{ padding: 16 }}>
              <InfoRow label="ธนาคาร"    value={p.bank_name}         editable />
              <InfoRow label="เลขบัญชี"  value={p.bank_account}      editable />
              <InfoRow label="ชื่อบัญชี" value={p.bank_account_name} editable />
              {!p.bank_name && (
                <div style={{ fontSize: 12, color: 'var(--color-text-hint)' }}>
                  ยังไม่ได้ตั้งค่าบัญชีธนาคาร
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 8, textAlign: 'center' }}>
                แตะเพื่อแก้ไขข้อมูล
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--color-border)', marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '0.5px solid var(--color-border)', fontSize: 13, fontWeight: 700 }}>
              🏦 แก้ไขบัญชีรับเงิน
            </div>
            <div style={{ padding: 16 }}>
              {[
                { field: 'bank_name',         label: 'ธนาคาร',   placeholder: 'เช่น กสิกรไทย, ไทยพาณิชย์' },
                { field: 'bank_account',      label: 'เลขบัญชี', placeholder: 'เลขที่บัญชี 10-12 หลัก' },
                { field: 'bank_account_name', label: 'ชื่อบัญชี', placeholder: 'ชื่อ-นามสกุลเจ้าของบัญชี' },
              ].map(({ field, label, placeholder }) => (
                <div key={field} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-hint)', marginBottom: 4 }}>{label}</label>
                  <input
                    type="text"
                    value={bankForm[field]}
                    onChange={(e) => setBankForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)', fontSize: 14,
                      fontFamily: 'var(--font-main)', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => setEditingBank(false)}
                  style={{
                    flex: 1, padding: 10, borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)', background: 'white',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-main)',
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveBank}
                  disabled={bankSaving}
                  style={{
                    flex: 2, padding: 10, borderRadius: 'var(--radius-sm)',
                    border: 'none', background: 'var(--color-primary)', color: 'white',
                    fontSize: 13, fontWeight: 600, cursor: bankSaving ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-main)',
                  }}
                >
                  {bankSaving ? 'กำลังบันทึก…' : '💾 บันทึก'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* เปลี่ยนรหัสผ่าน */}
        <button
          className="btn-secondary"
          style={{ marginBottom: showPw ? 0 : 10 }}
          onClick={() => setShowPw((v) => !v)}
        >
          🔒 {showPw ? 'ซ่อนฟอร์มรหัสผ่าน' : 'เปลี่ยนรหัสผ่าน'}
        </button>

        {showPw && (
          <Card title="🔒 เปลี่ยนรหัสผ่าน">
            {pwInput('old_password', 'รหัสผ่านเดิม', '••••••')}
            {pwInput('new_password', 'รหัสผ่านใหม่', 'อย่างน้อย 6 ตัวอักษร')}
            {pwInput('confirm',      'ยืนยันรหัสผ่านใหม่', '••••••')}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowPw(false)}>ยกเลิก</button>
              <button className="btn-primary"   style={{ flex: 2 }} disabled={pwSaving} onClick={handleChangePassword}>
                {pwSaving ? 'กำลังบันทึก…' : 'บันทึก'}
              </button>
            </div>
          </Card>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: 12,
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--color-danger)',
            background: 'white', color: 'var(--color-danger)',
            fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-main)',
            marginTop: 8,
          }}
        >
          🚪 ออกจากระบบ
        </button>

      </div>

    </div>
  );
}
