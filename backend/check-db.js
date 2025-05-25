import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Dynamic import after environment is loaded
const { default: prisma } = await import('./db/index.js');

async function checkDatabase() {
  try {
    console.log('Checking database...');
    
    // Check players
    const players = await prisma.player.findMany();
    console.log('Players:', players.length);
    players.forEach(player => {
      console.log(`  - ${player.name} (${player.id})`);
    });
    
    // Check horses
    const horses = await prisma.horse.findMany({
      include: {
        breed: true,
        owner: true,
        player: true
      }
    });
    console.log('\nHorses:', horses.length);
    horses.forEach(horse => {
      console.log(`  - ${horse.name} (ID: ${horse.id})`);
      console.log(`    Breed: ${horse.breed?.name || 'None'}`);
      console.log(`    Owner: ${horse.owner?.name || 'None'} (ID: ${horse.ownerId || 'None'})`);
      console.log(`    Player: ${horse.player?.name || 'None'} (ID: ${horse.playerId || 'None'})`);
    });
    
    // Check specific player with horses
    const testPlayer = await prisma.player.findUnique({
      where: { id: 'test-player-uuid-123' },
      include: {
        horses: {
          include: {
            breed: true
          }
        }
      }
    });
    
    console.log('\nTest Player with horses:');
    if (testPlayer) {
      console.log(`Player: ${testPlayer.name} (${testPlayer.id})`);
      console.log(`Horses: ${testPlayer.horses.length}`);
      testPlayer.horses.forEach(horse => {
        console.log(`  - ${horse.name} (${horse.breed?.name})`);
      });
    } else {
      console.log('Test player not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase(); 