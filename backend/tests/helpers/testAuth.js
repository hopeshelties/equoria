import { generateTestToken } from './authHelper.js';
import supertest from 'supertest';
import app from '../../app.js';
import { getSeededPlayerToken } from './testSeed.js';

/**
 * Add authentication headers to a supertest request object
 */
export const withAuth = (supertestRequest, userData = {}) => {
  const token = generateTestToken(userData);
  return supertestRequest.set('Authorization', `Bearer ${token}`);
};

/**
 * Creates a supertest request with auth headers for the seeded test player.
 * @param {string} method - The HTTP method (e.g., 'get', 'post').
 * @param {string} endpoint - The API endpoint (e.g., '/api/users').
 * @returns {object} A supertest request object with Authorization header set.
 */
export const withSeededPlayerAuth = (method, endpoint) => {
  const token = getSeededPlayerToken(); // Uses imported getSeededPlayerToken
  // Ensure 'method' is a valid property of supertest(app) (e.g., 'get', 'post')
  // and 'endpoint' is a string.
  if (typeof supertest(app)[method] !== 'function') {
    throw new Error(`Invalid HTTP method: ${method}`);
  }
  return supertest(app)[method](endpoint).set('Authorization', `Bearer ${token}`);
};

// USAGE EXAMPLE (INSIDE TEST):
// const response = await withSeededPlayerAuth('get', '/api/horses/trainable/somePlayerId');
