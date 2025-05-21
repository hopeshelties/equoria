// Create a test file at tests/integration/ping.test.js
// Use supertest to test the GET /ping route

const request = require('supertest');
const app = require('../../backend/app'); // Adjusted path to backend/app.js

describe('GET /ping', () => {
  it('should return { message: "pong" }', async () => {
    const res = await request(app).get('/ping');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'pong' });
  });
}); 