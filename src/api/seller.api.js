// src/api/seller.api.js
// Maesai Market — Seller Axios Instance
// Token เก็บใน memory (ไม่ใช้ localStorage เพื่อความปลอดภัย)
// Cookie httpOnly ใช้สำหรับ refresh token
// baseURL ชี้ตรงไป backend เพื่อข้าม setupProxy (CORS เปิดรับ localhost:3001 แล้ว)

import axios from 'axios';

// Proxy ใน dev: React dev server (3001) forward /api → backend (3000)
// ทำให้ browser เห็นเป็น same-origin → cookie SameSite=Lax ทำงานได้
const API_BASE = process.env.REACT_APP_API_URL || '/api';

/* ─── In-memory token storage ─────────────────────── */
let _accessToken = null;

export function setToken(token) { _accessToken = token; }
export function clearToken()    { _accessToken = null; }
export function getToken()      { return _accessToken; }

/* ─── Axios instance ──────────────────────────────── */
const sellerApi = axios.create({
  baseURL:         API_BASE,
  withCredentials: true,   // ส่ง httpOnly cookie refresh token
  timeout:         15000,
});

/* ─── REQUEST interceptor: ใส่ Authorization header ── */
sellerApi.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers['Authorization'] = `Bearer ${_accessToken}`;
  }
  return config;
});

/* ─── RESPONSE interceptor: 401 → refresh → retry ── */
let _refreshing = false;
let _queue = [];

function processQueue(error, token = null) {
  _queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  _queue = [];
}

sellerApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Bug #3 fix: ข้าม refresh interceptor สำหรับ auth endpoints
    // เพื่อป้องกัน login fail (401) แล้ว interceptor พยายาม refresh ซ้อน (401 loop)
    // ครอบคลุมทั้ง full URL และ relative URL ที่ axios อาจส่งมา
    const reqUrl = original.url || '';
    const isAuthEndpoint =
      reqUrl.includes('/auth/') ||
      reqUrl.includes('/auth/seller') ||
      reqUrl.includes('/seller/login') ||
      reqUrl.includes('/seller/register') ||
      reqUrl.includes('/seller/refresh');

    // 401 + ยังไม่เคย retry + ไม่ใช่ auth endpoint
    if (err.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (_refreshing) {
        // รอ refresh ที่กำลังทำอยู่
        return new Promise((resolve, reject) => {
          _queue.push({ resolve, reject });
        }).then((token) => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return sellerApi(original);
        });
      }

      original._retry = true;
      _refreshing = true;

      try {
        const res = await axios.post(
          '/api/auth/seller/refresh',
          {},
          { withCredentials: true }
        );
        // Bug fix: backend ส่ง { success, data: { accessToken } } → ต้องอ่าน data.data.accessToken
        const newToken = res.data?.data?.accessToken || res.data?.accessToken;
        setToken(newToken);
        processQueue(null, newToken);
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return sellerApi(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearToken();
        // แจ้ง App ให้ logout
        window.dispatchEvent(new CustomEvent('seller:logout'));
        return Promise.reject(refreshErr);
      } finally {
        _refreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default sellerApi;
