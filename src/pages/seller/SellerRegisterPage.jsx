// src/pages/seller/SellerRegisterPage.jsx
// Maesai Market — Seller Register
// เพิ่ม email field (optional) — ส่ง email ไปใน body ถ้ากรอก
// รองรับ EMAIL_ALREADY_REGISTERED จาก backend (migration 021)

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import sellerApi from '../../api/seller.api';
import FormInput from '../../components/shared/FormInput';
import BackButton from '../../components/shared/BackButton';

export default function SellerRegisterPage({ navigate }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    shop_name: '',
    phone: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  function setField(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function validate() {
    const e = {};
    if (!form.shop_name.trim()) e.shop_name = t('common.error');
    if (!form.phone.trim())     e.phone     = t('common.error');
    if (form.password.length < 6) e.password = t('auth.password_min');
    if (form.password !== form.confirm_password) e.confirm_password = t('auth.password_not_match');
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const e2 = validate();
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }

    setLoading(true);
    try {
      const payload = {
        shop_name: form.shop_name.trim(),
        phone:     form.phone.trim(),
        password:  form.password,
      };
      // เพิ่ม email เฉพาะเมื่อกรอก (optional)
      if (form.email.trim()) payload.email = form.email.trim();

      await sellerApi.post('/auth/seller/register', payload);
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg === 'PHONE_ALREADY_REGISTERED') {
        setApiError(t('auth.phone_exists'));
      } else if (msg === 'EMAIL_ALREADY_REGISTERED') {
        setApiError(t('auth.email_exists'));
      } else {
        setApiError(msg || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="page-container">
        <div className="top-bar">
          <BackButton onClick={() => navigate('seller-login')} />
          <span className="top-bar-title">{t('auth.register')}</span>
          <div style={{ width: 32 }} />
        </div>
        <div className="empty-state" style={{ paddingTop: 80 }}>
          <div className="empty-state-icon">✅</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text-main)' }}>
            {t('auth.register_success')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-hint)', marginTop: 4 }}>
            {t('auth.register_success_desc')}
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: 28, width: 'auto', padding: '12px 32px' }}
            onClick={() => navigate('seller-login')}
          >
            {t('auth.login')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="top-bar">
        <BackButton onClick={() => navigate('seller-login')} />
        <span className="top-bar-title">{t('auth.register')} — {t('landing.seller')}</span>
        <div style={{ width: 32 }} />
      </div>

      <div className="content-area" style={{ paddingBottom: 40, paddingTop: 24 }}>
        <form onSubmit={handleSubmit}>
          <FormInput
            label={t('auth.shop_name')}
            type="text"
            placeholder={t('auth.shop_name')}
            value={form.shop_name}
            onChange={(e) => setField('shop_name', e.target.value)}
            error={errors.shop_name}
          />
          <FormInput
            label={t('auth.phone')}
            type="tel"
            placeholder={t('auth.phone_placeholder')}
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            error={errors.phone}
          />
          <FormInput
            label={t('auth.email_optional')}
            type="email"
            placeholder={t('auth.email_optional_placeholder')}
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            error={errors.email}
          />
          <FormInput
            label={t('auth.password')}
            type="password"
            placeholder="••••••"
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            error={errors.password}
          />
          <FormInput
            label={t('auth.confirm_password')}
            type="password"
            placeholder="••••••"
            value={form.confirm_password}
            onChange={(e) => setField('confirm_password', e.target.value)}
            error={errors.confirm_password}
          />

          {apiError && <div className="error-box" style={{ marginBottom: 16 }}>{apiError}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? t('common.loading') + '…' : t('auth.register')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>
            {t('auth.have_account')}{' '}
          </span>
          <button
            onClick={() => navigate('seller-login')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-main)',
              padding: 0,
            }}
          >
            {t('auth.login')}
          </button>
        </div>
      </div>
    </div>
  );
}
