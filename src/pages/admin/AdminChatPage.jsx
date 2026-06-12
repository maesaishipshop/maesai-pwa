// src/pages/admin/AdminChatPage.jsx
// Admin Chat — เห็นห้องแชทจาก seller_admin / buyer_admin / driver_admin
// REST-based (ไม่ใช้ socket — admin ใช้ polling แทน)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import adminApi from '../../api/admin.api';
import { toImgUrl } from '../../utils/imageUrl';

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

/* ── Room type helpers ───────────────────────────── */
function getRoomMeta(room) {
  switch (room.room_type) {
    case 'seller_admin':
      return { name: room.seller_name || 'ร้านค้า', icon: '🏪', badge: 'ผู้ขาย',  badgeColor: '#e8f5e9', textColor: '#2e7d32' };
    case 'buyer_admin':
      return { name: room.buyer_name  || 'ลูกค้า',  icon: '🛍️', badge: 'ลูกค้า',  badgeColor: '#fff3e0', textColor: '#e65100' };
    case 'driver_admin':
      return { name: room.driver_name || 'คนขับ',   icon: '🚗', badge: 'คนขับ',   badgeColor: '#ede9fe', textColor: '#6d28d9' };
    default:
      return { name: 'ผู้ใช้',  icon: '👤', badge: '', badgeColor: '#f5f5f5', textColor: '#666' };
  }
}

/* ── Room List ───────────────────────────────────── */
function RoomList({ rooms, onSelect, loading }) {
  if (loading) {
    return <div className="loading-center">⏳ กำลังโหลด…</div>;
  }
  if (rooms.length === 0) {
    return (
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <div className="empty-state-icon">💬</div>
        <div>ยังไม่มีการสนทนา</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginTop: 6 }}>
          ข้อความจาก Seller / Buyer / Driver จะปรากฏที่นี่
        </div>
      </div>
    );
  }

  return (
    <div>
      {rooms.map((room) => {
        const meta   = getRoomMeta(room);
        const unread = room.unread_admin || room.unread_count || 0;

        return (
          <div
            key={room.id}
            onClick={() => onSelect(room)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: '0.5px solid var(--color-border)',
              cursor: 'pointer', background: 'white',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: meta.badgeColor, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              {meta.icon}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-main)' }}>
                    {meta.name}
                  </span>
                  {meta.badge && (
                    <span style={{
                      fontSize: 10, color: meta.textColor,
                      background: meta.badgeColor, borderRadius: 4,
                      padding: '1px 5px', fontWeight: 600, flexShrink: 0,
                      border: `1px solid ${meta.textColor}22`,
                    }}>
                      {meta.badge}
                    </span>
                  )}
                </div>
                {room.last_message_at && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-hint)' }}>
                    {formatTime(room.last_message_at)}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: 12, color: 'var(--color-text-hint)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: '80%',
                }}>
                  {room.last_message || 'เริ่มการสนทนา...'}
                </span>
                {unread > 0 && (
                  <span style={{
                    background: 'var(--color-danger)', color: 'white',
                    borderRadius: '50%', minWidth: 18, height: 18,
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', flexShrink: 0,
                  }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Chat Window ─────────────────────────────────── */
function ChatWindow({ room, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile]       = useState(null);
  const bottomRef    = useRef(null);
  const fileInputRef = useRef(null);

  const meta = getRoomMeta(room);

  // otherType: ฝ่ายตรงข้ามในห้องนี้ (ไว้ตรวจ seen indicator)
  const otherType = room.room_type === 'seller_admin' ? 'seller'
    : room.room_type === 'buyer_admin' ? 'buyer' : 'driver';
  const initUnread = room[`unread_${otherType}`] || 0;
  const [seenByOther, setSeenByOther] = useState(initUnread === 0);

  const loadMessages = useCallback(async () => {
    try {
      const res = await adminApi.get(`/chat/rooms/${room.id}/messages`, { params: { limit: 50 } });
      const msgs = res.data.messages || res.data.data || res.data || [];
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [room.id]);

  useEffect(() => {
    loadMessages();
    adminApi.post(`/chat/rooms/${room.id}/read`).catch(() => {});
  }, [room.id, loadMessages]);

  // Scroll to bottom เมื่อ messages เปลี่ยน
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Select image ──
  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    setImageFile(file);
    e.target.value = '';
  }

  function cancelImage() { setImageFile(null); setImagePreview(null); }

  // ── Send ──
  async function handleSend() {
    if (sending) return;

    if (imageFile) {
      setSending(true);
      try {
        const form = new FormData();
        form.append('image', imageFile);
        await adminApi.post(`/chat/rooms/${room.id}/messages`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setImageFile(null);
        setImagePreview(null);
        setSeenByOther(false);
        loadMessages();
      } catch { /* silent */ }
      finally { setSending(false); }
      return;
    }

    const txt = text.trim();
    if (!txt) return;
    setSending(true);
    try {
      await adminApi.post(`/chat/rooms/${room.id}/messages`, { message: txt });
      setText('');
      setSeenByOther(false);
      loadMessages();
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const hasExtra = imagePreview;

  // หา id ข้อความล่าสุดที่ admin ส่ง — ใช้แสดง seen indicator
  let lastSentMsgId = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_type === 'admin') { lastSentMsgId = messages[i].id; break; }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top bar */}
      <div className="top-bar">
        <button className="top-bar-back" onClick={onBack}>‹</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{meta.name}</span>
          <span style={{
            fontSize: 10, color: meta.textColor, background: meta.badgeColor,
            borderRadius: 4, padding: '1px 5px', fontWeight: 600,
          }}>
            {meta.badge}
          </span>
        </div>
        <button
          onClick={loadMessages}
          style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer' }}
        >
          🔄
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '12px 16px',
        paddingBottom: hasExtra ? 200 : 148,
        background: 'var(--color-bg)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {loading ? (
          <div className="loading-center">⏳ กำลังโหลด…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-hint)', fontSize: 13, marginTop: 40 }}>
            เริ่มบทสนทนา!
          </div>
        ) : (
          messages.map((msg) => {
            const isMine  = msg.sender_type === 'admin';
            const isImg   = msg.message_type === 'image' || !!msg.image_path;
            const imgSrc  = toImgUrl(msg.image_path);
            const isLastSent = isMine && msg.id === lastSentMsgId;

            return (
              <div key={msg.id} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
              }}>
                {/* Bubble */}
                <div style={{
                  maxWidth: '72%',
                  background: isMine ? '#3949ab' : 'white',
                  color: isMine ? 'white' : 'var(--color-text-main)',
                  borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: isImg ? 4 : '8px 12px',
                  fontSize: 13,
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  {isImg ? (
                    imgSrc
                      ? <img src={imgSrc} alt="รูปภาพ" style={{ maxWidth: 200, borderRadius: 12, display: 'block' }} />
                      : <span style={{ padding: '6px 10px', display: 'block', fontSize: 13, color: isMine ? 'rgba(255,255,255,0.8)' : '#aaa' }}>📷 รูปภาพ</span>
                  ) : msg.message}
                  {msg.edited_at && (
                    <div style={{ fontSize: 10, marginTop: 2, fontStyle: 'italic', color: isMine ? 'rgba(255,255,255,0.6)' : '#aaa', textAlign: 'right' }}>
                      แก้ไขแล้ว
                    </div>
                  )}
                </div>
                {/* Timestamp + seen */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, fontSize: 11, color: '#999' }}>
                  <span>{formatTime(msg.created_at)}</span>
                  {isLastSent && (
                    <span style={{ color: seenByOther ? '#2D9B6E' : '#aaa', fontWeight: seenByOther ? 700 : 400 }}>
                      {seenByOther ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageSelect}
      />

      {/* Input area */}
      <div style={{
        position: 'fixed', bottom: 64, left: 0, right: 0,
        maxWidth: 480, margin: '0 auto',
        background: 'white',
        borderTop: '0.5px solid var(--color-border)',
        zIndex: 100,
      }}>
        {/* Image preview */}
        {imagePreview && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', background: '#f5f5f5',
            borderBottom: '0.5px solid var(--color-border)',
          }}>
            <img src={imagePreview} alt="preview" style={{ height: 56, width: 56, borderRadius: 8, objectFit: 'cover' }} />
            <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-hint)' }}>รูปภาพที่เลือก — กด ➤ เพื่อส่ง</span>
            <button onClick={cancelImage} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-hint)', lineHeight: 1 }}>✕</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: '10px 12px' }}>
          {!imagePreview && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                border: '1px solid var(--color-border)',
                background: 'white', fontSize: 18,
                cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              📷
            </button>
          )}
          <textarea
            placeholder="พิมพ์ข้อความ..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            disabled={!!imagePreview}
            style={{
              flex: 1, padding: '8px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 20, fontSize: 14,
              fontFamily: 'var(--font-main)', resize: 'none', outline: 'none',
              maxHeight: 100, overflowY: 'auto',
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || (!text.trim() && !imageFile)}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              border: 'none', background: '#3949ab', color: 'white',
              fontSize: 16, cursor: 'pointer',
              opacity: (sending || (!text.trim() && !imageFile)) ? 0.5 : 1,
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main AdminChatPage ──────────────────────────── */
export default function AdminChatPage({ onUnreadChange }) {
  const [rooms, setRooms]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeRoom, setActive] = useState(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/chat/rooms');
      const list = res.data.rooms || res.data.data || res.data || [];
      setRooms(Array.isArray(list) ? list : []);
      // แจ้ง AdminApp จำนวน unread ทั้งหมด
      const totalUnread = list.reduce((sum, r) => sum + (r.unread_admin || r.unread_count || 0), 0);
      if (onUnreadChange) onUnreadChange(totalUnread);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  if (activeRoom) {
    return (
      <ChatWindow
        room={activeRoom}
        onBack={() => { setActive(null); loadRooms(); }}
      />
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="top-bar">
        <span className="top-bar-title">💬 แชทผู้ใช้</span>
        <button
          onClick={loadRooms}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          🔄
        </button>
      </div>

      <RoomList
        rooms={rooms}
        loading={loading}
        onSelect={(room) => {
          setActive(room);
          setRooms((prev) => prev.map((r) => r.id === room.id
            ? { ...r, unread_admin: 0, unread_count: 0 } : r));
        }}
      />
    </div>
  );
}
