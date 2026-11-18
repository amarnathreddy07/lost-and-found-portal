const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectDB } = require('./config/db');
const { uploadDir } = require('./config/upload');
const { sanitizeInput } = require('./middleware/sanitize');
const errorHandler = require('./middleware/errorHandler');
const { seedDatabase } = require('./utils/seed');

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const claimRoutes = require('./routes/claims');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const clientDir = path.join(__dirname, '..', 'client');

fs.mkdirSync(uploadDir, { recursive: true });

const allowedOrigins = String(process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeInput);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Campus Lost and Found API is running.', uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/admin', adminRoutes);

app.use('/uploads', express.static(uploadDir, { fallthrough: true }));
app.use(express.static(clientDir));

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.use(errorHandler);

async function start() {
  try {
    await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sai-university-lost-found');
    if (process.env.SEED_ON_START !== 'false') await seedDatabase();
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
