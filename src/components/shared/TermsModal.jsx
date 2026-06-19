import React, { useState, useEffect } from 'react';

/**
 * TermsModal — แสดงข้อตกลงการใช้งานตาม role และบังคับให้กด "ยอมรับ" ก่อนสมัคร
 * Props:
 *   role      — 'buyer' | 'seller' | 'driver'
 *   onAccept  — callback เมื่อผู้ใช้กดยอมรับ
 *   onClose   — callback เมื่อผู้ใช้กดปิด/ยกเลิก
 */
export default function TermsModal({ role, onAccept, onClose }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const baseUrl = process.env.REACT_APP_API_URL || '/api';
    fetch(`${baseUrl}/terms/${role}`)
      .then(r => r.json())
      .then(data => { setContent(data.content || ''); setLoading(false); })
      .catch(() => { setContent('ไม่สามารถโหลดข้อตกลงได้ กรุณาลองใหม่อีกครั้ง'); setLoading(false); });
  }, [role]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 12px', borderBottom: '1px solid #e8e8e8',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>
            ข้อตกลงการใช้งาน
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
            color: '#888', lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          fontSize: 14, lineHeight: 1.7, color: '#333',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#888' }}>กำลังโหลด...</p>
          ) : content}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px 18px', borderTop: '1px solid #e8e8e8',
          background: '#fafafa', borderRadius: '0 0 16px 16px',
        }}>
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            cursor: 'pointer', marginBottom: 14,
          }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 2, accentColor: '#2D9B6E', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 14, color: '#333', lineHeight: 1.5 }}>
              ข้าพเจ้าได้อ่านและยอมรับข้อตกลงการใช้งาน Maesai Market ฉบับนี้ครบถ้วนแล้ว
            </span>
          </label>

          <button
            disabled={!checked || loading}
            onClick={onAccept}
            style={{
              width: '100%', padding: '13px',
              borderRadius: 10, border: 'none',
              background: checked && !loading ? '#2D9B6E' : '#ccc',
              color: '#fff', fontWeight: 700, fontSize: 16,
              cursor: checked && !loading ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            ✅ ยอมรับและดำเนินการต่อ
          </button>
        </div>
      </div>
    </div>
  );
}
