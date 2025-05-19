const request = require('supertest');
const { app, server: expressServer } = require('../../index'); // Import app and the potentially started server
const pool = require('../../config/db');
const { stopHealthScheduler } = require('../../utils/healthScheduler'); // Import the stop function
const bcrypt = require('bcryptjs'); // For creating test users
const jwt = require('jsonwebtoken'); // For creating auth tokens
// We might need bcrypt for creating users if tests require authenticated users
// const bcrypt = require('bcryptjs');
// We might need JWT for creating tokens if tests require authenticated users
// const jwt = require('jsonwebtoken');

describe('Store API Endpoints', () => {
    beforeAll(async () => {
        // Ensure NODE_ENV is 'test'
        process.env.NODE_ENV = 'test';
        // Any other one-time setup
    });

    beforeEach(async () => {
        // Clear relevant tables before each test for isolation
        try {
            await pool.pool.query('BEGIN'); // Start transaction
            // Clear tables in an order that respects foreign key constraints, or use TRUNCATE ... CASCADE
            await pool.pool.query('DELETE FROM conformation_ratings');
            await pool.pool.query('DELETE FROM gait_ratings');
            await pool.pool.query('DELETE FROM horses');
            await pool.pool.query('DELETE FROM stables'); // Though not directly used by store, good to keep clean
            await pool.pool.query('DELETE FROM users'); // Users are needed as owners
            await pool.pool.query('DELETE FROM breeds'); // Breeds are crucial for store purchases
            // Add any other tables that might be affected by store operations
            await pool.pool.query('COMMIT'); // Commit transaction
        } catch (error) {
            await pool.pool.query('ROLLBACK'); // Rollback on error
            console.error('Error during beforeEach DB cleanup in store.test.js:', error);
            throw error;
        }
    });

    afterAll(async () => {
        if (pool && typeof pool.pool.end === 'function') {
            await pool.pool.end();
            console.log('Database pool closed in store.test.js.');
        }
        stopHealthScheduler(); // Stop the cron job
        if (expressServer && typeof expressServer.close === 'function') {
            await new Promise(resolve => expressServer.close(resolve));
            console.log('Express server closed in store.test.js.');
        }
    });

    describe('POST /api/store/purchase-horse', () => {
        let testUser;
        let testToken;
        let testBreed;

        beforeEach(async () => {
            // 1. Create a test user
            const hashedPassword = await bcrypt.hash('password123', 10);
            const userResult = await pool.pool.query(
                "INSERT INTO users (username, email, password_hash, is_verified, game_currency) VALUES ($1, $2, $3, $4, $5) RETURNING *",
                ['storetestuser', 'storetest@example.com', hashedPassword, true, 1000]
            );
            testUser = userResult.rows[0];

            // 2. Create a JWT token for the test user
            const payload = { user: { id: testUser.id, username: testUser.username, role: testUser.role } };
            testToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

            // 3. Create a test breed with a basic genetic profile
            const breedGeneticProfile = {
                color_palette: {
                    // Example: Basic Red/Black, Agouti, Cream
                    // These would need to be structured as per your geneticsEngine.js expectations
                    base: { E: 0.5, e: 0.5 },
                    agouti: { A: 0.5, a: 0.5 },
                    cream: { Cr: 0.1, cr: 0.9 },
                    // Add other loci as needed for minimal functionality
                },
                allele_weights: {
                    // Example structure - needs to match geneticsEngine.js
                    // This usually defines how alleles are chosen if not explicitly passed
                    E: { E: 1, e: 1}, // Example: equal chance for E or e
                    A: { A: 1, a: 1},
                    Cr: { Cr: 1, cr: 9}, // Example: Cream is rarer
                    // ... other genes needed by your engine
                },
                boolean_modifiers_prevalence: {
                    // Example: flaxen, sooty, grey etc. - needs to match geneticsEngine.js
                    // Names should be exact as expected by your genetics engine
                    flaxen: 0.1, // 10% chance of flaxen if applicable
                    grey: 0.05   // 5% chance of grey
                    // ... other boolean modifiers
                },
                rating_profiles: {
                    conformation: {
                        head: { mean: 50, std_dev: 10 },
                        neck: { mean: 55, std_dev: 8 },
                        shoulders: { mean: 50, std_dev: 5},
                        back: { mean: 50, std_dev: 5},
                        hindquarters: { mean: 50, std_dev: 5},
                        legs: { mean: 50, std_dev: 5},
                        hooves: { mean: 50, std_dev: 5}
                    },
                    gaits: {
                        walk: { mean: 50, std_dev: 10 },
                        trot: { mean: 55, std_dev: 8 },
                        canter: { mean: 60, std_dev: 7 },
                        gallop: { mean: 65, std_dev: 6 },
                        // Add other gaits if applicable
                        gaiting: { mean: 0, std_dev: 0} // for non-gaited
                    },
                    is_gaited_breed: false
                },
                temperament_weights: { Calm: 5, Spirited: 2, Bold: 3, Steady: 4, Playful: 1 },
                // Add other necessary fields from schema
                // default_trait: 'Balanced', // Already in INSERT query
            };
            const breedResult = await pool.pool.query(
                "INSERT INTO breeds (name, default_trait, breed_genetic_profile) VALUES ($1, $2, $3) RETURNING *",
                ['TestBreed', 'Balanced', JSON.stringify(breedGeneticProfile)]
            );
            testBreed = breedResult.rows[0];
        });

        it('should successfully purchase a horse with valid data for an authenticated user', async () => {
            const purchaseData = {
                name: 'TestHorseFromStore',
                sex: 'Mare',
                breed_id: testBreed.id
            };

            const response = await request(app)
                .post('/api/store/purchase-horse')
                .set('Authorization', `Bearer ${testToken}`)
                .send(purchaseData);

            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('message', 'Horse purchased successfully!');
            expect(response.body).toHaveProperty('horse');
            const purchasedHorse = response.body.horse;

            // Assertions about the horse details
            expect(purchasedHorse.name).toBe(purchaseData.name);
            expect(purchasedHorse.sex).toBe(purchaseData.sex);
            expect(purchasedHorse.breed_id).toBe(purchaseData.breed_id);
            expect(purchasedHorse.owner_id).toBe(testUser.id);
            expect(purchasedHorse.age_years).toBe(3); // Store horses are 3 years old
            expect(purchasedHorse.image_url).toBe('/images/samplehorse.JPG'); // Default image
            expect(purchasedHorse.health_status).toBe('Excellent');
            expect(purchasedHorse.last_vetted_date).toBeDefined();

            // Assertions for generated properties (more detailed checks later)
            expect(purchasedHorse.genotype).toBeDefined();
            expect(purchasedHorse.phenotypic_markings).toBeDefined();
            expect(purchasedHorse.final_display_color).toBeDefined();
            expect(purchasedHorse.trait).toBe(testBreed.default_trait); // Or specific logic
            expect(purchasedHorse.temperament).toBeDefined(); // Check against allowed temperaments

            // Assertions for ratings (more detailed checks later)
            expect(purchasedHorse.conformation_ratings).toBeDefined();
            expect(purchasedHorse.gait_ratings).toBeDefined();
            
            // TODO: Query DB to verify horse, conformation_ratings, gait_ratings tables directly
        });

        it.todo('should return 400 for invalid breed ID');
        it.todo('should return 401 if user is not authenticated');
        // Add more test cases as we develop:
        // it.todo('should correctly assign default horse attributes (age, image_url)');
        // it.todo('should generate ratings based on breed profile');
        // it.todo('should generate temperament based on breed profile');
        // it.todo('should generate genetics and color based on breed profile');
        // it.todo('should deduct currency from user (once currency is implemented)');
    });

    // We can add describe blocks for other store endpoints later if any are created.
}); 