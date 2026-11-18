const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const universityEmail = body('email')
  .isEmail().withMessage('Enter a valid email address.')
  .matches(/^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*\.[A-Za-z]-\d{2}@[A-Za-z]+(?:-[A-Za-z]+)*\.saiuniversity\.edu\.in$/i).withMessage('Use name.initial-YY@department.saiuniversity.edu.in.');

const strongPassword = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
  .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/).withMessage('Password must include at least one letter and one number.');

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters.'),
  universityEmail,
  strongPassword,
  body('studentId').trim().notEmpty().withMessage('PRN is required.')
    .matches(/^\d+$/).withMessage('PRN must contain digits only.')
    .isLength({ max: 30 }).withMessage('PRN is too long.'),
  body('phone').optional({ checkFalsy: true }).isLength({ max: 20 }).withMessage('Phone number is too long.')
];

const loginRules = [
  body('email').isEmail().withMessage('Enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.')
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/).withMessage('New password must include a letter and a number.')
];

router.post('/register', authLimiter, registerRules, handleValidationErrors, authController.register);
router.post('/login', authLimiter, loginRules, handleValidationErrors, authController.login);
router.get('/me', protect, authController.me);
router.post('/change-password', protect, changePasswordRules, handleValidationErrors, authController.changePassword);
router.post('/logout', protect, authController.logout);

module.exports = router;
