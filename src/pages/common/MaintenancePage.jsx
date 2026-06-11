// src/pages/common/MaintenancePage.jsx
// Maesai Market — Maintenance Mode Page

import React from 'react';
import { useTranslation } from 'react-i18next';

export default function MaintenancePage() {
  const { t } = useTranslation();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      background: 'var(--color-bg)',
      fontFamily: 'Prompt, sans-serif',
    }}>

      {/* ส่วนที่ 1 — ไอคอน */}
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
        🔧
      </div>

      {/* ส่วนที่ 2 — หัวข้อ */}
      <h1 style={{ color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
        {t('common.maintenance_title', 'ระบบปิดปรับปรุงชั่วคราว')}
      </h1>

      {/* ส่วนที่ 3 — คำอธิบาย */}
      <p style={{ color: 'var(--color-text-sub)', marginBottom: '0.5rem' }}>
        {t('common.maintenance_message', 'กรุณากลับมาใหม่ภายหลัง')}
      </p>

      {/* ส่วนที่ 4 — 3 ภาษา */}
      <p style={{
        color: 'var(--color-text-hint)',
        fontSize: '0.85rem',
        marginTop: '0.5rem',
      }}>
        We'll be back soon. / စနစ်ပြုပြင်နေဆဲဖြစ်သည်။
      </p>

    </div>
  );
}
