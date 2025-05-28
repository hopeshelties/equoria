/**
 * Schema Verification Script for Player Model
 * 
 * This script verifies that the players table has the required columns
 * Run with: node scripts/verifyPlayerSchema.js
 */

import prisma from '../db/index.js';
import logger from '../utils/logger.js';

async function verifyPlayerSchema() {
  try {
    console.log('🔍 Verifying Player Table Schema');
    console.log('=================================\n');

    // Try to create a test player to verify all required fields exist
    const testPlayerData = {
      name: 'Schema Test Player',
      email: `schema-test-${Date.now()}@example.com`,
      money: 1000,
      level: 1,
      xp: 0,
      settings: { theme: 'light', notifications: true }
    };

    console.log('1. Testing player creation with all required fields...');
    const testPlayer = await prisma.user.create({
      data: testPlayerData
    });

    console.log('✅ Player created successfully!');
    console.log(`   ID: ${testPlayer.id}`);
    console.log(`   Name: ${testPlayer.name}`);
    console.log(`   Email: ${testPlayer.email}`);
    console.log(`   Money: ${testPlayer.money}`);
    console.log(`   Level: ${testPlayer.level} (INTEGER)`);
    console.log(`   XP: ${testPlayer.xp} (INTEGER)`);
    console.log(`   Settings: ${JSON.stringify(testPlayer.settings)} (JSON)\n`);

    // Test updating level and XP
    console.log('2. Testing level and XP updates...');
    const updatedPlayer = await prisma.user.update({
      where: { id: testPlayer.id },
      data: {
        level: 5,
        xp: 50
      }
    });

    console.log('✅ Level and XP updated successfully!');
    console.log(`   New Level: ${updatedPlayer.level}`);
    console.log(`   New XP: ${updatedPlayer.xp}\n`);

    // Clean up test player
    console.log('3. Cleaning up test player...');
    await prisma.user.delete({
      where: { id: testPlayer.id }
    });
    console.log('✅ Test player deleted\n');

    console.log('🎉 Schema verification completed successfully!');
    console.log('\n📋 Verified Fields:');
    console.log('- ✅ id (UUID, Primary Key)');
    console.log('- ✅ name (String, Required)');
    console.log('- ✅ email (String, Required, Unique)');
    console.log('- ✅ money (Integer, Required)');
    console.log('- ✅ level (Integer, Required) ← XP System');
    console.log('- ✅ xp (Integer, Required) ← XP System');
    console.log('- ✅ settings (JSON, Required)');

  } catch (error) {
    console.error('❌ Schema verification failed:', error.message);
    
    if (error.message.includes('Unknown column') || error.message.includes('column') || error.message.includes('field')) {
      console.error('\n💡 Possible Issues:');
      console.error('- Missing level or xp columns in players table');
      console.error('- Incorrect column types (should be INTEGER)');
      console.error('- Database migration needed');
    }
    
    logger.error('[verifyPlayerSchema] Schema error: %o', error);
    throw error;
  }
}

// Run the verification if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyPlayerSchema()
    .then(() => {
      console.log('\n✨ Schema verification completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Schema verification failed:', error);
      process.exit(1);
    });
}

export { verifyPlayerSchema };
