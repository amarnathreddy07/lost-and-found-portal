const express = require('express');
const { body, query, param } = require('express-validator');
const itemController = require('../controllers/itemController');
const Item = require('../models/Item');
const { protect, ownerOrAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const { upload } = require('../config/upload');

const router = express.Router();

const createRules = [
  body('title').isLength({ min: 3, max: 120 }).withMessage('Title must be 3-120 characters.'),
  body('type').isIn(Item.TYPES).withMessage('Type must be lost or found.'),
  body('category').isIn(Item.CATEGORIES).withMessage('Choose a valid category.'),
  body('description').isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters.'),
  body('location').isIn(Item.LOCATIONS).withMessage('Choose a valid campus location.'),
  body('date').isISO8601().withMessage('Provide a valid date.'),
  body('imageUrl').optional({ checkFalsy: true }).isURL({ require_tld: false }).withMessage('Image URL is invalid.')
];

const updateRules = [
  body('title').optional().isLength({ min: 3, max: 120 }).withMessage('Title must be 3-120 characters.'),
  body('type').optional().isIn(Item.TYPES).withMessage('Type must be lost or found.'),
  body('category').optional().isIn(Item.CATEGORIES).withMessage('Choose a valid category.'),
  body('description').optional().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters.'),
  body('location').optional().isIn(Item.LOCATIONS).withMessage('Choose a valid campus location.'),
  body('date').optional().isISO8601().withMessage('Provide a valid date.'),
  body('imageUrl').optional({ checkFalsy: true }).isURL({ require_tld: false }).withMessage('Image URL is invalid.')
];

const listRules = [
  query('type').optional().isIn(Item.TYPES).withMessage('Invalid type filter.'),
  query('category').optional().isIn(Item.CATEGORIES).withMessage('Invalid category filter.'),
  query('location').optional().isIn(Item.LOCATIONS).withMessage('Invalid location filter.'),
  query('status').optional().isIn(Item.STATUSES).withMessage('Invalid status filter.'),
  query('sort').optional().isIn(['newest', 'oldest', 'date_desc', 'date_asc', 'title_asc']).withMessage('Invalid sort option.')
];

const idRule = [param('id').isMongoId().withMessage('Invalid item identifier.')];

router.get('/', listRules, handleValidationErrors, itemController.list);
router.get('/mine', protect, itemController.mine);
router.get('/:id', idRule, handleValidationErrors, itemController.getById);

router.post('/', protect, upload.single('image'), createRules, handleValidationErrors, itemController.create);
router.put('/:id', protect, ownerOrAdmin, upload.single('image'), updateRules, handleValidationErrors, itemController.update);
router.patch('/:id/status', protect, ownerOrAdmin, [
  body('status').isIn(Item.STATUSES).withMessage('Invalid status.')
], handleValidationErrors, itemController.setStatus);
router.delete('/:id', protect, ownerOrAdmin, idRule, handleValidationErrors, itemController.remove);

module.exports = router;
