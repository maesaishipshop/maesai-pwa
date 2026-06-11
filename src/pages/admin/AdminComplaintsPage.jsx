// src/pages/admin/AdminComplaintsPage.jsx
// Maesai Market — Admin Complaints Page (Step 15-26)
// แสดงรายการร้องเรียนจาก Seller / Buyer / Driver พร้อมระบบตอบกลับ/ปิดเรื่อง

import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../api/admin.api';
import BackButton from '../../components/shared/BackButton';

/* ── Status config ──────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  open:        { label: 'รอดำเนินการ', color: '#E53E3E', bg: '#fff5f5' },
  in_progress: { label: 'กำลังดำเนินการ', color: '#D97706', bg: '#fffbeb' },
  resolved:    { label: 'แก้ไขแล้ว',   color: '#2D9B6E', bg: '#f0fdf4' },
  closed:      { label: 'ปิดแล้ว',     color: '#64748B', bg: '#f1f5f9' },
};

const ROLE_CONFIG = {
  seller: { label: 'ผู้ขาย',  icon: '🏪', color: '#2D9B6E' },
  buyer:  { label: 'ผู้ซื้อ',  icon: '🛍️', color: '#D97706' },
  driver: { label: 'คนขับ',   icon: '🚗', color: '#7C3AED' },
};

/* ── Filter Tabs ────────────────────────────────────────────────────────── */
const FILTER_TABS = [
  { key: 'all',         label: 'ทั้งหมด'        },
  { key: 'open',        label: 'รอดำเนินการ'     },
  { key: 'in_progress', label: 'กำลังดำเนินการ'  },
  { key: 'resolved',    label: 'แก้ไขแล้ว'      },
];

/* ── ComplaintCard ──────────────────────────────────────────────────────── */
function ComplaintCard({ complaint, onSelect }) {
  const st   = STATUS_CONFIG[complaint.status]  || STATUS_CONFIG.closed;
  const role = ROLE_CONFIG[complaint.complainant_type] || { label: complaint.complainant_type, icon: '👤', color: '#64748B' };
  const date = new Date(complaint.created_at).toLocaleDateString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
  });

  return (
    <button
      onClick={() => onSelect(complaint)}
      style={{
        width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
        background: 'white', borderRadius: 12, padding: '14px 16px',
        marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}
    >
      {/* Role icon */}
      <div style={{
        width: 42, height: 42, borderRadius: 21,
        background: role.color + '18', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>
        {role.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <span style={{
              fontSize: 12, color: role.color, fontWeight: 600,
              background: role.color + '15', borderRadius: 4,
              padding: '1px 6px', marginRight: 6,
            }}>
              {role.icon} {role.label}
            </span>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              {complaint.complainant_name}
            </span>
          </div>
          {/* Status badge */}
          <span style={{
            flexShrink: 0, fontSize: 10, fontWeight: 700,
            color: st.color, background: st.bg,
            borderRadius: 99, padding: '2px 8px',
            border: `1px solid ${st.color}40`,
          }}>
            {st.label}
          </span>
        </div>

        {/* Subject */}
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#1e293b',
          marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {complaint.subject}
        </div>

        {/* Date + admin note indicator */}
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, display: 'flex', gap: 8 }}>
          <span>{date}</span>
          {complaint.admin_note && (
            <span style={{ color: '#2D9B6E' }}>✓ มีหมายเหตุ</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── ComplaintDetail ────────────────────────────────────────────────────── */
function ComplaintDetail({ complaint: initial, onBack, onUpdated }) {
  const [complaint, setComplaint]   = useState(initial);
  const [replyText, setReplyText]   = useState(initial.admin_note || '');
  const [loading,   setLoading]     = useState(false);
  const [saving,    setSaving]      = useState(false);
  const [error,     setError]       = useState('');

  const st   = STATUS_CONFIG[complaint.status]  || STATUS_CONFIG.closed;
  const role = ROLE_CONFIG[complaint.complainant_type] || { label: complaint.complainant_type, icon: '👤', color: '#64748B' };
  const date = new Date(complaint.created_at).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const isResolved = complaint.status === 'resolved' || complaint.status === 'closed';

  /* ── Reply ── */
  async function handleReply() {
    if (!replyText.trim()) { setError('กรุณากรอกหมายเหตุ/คำตอบ'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await adminApi.put(
        `/admin/complaints/${complaint.id}/reply`,
        { admin_note: replyText.trim() },
      );
      const updated = res.data.complaint;
      setComplaint(prev => ({ ...prev, ...updated }));
      if (onUpdated) onUpdated(updated);
    } catch {
      setError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  }

  /* ── Close ── */
  async function handleClose() {
    if (!window.confirm('ยืนยันการปิดเรื่องร้องเรียนนี้?')) return;
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.put(`/admin/complaints/${complaint.id}/close`);
      const updated = res.data.complaint;
      setComplaint(prev => ({ ...prev, ...updated }));
      if (onUpdated) onUpdated(updated);
    } catch {
      setError('ปิดเรื่องไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        background: '#1a1a2e', padding: '16px 16px 12px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <BackButton onClick={onBack} color="white" />
        <div style={{ flex: 1 }}>
          <h2 style={{ color: 'white', margin: 0, fontSize: 16, fontWeight: 700 }}>
            รายละเอียดการร้องเรียน
          </h2>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>#{complaint.id}</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, color: st.color,
          background: st.bg, borderRadius: 99, padding: '3px 10px',
          border: `1px solid ${st.color}50`,
        }}>
          {st.label}
        </span>
      </div>

      <div style={{ padding: 16 }}>
        {/* Complainant info */}
        <div style={{
          background: 'white', borderRadius: 12, padding: 16,
          marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{
              fontSize: 13, color: role.color, fontWeight: 600,
              background: role.color + '15', borderRadius: 6, padding: '2px 8px',
            }}>
              {role.icon} {role.label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
              {complaint.complainant_name}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>วันที่ร้องเรียน: {date}</div>
        </div>

        {/* Subject + Detail */}
        <div style={{
          background: 'white', borderRadius: 12, padding: 16,
          marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 4 }}>
            หัวเรื่อง
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>
            {complaint.subject}
          </div>
          <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 6 }}>
            รายละเอียด
          </div>
          <div style={{
            fontSize: 14, color: '#334155', lineHeight: 1.6,
            background: '#f8fafc', borderRadius: 8, padding: 12,
          }}>
            {complaint.detail}
          </div>
        </div>

        {/* Admin Note / Reply */}
        <div style={{
          background: 'white', borderRadius: 12, padding: 16,
          marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 8 }}>
            หมายเหตุ / คำตอบจาก Admin
          </div>
          {isResolved ? (
            /* Readonly when resolved */
            <div style={{
              fontSize: 14, color: '#334155', lineHeight: 1.6,
              background: '#f8fafc', borderRadius: 8, padding: 12,
              minHeight: 60,
            }}>
              {complaint.admin_note || <span style={{ color: '#94a3b8' }}>ไม่มีหมายเหตุ</span>}
            </div>
          ) : (
            /* Editable */
            <textarea
              value={replyText}
              onChange={e => { setReplyText(e.target.value); setError(''); }}
              placeholder="พิมพ์คำตอบหรือหมายเหตุถึงผู้ร้องเรียน..."
              rows={4}
              style={{
                width: '100%', borderRadius: 8, border: '1.5px solid #e2e8f0',
                padding: 10, fontSize: 14, resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'var(--font-main)', lineHeight: 1.6, outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#2D9B6E'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          )}

          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 6 }}>
              {error}
            </div>
          )}

          {/* Action buttons */}
          {!isResolved && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={handleReply}
                disabled={saving}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: saving ? '#e2e8f0' : '#2D9B6E', color: saving ? '#94a3b8' : 'white',
                  fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'กำลังบันทึก...' : '💬 บันทึกคำตอบ'}
              </button>
              <button
                onClick={handleClose}
                disabled={loading}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  border: '1.5px solid #64748B', background: 'white',
                  color: loading ? '#94a3b8' : '#64748B',
                  fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'กำลังปิด...' : '✅ ปิดเรื่อง'}
              </button>
            </div>
          )}

          {isResolved && complaint.resolved_at && (
            <div style={{ fontSize: 12, color: '#2D9B6E', marginTop: 8 }}>
              ✓ ปิดเรื่องเมื่อ {new Date(complaint.resolved_at).toLocaleDateString('th-TH', {
                day: '2-digit', month: 'short', year: '2-digit',
                hour: '2-digit', minute: '2-digit',
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── AdminComplaintsPage ────────────────────────────────────────────────── */
export default function AdminComplaintsPage({ onNavigate }) {
  const [filterTab,   setFilterTab]   = useState('all');
  const [complaints,  setComplaints]  = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [selected,    setSelected]    = useState(null); // complaint detail

  const LIMIT = 20;

  const fetchComplaints = useCallback(async (tab = filterTab, p = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.get('/admin/complaints', {
        params: { status: tab, page: p, limit: LIMIT },
      });
      setComplaints(res.data.complaints || []);
      setTotal(res.data.total || 0);
    } catch {
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, [filterTab]);

  useEffect(() => {
    fetchComplaints(filterTab, page);
  }, [filterTab, page, fetchComplaints]);

  function handleTabChange(key) {
    setFilterTab(key);
    setPage(1);
    setSelected(null);
  }

  function handleUpdated(updated) {
    // อัปเดต complaint ใน list ด้วย
    setComplaints(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
  }

  // ── Detail view ──
  if (selected) {
    return (
      <ComplaintDetail
        complaint={selected}
        onBack={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    );
  }

  // ── List view ──
  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{
        background: '#1a1a2e', padding: '16px 16px 12px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {onNavigate && (
          <BackButton onClick={() => onNavigate('dashboard')} color="white" />
        )}
        <div>
          <h2 style={{ color: 'white', margin: 0, fontSize: 18, fontWeight: 700 }}>
            📋 การร้องเรียน
          </h2>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
            {total > 0 ? `${total} รายการ` : 'ไม่มีรายการ'}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        background: 'white', padding: '8px 12px',
        display: 'flex', gap: 6, overflowX: 'auto',
        borderBottom: '1px solid var(--color-border)',
      }}>
        {FILTER_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 99,
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: filterTab === t.key ? '#1a1a2e' : '#f1f5f9',
              color:      filterTab === t.key ? 'white'   : '#64748B',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 14px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            ⏳ กำลังโหลด...
          </div>
        ) : complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ color: '#94a3b8', fontSize: 14 }}>ไม่มีรายการร้องเรียน</div>
          </div>
        ) : (
          <>
            {complaints.map(c => (
              <ComplaintCard key={c.id} complaint={c} onSelect={setSelected} />
            ))}

            {/* Pagination */}
            {total > LIMIT && (
              <div style={{
                display: 'flex', justifyContent: 'center', gap: 8,
                padding: '12px 0 20px',
              }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '6px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                    background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer',
                    color: page === 1 ? '#94a3b8' : '#1e293b', fontWeight: 600, fontSize: 13,
                  }}
                >
                  ← ก่อนหน้า
                </button>
                <span style={{
                  padding: '6px 14px', fontSize: 13, color: '#64748B',
                  background: '#f1f5f9', borderRadius: 8,
                }}>
                  {page} / {Math.ceil(total / LIMIT)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / LIMIT)}
                  style={{
                    padding: '6px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                    background: 'white',
                    cursor: page >= Math.ceil(total / LIMIT) ? 'not-allowed' : 'pointer',
                    color: page >= Math.ceil(total / LIMIT) ? '#94a3b8' : '#1e293b',
                    fontWeight: 600, fontSize: 13,
                  }}
                >
                  ถัดไป →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
