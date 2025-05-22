const { validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log the errors for debugging if needed
    // console.error('Validation errors:', errors.array()); 
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

module.exports = { handleValidationErrors }; 