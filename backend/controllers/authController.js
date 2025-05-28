import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateToken, generateRefreshToken } from '../middleware/auth.js';
import { AppError, ValidationError } from '../errors/index.js';
import logger from '../utils/logger.js';
import prisma from '../db/index.js';

/**
 * Register a new user
 */
export const register = async(req, res, next) => {
  try {
    const { email, password, name, username: bodyUsername, firstName, lastName } = req.body;

    const finalUsername = bodyUsername || name;

    if (!finalUsername) {
      throw new ValidationError('Username or name is required', 'username');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: finalUsername.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new AppError('Email already registered', 409);
      } else {
        throw new AppError('Username already taken', 409);
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const createdUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: finalUsername.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: 'user' // Default role
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    });

    // Generate tokens
    const tokenPayload = {
      id: createdUser.id,
      email: createdUser.email,
      username: createdUser.username,
      role: createdUser.role
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: createdUser.id });

    logger.info(`[auth] User registered successfully: ${createdUser.email} (${createdUser.id})`);

    const userForResponse = { ...createdUser, name: createdUser.username };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userForResponse,
        token: accessToken, // Include both for backward compatibility
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
export const login = async(req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logger.warn(`[auth] Failed login attempt for ${email} from ${req.ip}`);
      throw new AppError('Invalid email or password', 401);
    }

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user.id });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    const userForResponse = { ...userWithoutPassword, name: userWithoutPassword.username };


    logger.info(`[auth] User logged in successfully: ${user.email} (${user.id})`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userForResponse,
        token: accessToken, // Include both for backward compatibility
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async(req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token required', 'refreshToken');
    }

    // Verify refresh token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT configuration error', 500);
    }

    const decoded = jwt.verify(refreshToken, secret);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Generate new tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    };

    const newAccessToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken({ id: user.id });

    logger.info(`[auth] Token refreshed for user: ${user.email} (${user.id})`);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newAccessToken, // Include both for backward compatibility
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired refresh token', 401));
    }
    next(error);
  }
};

/**
 * Get current user profile
 */
export const getProfile = async(req, res, next) => {
  try {
    const userFromDb = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!userFromDb) {
      throw new AppError('User not found', 404);
    }

    const userForResponse = { ...userFromDb, name: userFromDb.username };

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: userForResponse
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
export const updateProfile = async(req, res, next) => {
  try {
    const { firstName, lastName, username } = req.body;
    const userId = req.user.id;

    // Check if username is taken by another user
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: username.toLowerCase(),
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        throw new ValidationError('Username already taken', 'username', username);
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(username && { username: username.toLowerCase() })
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        updatedAt: true
      }
    });

    logger.info(`[auth] Profile updated for user: ${updatedUser.email} (${updatedUser.id})`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
export const logout = async(req, res, next) => {
  try {
    // In a real application, you would invalidate the refresh token here.
    // For example, by removing it from a database of active refresh tokens.
    // For simplicity, we'll just send a success message.
    logger.info(`[auth] User logged out: ${req.user?.email} (${req.user?.id})`);
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};
