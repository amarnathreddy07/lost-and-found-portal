const express = require('express');
const { body, param, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const { csvUpload } = require('../config/upload');
const { UNIVERSITY_EMAIL_PATTERN } = require('../config/accounts');
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
const userDetailRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters.'),
  body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address.')
    .matches(UNIVERSITY_EMAIL_PATTERN).withMessage('Use name.initial-YY@department.saiuniversity.edu.in.'),
  body('studentId').trim().notEmpty().withMessage('PRN is required.').isLength({ max: 30 }).withMessage('PRN is too long.'),
  body('department').optional({ checkFalsy: true }).trim().isLength({ max: 40 }).withMessage('Department is too long.'),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).withMessage('Phone number is too long.')
];

router.post('/users', userDetailRules, handleValidationErrors, adminController.createUser);
router.patch('/users/:id', [
  param('id').isMongoId().withMessage('Invalid user identifier.'),
  ...userDetailRules
], handleValidationErrors, adminController.updateUser);
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
