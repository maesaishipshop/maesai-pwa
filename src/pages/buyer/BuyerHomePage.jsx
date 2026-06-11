// src/pages/buyer/BuyerHomePage.jsx
// Browse products — search + category filter + product grid → detail page

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import buyerApi from '../../api/buyer.api';
import BuyerProductDetailPage from './BuyerProductDetailPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

function toImgUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BACKEND_URL}${path}`;
}

/* ── Product Card ────────────────────────────────── */
function ProductCard({ product, onClick }) {
  const { t } = useTranslation();
  const imgUrl = toImgUrl(product.primary_image);
  const name   = product.name_th || product.name_en || product.name_my || '—';
  const stock  = Number(product.stock || 0);

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '0.5px solid var(--color-border)',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Image */}
      <div
        style={{
          height: 130,
          background: 'var(--color-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div
          style={{
            display: imgUrl ? 'none' : 'flex',
            fontSize: 36, color: 'var(--color-text-hint)',
            width: '100%', height: '100%',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          📦
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div
          style={{
            fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 2 }}>
          {product.shop_name || product.seller_name || ''}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>
            ฿{Number(product.price || 0).toLocaleString()}/{product.unit || 'unit'}
          </span>
          {stock === 0 && (
            <span style={{ fontSize: 10, color: 'var(--color-danger)', fontWeight: 600 }}>
              {t('product.out_of_stock')}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 3 }}>
          MOQ: {product.moq} {product.unit}
        </div>
      </div>
    </div>
  );
}

/* ── Main BuyerHomePage ──────────────────────────── */
export default function BuyerHomePage({ profile, onViewOrder, onChatSeller, onOpenChatRoom, onNavigate }) {
  const { t } = useTranslation();
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchIn]  = useState('');
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat]   = useState('');
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);
  const [selectedProduct, setSelected] = useState(null); // product id → show detail
  const searchTimer                 = useRef(null);
  const chipsRef                    = useRef(null);

  const scrollChips = (dir) => {
    chipsRef.current?.scrollBy({ left: dir * 150, behavior: 'smooth' });
  };

  /* ── Load categories once ────────────────────── */
  useEffect(() => {
    buyerApi.get('/products/categories')
      .then((r) => {
        const cats = r.data.categories || r.data.data || r.data || [];
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch(() => setCategories([]));
  }, []);

  /* ── Load products ───────────────────────────── */
  const loadProducts = useCallback(async (pageNum = 1, replace = true) => {
    setLoading(true);
    try {
      const res = await buyerApi.get('/products', {
        params: {
          search:   search   || undefined,
          category: activeCat || undefined, // แก้: category_id → category
          page:     pageNum,
          limit:    20,
        },
      });
      const list  = res.data.products || res.data.data || res.data || [];
      const total = res.data.count || res.data.total || list.length;
      setProducts((prev) => replace ? list : [...prev, ...list]);
      setPage(pageNum);
      setHasMore((pageNum * 20) < total);
    } catch {
      if (replace) setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeCat]);

  useEffect(() => { loadProducts(1, true); }, [loadProducts]);

  /* ── Debounced search ────────────────────────── */
  function handleSearchChange(e) {
    const v = e.target.value;
    setSearchIn(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(v), 400);
  }

  /* ── Product detail selected ─────────────────── */
  if (selectedProduct) {
    return (
      <BuyerProductDetailPage
        productId={selectedProduct}
        onBack={() => setSelected(null)}
        onOrderPlaced={(orderId) => {
          setSelected(null);
          onViewOrder(orderId);
        }}
        onChatSeller={onChatSeller}
        onOpenChatRoom={onOpenChatRoom}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div className="top-bar">
        <span className="top-bar-title">{t('landing.buyer')} 🛍️</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Greeting */}
      {profile?.full_name && (
        <div style={{ padding: '10px 16px 0', fontSize: 13, color: 'var(--color-text-sub)' }}>
          สวัสดี, {profile.full_name} 👋
        </div>
      )}

      {/* Search */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>
            🔍
          </span>
          <input
            type="search"
            placeholder={t('buyer.search_placeholder')}
            value={searchInput}
            onChange={handleSearchChange}
            style={{
              width: '100%', padding: '10px 12px 10px 36px',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              fontSize: 14, fontFamily: 'var(--font-main)',
              background: 'white', boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Category chips — wrapper ที่ซ้อนปุ่มลูกศร */}
      <div style={{ position: 'relative' }}>

        {/* ปุ่มซ้าย — ซ่อนบน mobile (< 480px) */}
        <button
          onClick={() => scrollChips(-1)}
          style={{
            display: window.innerWidth < 480 ? 'none' : 'flex',
            position: 'absolute', left: 4, top: '50%',
            transform: 'translateY(-50%)', zIndex: 2,
            alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: '50%',
            border: '1px solid var(--color-border)',
            background: 'white', cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            fontSize: 14, color: 'var(--color-text-sub)',
            fontFamily: 'var(--font-main)',
          }}
          aria-label="scroll left"
        >
          ‹
        </button>

        {/* chip row */}
        <div
          ref={chipsRef}
          className="scroll-x"
          style={{
            display: 'flex', gap: 8, padding: '12px 16px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch', // iOS smooth momentum scroll
            scrollbarWidth: 'none',           // Firefox
          }}
        >
          <button
            onClick={() => setActiveCat('')}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none',
              background: activeCat === '' ? 'var(--color-primary)' : 'var(--color-bg)',
              color: activeCat === '' ? 'white' : 'var(--color-text-sub)',
              fontSize: 12, fontWeight: activeCat === '' ? 600 : 400,
              cursor: 'pointer', fontFamily: 'var(--font-main)', whiteSpace: 'nowrap',
            }}
          >
            {t('buyer.all_categories')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCat(String(cat.id));
              }}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none',
                background: activeCat === String(cat.id) ? 'var(--color-primary)' : 'var(--color-bg)',
                color: activeCat === String(cat.id) ? 'white' : 'var(--color-text-sub)',
                fontSize: 12, fontWeight: activeCat === String(cat.id) ? 600 : 400,
                cursor: 'pointer', fontFamily: 'var(--font-main)', whiteSpace: 'nowrap',
              }}
            >
              {cat.icon ? `${cat.icon} ` : ''}{cat.name_th || cat.name_en || cat.name_my || `Cat ${cat.id}`}
            </button>
          ))}
        </div>

        {/* ปุ่มขวา — ซ่อนบน mobile (< 480px) */}
        <button
          onClick={() => scrollChips(1)}
          style={{
            display: window.innerWidth < 480 ? 'none' : 'flex',
            position: 'absolute', right: 4, top: '50%',
            transform: 'translateY(-50%)', zIndex: 2,
            alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: '50%',
            border: '1px solid var(--color-border)',
            background: 'white', cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            fontSize: 14, color: 'var(--color-text-sub)',
            fontFamily: 'var(--font-main)',
          }}
          aria-label="scroll right"
        >
          ›
        </button>

      </div>

      {/* Product grid */}
      <div style={{ padding: '0 16px' }}>
        {loading && products.length === 0 ? (
          <div className="loading-center">⏳ {t('common.loading')}…</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div>{t('buyer.no_products')}</div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onClick={() => setSelected(p.id)}
                />
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => loadProducts(page + 1, false)}
                disabled={loading}
                style={{
                  display: 'block', width: '100%', marginTop: 16,
                  padding: '12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'white', color: 'var(--color-text-sub)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-main)',
                }}
              >
                {loading ? t('common.loading') + '…' : '+ โหลดเพิ่มเติม'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
