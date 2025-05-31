// test-connection.js
import { Client } from 'pg';

const client = new Client({
  connectionString: 'postgresql://postgres:JimpkpNnVF2o%23DaX1Qx0@localhost:5432/postgres'
});

async function testConnection() {
  console.log('Starting connection test...');
  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL!');
    console.log('Querying version...');
    const result = await client.query('SELECT version()');
    console.log('Version:', result.rows[0].version);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    console.log('Closing connection...');
    await client.end();
    console.log('Test completed.');
  }
}

testConnection();
