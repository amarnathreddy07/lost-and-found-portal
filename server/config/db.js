const mongoose = require('mongoose');

let connectionPromise;

async function connectDB(uri) {
  mongoose.set('strictQuery', true);

  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
  }

  try {
    await connectionPromise;
  } catch (error) {
    connectionPromise = undefined;
    throw error;
  }

  console.log('[db] MongoDB connected');
  return mongoose.connection;
}

module.exports = { connectDB };
