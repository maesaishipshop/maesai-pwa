// src/App.js
// Maesai Market — App Root
// Page-based routing (no react-router)

import React, { useState, useEffect, useCallback } from 'react';

import LandingPage        from './pages/common/LandingPage';
import SellerLoginPage    from './pages/seller/SellerLoginPage';
import SellerRegisterPage from './pages/seller/SellerRegisterPage';
import BuyerLoginPage     from './pages/buyer/BuyerLoginPage';
import BuyerRegisterPage  from './pages/buyer/BuyerRegisterPage';
import DriverLoginPage    from './pages/driver/DriverLoginPage';
import DriverRegisterPage from './pages/driver/DriverRegisterPage';
import AdminLoginPage     from './pages/admin/AdminLoginPage';
import SellerApp          from './pages/seller/SellerApp';
import BuyerApp           from './pages/buyer/BuyerApp';
import DriverApp          from './pages/driver/DriverApp';
import AdminApp           from './pages/admin/AdminApp';
import MaintenancePage    from './pages/common/MaintenancePage';

import sellerApi, { clearToken as clearSeller, setToken as setSellerApiToken } from './api/seller.api';
import buyerApi,  { clearToken as clearBuyer,  setToken as setBuyerApiToken  } from './api/buyer.api';
import driverApi, { clearToken as clearDriver, setToken as setDriverApiToken  } from './api/driver.api';
import adminApi,  { clearToken as clearAdmin,  setToken as setAdminApiToken   } from './api/admin.api';

/* ── Full-page Loading ───────────────────────────── */
function FullPageLoading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg)',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ fontSize: 32 }}>🌿</div>
      <p style={{ color: 'var(--color-text-hint)', fontSize: 14, fontFamily: 'var(--font-main)' }}>
        Maesai Market
      </p>
    </div>
  );
}

/* ComingSoon ลบออกแล้ว — ทุก role มี App component ครบแล้ว (Step 15-6) */

/* ── App ──────────────────────────────────────────── */
export default function App() {
  const [page,       setPage]       = useState('landing');
  const [isRestoring, setIsRestoring] = useState(true); // true = กำลัง restore session อยู่
  // Bug fix: เก็บ accessToken สำหรับ pass ให้ SellerApp / BuyerApp / DriverApp
  // ให้ socket.io connect หลังจาก token ถูก set แน่นอนแล้ว
  const [sellerToken, setSellerToken] = useState(null);
  const [buyerToken,  setBuyerToken]  = useState(null);
  const [driverToken, setDriverToken] = useState(null);
  const [adminToken,  setAdminToken]  = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  /* Navigate helper */
  function navigate(to) {
    setPage(to);
  }

  /* ── Restore session จาก httpOnly cookie เมื่อ reload ── */
  useEffect(() => {
    async function restoreSession() {
      // ลอง restore ทีละ role — role แรกที่มี valid refresh cookie จะได้เข้า app
      try {
        const res = await sellerApi.post('/auth/seller/refresh');
        const token = res.data?.data?.accessToken || res.data?.accessToken;
        if (token) {
          setSellerApiToken(token);
          setSellerToken(token);
          setPage('seller-app');
          setIsRestoring(false);
          return; // พบ session แล้ว ไม่ต้อง check role อื่น
        }
      } catch (_) {}

      try {
        const res = await buyerApi.post('/auth/buyer/refresh');
        const token = res.data?.data?.accessToken || res.data?.accessToken;
        if (token) {
          setBuyerApiToken(token);
          setBuyerToken(token);
          setPage('buyer-app');
          setIsRestoring(false);
          return;
        }
      } catch (_) {}

      try {
        const res = await driverApi.post('/auth/driver/refresh');
        const token = res.data?.data?.accessToken || res.data?.accessToken;
        if (token) {
          setDriverApiToken(token);
          setDriverToken(token);
          setPage('driver-app');
          setIsRestoring(false);
          return;
        }
      } catch (_) {}

      try {
        const res = await adminApi.post('/admin/refresh'); // admin ใช้ /admin/refresh (ไม่มี /auth/)
        const token = res.data?.data?.accessToken || res.data?.accessToken;
        if (token) {
          setAdminApiToken(token);
          setAdminToken(token);
          setPage('admin-app');
          setIsRestoring(false);
          return;
        }
      } catch (_) {}

      // ไม่พบ session ใด → กลับ landing
      setIsRestoring(false);
    }

    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Admin secret URL: ?ref=msmadmin2025 → ข้ามหน้า landing ไป admin-login ทันที */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ref') === 'Zw4Rk9mX2pQn7vLs') {
      setPage('admin-login');
    }
  }, []);

  /* ── Maintenance Mode check — รันครั้งเดียวตอน mount ── */
  useEffect(() => {
    fetch('/api/maintenance-status')
      .then(r => r.json())
      .then(data => { if (data.maintenance_mode) setMaintenanceMode(true); })
      .catch(() => {});
  }, []);

  /* Auto-logout event listeners */
  const handleLogout = useCallback((type) => {
    if (type === 'seller') clearSeller();
    if (type === 'buyer')  clearBuyer();
    if (type === 'driver') clearDriver();
    if (type === 'admin')  clearAdmin();
    setPage('landing');
  }, []);

  useEffect(() => {
    const onSeller = () => handleLogout('seller');
    const onBuyer  = () => handleLogout('buyer');
    const onDriver = () => handleLogout('driver');
    const onAdmin  = () => handleLogout('admin');

    window.addEventListener('seller:logout', onSeller);
    window.addEventListener('buyer:logout',  onBuyer);
    window.addEventListener('driver:logout', onDriver);
    window.addEventListener('admin:logout',  onAdmin);

    return () => {
      window.removeEventListener('seller:logout', onSeller);
      window.removeEventListener('buyer:logout',  onBuyer);
      window.removeEventListener('driver:logout', onDriver);
      window.removeEventListener('admin:logout',  onAdmin);
    };
  }, [handleLogout]);

  /* Login success: token already set inside login page, just navigate */
  // Bug fix: รับ token param เพื่อ pass ให้ SellerApp/BuyerApp/DriverApp (socket.io auth)
  function handleLoginSuccess(role, token) {
    if (role === 'seller' && token) setSellerToken(token);
    if (role === 'buyer'  && token) setBuyerToken(token);
    if (role === 'driver' && token) setDriverToken(token);
    if (role === 'admin'  && token) setAdminToken(token);
    setPage(`${role}-app`);
  }

  /* Back to landing and clear tokens */
  function handleBackToLanding() {
    setSellerToken(null);
    setBuyerToken(null);
    setDriverToken(null);
    setAdminToken(null);
    setPage('landing');
  }

  /* ── Render ──────────────────────────────────────── */
  // แสดง loading screen ระหว่าง restore session (ป้องกัน flash ไป landing แล้วค่อย redirect)
  if (isRestoring) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column' }}>
        <div style={{ fontSize: 40 }}>🛒</div>
        <p style={{ color: '#2D9B6E', fontFamily: 'Prompt, sans-serif', marginTop: 8 }}>Maesai Market</p>
      </div>
    );
  }

  /* ── Maintenance Mode render guard ──────────────────
     Admin ไม่ถูกบล็อก: page ขึ้นต้น 'admin', มี ?ref= ใน URL, หรือมี adminToken อยู่แล้ว */
  const isAdminSession = page.startsWith('admin') || window.location.search.includes('ref=') || !!adminToken;
  if (maintenanceMode && !isAdminSession) {
    return <MaintenancePage />;
  }

  if (page === 'landing') {
    return (
      <LandingPage
        onSelectRole={(role) => {
          navigate(`${role}-login`);
        }}
      />
    );
  }

  if (page === 'seller-login') {
    return (
      <SellerLoginPage
        navigate={navigate}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (page === 'seller-register') {
    return <SellerRegisterPage navigate={navigate} />;
  }

  if (page === 'buyer-login') {
    return (
      <BuyerLoginPage
        navigate={navigate}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (page === 'buyer-register') {
    return <BuyerRegisterPage navigate={navigate} />;
  }

  if (page === 'driver-login') {
    return (
      <DriverLoginPage
        navigate={navigate}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (page === 'driver-register') {
    return <DriverRegisterPage navigate={navigate} />;
  }

  if (page === 'admin-login') {
    return (
      <AdminLoginPage
        navigate={navigate}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  /* Seller App */
  if (page === 'seller-app') {
    // Bug fix: pass accessToken เป็น prop → SellerApp connect socket หลังได้ token แน่นอน
    return <SellerApp onLogout={handleBackToLanding} accessToken={sellerToken} />;
  }

  /* Buyer App */
  if (page === 'buyer-app') {
    return <BuyerApp onLogout={handleBackToLanding} accessToken={buyerToken} />;
  }

  /* Driver App */
  if (page === 'driver-app') {
    return <DriverApp onLogout={handleBackToLanding} accessToken={driverToken} />;
  }

  /* Admin App */
  if (page === 'admin-app') {
    return <AdminApp onLogout={handleBackToLanding} accessToken={adminToken} />;
  }

  /* Fallback */
  return (
    <LandingPage
      onSelectRole={(role) => {
        navigate(`${role}-login`);
      }}
    />
  );
}
