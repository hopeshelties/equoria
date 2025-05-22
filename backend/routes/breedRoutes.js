const express = require('express');
const { body, param } = require('express-validator');
const breedController = require('../controllers/breedController');
const { handleValidationErrors } = require('../middleware/validationErrorHandler'); // Assuming you might create this

const router = express.Router();

// POST /api/breeds - Create a new breed
router.post('/', [
  body('name')
    .isString().withMessage('Breed name must be a string.')
    .trim()
    .notEmpty().withMessage('Breed name cannot be empty after trimming.')
    .isLength({ min: 2, max: 255 }).withMessage('Breed name must be between 2 and 255 characters.')
], handleValidationErrors, breedController.createBreed);

// GET /api/breeds - Get all breeds
router.get('/', breedController.getAllBreeds);

// GET /api/breeds/:id - Get a single breed by ID
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('Breed ID must be a positive integer.')
], handleValidationErrors, breedController.getBreedById);

module.exports = router; 