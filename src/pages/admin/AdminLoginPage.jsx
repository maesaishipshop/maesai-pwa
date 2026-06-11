// src/pages/admin/AdminLoginPage.jsx
// Maesai Market — Admin Login (2-step: email+password → OTP)

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import adminApi, { setToken } from '../../api/admin.api';
import FormInput from '../../components/shared/FormInput';
import BackButton from '../../components/shared/BackButton';

export default function AdminLoginPage({ navigate, onLoginSuccess }) {
  const { t } = useTranslation();

  const [step, setStep]         = useState(1);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp]           = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleStep1(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError(t('common.error')); return; }
    setLoading(true);
    try {
      const res = await adminApi.post('/admin/login', { email, password });
      const token = res.data.accessToken || res.data.data?.accessToken;
      if (token) {
        setToken(token);
        onLoginSuccess('admin', token);
      } else {
        setStep(2);
      }
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (err.response?.status === 401) {
        setError(t('auth.invalid_credentials'));
      } else {
        setError(msg || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2(e) {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError(t('auth.otp_placeholder')); return; }
    setLoading(true);
    try {
      const res = await adminApi.post('/admin/verify-otp', { email, otp });
      const token = res.data.accessToken || res.data.data?.accessToken;
      setToken(token);
      onLoginSuccess('admin', token);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      setError(msg || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="top-bar">
        <BackButton onClick={() => step === 2 ? setStep(1) : navigate('landing')} />
        <span className="top-bar-title">Admin</span>
        <div style={{ width: 32 }} />
      </div>

      <div className="content-area" style={{ paddingBottom: 40, paddingTop: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 12px',
            }}
          >
            🔐
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary-dark)' }}>
            Maesai Market
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginTop: 2 }}>
            Admin Portal
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: step >= s ? 'var(--color-primary)' : 'var(--color-border)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-text-sub)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 16,
          }}
        >
          {step === 1 ? t('auth.step1_credential') : t('auth.step2_otp')}
        </div>

        {step === 1 && (
          <form onSubmit={handleStep1}>
            <FormInput
              label={t('auth.email')}
              type="email"
              placeholder={t('auth.email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormInput
              label={t('auth.password')}
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? t('common.loading') + '…' : t('auth.login')}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2}>
            <div
              style={{
                background: 'var(--color-primary-light)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: 13,
                color: 'var(--color-primary-dark)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>📧</span>
              {t('auth.otp_sent')}
            </div>

            <FormInput
              label={t('auth.otp')}
              type="text"
              placeholder={t('auth.otp_placeholder')}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />

            {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || otp.length !== 6}
              style={{ marginTop: 4 }}
            >
              {loading ? t('common.loading') + '…' : t('auth.verify_otp')}
            </button>

            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: 12, width: '100%' }}
              onClick={() => { setStep(1); setOtp(''); setError(''); }}
            >
              {t('common.back')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
