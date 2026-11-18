const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function handleValidationErrors(req, _res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const details = errors.array().map((e) => ({ field: e.path || e.param, message: e.msg }));
  return next(new ApiError(400, 'Please correct the highlighted fields.', details));
}

module.exports = { handleValidationErrors };
