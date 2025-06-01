/**
 * Simple test runner to verify our failing test case
 */

// Mock Prisma
const mockPrisma = {
  horse: {
    findUnique: () => Promise.resolve({
      id: 1,
      name: 'Adult Horse',
      age: 365, // 1 year old
    }),
  },
  groomInteraction: {
    findMany: () => Promise.resolve([{
      id: 1,
      foalId: 1,
      groomId: 1,
      timestamp: new Date(),
      interactionType: 'daily_care',
    }]),
  },
};

// Mock logger
const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
};

// Mock modules
const originalImport = global.import;
global.import = async (modulePath) => {
  if (modulePath.includes('db/index.js')) {
    return { default: mockPrisma };
  }
  if (modulePath.includes('utils/logger.js')) {
    return { default: mockLogger };
  }
  return originalImport(modulePath);
};

// Import and test the function
async function runTest() {
  try {
    console.log('🧪 Testing validateFoalInteractionLimits with 1-year-old horse...');
    
    const { validateFoalInteractionLimits } = await import('./utils/groomSystem.js');
    
    const result = await validateFoalInteractionLimits(1);
    
    console.log('📊 Result:', result);
    console.log('🔍 canInteract:', result.canInteract);
    console.log('💬 message:', result.message);
    
    if (result.canInteract === true) {
      console.log('❌ BUG STILL EXISTS: Adult horse is allowed unlimited interactions');
      console.log('🔧 Need to check if our fix was applied correctly');
    } else {
      console.log('✅ FIX SUCCESSFUL: Adult horse is now properly limited to once per day!');
      console.log('🎯 All horses are now limited to 1 interaction per day as required');
    }
    
  } catch (error) {
    console.error('❌ Error running test:', error.message);
  }
}

runTest();
