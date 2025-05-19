const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Validation rules for login
const loginValidationRules = [
  body('email').notEmpty().withMessage('Email is required.').isEmail().withMessage('Invalid email format.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.')
];

// POST /api/auth/login - User Login
router.post('/login', loginValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Check if user exists
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // User matched, create JWT payload
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };

    // Sign token (using the secret from .env)
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 3600 }, // Expires in 1 hour, adjust as needed
      (err, token) => {
        if (err) throw err;
        res.json({ token, userId: user.id, username: user.username });
      }
    );

  } catch (err) {
    console.error('Error during user login:', err.message);
    res.status(500).send('Server error');
  }
});

// GET /api/auth/verify-email/:token - Email Verification
router.get('/verify-email/:token', async (req, res) => {
  const { token } = req.params;

  if (!token || token.trim() === '') {
    return res.status(400).json({ message: 'Verification token is missing.' });
  }

  try {
    // Find user by verification token
    const result = await db.query('SELECT * FROM users WHERE email_verification_token = $1', [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired verification token.' });
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.is_verified) {
      // Optionally, you could redirect to login or inform the user they are already verified.
      return res.status(200).json({ message: 'Email already verified. You can log in.' });
    }

    // Mark user as verified and clear the token
    await db.query(
      'UPDATE users SET is_verified = TRUE, email_verification_token = NULL WHERE id = $1',
      [user.id]
    );

    // For a web app, you might redirect here. For an API, a JSON response is typical.
    res.status(200).json({ message: 'Email verified successfully. You can now log in.' });

  } catch (err) {
    console.error('Error during email verification:', err.message);
    res.status(500).send('Server error during email verification.');
  }
});

module.exports = router; 