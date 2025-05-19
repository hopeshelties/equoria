const mockSendMail = jest
  .fn()
  .mockResolvedValue({ messageId: 'mocked-message-id' }); // Define this at the very top and make it return a value

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail,
    verify: jest.fn().mockResolvedValue(true),
  }),
  createTestAccount: jest.fn().mockResolvedValue({
    user: 'ethereal_user@example.com',
    pass: 'ethereal_password',
    smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
  }),
  getTestMessageUrl: jest
    .fn()
    .mockReturnValue('http://ethereal.example/preview/message'),
}));

const request = require('supertest');
const { app, server: expressServer } = require('../../index'); // Import app and the potentially started server
const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const { stopHealthScheduler } = require('../../utils/healthScheduler'); // Import the stop function

describe('Auth API Endpoints', () => {
  beforeAll(async () => {
    // It's good practice to ensure migrations/table creations are done if not handled automatically
    // For now, assuming tables exist as per schema.sql
  });

  beforeEach(async () => {
    // Reset mocks and clear tables before each test for isolation
    mockSendMail.mockClear();
    try {
      await pool.query('BEGIN'); // Start transaction
      // Clear tables in reverse order of foreign key dependencies if any cascade issues arise
      // Or use TRUNCATE ... RESTART IDENTITY CASCADE if supported and appropriate
      await pool.query('DELETE FROM horses');
      await pool.query('DELETE FROM conformation_ratings');
      await pool.query('DELETE FROM gait_ratings');
      await pool.query('DELETE FROM stables');
      await pool.query('DELETE FROM users');
      await pool.query('COMMIT'); // Commit transaction
    } catch (error) {
      await pool.query('ROLLBACK'); // Rollback on error
      console.error('Error during beforeEach DB cleanup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (pool && typeof pool.pool.end === 'function') {
      // Check if pool and pool.pool.end exist
      await pool.pool.end();
      console.log('Database pool closed.');
    } else {
      console.warn(
        'Database pool or pool.end function not found, could not close pool.'
      );
    }
    stopHealthScheduler(); // Stop the cron job
    if (expressServer && typeof expressServer.close === 'function') {
      // Close the main server if it was started
      await new Promise((resolve) => expressServer.close(resolve));
      console.log('Express server closed.');
    }
  });

  describe('POST /api/users - User Signup', () => {
    const validUserData = {
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'Password123!',
    };

    it('should create a new user successfully and trigger a verification email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send(validUserData);

      if (response.statusCode !== 201) {
        console.log(
          'Successful Signup Failure - Response Body:',
          JSON.stringify(response.body, null, 2)
        );
      }

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty(
        'message',
        'Registration successful. Please check your email (or Ethereal preview link in console) to verify your account.'
      );
      expect(response.body).toHaveProperty('userId');
      const userId = response.body.userId;

      // Check database
      const dbUserResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      expect(dbUserResult.rows.length).toBe(1);
      const dbUser = dbUserResult.rows[0];
      expect(dbUser.username).toBe(validUserData.username);
      expect(dbUser.email).toBe(validUserData.email.toLowerCase());
      expect(dbUser.is_verified).toBe(false);
      expect(dbUser.email_verification_token).not.toBeNull();

      // Check password was hashed
      const isPasswordMatch = await bcrypt.compare(
        validUserData.password,
        dbUser.password_hash
      );
      expect(isPasswordMatch).toBe(true);

      // Check email was sent
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail.mock.calls[0][0].to).toBe(
        validUserData.email.toLowerCase()
      );
      expect(mockSendMail.mock.calls[0][0].subject).toBe(
        'Verify Your Email Address for HorseSim Game'
      );
      expect(mockSendMail.mock.calls[0][0].html).toContain(
        'verify-email/' + dbUser.email_verification_token
      );
    });

    it('should return 400 for missing username', async () => {
      const dataWithoutUsername = { ...validUserData };
delete dataWithoutUsername.username;
      const response = await request(app)
        .post('/api/users')
        .send(dataWithoutUsername);
      expect(response.statusCode).toBe(400);
      console.log(
        'Missing Username Response Body:',
        JSON.stringify(response.body, null, 2)
      );
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.some((err) => err.path === 'username')).toBe(
        true
      );
    });

    it('should return 400 for missing email', async () => {
      const dataWithoutEmail = { ...validUserData };
      delete dataWithoutEmail.email;
      const response = await request(app)
        .post('/api/users')
        .send(dataWithoutEmail);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.some((err) => err.path === 'email')).toBe(
        true
      );
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ ...validUserData, email: 'invalidemail' });
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(
        response.body.errors.some(
          (err) =>
            err.path === 'email' &&
            err.msg === 'Please provide a valid email address.'
        )
      ).toBe(true);
    });

    it('should return 400 for missing password', async () => {
      const dataWithoutPassword = { ...validUserData };
      delete dataWithoutPassword.password;
      const response = await request(app)
        .post('/api/users')
        .send(dataWithoutPassword);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.some((err) => err.path === 'password')).toBe(
        true
      );
    });

    it('should return 400 for password not meeting complexity requirements (e.g., too short)', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ ...validUserData, password: 'Pass1!' });
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(
        response.body.errors.some(
          (err) =>
            err.path === 'password' && err.msg.includes('at least 8 characters')
        )
      ).toBe(true);
    });

    it('should return 409 if username already exists', async () => {
      await request(app).post('/api/users').send(validUserData);
      mockSendMail.mockClear();

      const response = await request(app)
        .post('/api/users')
        .send({ ...validUserData, email: 'another@example.com' });
      expect(response.statusCode).toBe(409);
      expect(response.body).toHaveProperty(
        'message',
        'Username already exists'
      );
    });

    it('should return 409 if email already exists', async () => {
      await request(app).post('/api/users').send(validUserData);
      mockSendMail.mockClear();

      const response = await request(app)
        .post('/api/users')
        .send({ ...validUserData, username: 'anotheruser' });
      expect(response.statusCode).toBe(409);
      expect(response.body).toHaveProperty(
        'message',
        'Email already registered'
      );
    });
  });

  describe('POST /api/auth/login - User Login', () => {
    const signupData = {
      username: 'loginuser',
      email: 'login@example.com',
      password: 'Password123!',
    };
    let hashedPassword;

    beforeEach(async () => {
      // Ensure a user exists to test login
      hashedPassword = await bcrypt.hash(signupData.password, 10);
      // We'll create a verified and an unverified user for different test cases
      await pool.query(
        'INSERT INTO users (username, email, password_hash, is_verified, email_verification_token) VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)',
        [
          signupData.username,
          signupData.email,
          hashedPassword,
          true,
          null, // Verified user
          'unverifieduser',
          'unverified@example.com',
          hashedPassword,
          false,
          'some_token', // Unverified user
        ]
      );
    });

    it('should login a verified user successfully and return a JWT token', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: signupData.email,
        password: signupData.password,
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('token');
      // Further token validation (e.g., decoding and checking payload) could be added here
      // For now, just checking for its presence.
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: signupData.email,
        password: 'WrongPassword123!',
      });
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should return 401 for non-existent email', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: signupData.password,
      });
      expect(response.statusCode).toBe(401); // Or 404, depending on how you want to handle it. 401 is common for auth.
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should return 403 if user is not verified', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'unverified@example.com',
        password: signupData.password,
      });
      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'Please verify your email before logging in.'
      );
    });

    it('should return 400 for missing email', async () => {
      // TODO: Remove unused 'email' variable or use it in future validation logic
      // eslint-disable-next-line no-unused-vars
      const { email, ...dataWithoutEmail } = signupData;
      const response = await request(app)
        .post('/api/auth/login')
        .send(dataWithoutEmail);
      expect(response.statusCode).toBe(400);
      console.log(
        'Login Missing Email Response Body:',
        JSON.stringify(response.body, null, 2)
      );
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.some((err) => err.path === 'email')).toBe(
        true
      );
    });

    it('should return 400 for missing password', async () => {
      // TODO: Remove unused 'password' variable or use it in future validation logic
      // eslint-disable-next-line no-unused-vars
      const { password, ...dataWithoutPassword } = signupData;
      const response = await request(app)
        .post('/api/auth/login')
        .send(dataWithoutPassword);
      expect(response.statusCode).toBe(400);
      console.log(
        'Login Missing Password Response Body:',
        JSON.stringify(response.body, null, 2)
      );
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.some((err) => err.path === 'password')).toBe(
        true
      );
    });
  });

  describe('GET /api/auth/verify-email/:token - Email Verification', () => {
    const verificationUser = {
      username: 'verifyuser',
      email: 'verify@example.com',
      password: 'Password123!',
      token: 'testverificationtoken123',
    };
    let userId;

    beforeEach(async () => {
      const hashedPass = await bcrypt.hash(verificationUser.password, 10);
      const result = await pool.query(
        'INSERT INTO users (username, email, password_hash, is_verified, email_verification_token) VALUES ($1, $2, $3, false, $4) RETURNING id',
        [
          verificationUser.username,
          verificationUser.email,
          hashedPass,
          verificationUser.token,
        ]
      );
      userId = result.rows[0].id;
    });

    it('should verify email successfully with a valid token', async () => {
      const response = await request(app).get(
        `/api/auth/verify-email/${verificationUser.token}`
      );

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'Email verified successfully. You can now log in.'
      );

      // Check database
      const dbUserResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      expect(dbUserResult.rows.length).toBe(1);
      const dbUser = dbUserResult.rows[0];
      expect(dbUser.is_verified).toBe(true);
      expect(dbUser.email_verification_token).toBeNull();
    });

    it('should return 400 if token is invalid or not found', async () => {
      const response = await request(app).get(
        '/api/auth/verify-email/invalidtoken123'
      );

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty(
        'message',
        'Invalid or expired verification token.'
      );

      // Check database to ensure user is still unverified
      const dbUserResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      expect(dbUserResult.rows.length).toBe(1);
      const dbUser = dbUserResult.rows[0];
      expect(dbUser.is_verified).toBe(false);
      expect(dbUser.email_verification_token).toBe(verificationUser.token);
    });

    it('should return 404 if token path segment is effectively empty (e.g. whitespace string)', async () => {
      const response = await request(app).get('/api/auth/verify-email/   '); // Test with whitespace token

      expect(response.statusCode).toBe(404); // Expect 404 due to routing
      // The message for 404 can be Express default, so not strictly checking response.body.message
    });

    // Test for already verified user trying to verify again (optional, depends on desired behavior)
    // it('should inform if email is already verified', async () => {
    //     // First, verify the user
    //     await request(app).get(`/api/auth/verify-email/${verificationUser.token}`);

    //     // Attempt to verify again
    //     const response = await request(app)
    //         .get(`/api/auth/verify-email/${verificationUser.token}`); // Token should be nullified by now
    // Or, if we test with the original token
    // the DB lookup would fail.
    // Let's test if user tries to re-verify using an old link, after already being verified (token cleared)

    //     const alreadyVerifiedUserTokenLookupResponse = await request(app)
    //          .get(`/api/auth/verify-email/${verificationUser.token}_stale`); // A token that no longer exists

    //     expect(alreadyVerifiedUserTokenLookupResponse.statusCode).toBe(400); // Or a specific message
    //     expect(alreadyVerifiedUserTokenLookupResponse.body).toHaveProperty('message', 'Invalid or expired verification token.');
    //     // This is already covered by "invalid token" test.
    //     // What if the user *is* verified, and somehow tries to hit the endpoint with *their* token that's now cleared?
    //     // The controller logic is: find by token. If not found -> invalid. If found -> set verified, clear token.
    //     // So, a second attempt with same token will always result in 'token not found'.
    // });
  });
});
