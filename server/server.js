const app = require('./app');
const { connectDB } = require('./config/db');
const { seedDatabase } = require('./utils/seed');

const PORT = Number(process.env.PORT) || 5000;

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
