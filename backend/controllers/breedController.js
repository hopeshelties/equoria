import prisma from '../db/index.js'; // Replaced pool with prisma client

// Create a new breed
async function createBreed(req, res, next) {
  const { name, description } = req.body; // Added description

  try {
    // Prisma's `create` will fail if `name` is not unique due to `@unique` in schema
    // However, to provide a friendly error message, we can check first.
    const existingBreed = await prisma.breed.findUnique({
      where: { name }, // Prisma is case-sensitive by default for unique checks on PostgreSQL
    });

    if (existingBreed) {
      // For a case-insensitive check, we might need a raw query or to query and compare manually if Prisma doesn't support it directly for findUnique with modifiers.
      // For now, sticking to case-sensitive unique check as defined by schema.
      // If a case-insensitive unique constraint is needed, the database schema itself should enforce it, or a workaround query used.
      // Let's assume the unique constraint on `name` in `schema.prisma` is sufficient, or adjust if specific case-insensitivity is required here.
      // A simple approach for case-insensitivity if the DB doesn't enforce it:
      const breeds = await prisma.breed.findMany({ where: { name: { equals: name, mode: 'insensitive' } } });
      if (breeds.length > 0) {
         return res.status(409).json({ message: 'Breed name already exists (case-insensitive check).' });
      }
    }

    const newBreed = await prisma.breed.create({
      data: {
        name,
        description, // Added description
      },
    });
    res.status(201).json(newBreed);
  } catch (error) {
    // Prisma can throw specific errors, e.g., P2002 for unique constraint violation
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return res.status(409).json({ message: 'Breed name already exists.' });
    }
    console.error('Error creating breed:', error);
    next(error); // Pass error to the global error handler
  }
}

// Get all breeds
async function getAllBreeds(req, res, next) {
  try {
    const breeds = await prisma.breed.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    res.status(200).json(breeds);
  } catch (error) {
    console.error('Error getting all breeds:', error);
    next(error);
  }
}

// Get a single breed by ID
async function getBreedById(req, res, next) {
  const { id } = req.params;

  try {
    const breed = await prisma.breed.findUnique({
      where: { id: parseInt(id, 10) }, // Ensure id is an integer
    });
    if (!breed) { // Prisma findUnique returns null if not found
      return res.status(404).json({ message: 'Breed not found.' });
    }
    res.status(200).json(breed);
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