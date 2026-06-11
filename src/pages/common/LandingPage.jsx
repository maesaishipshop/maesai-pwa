// src/pages/common/LandingPage.jsx
// Maesai Market — Landing Page
// Role selection: Seller / Buyer / Driver + Admin link

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/* ── Language Switcher ─────────────────────────────── */
function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const langs = [
    { code: 'th', label: 'ไทย' },
    { code: 'en', label: 'EN'   },
    { code: 'my', label: 'မြန်မာ' },
  ];

  const current = langs.find((l) => l.code === i18n.language) || langs[0];

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function select(code) {
    i18n.changeLanguage(code);
    localStorage.setItem('mm_lang', code);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 11px',
          borderRadius: 20,
          border: '1.5px solid rgba(255,255,255,0.45)',
          background: 'rgba(255,255,255,0.18)',
          color: 'white',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--font-main)',
          cursor: 'pointer',
          backdropFilter: 'blur(4px)',
          lineHeight: 1,
        }}
      >
        {current.label}
        <span style={{ fontSize: 9, opacity: 0.8, marginTop: 1 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'white',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            minWidth: 90,
            border: '0.5px solid var(--color-border)',
          }}
        >
          {langs.map((l) => (
            <button
              key={l.code}
              onClick={() => select(l.code)}
              style={{
                display: 'block',
                width: '100%',
                padding: '9px 14px',
                background: l.code === i18n.language ? 'var(--color-primary-light)' : 'white',
                color: l.code === i18n.language ? 'var(--color-primary-dark)' : 'var(--color-text-main)',
                border: 'none',
                textAlign: 'left',
                fontSize: 13,
                fontWeight: l.code === i18n.language ? 600 : 400,
                fontFamily: 'var(--font-main)',
                cursor: 'pointer',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Role Card ────────────────────────────────────── */
function RoleCard({ icon, title, desc, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        background: 'white',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '18px 20px',
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: 'var(--shadow-sm)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        fontFamily: 'var(--font-main)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: color + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-main)', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>{desc}</div>
      </div>

      <div style={{ color: 'var(--color-text-hint)', fontSize: 18 }}>›</div>
    </button>
  );
}

/* ── Main Component ───────────────────────────────── */
export default function LandingPage({ onSelectRole }) {
  const { t } = useTranslation();

  return (
    /* Outer: flex column เต็ม viewport
       overflow:hidden + borderRadius:16 → clip มุมของ header ให้โค้งครบ 4 มุม */
    <div
      className="page-container"
      style={{
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        borderRadius: 16,
        overflow: 'hidden',
        /* paddingTop: ช่องว่างบนจอก่อน header — รองรับ safe-area (notch) บน iOS/Android */
        paddingTop: 'max(16px, env(safe-area-inset-top))',
      }}
    >

      {/* ── Header — borderRadius ครบ 4 มุม (outer clip ช่วยด้วย) ── */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(160deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
          paddingTop: 20,
          paddingRight: 16,
          paddingBottom: 24,
          paddingLeft: 16,
          textAlign: 'center',
          borderRadius: 16,
          width: '100%',
          margin: 0,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <LanguageSwitcher />

        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            margin: '0 auto 6px',
            border: '1.5px solid rgba(255,255,255,0.3)',
          }}
        >
          🏪
        </div>

        <h1 style={{ color: 'white', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
          {t('landing.title')}
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11 }}>
          {t('landing.subtitle')}
        </p>
      </div>

      {/* ── Content — flex: 1 + justifyContent center → cards อยู่กึ่งกลางจอ ── */}
      <div
        className="content-area"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingTop: 36,
          paddingBottom: 40,
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-text-sub)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 14,
          }}
        >
          {t('landing.select_role')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RoleCard
            icon="🏪"
            title={t('landing.seller')}
            desc={t('landing.seller_desc')}
            color="#2D9B6E"
            onClick={() => onSelectRole('seller')}
          />
          <RoleCard
            icon="🛍️"
            title={t('landing.buyer')}
            desc={t('landing.buyer_desc')}
            color="#3B82F6"
            onClick={() => onSelectRole('buyer')}
          />
          <RoleCard
            icon="🚚"
            title={t('landing.driver')}
            desc={t('landing.driver_desc')}
            color="#F59E0B"
            onClick={() => onSelectRole('driver')}
          />
        </div>

        {/* Admin login — hidden, เข้าผ่าน URL secret ?ref=msmadmin2025 */}
      </div>
    </div>
  );
}
