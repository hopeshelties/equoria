const request = require('supertest');
const app = require('../../backend/app'); // Path to your Express app
const pool = require('../../backend/db'); // Path to your db connection pool

// Helper function to reset the database using schema.sql
// This might need to be more sophisticated depending on your setup,
// e.g., running the SQL file via a script or directly with pg
const resetDatabase = async () => {
  // For now, we'll assume a simple way to clear tables relevant to breeds
  // Ideally, you'd re-run your schema.sql or use a migration tool
  try {
    await pool.query('DELETE FROM public.horses;'); // Clear horses first due to FK
    await pool.query('DELETE FROM public.breeds;');
  } catch (error) {
    console.error('Error resetting database for tests:', error);
    // It's crucial that tests can reset state. If this fails, tests are unreliable.
    // Depending on test runner setup, might want to throw to halt tests.
  }
};

describe('Breeds API - /api/breeds', () => {
  beforeAll(async () => {
    // Setup database connection if not already handled by app start
    // For example, if your app.js doesn't immediately connect.
    // In our case, db is initialized in server.js, but tests use app.js
    // and pool is directly imported.
  });

  beforeEach(async () => {
    // Reset database before each test to ensure isolation
    await resetDatabase();
  });

  afterAll(async () => {
    // Close database connection
    await pool.end();
  });

  describe('POST /api/breeds', () => {
    it('should create a new breed and return 201 status with the created breed', async () => {
      const newBreed = { name: 'Arabian' };
      const response = await request(app)
        .post('/api/breeds')
        .send(newBreed);
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newBreed.name);

      // Verify the breed was actually inserted into the database
      const dbResult = await pool.query('SELECT * FROM public.breeds WHERE id = $1', [response.body.id]);
      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].name).toBe(newBreed.name);
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/breeds')
        .send({});
      expect(response.statusCode).toBe(400);
      // Optionally, check for a specific error message if your API returns one
      // expect(response.body.message).toBe('Name is required');
    });

    it('should return 400 if name is not a string or empty', async () => {
      const response = await request(app)
        .post('/api/breeds')
        .send({ name: '' });
      expect(response.statusCode).toBe(400);

      const response2 = await request(app)
        .post('/api/breeds')
        .send({ name: 123 });
      expect(response2.statusCode).toBe(400);
    });

    it('should return 409 if breed name already exists (case-insensitive)', async () => {
      // First, create a breed
      await request(app).post('/api/breeds').send({ name: 'Thoroughbred' });
      
      // Attempt to create it again
      const response = await request(app)
        .post('/api/breeds')
        .send({ name: 'Thoroughbred' });
      expect(response.statusCode).toBe(409);

      // Attempt to create with different casing
      const response2 = await request(app)
        .post('/api/breeds')
        .send({ name: 'thoroughbred' });
      expect(response2.statusCode).toBe(409);
    });
  });

  describe('GET /api/breeds', () => {
    it('should return an array of breeds and 200 status', async () => {
      // Pre-populate some data
      await request(app).post('/api/breeds').send({ name: 'Quarter Horse' });
      await request(app).post('/api/breeds').send({ name: 'Morgan' });

      const response = await request(app).get('/api/breeds');
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body.some(b => b.name === 'Quarter Horse')).toBe(true);
      expect(response.body.some(b => b.name === 'Morgan')).toBe(true);
    });

    it('should return an empty array and 200 status if no breeds exist', async () => {
      const response = await request(app).get('/api/breeds');
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/breeds/:id', () => {
    it('should return a single breed by id and 200 status', async () => {
      const postRes = await request(app).post('/api/breeds').send({ name: 'Appaloosa' });
      const breedId = postRes.body.id;

      const response = await request(app).get(`/api/breeds/${breedId}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('id', breedId);
      expect(response.body.name).toBe('Appaloosa');
    });

    it('should return 404 if breed with id does not exist', async () => {
      const nonExistentId = 99999;
      const response = await request(app).get(`/api/breeds/${nonExistentId}`);
      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if id is not a valid integer', async () => {
      const invalidId = 'abc';
      const response = await request(app).get(`/api/breeds/${invalidId}`);
      expect(response.statusCode).toBe(400);
    });
  });
}); 