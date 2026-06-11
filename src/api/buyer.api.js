// src/api/buyer.api.js
// Maesai Market — Buyer Axios Instance
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
const buyerApi = axios.create({
  baseURL:         API_BASE,
  withCredentials: true,
  timeout:         15000,
});

/* ─── REQUEST interceptor ─────────────────────────── */
buyerApi.interceptors.request.use((config) => {
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

buyerApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Bug fix: ข้าม refresh interceptor สำหรับ auth endpoints
    // ใช้ทั้ง includes('/auth/') และ explicit list
    // เพื่อรองรับกรณี axios ส่ง full URL หรือ relative URL
    const reqUrl = original.url || '';
    const isAuthEndpoint =
      reqUrl.includes('/auth/') ||
      reqUrl.includes('/buyer/login') ||
      reqUrl.includes('/buyer/register') ||
      reqUrl.includes('/buyer/refresh');

    if (err.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (_refreshing) {
        return new Promise((resolve, reject) => {
          _queue.push({ resolve, reject });
        }).then((token) => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return buyerApi(original);
        });
      }

      original._retry = true;
      _refreshing = true;

      try {
        const res = await axios.post(
          '/api/auth/buyer/refresh',
          {},
          { withCredentials: true }
        );
        // Bug fix: backend ส่ง { success, data: { accessToken } }
        // ต้องอ่าน res.data.data.accessToken ไม่ใช่ res.data.accessToken
        const newToken = res.data.data?.accessToken || res.data.accessToken;
        setToken(newToken);
        processQueue(null, newToken);
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return buyerApi(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearToken();
        window.dispatchEvent(new CustomEvent('buyer:logout'));
        return Promise.reject(refreshErr);
      } finally {
        _refreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default buyerApi;
