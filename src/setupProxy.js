// src/setupProxy.js
// Proxy สำหรับ development — ส่ง request ไป backend port 3000

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Mount ที่ root ('/') แทนการ mount แยก path
  // เหตุผล: app.use('/uploads', proxy) ทำให้ Express strip prefix ออก
  //   → proxy ได้รับ /buyers/xxx.jpg แทน /uploads/buyers/xxx.jpg
  //   → backend ตอบ 404 "Cannot GET /buyers/"
  // วิธีแก้: mount ที่ root → Express ไม่ strip อะไร → full path ถูกส่งไป backend ครบ
  // pathFilter: กรองเฉพาะ path ที่ต้องการ proxy (ส่วนที่เหลือ → React dev server ตอบเอง)
  app.use(
    createProxyMiddleware({
      target:              'http://localhost:3000',
      changeOrigin:        true,
      cookieDomainRewrite: '',
      ws:                  true,   // รองรับ Socket.io WebSocket
      pathFilter: function(pathname) {
        return pathname.startsWith('/api') ||
               pathname.startsWith('/uploads') ||
               pathname.startsWith('/socket.io');
      },
    })
  );
};
