// init-databases.js
import { Client } from 'pg';

async function createDatabases() {
  const client = new Client({
    connectionString: 'postgresql://postgres:JimpkpNnVF2o%23DaX1Qx0@localhost:5432/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    await client.query('CREATE DATABASE equoria');
    console.log('✅ Created equoria database');
  } catch (error) {
    if (error.code === '42P04') {console.log('ℹ️ equoria already exists');}
    else {console.error('❌ Error creating equoria:', error.message);}
  }

  try {
    await client.query('CREATE DATABASE equoria_test');
    console.log('✅ Created equoria_test database');
  } catch (error) {
    if (error.code === '42P04') {console.log('ℹ️ equoria_test already exists');}
    else {console.error('❌ Error creating equoria_test:', error.message);}
  } finally {
    await client.end();
  }
}

createDatabases();
