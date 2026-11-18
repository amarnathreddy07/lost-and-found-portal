const ApiError = require('../utils/ApiError');

function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong. Please try again.';
  let details = err.details;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid data supplied.';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'record';
    message = field === 'item' && Object.keys(err.keyPattern || {}).includes('claimant')
      ? 'You have already submitted a claim for this item.'
      : `This ${field} is already in use.`;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier.';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = `Image must be smaller than ${process.env.UPLOAD_MAX_MB || 5} MB.`;
  } else if (err.message && err.message.startsWith('Only PNG')) {
    statusCode = 400;
  }

  if (statusCode >= 500) console.error('[error]', err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {})
  });
}

module.exports = errorHandler;
