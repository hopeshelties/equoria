// middleware/validatePing.js
const { query, validationResult } = require('express-validator');

exports.validatePing = [
  query('name')
    .optional()
    .isString().withMessage('Name must be a string')
    .isLength({ min: 2, max: 30 }).withMessage('Name must be between 2 and 30 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
]; 