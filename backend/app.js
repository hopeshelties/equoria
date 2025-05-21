const express = require('express');
const pingRoute = require('./routes/ping'); // Require the new ping route
// const config = require('./config/config'); // Config is not directly used by app.js anymore

const app = express();

app.use(express.json()); // Middleware to parse JSON bodies

// Mount the ping route
app.use('/ping', pingRoute);

// Old direct routes removed as per refactoring for /ping.
// The default '/' route can be re-added or managed elsewhere if needed.

module.exports = app; 