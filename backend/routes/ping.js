const express = require('express');
const router = express.Router();

// Handle GET requests to / (relative to the path this router is mounted on)
router.get('/', (req, res) => {
  res.json({ message: 'pong' });
});

module.exports = router; 