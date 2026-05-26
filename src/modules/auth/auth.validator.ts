import { body } from 'express-validator';

export const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('role')
    .optional()
    .isIn(['client', 'freelancer'])
    .withMessage('Role must be client or freelancer'),
];

export const loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const verifyOtpValidator = [
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

export const refreshTokenValidator = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];
