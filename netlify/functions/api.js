const serverless = require('serverless-http');
const app = require('../../server/app');
const { connectDB } = require('../../server/config/db');
const { seedDatabase } = require('../../server/utils/seed');

let initialization;

async function initialize() {
  if (!initialization) {
    initialization = (async () => {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
        throw new Error('JWT_SECRET must be set to at least 16 characters.');
      }
      if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI must be set.');
      }

      await connectDB(process.env.MONGO_URI);

      if (process.env.SEED_ON_START === 'true') {
        await seedDatabase({ allowAdmin: false });
      }
    })();
  }

  try {
    await initialization;
  } catch (error) {
    initialization = undefined;
    throw error;
  }
}

const handler = serverless(app, {
  binary: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']
});

exports.handler = async (event, context) => {
  await initialize();
  return handler(event, context);
};
