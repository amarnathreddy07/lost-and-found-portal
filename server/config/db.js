const mongoose = require('mongoose');

let connectionPromise = null;

async function connectDB(uri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  mongoose.set('strictQuery', true);
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    }).then(() => {
      console.log('[db] MongoDB connected');
      return mongoose.connection;
    }).catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  return connectionPromise;
}

module.exports = { connectDB };
