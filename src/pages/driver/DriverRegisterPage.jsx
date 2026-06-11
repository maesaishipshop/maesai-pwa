// src/pages/driver/DriverRegisterPage.jsx
// Maesai Market — Driver Register
// เพิ่ม email field (optional) — ส่ง email ไปใน body ถ้ากรอก
// รองรับ EMAIL_ALREADY_REGISTERED จาก backend (migration 021)

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import driverApi from '../../api/driver.api';
import FormInput from '../../components/shared/FormInput';
import BackButton from '../../components/shared/BackButton';

const VEHICLE_TYPES = [
  { value: 'motorcycle', labelKey: 'auth.vehicle_motorcycle' },
  { value: 'pickup',     labelKey: 'auth.vehicle_pickup'     },
  { value: 'van',        labelKey: 'auth.vehicle_van'        },
  { value: 'truck',      labelKey: 'auth.vehicle_truck'      },
];

export default function DriverRegisterPage({ navigate }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    full_name:        '',
    phone:            '',
    email:            '',
    id_card_number:   '',
    vehicle_type:     '',
    vehicle_plate:    '',
    password:         '',
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
    if (!form.full_name.trim())      e.full_name      = t('common.error');
    if (!form.phone.trim())          e.phone          = t('common.error');
    if (form.id_card_number.replace(/\D/g, '').length !== 13) {
      e.id_card_number = t('auth.id_card_invalid');
    }
    if (!form.vehicle_type)          e.vehicle_type   = t('common.error');
    if (!form.vehicle_plate.trim())  e.vehicle_plate  = t('common.error');
    if (form.password.length < 6)    e.password       = t('auth.password_min');
    if (form.password !== form.confirm_password) {
      e.confirm_password = t('auth.password_not_match');
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const e2 = validate();
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }

    const nameParts  = form.full_name.trim().split(' ');
    const first_name = nameParts[0] || '';
    const last_name  = nameParts.slice(1).join(' ') || '-';

    setLoading(true);
    try {
      const payload = {
        first_name,
        last_name,
        phone:          form.phone.trim(),
        id_card_number: form.id_card_number.trim(),
        vehicle_type:   form.vehicle_type,
        vehicle_plate:  form.vehicle_plate.trim(),
        password:       form.password,
      };
      // เพิ่ม email เฉพาะเมื่อกรอก (optional)
      if (form.email.trim()) payload.email = form.email.trim();

      await driverApi.post('/auth/driver/register', payload);
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
          <BackButton onClick={() => navigate('landing')} />
          <span className="top-bar-title">{t('auth.register')}</span>
          <div style={{ width: 32 }} />
        </div>
        <div className="empty-state" style={{ paddingTop: 80 }}>
          <div className="empty-state-icon">⏳</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text-main)' }}>
            {t('auth.register_success')}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-text-hint)',
              marginTop: 6,
              maxWidth: 280,
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            {t('auth.pending_approval')}
            {'\n'}
            {t('auth.pending_approval_desc')}
          </div>
          <button
            className="btn-secondary"
            style={{ marginTop: 28, width: 'auto', padding: '10px 28px' }}
            onClick={() => navigate('driver-login')}
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
        <BackButton onClick={() => navigate('driver-login')} />
        <span className="top-bar-title">{t('auth.register')} — {t('landing.driver')}</span>
        <div style={{ width: 32 }} />
      </div>

      <div className="content-area" style={{ paddingBottom: 40, paddingTop: 24 }}>
        <form onSubmit={handleSubmit}>
          <FormInput
            label={t('auth.full_name')}
            type="text"
            placeholder={t('auth.full_name')}
            value={form.full_name}
            onChange={(e) => setField('full_name', e.target.value)}
            error={errors.full_name}
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
            label={t('auth.id_card')}
            type="text"
            placeholder={t('auth.id_card_placeholder')}
            value={form.id_card_number}
            onChange={(e) => setField('id_card_number', e.target.value)}
            error={errors.id_card_number}
            maxLength={13}
          />

          <FormInput label={t('auth.vehicle_type')} error={errors.vehicle_type}>
            <select
              className="input-field"
              value={form.vehicle_type}
              onChange={(e) => setField('vehicle_type', e.target.value)}
              style={errors.vehicle_type ? { borderColor: 'var(--color-danger)' } : undefined}
            >
              <option value="">{t('auth.vehicle_type')}</option>
              {VEHICLE_TYPES.map((v) => (
                <option key={v.value} value={v.value}>{t(v.labelKey)}</option>
              ))}
            </select>
          </FormInput>

          <FormInput
            label={t('auth.vehicle_plate')}
            type="text"
            placeholder={t('auth.vehicle_plate_placeholder')}
            value={form.vehicle_plate}
            onChange={(e) => setField('vehicle_plate', e.target.value)}
            error={errors.vehicle_plate}
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
            onClick={() => navigate('driver-login')}
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
