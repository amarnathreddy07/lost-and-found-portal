const express = require('express');
const { body, param } = require('express-validator');
const adminController = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.use(protect, requireAdmin);

router.get('/stats', adminController.stats);
router.get('/items', adminController.items);
router.get('/users', adminController.users);
router.patch('/users/:id/role', [
  param('id').isMongoId().withMessage('Invalid user identifier.'),
  body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin.')
], handleValidationErrors, adminController.updateRole);
router.delete('/users/:id', [
  param('id').isMongoId().withMessage('Invalid user identifier.')
], handleValidationErrors, adminController.removeUser);

module.exports = router;
