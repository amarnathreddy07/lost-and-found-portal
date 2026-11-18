const mongoose = require('mongoose');

async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000
  });
  console.log('[db] MongoDB connected');
  return mongoose.connection;
}

module.exports = { connectDB };
