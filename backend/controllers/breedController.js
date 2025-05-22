const pool = require('../db'); // Database connection pool

// Create a new breed
async function createBreed(req, res, next) {
  const { name } = req.body;

  try {
    // Check if breed name already exists (case-insensitive)
    const existingBreed = await pool.query('SELECT * FROM public.breeds WHERE LOWER(name) = LOWER($1)', [name]);
    if (existingBreed.rows.length > 0) {
      return res.status(409).json({ message: 'Breed name already exists.' });
    }

    const result = await pool.query(
      'INSERT INTO public.breeds (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating breed:', error);
    next(error); // Pass error to the global error handler
  }
}

// Get all breeds
async function getAllBreeds(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM public.breeds ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting all breeds:', error);
    next(error);
  }
}

// Get a single breed by ID
async function getBreedById(req, res, next) {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM public.breeds WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Breed not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error getting breed by id ${id}:`, error);
    next(error);
  }
}

module.exports = {
  createBreed,
  getAllBreeds,
  getBreedById,
}; 