// src/utils/imageUrl.js
// แปลง relative path จาก backend (เช่น /uploads/sellers/xxx.jpg) → full URL
//
// BACKEND_URL derive จาก REACT_APP_API_URL โดยตัด suffix "/api" ออก
// เพราะ REACT_APP_BACKEND_URL ไม่เคยถูกตั้งค่าในทุก env (รวม production)
// ถ้าใช้ BACKEND_URL='' ตรงๆ ใน production frontend/backend จะเป็นคนละ domain
// ทำให้ path /uploads/... ชี้ผิดไปที่ frontend domain (404)

const API_BASE = process.env.REACT_APP_API_URL || '/api';

export const BACKEND_URL = API_BASE.replace(/\/api\/?$/, '');

export function toImgUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${p}`;
}
