// test-connection.js
import { Client } from 'pg';

const client = new Client({
  connectionString: 'postgresql://postgres:JimpkpNnVF2o%23DaX1Qx0@localhost:5432/postgres'
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL!');
    const result = await client.query('SELECT version()');
    console.log('Version:', result.rows[0].version);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();
