// Update server.js to trigger the database connection by importing db/index.js
require('./db'); // This will initialize the pool and attempt connection

const app = require('./app');
const { port } = require('./config/config'); // Corrected path to config

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Database connection logic removed as per this refactoring step.
// It can be reintegrated if needed, perhaps in a dedicated db.js or within server.js conditionally. 