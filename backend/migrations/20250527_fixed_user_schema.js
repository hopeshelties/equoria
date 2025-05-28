/**
 * Migration file to update the User schema
 * This ensures User model in database matches the application expectations
 */

import prisma from '../db/index.js';

async function main() {
  try {
    console.log('Starting User schema migration...');

    // 1. First get all users to identify those needing updates
    const allUsers = await prisma.user.findMany();
    console.log(`Found ${allUsers.length} total users`);

    // 2. Process each user to ensure they have all required fields
    for (const user of allUsers) {
      const updates = {};

      // Handle username field - generate if missing
      if (!user.username) {
        const usernameBase = user.email.split('@')[0];
        let username = usernameBase;
        let counter = 1;

        // Make sure username is unique
        while (true) {
          const existingUser = await prisma.user.findFirst({
            where: {
              username,
              NOT: { id: user.id }
            }
          });

          if (!existingUser) {break;}

          username = `${usernameBase}${counter}`;
          counter++;
        }

        updates.username = username;
        console.log(`Generated username for ${user.email}: ${username}`);
      }

      // Handle firstName field
      if (!user.firstName) {
        updates.firstName = user.name ? user.name.split(' ')[0] : 'User';
        console.log(`Set firstName for ${user.email} to ${updates.firstName}`);
      }

      // Handle lastName field
      if (!user.lastName) {
        updates.lastName = user.name ?
          (user.name.split(' ').slice(1).join(' ') || 'User') :
          `User${user.id}`;
        console.log(`Set lastName for ${user.email} to ${updates.lastName}`);
      }

      // Update user if we have changes
      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: updates
        });

        console.log(`Updated user ${user.email} with fields: ${Object.keys(updates).join(', ')}`);
      }
    }

    console.log('User schema migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
