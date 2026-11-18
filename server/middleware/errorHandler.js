const fs = require('fs');

function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong. Please try again.';
  let details = err.details;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid data supplied.';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    statusCode = 409;
    const keys = Object.keys(err.keyPattern || err.keyValue || {});
    const field = keys[0] || 'record';
    message = field === 'item' && keys.includes('claimant')
      ? 'You have already submitted a claim for this item.'
      : `This ${field} is already in use.`;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier.';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = `Image must be smaller than ${process.env.UPLOAD_MAX_MB || 5} MB.`;
    } else {
      message = 'Invalid upload. Send one image file using the "image" field.';
    }
  } else if (err.message && /Only valid PNG/.test(err.message)) {
    statusCode = 400;
  }

  if (statusCode >= 400 && req.file?.path) {
    fs.promises.unlink(req.file.path).catch(() => {});
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
    message = 'Something went wrong. Please try again.';
    details = undefined;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(typeof err.code === 'string' && err.code !== 'LIMIT_FILE_SIZE' ? { code: err.code } : {}),
    ...(details ? { details } : {})
  });
}

module.exports = errorHandler;
