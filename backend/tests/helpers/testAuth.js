import { generateTestToken } from './authHelper.js';

/**
 * Add authentication headers to a supertest request object
 */
export const withAuth = (supertestRequest, userData = {}) => {
  const token = generateTestToken(userData);
  return supertestRequest.set('Authorization', `Bearer ${token}`);
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
 * Add auth headers for the seeded test player to a supertest request object
 */
export const withSeededPlayerAuth = (supertestRequest) => {
  const token = getSeededPlayerToken();
  return supertestRequest.set('Authorization', `Bearer ${token}`);
};