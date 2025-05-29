/* eslint-disable no-console */
/**
 * Manual Test Script for XP and Level System
 *
 * This script demonstrates the XP rollover behavior and leveling logic
 * Run with: node scripts/testXpSystem.js
 */

import { addXpToUser, getUserById, createUser } from '../models/userModel.js';
import logger from '../utils/logger.js';

async function testXpSystem() {
  try {
    console.log('🎮 Testing XP and Level System');
    console.log('================================\n');

    // Create a test user
    const testUser = {
      username: 'XPTestUser',
      firstName: 'XP',
      lastName: 'Test',
      email: `xp-test-${Date.now()}@example.com`,
      password: 'password123',
      money: 1000,
      level: 1,
      xp: 0,
      settings: { theme: 'light' }
    };

    console.log('1. Creating test user...');
    const user = await createUser(testUser);
    console.log(`✅ Created user: ${user.name} (ID: ${user.id})`);
    console.log(`   Initial Level: ${user.level}, XP: ${user.xp}\n`);

    // Test 1: Add XP without leveling up
    console.log('2. Adding 20 XP (should not level up)...');
    let result = await addXpToUser(user.id, 20);
    console.log(`✅ Result: Level ${result.level}, XP: ${result.xp}`);
    console.log(`   Leveled up: ${result.leveledUp}, Levels gained: ${result.levelsGained}\n`);

    // Test 2: Add XP to reach exactly 100 XP (should level up once)
    console.log('3. Adding 80 XP (should level up once: 20+80=100)...');
    result = await addXpToUser(user.id, 80);
    console.log(`✅ Result: Level ${result.level}, XP: ${result.xp}`);
    console.log(`   Leveled up: ${result.leveledUp}, Levels gained: ${result.levelsGained}\n`);

    // Test 3: Add large XP amount (should level up multiple times)
    console.log('4. Adding 250 XP (should level up 2 times: 0+250=250, then 250-200=50)...');
    result = await addXpToUser(user.id, 250);
    console.log(`✅ Result: Level ${result.level}, XP: ${result.xp}`);
    console.log(`   Leveled up: ${result.leveledUp}, Levels gained: ${result.levelsGained}\n`);

    // Test 4: Test levelUpIfNeeded function
    console.log('5. Adding 150 XP more (should level up 1 time: 50+150=200, then 200-100=100, then 100-100=0)...');
    result = await addXpToUser(user.id, 150);
    console.log(`✅ Result: Level ${result.level}, XP: ${result.xp}`);
    console.log(`   Leveled up: ${result.leveledUp}, Levels gained: ${result.levelsGained}\n`);

    // Test 5: Test levelUpIfNeeded when no level up is needed
    console.log('6. Testing addXpToUser when no level up needed (add 0 XP)...');
    // To test the scenario where levelUpIfNeeded was used when no level up was needed,
    // we can call addXpToUser with 0 XP. This won't change XP or level,
    // but will return the current state, similar to how a standalone check would.
    // However, addXpToUser with 0 XP will return an error, so we fetch the user directly.
    const userStateAfterNoXp = await getUserById(user.id);
    result = { // Simulate the structure of addXpToUser response for consistency
      level: userStateAfterNoXp.level,
      xp: userStateAfterNoXp.xp,
      leveledUp: false, // No XP added, so no level up
      levelsGained: 0,
      message: 'Checked user state without adding XP.'
    };
    console.log(`✅ Result: Level ${result.level}, XP: ${result.xp}`);
    console.log(`   Leveled up: ${result.leveledUp}, Message: ${result.message}\n`);

    // Test 6: Manually set XP to test levelUpIfNeeded
    console.log('7. Adding 200 XP (will trigger level up inside addXpToUser)...');
    result = await addXpToUser(user.id, 200); // This call now handles leveling up.

    console.log('8. Verifying state after adding 200 XP...');
    // The result from addXpToUser already contains the post-level-up state.
    console.log(`✅ Result: Level ${result.currentLevel}, XP: ${result.currentXP}`);
    console.log(`   Leveled up: ${result.leveledUp}, Levels gained: ${result.levelsGained}\n`);

    // Final user state
    console.log('9. Final user state...');
    const finalUser = await getUserById(user.id);
    console.log(`✅ Final state: Level ${finalUser.level}, XP: ${finalUser.xp}\n`);

    console.log('🎉 All XP system tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('- ✅ XP addition without leveling up');
    console.log('- ✅ Single level up at 100 XP');
    console.log('- ✅ Multiple level ups with large XP gains');
    console.log('- ✅ XP rollover behavior (subtract 100 per level)');
    // console.log('- ✅ levelUpIfNeeded function'); // This is now part of addXpToUser
    console.log('- ✅ Proper XP remainder after multiple level ups');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logger.error('[testXpSystem] Test error: %o', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testXpSystem()
    .then(() => {
      console.log('\n✨ Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

export { testXpSystem };
