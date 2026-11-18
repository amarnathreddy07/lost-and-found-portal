const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const cookieParser = require('cookie-parser');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { uploadDir } = require('./config/upload');
const { sanitizeInput } = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const claimRoutes = require('./routes/claims');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const clientDir = path.join(__dirname, '..', 'client');

fs.mkdirSync(uploadDir, { recursive: true });

const allowedOrigins = [...new Set([
  ...String(process.env.CLIENT_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  process.env.URL,
  process.env.DEPLOY_PRIME_URL,
  `http://localhost:${PORT}`
].filter(Boolean))];

app.set('query parser', 'simple');
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use(apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Campus Lost and Found API is running.', uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/admin', adminRoutes);

const imageTypes = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif'
};

app.use('/uploads', express.static(uploadDir, {
  fallthrough: true,
  setHeaders(res, filePath) {
    const contentType = imageTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

app.use(express.static(clientDir, {
  setHeaders(res, filePath) {
    if (/\.(js|css|html)$/.test(filePath)) res.setHeader('Cache-Control', 'no-store');
  }
}));

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.use(errorHandler);

module.exports = app;
