// Update server.js to trigger the database connection by importing db/index.js
import './db/index.js'; // This will initialize the pool and attempt connection

import app from './app.js';
import config from './config/config.js';

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

// Database connection logic removed as per this refactoring step.
// It can be reintegrated if needed, perhaps in a dedicated db.js or within server.js conditionally. 