import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import { ApiResponse } from '../utils/apiResponse.js';
import prisma from '../db/index.js';

/**
 * Generate JWT token with user information
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role || 'user',
    fingerprint: Date.now() // Simple fingerprinting
  };
  
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn || '7d'
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    type: 'refresh'
  };
  
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtRefreshExpiresIn || '30d'
  });
};

/**
 * POST /api/auth/register
 * Register a new user account
 */
export const register = async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.badRequest('Validation failed', {
        errors: errors.array()
      }));
    }

    const { name, email, password } = req.body;
    
    logger.info(`[authController] Registration attempt for email: ${email}`);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      logger.warn(`[authController] Registration failed - email already exists: ${email}`);
      return res.status(409).json(ApiResponse.conflict('Email already registered'));
    }
    
    // Hash password
    const saltRounds = parseInt(config.bcryptRounds) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'user', // Default role
        isActive: true,
        createdAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    
    // Generate tokens
    const token = generateToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    
    logger.info(`[authController] User registered successfully: ${email} (ID: ${newUser.id})`);
    
    return res.status(201).json(ApiResponse.success(
      'User registered successfully',
      {
        user: newUser,
        token,
        refreshToken,
        expiresIn: config.jwtExpiresIn || '7d'
      }
    ));
    
  } catch (error) {
    logger.error('[authController] Registration error:', error);
    return res.status(500).json(ApiResponse.serverError('Registration failed'));
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
export const login = async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.badRequest('Validation failed', {
        errors: errors.array()
      }));
    }

    const { email, password } = req.body;
    
    logger.info(`[authController] Login attempt for email: ${email} from IP: ${req.ip}`);
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      logger.warn(`[authController] Login failed - user not found: ${email}`);
      return res.status(401).json(ApiResponse.unauthorized('Invalid email or password'));
    }
    
    // Check if user is active
    if (!user.isActive) {
      logger.warn(`[authController] Login failed - account disabled: ${email}`);
      return res.status(401).json(ApiResponse.unauthorized('Account is disabled'));
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      logger.warn(`[authController] Login failed - invalid password: ${email}`);
      return res.status(401).json(ApiResponse.unauthorized('Invalid email or password'));
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    
    // Generate tokens
    const userForToken = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    
    const token = generateToken(userForToken);
    const refreshToken = generateRefreshToken(userForToken);
    
    logger.info(`[authController] User logged in successfully: ${email} (ID: ${user.id})`);
    
    return res.status(200).json(ApiResponse.success(
      'Login successful',
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLoginAt: new Date()
        },
        token,
        refreshToken,
        expiresIn: config.jwtExpiresIn || '7d'
      }
    ));
    
  } catch (error) {
    logger.error('[authController] Login error:', error);
    return res.status(500).json(ApiResponse.serverError('Login failed'));
  }
};

/**
 * POST /api/auth/refresh
 * Refresh JWT token using refresh token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json(ApiResponse.badRequest('Refresh token is required'));
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwtSecret);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json(ApiResponse.unauthorized('Invalid refresh token'));
    }
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json(ApiResponse.unauthorized('User not found or inactive'));
    }
    
    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    logger.info(`[authController] Token refreshed for user: ${user.email}`);
    
    return res.status(200).json(ApiResponse.success(
      'Token refreshed successfully',
      {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: config.jwtExpiresIn || '7d'
      }
    ));
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json(ApiResponse.unauthorized('Invalid or expired refresh token'));
    }
    
    logger.error('[authController] Token refresh error:', error);
    return res.status(500).json(ApiResponse.serverError('Token refresh failed'));
  }
};

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
export const logout = async (req, res) => {
  try {
    logger.info(`[authController] User logged out: ${req.user?.email || 'unknown'}`);
    
    return res.status(200).json(ApiResponse.success(
      'Logout successful',
      { message: 'Please remove token from client storage' }
    ));
    
  } catch (error) {
    logger.error('[authController] Logout error:', error);
    return res.status(500).json(ApiResponse.serverError('Logout failed'));
  }
};

/**
 * GET /api/auth/me
 * Get current user profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json(ApiResponse.notFound('User not found'));
    }
    
    return res.status(200).json(ApiResponse.success(
      'Profile retrieved successfully',
      user
    ));
    
  } catch (error) {
    logger.error('[authController] Get profile error:', error);
    return res.status(500).json(ApiResponse.serverError('Failed to retrieve profile'));
  }
}; 