import express from 'express';
const router = express.Router();
import { handlePing } from '../controllers/pingController.js'; // Import from controller
import { validatePing } from '../middleware/validatePing.js'; // Import validation middleware

// Apply validation middleware before the controller
router.get('/', validatePing, handlePing);

export default router; 