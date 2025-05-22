const express = require('express');
const router = express.Router();
const { handlePing } = require('../controllers/pingController'); // Import from controller
const { validatePing } = require('../middleware/validatePing'); // Import validation middleware

// Apply validation middleware before the controller
router.get('/', validatePing, handlePing);

module.exports = router; 