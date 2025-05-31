// Script to fix all breedId usages in test files and seed files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files that need to be fixed based on grep search results
const filesToFix = [
  'tests/training-complete.test.js',
  'tests/trainingCooldown.test.js',
  'tests/traitDiscoveryIntegration.test.js',
  'tests/horseModel.test.js',
  'tests/foalEnrichmentIntegration.test.js',
  'tests/cronJobsIntegration.test.js',
  'seed/userSeed.js',
  'seed/horseSeed.js',
  'models/horseModel.test.js',
];

function fixBreedIdInFile(filePath) {
  try {
    console.log(`Fixing ${filePath}...`);

    let content = fs.readFileSync(filePath, 'utf8');
    let changesMade = 0;

    // Pattern 1: breedId: someVariable.id -> breed: { connect: { id: someVariable.id } }
    const pattern1 = /breedId:\s*([^,\s}]+)/g;
    content = content.replace(pattern1, (match, breedValue) => {
      changesMade++;
      return `breed: { connect: { id: ${breedValue} } }`;
    });

    // Pattern 2: breedId: number -> breed: { connect: { id: number } }
    const pattern2 = /breedId:\s*(\d+)/g;
    content = content.replace(pattern2, (match, breedId) => {
      changesMade++;
      return `breed: { connect: { id: ${breedId} } }`;
    });

    // Pattern 3: Add ownerId to horse creation calls that don't have it
    // Look for createHorse calls with breed but no ownerId
    const createHorsePattern = /createHorse\(\s*\{([^}]+)\}\s*\)/g;
    content = content.replace(createHorsePattern, (match, horseData) => {
      // Check if ownerId is already present
      if (horseData.includes('ownerId') || horseData.includes('owner:')) {
        return match; // Already has owner, don't change
      }

      // Add ownerId: 1 to the horse data
      const trimmedData = horseData.trim();
      const newData = trimmedData.endsWith(',')
        ? `${trimmedData}\n      ownerId: 1`
        : `${trimmedData},\n      ownerId: 1`;

      changesMade++;
      return `createHorse({\n      ${newData}\n    })`;
    });

    if (changesMade > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${changesMade} instances in ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed in ${filePath}`);
    }

    return changesMade;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('🔧 Starting breed relation and owner fixes...\n');

  let totalChanges = 0;

  for (const file of filesToFix) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      totalChanges += fixBreedIdInFile(fullPath);
    } else {
      console.log(`⚠️  File not found: ${fullPath}`);
    }
  }

  console.log(`\n🎉 Completed! Made ${totalChanges} total changes across all files.`);
  console.log('Now you can run the tests again.');
}

main();
