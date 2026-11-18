const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters.'),
  body('email').isEmail().withMessage('Enter a valid email address.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('studentId').optional({ checkFalsy: true }).isLength({ max: 30 }).withMessage('Student ID is too long.'),
  body('phone').optional({ checkFalsy: true }).isLength({ max: 20 }).withMessage('Phone number is too long.')
];

const loginRules = [
  body('email').isEmail().withMessage('Enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.')
];

router.post('/register', registerRules, handleValidationErrors, authController.register);
router.post('/login', loginRules, handleValidationErrors, authController.login);
router.get('/me', protect, authController.me);
router.post('/logout', authController.logout);

module.exports = router;
