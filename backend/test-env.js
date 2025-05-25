import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Current directory:', __dirname);
console.log('Looking for .env at:', path.resolve(__dirname, '.env'));

const result = dotenv.config({ path: path.resolve(__dirname, '.env') });

if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('Successfully loaded .env');
  console.log('Parsed:', result.parsed);
}

console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV); 