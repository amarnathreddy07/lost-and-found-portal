function cleanString(value) {
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim();
}

function sanitizeValue(value, key = '') {
  if (key === 'password') return value;
  if (typeof value === 'string') return cleanString(value);
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry));
  if (value && typeof value === 'object') return sanitizeObject(value);
  return value;
}

function sanitizeObject(source) {
  const output = {};
  for (const [key, value] of Object.entries(source || {})) {
    output[key] = sanitizeValue(value, key);
  }
  return output;
}

function sanitizeInput(req, _res, next) {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
}

module.exports = { sanitizeInput, sanitizeObject, cleanString };
