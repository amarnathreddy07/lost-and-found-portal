const express = require('express');
const { body, query, param } = require('express-validator');
const itemController = require('../controllers/itemController');
const Item = require('../models/Item');
const { protect, ownerOrAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const { upload, verifyUploadedImage } = require('../config/upload');

const router = express.Router();

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Provide a valid date.');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('Provide a real calendar date.');
  }
  if (date.getTime() > Date.now()) throw new Error('Date cannot be in the future.');
  return true;
}

const dateRule = () => body('date').custom(isRealDate).withMessage('Provide a valid date.');
const imageUrlRule = () => body('imageUrl')
  .optional({ checkFalsy: true })
  .custom((value) => /^https?:\/\/[^\s"'<>]+$/i.test(String(value)) || /^\/uploads\/[\w.-]+$/.test(String(value)))
  .withMessage('Image URL is invalid.');

const createRules = [
  body('title').isLength({ min: 3, max: 120 }).withMessage('Title must be 3-120 characters.'),
  body('type').isIn(Item.TYPES).withMessage('Type must be lost or found.'),
  body('category').isIn(Item.CATEGORIES).withMessage('Choose a valid category.'),
  body('description').isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters.'),
  body('location').isIn(Item.LOCATIONS).withMessage('Choose a valid campus location.'),
  dateRule(),
  imageUrlRule()
];

const updateRules = [
  body('title').optional().isLength({ min: 3, max: 120 }).withMessage('Title must be 3-120 characters.'),
  body('type').optional().isIn(Item.TYPES).withMessage('Type must be lost or found.'),
  body('category').optional().isIn(Item.CATEGORIES).withMessage('Choose a valid category.'),
  body('description').optional().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters.'),
  body('location').optional().isIn(Item.LOCATIONS).withMessage('Choose a valid campus location.'),
  body('date').optional().custom(isRealDate).withMessage('Provide a valid date.'),
  imageUrlRule()
];

const listRules = [
  query('q').optional().isLength({ max: 100 }).withMessage('Search term is too long.'),
  query('type').optional().isIn(Item.TYPES).withMessage('Invalid type filter.'),
  query('category').optional().isIn(Item.CATEGORIES).withMessage('Invalid category filter.'),
  query('location').optional().isIn(Item.LOCATIONS).withMessage('Invalid location filter.'),
  query('status').optional().isIn(Item.STATUSES).withMessage('Invalid status filter.'),
  query('sort').optional().isIn(['newest', 'oldest', 'date_desc', 'date_asc', 'title_asc']).withMessage('Invalid sort option.'),
  query('page').optional().isInt({ min: 1, max: 10000 }).withMessage('Invalid page.'),
  query('limit').optional().isInt({ min: 1, max: 60 }).withMessage('Invalid limit.')
];

const idRule = [param('id').isMongoId().withMessage('Invalid item identifier.')];

router.get('/', listRules, handleValidationErrors, itemController.list);
router.get('/mine', protect, itemController.mine);
router.get('/:id', idRule, handleValidationErrors, itemController.getById);

router.post('/', protect, upload.single('image'), verifyUploadedImage, createRules, handleValidationErrors, itemController.create);
router.put('/:id', protect, idRule, handleValidationErrors, ownerOrAdmin(), upload.single('image'), verifyUploadedImage, updateRules, handleValidationErrors, itemController.update);
router.patch('/:id/status', protect, idRule, handleValidationErrors, ownerOrAdmin(), [
  body('status').isIn(Item.STATUSES).withMessage('Invalid status.')
], handleValidationErrors, itemController.setStatus);
router.delete('/:id', protect, idRule, handleValidationErrors, ownerOrAdmin(), itemController.remove);

module.exports = router;
