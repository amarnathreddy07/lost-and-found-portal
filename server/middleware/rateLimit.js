const rateLimit = require('express-rate-limit');

function clientKey(req) {
  return req.ip ||
    req.headers['x-nf-client-connection-ip'] ||
    String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';
}

function jsonHandler(req, res, _next, options) {
  res.status(options.statusCode).json({
    success: false,
    message: options.message || 'Too many requests. Please try again later.'
  });
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: clientKey,
  handler: jsonHandler,
  message: 'Too many sign-in attempts. Try again in 15 minutes.'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 400,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: clientKey,
  handler: jsonHandler,
  message: 'Too many requests. Try again in 15 minutes.'
});

module.exports = { authLimiter, apiLimiter };
