const express = require('express');
const { body, param } = require('express-validator');
const claimController = require('../controllers/claimController');
const { protect, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const Item = require('../models/Item');

const router = express.Router();

router.use(protect);

router.get('/', requireAdmin, claimController.all);
router.get('/mine', claimController.mine);
router.get('/received', claimController.received);
router.get('/item/:itemId', [
  param('itemId').isMongoId().withMessage('Invalid item identifier.')
], handleValidationErrors, claimController.forItem);

router.post('/', [
  body('itemId').isMongoId().withMessage('Select a valid item.'),
  body('proof').isLength({ min: 10, max: 1500 }).withMessage('Proof/notes must be 10-1500 characters.')
], handleValidationErrors, claimController.create);

router.patch('/:id/review', [
  param('id').isMongoId().withMessage('Invalid claim identifier.'),
  body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected.')
], handleValidationErrors, claimController.review);

router.get('/stats/values', requireAdmin, (_req, res) => {
  res.json({ success: true, categories: Item.CATEGORIES, locations: Item.LOCATIONS });
});

module.exports = router;
