import { generateTestToken, authHeader } from './authHelper.js';

/**
 * Add authentication headers to a request for existing tests
 */
export const withAuth = (request, userData = {}) => {
  const token = generateTestToken(userData);
  return request.set('Authorization', `Bearer ${token}`);
};

/**
 * Create a test user token for the seeded player
 */
export const getSeededPlayerToken = () => {
  return generateTestToken({
    id: 'test-player-uuid-123',
    email: 'test@example.com',
    role: 'user'
  });
};

/**
 * Add auth headers for the seeded test player
 */
export const withSeededPlayerAuth = (request) => {
  const token = getSeededPlayerToken();
  return request.set('Authorization', `Bearer ${token}`);
}; 