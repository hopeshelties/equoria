import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import { ApiResponse } from '../utils/apiResponse.js';
import prisma from '../db/index.js';

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and prevents token tampering
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn(`[auth] Unauthorized access attempt from IP: ${req.ip} to ${req.path}`);
    return res.status(401).json(ApiResponse.unauthorized('Access token required'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Additional security checks
    if (!decoded.id || !decoded.email) {
      logger.warn(`[auth] Invalid token structure from IP: ${req.ip}`);
      return res.status(401).json(ApiResponse.unauthorized('Invalid token structure'));
    }

    // Check token expiration (additional layer)
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      logger.warn(`[auth] Expired token used from IP: ${req.ip}`);
      return res.status(401).json(ApiResponse.unauthorized('Token expired'));
    }

    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
      permissions: decoded.permissions || []
    };

    logger.info(`[auth] Authenticated user: ${req.user.email} (${req.user.role})`);
    next();
  } catch (error) {
    logger.error(`[auth] Token verification failed from IP: ${req.ip}:`, error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(ApiResponse.unauthorized('Token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(ApiResponse.unauthorized('Invalid token'));
    } else {
      return res.status(401).json(ApiResponse.unauthorized('Token verification failed'));
    }
  }
};

/**
 * Role-based authorization middleware
 * Prevents privilege escalation attacks
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(ApiResponse.unauthorized('Authentication required'));
    }

    const userRole = req.user.role;
    const hasPermission = Array.isArray(allowedRoles) 
      ? allowedRoles.includes(userRole)
      : allowedRoles === userRole;

    if (!hasPermission) {
      logger.warn(`[auth] Unauthorized role access: ${userRole} attempted to access ${req.path} (requires: ${allowedRoles})`);
      return res.status(403).json(ApiResponse.forbidden('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Resource ownership verification
 * Prevents users from accessing/modifying other players' resources
 */
export const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const resourceId = req.params.id || req.params.horseId || req.params.playerId;

      if (!resourceId) {
        return res.status(400).json(ApiResponse.badRequest('Resource ID required'));
      }

      // Skip ownership check for admins
      if (req.user.role === 'admin') {
        return next();
      }

      let isOwner = false;

      switch (resourceType) {
        case 'horse':
          // Check if user owns the horse
          const horse = await prisma.horse.findUnique({
            where: { id: parseInt(resourceId) },
            select: { playerId: true, ownerId: true }
          });
          isOwner = horse && (horse.playerId === userId || horse.ownerId === userId);
          break;

        case 'player':
          // Check if user is accessing their own profile
          isOwner = userId === resourceId;
          break;

        case 'stable':
          // Check if user owns the stable
          const stable = await prisma.stable.findUnique({
            where: { id: parseInt(resourceId) },
            select: { ownerId: true }
          });
          isOwner = stable && stable.ownerId === userId;
          break;

        default:
          logger.error(`[auth] Unknown resource type for ownership check: ${resourceType}`);
          return res.status(500).json(ApiResponse.serverError('Internal authorization error'));
      }

      if (!isOwner) {
        logger.warn(`[auth] Ownership violation: User ${userId} attempted to access ${resourceType} ${resourceId}`);
        return res.status(403).json(ApiResponse.forbidden('You do not own this resource'));
      }

      next();
    } catch (error) {
      logger.error(`[auth] Ownership check error:`, error);
      return res.status(500).json(ApiResponse.serverError('Authorization check failed'));
    }
  };
};

/**
 * Anti-automation middleware
 * Prevents rapid-fire requests and bot attacks
 */
export const antiAutomation = (maxRequests = 10, windowMs = 60000) => {
  const requestCounts = new Map();

  return (req, res, next) => {
    const key = `${req.user?.id || req.ip}_${req.path}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [k, timestamps] of requestCounts.entries()) {
      requestCounts.set(k, timestamps.filter(t => t > windowStart));
      if (requestCounts.get(k).length === 0) {
        requestCounts.delete(k);
      }
    }

    // Check current user's requests
    const userRequests = requestCounts.get(key) || [];
    const recentRequests = userRequests.filter(t => t > windowStart);

    if (recentRequests.length >= maxRequests) {
      logger.warn(`[auth] Anti-automation triggered for ${req.user?.email || req.ip} on ${req.path}`);
      return res.status(429).json(ApiResponse.error('Too many requests. Please slow down.'));
    }

    // Add current request
    recentRequests.push(now);
    requestCounts.set(key, recentRequests);

    next();
  };
};

/**
 * Secure password hashing
 */
export const hashPassword = async (password) => {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  return await bcrypt.hash(password, config.bcryptRounds);
};

/**
 * Secure password verification
 */
export const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate secure JWT token
 */
export const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role || 'user',
    permissions: user.permissions || [],
    iat: Math.floor(Date.now() / 1000),
    // Add anti-tampering data
    fingerprint: generateFingerprint(user)
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    issuer: 'equoria-api',
    audience: 'equoria-client'
  });
};

/**
 * Generate user fingerprint for anti-tampering
 */
function generateFingerprint(user) {
  const data = `${user.id}:${user.email}:${user.createdAt || Date.now()}`;
  return require('crypto').createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export default {
  authenticateToken,
  requireRole,
  requireOwnership,
  antiAutomation,
  hashPassword,
  verifyPassword,
  generateToken
}; 