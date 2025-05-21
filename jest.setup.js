// This file is temporarily cleared as environment variables will be loaded via the Jest command. 

const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, 'backend', '.env.test');
dotenv.config({ path: envPath }); 