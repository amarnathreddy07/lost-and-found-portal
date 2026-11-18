const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const cookieParser = require('cookie-parser');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectDB } = require('./config/db');
const { uploadDir } = require('./config/upload');
const { sanitizeInput } = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');
const { seedDatabase } = require('./utils/seed');

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const claimRoutes = require('./routes/claims');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const rootDir = path.join(__dirname, '..');

fs.mkdirSync(uploadDir, { recursive: true });

const allowedOrigins = String(process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOrigin = allowedOrigins.length
  ? allowedOrigins
  : process.env.NODE_ENV === 'production'
    ? [`http://localhost:${PORT}`]
    : true;

app.set('query parser', 'simple');
app.use(cors({ origin: corsOrigin, credentials: true }));
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
const staticOptions = {
  setHeaders(res, filePath) {
    if (/\.(js|css|html)$/.test(filePath)) res.setHeader('Cache-Control', 'no-store');
  }
};

app.use('/css', express.static(path.join(rootDir, 'css'), staticOptions));
app.use('/js', express.static(path.join(rootDir, 'js'), staticOptions));
app.use('/assets', express.static(path.join(rootDir, 'assets'), staticOptions));

app.get('/styles.css', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(rootDir, 'styles.css'));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

function sendIndex(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(rootDir, 'index.html'));
}

app.get('/', sendIndex);
app.get('*', sendIndex);

app.use(errorHandler);

async function start() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
      throw new Error('JWT_SECRET must be set to at least 16 characters.');
    }

    await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sai-university-lost-found');

    const shouldSeed = process.env.SEED_ON_START === 'true' ||
      (process.env.NODE_ENV !== 'production' && process.env.SEED_ON_START !== 'false');
    if (shouldSeed) {
      await seedDatabase({ allowAdmin: process.env.NODE_ENV !== 'production' });
    }

    app.listen(PORT, () => {
      console.log(`[server] Portal ready at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[server] Startup failed:', error.message);
    process.exit(1);
  }
}

start();

module.exports = app;
