const express = require('express');
const { body, param, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const { csvUpload } = require('../config/upload');
const Item = require('../models/Item');

const router = express.Router();

router.use(protect, requireAdmin);

router.get('/stats', adminController.stats);
router.get('/items', [
  query('status').optional().isIn(Item.STATUSES).withMessage('Invalid status filter.'),
  query('type').optional().isIn(Item.TYPES).withMessage('Invalid type filter.')
], handleValidationErrors, adminController.items);
router.get('/users', adminController.users);
router.get('/users/preloaded', adminController.preloadedUsers);
router.post('/users', [
  body('email').isEmail().withMessage('Choose a valid preloaded email.')
], handleValidationErrors, adminController.createUser);
router.post('/users/import', csvUpload.single('file'), adminController.importUsers);
router.post('/users/:id/reset-password', [
  param('id').isMongoId().withMessage('Invalid user identifier.'),
  body('password').optional({ checkFalsy: true })
    .isLength({ min: 8 }).withMessage('Temporary password must be at least 8 characters.')
    .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/).withMessage('Temporary password must include a letter and a number.')
], handleValidationErrors, adminController.resetPassword);
router.patch('/users/:id/role', [
  param('id').isMongoId().withMessage('Invalid user identifier.'),
  body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin.')
], handleValidationErrors, adminController.updateRole);
router.delete('/users/:id', [
  param('id').isMongoId().withMessage('Invalid user identifier.')
], handleValidationErrors, adminController.removeUser);

module.exports = router;
