// src/pages/seller/SellerOrdersPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import sellerApi from '../../api/seller.api';

const STATUS_TABS = [
  { key: 'pending_seller',   labelKey: 'seller.order_pending'    },
  { key: 'ready_for_pickup', labelKey: 'seller.order_ready'      },
  { key: 'picked_up',        labelKey: 'seller.order_delivering' },
  { key: 'completed',        labelKey: 'seller.order_completed'  },
  { key: 'cancelled',        labelKey: 'seller.order_cancelled'  },
];

const STATUS_BADGE = {
  pending_seller:   'badge-warning',
  ready_for_pickup: 'badge-info',
  driver_assigned:  'badge-info',
  picked_up:        'badge-info',
  delivered:        'badge-info',
  completed:        'badge-success',
  cancelled:        'badge-danger',
  disputed:         'badge-danger',
};

function OrderCard({ order, onAction, actionLoading, onPrinted, selectionMode, isSelected, onToggleSelect }) {
  const { t } = useTranslation();
  const status  = order.status;
  const total   = Number(order.total || 0);
  const loading = actionLoading === order.id;

  async function handlePrint() {
    // iOS Safari fix: window.open() ต้องเรียกก่อน await ทุกกรณี
    const w = window.open('', '_blank');
    if (!w) { alert('กรุณาอนุญาต popup สำหรับเว็บนี้'); return; }
    try {
      w.document.write('<p style="font-family:sans-serif;padding:20px">กำลังโหลด...</p>');
      const res = await sellerApi.get(`/orders/${order.id}/print`);
      w.document.open();
      w.document.write(res.data);
      w.document.close();
      if (onPrinted) onPrinted(order.id);
    } catch (e) {
      w.close();
      alert('ไม่สามารถโหลดใบสั่งซื้อได้ กรุณาลองใหม่');
    }
  }

  return (
    <div
      onClick={selectionMode ? () => onToggleSelect(order.id) : undefined}
      style={{
        background: isSelected ? '#f0faf5' : 'white',
        borderRadius: 'var(--radius-lg)',
        border: isSelected ? '2px solid #2D9B6E' : '0.5px solid var(--color-border)',
        padding: '14px 16px',
        marginBottom: 10,
        cursor: selectionMode ? 'pointer' : 'default',
        display: 'flex', gap: 10, alignItems: 'flex-start',
        transition: 'border 0.15s, background 0.15s',
      }}
    >
      {/* Checkbox — แสดงเฉพาะใน selection mode */}
      {selectionMode && (
        <div
          style={{
            marginTop: 2, flexShrink: 0,
            width: 20, height: 20,
            borderRadius: 4,
            border: isSelected ? '2px solid #2D9B6E' : '2px solid #ccc',
            background: isSelected ? '#2D9B6E' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 13, fontWeight: 700,
          }}
        >
          {isSelected ? '✓' : ''}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>#{order.order_number}</span>
          <span className={`badge ${STATUS_BADGE[status] || 'badge-gray'}`}>
            {t(`seller.order_${status.replace('pending_seller','pending').replace('ready_for_pickup','ready').replace('driver_assigned','delivering').replace('picked_up','delivering')}`) || status}
          </span>
        </div>

        <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 6 }}>
          {t('seller.buyer')}: {order.buyer_name || '—'} •{' '}
          {new Date(order.created_at).toLocaleDateString('th-TH')}
        </div>

        {(order.items || []).map((item, i) => (
          <div key={i} style={{ fontSize: 12, color: 'var(--color-text-main)', marginBottom: 2 }}>
            • {item.product_name} × {item.quantity} {item.unit || ''}
            <span style={{ color: 'var(--color-text-sub)' }}> = ฿{Number(item.unit_price * item.quantity).toLocaleString()}</span>
          </div>
        ))}

        <div
          style={{
            display: 'flex', justifyContent: 'space-between',
            borderTop: '0.5px solid var(--color-border-light)',
            marginTop: 10, paddingTop: 10,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>
            {t('seller.shipping_fee')}: ฿{Number(order.shipping_fee || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>
            {t('seller.order_total')}: ฿{total.toLocaleString()}
          </div>
        </div>

        {/* indicator ปริ้นแล้ว */}
        {order.is_printed && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#666', fontSize: 12, marginTop: 8 }}>
            ✅ ปริ้นแล้ว
            {order.printed_at && (
              <span>· {new Date(order.printed_at).toLocaleString('th-TH', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}</span>
            )}
          </div>
        )}

        {/* Action buttons — ซ่อนใน selection mode */}
        {!selectionMode && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {status === 'pending_seller' && (
              <>
                <button
                  onClick={() => onAction(order.id, 'reject')}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-danger)',
                    background: 'white', color: 'var(--color-danger)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-main)',
                  }}
                >
                  {t('seller.reject_order')}
                </button>
                <button
                  onClick={() => onAction(order.id, 'accept')}
                  disabled={loading}
                  style={{
                    flex: 2, padding: '8px', borderRadius: 'var(--radius-md)',
                    border: 'none', background: 'var(--color-primary)', color: 'white',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-main)',
                  }}
                >
                  {loading ? '…' : t('seller.accept_order')}
                </button>
              </>
            )}
            {status === 'delivered' && (
              <div style={{ fontSize: 12, color: 'var(--color-text-hint)', flex: 1, padding: '8px 0' }}>
                ⏳ รอลูกค้ายืนยัน
              </div>
            )}
            {status !== 'cancelled' && (
              <button
                onClick={handlePrint}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'white', color: 'var(--color-text-sub)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-main)',
                }}
              >
                🖨 {t('seller.print_order')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// statuses ที่แต่ละ tab แสดง (รวม driver_assigned ใน tab กำลังส่ง)
const TAB_FILTER = {
  pending_seller:   ['pending_seller'],
  ready_for_pickup: ['ready_for_pickup'],
  picked_up:        ['driver_assigned', 'picked_up'],
  completed:        ['completed'],
  cancelled:        ['cancelled'],
};

// tabs ที่แสดง badge count (เฉพาะที่มีความหมาย)
const TAB_BADGE_STATUSES = {
  pending_seller:   ['pending_seller'],
  ready_for_pickup: ['ready_for_pickup'],
  picked_up:        ['driver_assigned', 'picked_up'],
};

export default function SellerOrdersPage({ onPendingCountChange }) {
  const { t } = useTranslation();
  const [allOrders, setAllOrders]       = useState([]);
  const [activeStatus, setStatus]       = useState('pending_seller');
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActLoad]     = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds]   = useState(new Set());

  // นับจำนวนแต่ละ status
  const counts = allOrders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  // orders ที่แสดงใน tab ปัจจุบัน
  const displayedOrders = allOrders.filter((o) =>
    (TAB_FILTER[activeStatus] || [activeStatus]).includes(o.status)
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await sellerApi.get('/orders/seller', { params: { limit: 200 } });
      const data = res.data.orders || res.data.data || res.data || [];
      setAllOrders(data);
      if (onPendingCountChange) {
        onPendingCountChange(data.filter((o) => o.status === 'pending_seller').length);
      }
    } catch (e) {
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, [onPendingCountChange]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // เปลี่ยน tab → reset selection
  function handleSetStatus(key) {
    setStatus(key);
    setSelectedIds(new Set());
  }

  // ออก selection mode
  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  // toggle select order เดียว
  function handleToggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // เลือก/ยกเลิกทั้งหมดใน tab ปัจจุบัน
  function handleSelectAll() {
    if (selectedIds.size === displayedOrders.length) {
      setSelectedIds(new Set()); // ยกเลิกทั้งหมด
    } else {
      setSelectedIds(new Set(displayedOrders.map((o) => o.id)));
    }
  }

  // อัปเดต is_printed ใน state ทันที (ไม่ต้อง refetch)
  function handlePrinted(orderId) {
    setAllOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, is_printed: true, printed_at: new Date().toISOString() }
          : o
      )
    );
  }

  // ปริ้นหลายรายการต่อเนื่อง
  async function handleBulkPrint() {
    const ids = [...selectedIds];
    let successCount = 0;

    for (const id of ids) {
      // iOS Safari fix: window.open() ต้องเรียกก่อน await ทุกครั้ง
      const w = window.open('', '_blank');
      if (!w) {
        alert(`กรุณาอนุญาต popup — ปริ้นได้ ${successCount}/${ids.length} รายการ`);
        break;
      }
      try {
        w.document.write('<p style="padding:20px;font-family:sans-serif">กำลังโหลด...</p>');
        const res = await sellerApi.get(`/orders/${id}/print`);
        w.document.open();
        w.document.write(res.data);
        w.document.close();
        successCount++;
        handlePrinted(id); // อัปเดต indicator ทันที
      } catch {
        w.close();
      }
      // หน่วงเล็กน้อยระหว่าง popup (browser บางตัวต้องการ)
      await new Promise((r) => setTimeout(r, 300));
    }

    exitSelectionMode();
  }

  async function handleAction(orderId, action) {
    if (action === 'reject') {
      if (!window.confirm(t('seller.confirm_reject'))) return;
    }
    setActLoad(orderId);
    try {
      await sellerApi.post(`/orders/${orderId}/${action}`);
      await loadOrders();
    } catch (e) {
      alert(e.response?.data?.message || t('common.error'));
    } finally {
      setActLoad(null);
    }
  }

  const allSelected = displayedOrders.length > 0 && selectedIds.size === displayedOrders.length;

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Top bar — paddingRight เผื่อพื้นที่กระดิ่งแจ้งเตือน (fixed top:16 right:16 width:38px) ไม่ให้ทับปุ่มขวาสุด */}
      <div className="top-bar" style={{ paddingRight: 60 }}>
        <span className="top-bar-title">{t('seller.orders')}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={loadOrders}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
          >
            🔄
          </button>
          {/* ปุ่ม "เลือกปริ้น" — แสดงเฉพาะตอนไม่ได้อยู่ใน selection mode
              ตอน selection mode → ปุ่มย้ายไปอยู่ใน action bar แทน */}
          {!selectionMode && (
            <button
              onClick={() => setSelectionMode(true)}
              style={{
                background: 'white', border: '1px solid #2D9B6E',
                color: '#2D9B6E', borderRadius: 8,
                padding: '5px 10px', fontSize: 12,
                cursor: 'pointer', fontFamily: 'var(--font-main)',
              }}
            >
              ☑️ เลือกปริ้น
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs + badge count */}
      <div
        style={{
          display: 'flex', gap: 6, padding: '12px 16px',
          background: 'white', borderBottom: '0.5px solid var(--color-border)',
          overflowX: 'auto',
        }}
      >
        {STATUS_TABS.map((tab) => {
          const badgeStatuses = TAB_BADGE_STATUSES[tab.key];
          const count = badgeStatuses
            ? badgeStatuses.reduce((sum, s) => sum + (counts[s] || 0), 0)
            : 0;
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleSetStatus(tab.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '6px 13px', borderRadius: 20, border: 'none',
                background: isActive ? 'var(--color-primary)' : 'var(--color-bg)',
                color: isActive ? 'white' : 'var(--color-text-sub)',
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', fontFamily: 'var(--font-main)', whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {t(tab.labelKey)}
              {count > 0 && (
                <span style={{
                  background: '#E53E3E', color: 'white', borderRadius: '50%',
                  fontSize: 10, minWidth: 16, height: 16,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, lineHeight: 1, flexShrink: 0,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection action bar — แสดงเฉพาะใน selection mode
          รวม: เลือกทั้งหมด | counter | ปุ่มปริ้น | ปุ่มยกเลิก (ย้ายมาจาก top bar) */}
      {selectionMode && (
        <div style={{
          display: 'flex', gap: 8, padding: '8px 16px',
          background: '#f0faf5', borderBottom: '1px solid #d1ebe0',
          alignItems: 'center',
        }}>
          <button
            onClick={handleSelectAll}
            style={{
              background: 'white', border: '1px solid #2D9B6E',
              color: '#2D9B6E', borderRadius: 8,
              padding: '6px 10px', fontSize: 12,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
              flexShrink: 0,
            }}
          >
            {allSelected ? '☑ ยกเลิกทั้งหมด' : '☐ เลือกทั้งหมด'}
          </button>
          <span style={{ fontSize: 12, color: '#555', flex: 1 }}>
            {selectedIds.size > 0 ? `เลือก ${selectedIds.size} รายการ` : ''}
          </span>
          <button
            onClick={handleBulkPrint}
            disabled={selectedIds.size === 0}
            style={{
              background: selectedIds.size > 0 ? '#2D9B6E' : '#ccc',
              color: 'white', border: 'none', borderRadius: 8,
              padding: '6px 12px', fontSize: 12,
              cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-main)', fontWeight: 600,
              flexShrink: 0,
            }}
          >
            🖨 ปริ้น{selectedIds.size > 0 ? ` ${selectedIds.size} รายการ` : ''}
          </button>
          <button
            onClick={exitSelectionMode}
            style={{
              background: '#E53E3E', color: 'white', border: 'none',
              borderRadius: 8, padding: '6px 12px', fontSize: 12,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
              flexShrink: 0,
            }}
          >
            ✕ ยกเลิก
          </button>
        </div>
      )}

      {/* Order list */}
      <div style={{ padding: 16 }}>
        {loading ? (
          <div className="loading-center">⏳ {t('common.loading')}…</div>
        ) : displayedOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div>{t('seller.no_orders')}</div>
          </div>
        ) : (
          displayedOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAction={handleAction}
              actionLoading={actionLoading}
              onPrinted={handlePrinted}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(order.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
