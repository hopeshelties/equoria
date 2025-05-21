const app = require('./app');
const { port } = require('./config/config'); // Ensure correct path to config

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Database connection logic removed as per this refactoring step.
// It can be reintegrated if needed, perhaps in a dedicated db.js or within server.js conditionally. 