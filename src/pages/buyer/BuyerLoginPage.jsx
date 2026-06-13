// src/pages/buyer/BuyerLoginPage.jsx
// Maesai Market — Buyer Login
// Bug fix: เปลี่ยน phone → identifier เพื่อรองรับ login ด้วย email ด้วย
//   backend ตรวจจาก '@' ว่าเป็น email หรือ phone แล้ว query column ที่ถูก

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import buyerApi, { setToken } from '../../api/buyer.api';
import FormInput from '../../components/shared/FormInput';
import BackButton from '../../components/shared/BackButton';

export default function BuyerLoginPage({ navigate, onLoginSuccess }) {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!identifier || !password) { setError(t('common.error')); return; }
    setLoading(true);
    try {
      const res = await buyerApi.post('/auth/buyer/login', { identifier, password });
      // Backend returns { success, data: { accessToken, refreshToken, buyer } }
      const token = res.data.data?.accessToken || res.data.accessToken;
      setToken(token);
      onLoginSuccess('buyer', token);
    } catch (err) {
      const msg    = err.response?.data?.message || '';
      const status = err.response?.status;
      if (msg === 'ACCOUNT_SUSPENDED') {
        setError(t('auth.account_suspended'));
      } else if (status === 429 || msg === 'TOO_MANY_REQUESTS') {
        setError(t('auth.too_many_requests'));
      } else if (msg === 'INVALID_CREDENTIALS' || status === 401) {
        setError(t('auth.invalid_credentials'));
      } else if (!err.response) {
        setError(t('auth.network_error'));
      } else {
        setError(msg || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="top-bar">
        <BackButton onClick={() => navigate('landing')} />
        <span className="top-bar-title">{t('landing.buyer')}</span>
        <div style={{ width: 32 }} />
      </div>

      {/* iOS fix: ไม่มี overflow:hidden ที่ clip tap, position:relative เปิด z-index */}
      <div className="content-area" style={{ paddingBottom: 40, paddingTop: 32, position: 'relative', zIndex: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 12px',
            }}
          >
            🛍️
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary-dark)' }}>
            Maesai Market
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginTop: 2 }}>
            {t('landing.buyer_desc')}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <FormInput
            label={t('auth.identifier')}
            type="text"
            placeholder={t('auth.identifier_placeholder')}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
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

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-hint)' }}>
            {t('auth.no_account')}{' '}
          </span>
          <button
            onClick={() => navigate('buyer-register')}
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
            {t('auth.register')}
          </button>
        </div>
      </div>
    </div>
  );
}
