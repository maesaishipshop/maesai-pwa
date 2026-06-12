// src/pages/buyer/BuyerChatPage.jsx
// แชทกับ Seller — room list + chat window
// Features: image preview, long-press edit/delete, badge on startup,
//           timestamp under bubble, seen indicator (✓/✓✓)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import buyerApi from '../../api/buyer.api';
import { toImgUrl } from '../../utils/imageUrl';

/* ── helper: format timestamp ───────────────────────── */
function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

/* ── Room list ───────────────────────────────────── */
function RoomList({ rooms, onSelect, loading }) {
  const { t } = useTranslation();

  if (loading) {
    return <div className="loading-center">⏳ {t('common.loading')}…</div>;
  }
  if (rooms.length === 0) {
    return (
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <div className="empty-state-icon">💬</div>
        <div>ยังไม่มีการสนทนา</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-hint)', marginTop: 6 }}>
          เปิดสินค้าแล้วกด "แชทกับร้านค้า"
        </div>
      </div>
    );
  }

  return (
    <div>
      {rooms.map((room) => {
        // แยก admin room ออกจาก seller room เพื่อแสดง avatar/ชื่อที่ถูกต้อง
        const isAdmin  = room.room_type?.includes('admin');
        const lastMsg  = room.last_message || '';
        const unread   = room.unread_buyer || room.unread_count || 0;
        const avatar   = isAdmin ? null : toImgUrl(room.seller_shop_image || room.other_avatar);
        const name     = isAdmin ? 'ผู้ดูแลระบบ' : (room.shop_name || room.seller_name || 'ร้านค้า');

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
              width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
              background: isAdmin ? '#e8eaf6' : 'var(--color-primary-light)',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              {avatar ? (
                <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
              ) : isAdmin ? '👨‍💼' : '🏪'}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-main)' }}>{name}</span>
                  {isAdmin && (
                    <span style={{
                      fontSize: 10, color: '#3949ab',
                      background: '#e8eaf6', borderRadius: 4,
                      padding: '1px 5px', fontWeight: 600, flexShrink: 0,
                    }}>🛡️ ผู้ดูแล</span>
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
                  {lastMsg || 'เริ่มการสนทนา...'}
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

/* ── Chat window ─────────────────────────────────── */
function ChatWindow({ room, buyerProfile, socket, onBack }) {
  const { t } = useTranslation();
  const [messages, setMessages]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  // Image preview before send
  const [imagePreview, setImagePreview] = useState(null); // base64 URL
  const [imageFile, setImageFile]       = useState(null); // File object
  // Long-press popup
  const [pressedMsgId, setPressedMsgId] = useState(null);
  const pressTimerRef                   = useRef(null);
  // Edit mode
  const [editingMsg, setEditingMsg] = useState(null);

  // ── Seen indicator ──
  // otherType: ฝ่ายตรงข้ามในห้องนี้ — ใช้ตรวจ seen
  const otherType = room.room_type === 'buyer_admin' ? 'admin' : 'seller';
  // seenByOther: true ถ้าอีกฝ่ายอ่านแล้ว (unread ของเขา = 0)
  const initUnread = otherType === 'seller'
    ? (room.unread_seller || 0)
    : (room.unread_admin  || 0);
  const [seenByOther, setSeenByOther] = useState(initUnread === 0);

  const bottomRef    = useRef(null);
  const fileInputRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await buyerApi.get(`/chat/rooms/${room.id}/messages`, { params: { limit: 50 } });
      const msgs = res.data.messages || res.data.data || res.data || [];
      // Bug fix: API (chat.service.js) คืนผลเรียงจากเก่า→ใหม่แล้ว — ไม่ต้อง reverse ซ้ำ
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [room.id]);

  useEffect(() => {
    loadMessages();
    buyerApi.post(`/chat/rooms/${room.id}/read`).catch(() => {});
  }, [room.id, loadMessages]);

  // Socket: join room + listen events
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_room', { roomId: room.id }); // Bug fix: camelCase

    function onNewMsg(msg) {
      if (msg.room_id === room.id || msg.chat_room_id === room.id) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    }
    function onMsgEdited(updatedMsg) {
      if (updatedMsg.room_id === room.id) {
        setMessages((prev) => prev.map((m) => m.id === updatedMsg.id ? updatedMsg : m));
      }
    }
    function onMsgDeleted({ id, room_id }) {
      if (room_id === room.id) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }
    }
    // Seen indicator: อีกฝ่ายอ่านข้อความแล้ว → ✓✓
    function onMessagesRead({ roomId, readerType }) {
      if (roomId === room.id && readerType === otherType) {
        setSeenByOther(true);
      }
    }

    socket.on('receive_message', onNewMsg);
    socket.on('message_edited',  onMsgEdited);
    socket.on('message_deleted', onMsgDeleted);
    socket.on('messages_read',   onMessagesRead);
    return () => {
      socket.off('receive_message', onNewMsg);
      socket.off('message_edited',  onMsgEdited);
      socket.off('message_deleted', onMsgDeleted);
      socket.off('messages_read',   onMessagesRead);
    };
  }, [socket, room.id, otherType]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Long press handlers ──
  function handlePressStart(msgId) {
    clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => setPressedMsgId(msgId), 600);
  }
  function handlePressEnd() {
    clearTimeout(pressTimerRef.current);
  }

  // ── Select image (preview only — not upload yet) ──
  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    setImageFile(file);
    e.target.value = ''; // รีเซ็ตเพื่อให้เลือกไฟล์เดิมซ้ำได้
  }

  function cancelImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  // ── Send (text / image / save edit) ──
  async function handleSend() {
    if (sending) return;

    // Mode 1: กำลังแก้ไขข้อความ (ไม่ reset seenByOther — ไม่ใช่ข้อความใหม่)
    if (editingMsg) {
      const newText = text.trim();
      if (!newText) return;
      setSending(true);
      try {
        const res = await buyerApi.put(`/chat/rooms/${room.id}/messages/${editingMsg.id}`, { message: newText });
        const updated = res.data.data || { ...editingMsg, message: newText, edited_at: new Date().toISOString() };
        setMessages((prev) => prev.map((m) => m.id === editingMsg.id ? updated : m));
        setEditingMsg(null);
        setText('');
      } catch { /* silent */ }
      finally { setSending(false); }
      return;
    }

    // Mode 2: ส่งรูปภาพ (ข้อความใหม่ → reset seen)
    if (imageFile) {
      setSending(true);
      try {
        const form = new FormData();
        form.append('image', imageFile);
        await buyerApi.post(`/chat/rooms/${room.id}/messages`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setImageFile(null);
        setImagePreview(null);
        setSeenByOther(false); // ส่งข้อความใหม่ → ยังไม่อ่าน
        loadMessages();
      } catch { /* silent */ }
      finally { setSending(false); }
      return;
    }

    // Mode 3: ส่งข้อความ (ข้อความใหม่ → reset seen)
    const txt = text.trim();
    if (!txt) return;
    setSending(true);
    try {
      await buyerApi.post(`/chat/rooms/${room.id}/messages`, { message: txt });
      setText('');
      setSeenByOther(false); // ส่งข้อความใหม่ → ยังไม่อ่าน
      loadMessages();
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── Delete message ──
  async function handleDeleteMsg(msgId) {
    setPressedMsgId(null);
    try {
      await buyerApi.delete(`/chat/rooms/${room.id}/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch { /* silent */ }
  }

  const myId = buyerProfile?.id;
  const hasExtra = imagePreview || editingMsg;

  // หา id ของข้อความล่าสุดที่ฉัน (buyer) ส่ง — ใช้แสดง seen indicator
  let lastSentMsgId = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_type === 'buyer') { lastSentMsgId = messages[i].id; break; }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top bar */}
      <div className="top-bar">
        <button className="top-bar-back" onClick={onBack}>‹</button>
        <span className="top-bar-title" style={{ fontSize: 14 }}>
          {room.shop_name || room.seller_name || 'ร้านค้า'}
        </span>
        <div style={{ width: 32 }} />
      </div>

      {/* Overlay — ปิด popup เมื่อ tap นอก */}
      {pressedMsgId && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onClick={() => setPressedMsgId(null)}
        />
      )}

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px',
        paddingBottom: hasExtra ? 220 : 148,
        background: 'var(--color-bg)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {loading ? (
          <div className="loading-center">⏳ {t('common.loading')}…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-hint)', fontSize: 13, marginTop: 40 }}>
            เริ่มบทสนทนา!
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === myId || msg.sender_type === 'buyer';
            const isImg  = msg.message_type === 'image' || !!msg.image_path;
            const imgSrc = toImgUrl(msg.image_path);
            const isLastSent = isMine && msg.id === lastSentMsgId;

            return (
              // Outer wrapper: column layout → bubble แล้วตามด้วย timestamp row
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMine ? 'flex-end' : 'flex-start',
                }}
              >
                {/* ── Bubble ── */}
                <div
                  // Long-press: กดค้าง 600ms เพื่อเปิด popup (เฉพาะข้อความของตัวเอง)
                  onMouseDown={isMine ? () => handlePressStart(msg.id) : undefined}
                  onMouseUp={isMine ? handlePressEnd : undefined}
                  onMouseLeave={isMine ? handlePressEnd : undefined}
                  onTouchStart={isMine ? () => handlePressStart(msg.id) : undefined}
                  onTouchEnd={isMine ? handlePressEnd : undefined}
                  style={{
                    maxWidth: '72%',
                    background: isMine ? 'var(--color-primary)' : 'white',
                    color: isMine ? 'white' : 'var(--color-text-main)',
                    borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: isImg ? 4 : '8px 12px',
                    fontSize: 13,
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    cursor: isMine ? 'pointer' : 'default',
                  }}
                >
                  {/* Content */}
                  {isImg ? (
                    imgSrc ? (
                      <img
                        src={imgSrc} alt="รูปภาพ"
                        style={{ maxWidth: 200, borderRadius: 12, display: 'block' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentNode.querySelector('.img-fallback').style.display = 'block';
                        }}
                      />
                    ) : null
                  ) : msg.message}

                  {isImg && (
                    <span className="img-fallback" style={{
                      display: 'none', padding: '6px 10px', fontSize: 13,
                      color: isMine ? 'rgba(255,255,255,0.85)' : 'var(--color-text-hint)',
                    }}>📷 รูปภาพ</span>
                  )}

                  {/* แก้ไขแล้ว label (อยู่ใน bubble) */}
                  {msg.edited_at && (
                    <div style={{
                      fontSize: 10, marginTop: 2, fontStyle: 'italic',
                      color: isMine ? 'rgba(255,255,255,0.65)' : '#aaa',
                      textAlign: 'right',
                    }}>
                      แก้ไขแล้ว
                    </div>
                  )}

                  {/* Long-press popup menu */}
                  {pressedMsgId === msg.id && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      right: isMine ? 0 : 'auto',
                      left: isMine ? 'auto' : 0,
                      background: 'white',
                      borderRadius: 12,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                      overflow: 'hidden',
                      zIndex: 200,
                      minWidth: 140,
                      marginBottom: 6,
                    }}>
                      {/* แก้ไข — เฉพาะ text message */}
                      {!isImg && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMsg(msg);
                            setText(msg.message || '');
                            setPressedMsgId(null);
                          }}
                          style={{
                            display: 'block', width: '100%',
                            padding: '12px 16px',
                            border: 'none', borderBottom: '0.5px solid var(--color-border)',
                            background: 'none', textAlign: 'left',
                            fontSize: 14, cursor: 'pointer', color: 'var(--color-text-main)',
                          }}
                        >
                          ✏️ แก้ไข
                        </button>
                      )}
                      {/* ลบ */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMsg(msg.id);
                        }}
                        style={{
                          display: 'block', width: '100%',
                          padding: '12px 16px',
                          border: 'none', background: 'none',
                          textAlign: 'left', fontSize: 14,
                          color: 'var(--color-danger)', cursor: 'pointer',
                        }}
                      >
                        🗑️ ลบ
                      </button>
                    </div>
                  )}
                </div>

                {/* ── ใต้ bubble: timestamp + seen indicator ── */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  marginTop: 2,
                  fontSize: 11,
                  color: '#999',
                }}>
                  <span>{formatTime(msg.created_at)}</span>
                  {/* Seen indicator แสดงเฉพาะข้อความล่าสุดที่ฉันส่ง */}
                  {isLastSent && (
                    <span style={{
                      color: seenByOther ? '#2D9B6E' : '#aaa',
                      fontWeight: seenByOther ? 700 : 400,
                      fontSize: 11,
                    }}>
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

      {/* Bottom input area (fixed above BottomNav) */}
      <div style={{
        position: 'fixed',
        bottom: 64,
        left: 0, right: 0,
        maxWidth: 480,
        margin: '0 auto',
        background: 'white',
        borderTop: '0.5px solid var(--color-border)',
        zIndex: 100,
      }}>
        {/* Edit banner */}
        {editingMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px',
            background: '#fff8e1',
            borderBottom: '0.5px solid var(--color-border)',
            fontSize: 12, color: '#795548',
          }}>
            <span style={{ flex: 1 }}>✏️ กำลังแก้ไขข้อความ</span>
            <button
              onClick={() => { setEditingMsg(null); setText(''); }}
              style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-hint)', lineHeight: 1 }}
            >✕</button>
          </div>
        )}

        {/* Image preview bar */}
        {imagePreview && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px',
            background: '#f5f5f5',
            borderBottom: '0.5px solid var(--color-border)',
          }}>
            <img src={imagePreview} alt="preview" style={{ height: 56, width: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-hint)' }}>รูปภาพที่เลือก — กด ➤ เพื่อส่ง</span>
            <button
              onClick={cancelImage}
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-hint)', lineHeight: 1 }}
            >✕</button>
          </div>
        )}

        {/* Input row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: '10px 12px' }}>
          {/* 📷 Image button — ซ่อนเมื่อกำลัง preview หรือ edit */}
          {!imagePreview && !editingMsg && (
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
            placeholder={editingMsg ? 'แก้ไขข้อความ...' : 'พิมพ์ข้อความ...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            disabled={!!imagePreview} // เมื่อมี preview ไม่ให้พิมพ์
            style={{
              flex: 1, padding: '8px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 20, fontSize: 14,
              fontFamily: 'var(--font-main)', resize: 'none', outline: 'none',
              maxHeight: 100, overflowY: 'auto',
              background: imagePreview ? '#f5f5f5' : 'white',
            }}
          />

          {/* Send / Save button */}
          <button
            onClick={handleSend}
            disabled={sending || (!text.trim() && !imageFile)}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              border: 'none', background: editingMsg ? '#ff9800' : 'var(--color-primary)', color: 'white',
              fontSize: 16, cursor: 'pointer',
              opacity: (sending || (!text.trim() && !imageFile)) ? 0.5 : 1,
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {editingMsg ? '✓' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main BuyerChatPage ──────────────────────────── */
// initialRoom: room object ที่ได้จาก POST /chat/rooms (จาก BuyerProductDetailPage)
//              ถ้ามี → เปิดห้องนั้นทันทีโดยไม่ต้องกดเอง
// initSellerId: seller_id (จาก BuyerHomePage) → สร้างห้องก่อน แล้วเปิด
export default function BuyerChatPage({ socket, initSellerId, initialRoom, onUnreadChange, onBack }) {
  const { t } = useTranslation();
  const [rooms, setRooms]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeRoom, setActive] = useState(initialRoom || null); // เปิดทันทีถ้ามี initialRoom
  const [profile, setProfile]   = useState(null);

  /* ── Load my profile (for sender_id check) ────── */
  useEffect(() => {
    buyerApi.get('/buyers/profile').then((r) => setProfile(r.data.data || r.data.buyer || r.data)).catch(() => {});
  }, []);

  /* ── Load room list ──────────────────────────── */
  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await buyerApi.get('/chat/rooms');
      const list = res.data.rooms || res.data.data || res.data || [];
      setRooms(Array.isArray(list) ? list : []);
      const totalUnread = list.reduce((sum, r) => sum + (r.unread_buyer || r.unread_count || 0), 0);
      if (onUnreadChange) onUnreadChange(totalUnread);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  /* ── If initiated from product page (initSellerId) → สร้างห้องก่อน ── */
  // Bug fix: POST body ต้องส่ง { type, targetId } ไม่ใช่ { seller_id }
  useEffect(() => {
    if (!initSellerId) return;
    buyerApi.post('/chat/rooms', { type: 'seller_buyer', targetId: initSellerId })
      .then((r) => {
        const room = r.data.room || r.data.data || r.data;
        if (room) {
          setActive(room);
          loadRooms();
        }
      })
      .catch((err) => {
        console.error('[BuyerChat] สร้างห้องไม่สำเร็จ:', err.response?.data || err.message);
      });
  }, [initSellerId, loadRooms]);

  /* ── Contact Admin — สร้างหรือเปิดห้อง buyer_admin ── */
  async function handleContactAdmin() {
    try {
      const r = await buyerApi.post('/chat/rooms', { type: 'buyer_admin' });
      const room = r.data.room || r.data.data || r.data;
      if (room?.id) { setActive(room); loadRooms(); }
    } catch { /* silent */ }
  }

  if (activeRoom) {
    return (
      <ChatWindow
        room={activeRoom}
        buyerProfile={profile}
        socket={socket}
        onBack={() => { setActive(null); loadRooms(); }}
      />
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="top-bar">
        <span className="top-bar-title">{t('nav.chat')}</span>
        <button
          onClick={loadRooms}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          🔄
        </button>
      </div>

      {/* ปุ่มติดต่อ Admin — แสดงเสมอบนสุดของ chat list */}
      <div style={{ padding: '12px 16px 4px' }}>
        <button
          onClick={handleContactAdmin}
          style={{
            background: '#e8eaf6', color: '#3949ab',
            border: '1px solid #c5cae9', borderRadius: 12,
            padding: '10px 16px', marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 14, width: '100%', cursor: 'pointer',
            fontFamily: 'var(--font-main)',
          }}
        >
          <span style={{ fontSize: 18 }}>👨‍💼</span>
          <span style={{ fontWeight: 600 }}>ติดต่อผู้ดูแลระบบ</span>
        </button>
      </div>

      <RoomList
        rooms={rooms}
        loading={loading}
        onSelect={(room) => {
          setActive(room);
          setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, unread_buyer: 0, unread_count: 0 } : r));
        }}
      />
    </div>
  );
}
