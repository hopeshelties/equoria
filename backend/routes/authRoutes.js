import express from 'express';
import { body } from 'express-validator';
import { register, login, refreshToken, logout, getProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/security.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register',
  // Rate limiting for auth endpoints
  authRateLimit,
  
  // Validation middleware
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  // Security middleware
  auditLog('user_registration', 'high'),
  
  // Controller
  register
);

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login',
  // Rate limiting for auth endpoints
  authRateLimit,
  
  // Validation middleware
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  // Security middleware
  auditLog('user_login', 'medium'),
  
  // Controller
  login
);

/**
 * POST /api/auth/refresh
 * Refresh JWT token using refresh token
 */
router.post('/refresh',
  // Rate limiting
  authRateLimit,
  
  // Validation middleware
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  
  // Security middleware
  auditLog('token_refresh', 'low'),
  
  // Controller
  refreshToken
);

/**
 * POST /api/auth/logout
 * Logout user (invalidate token on client side)
 */
router.post('/logout',
  // Authentication required
  authenticateToken,
  
  // Security middleware
  auditLog('user_logout', 'low'),
  
  // Controller
  logout
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me',
  // Authentication required
  authenticateToken,
  
  // Security middleware
  auditLog('profile_access', 'low'),
  
  // Controller
  getProfile
);

/**
 * POST /api/auth/change-password
 * Change user password (authenticated users only)
 */
router.post('/change-password',
  // Authentication required
  authenticateToken,
  
  // Rate limiting
  authRateLimit,
  
  // Validation middleware
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  // Security middleware
  auditLog('password_change', 'high'),
  
  // Controller (to be implemented)
  async (req, res) => {
    res.status(501).json({
      success: false,
      message: 'Password change functionality not yet implemented'
    });
  }
);

export default router; 