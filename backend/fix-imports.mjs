import replace from 'replace-in-file';
import { promises as fs } from 'fs';
import path from 'path';
import fg from 'fast-glob';

const updateImportsInFile = async filePath => {
  try {
    const results = await replace({
      files: filePath,
      from: /(from\s+['"]((\.\/|\.\.\/)[^'"]*?)\.js['"])/g,
      to: "from '$2.mjs'",
    });
    if (results[0].hasChanged) {
      console.log(`✔ Updated imports in ${filePath}`);
    } else {
      console.log(`ℹ No changes needed in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
  }
};

const run = async () => {
  try {
    const files = await fg('**/*.mjs', { ignore: ['node_modules/**', 'fix-imports.mjs'] });
    if (files.length === 0) {
      console.log('⚠ No .mjs files found.');
      return;
    }
    console.log(`📝 Processing ${files.length} .mjs files...`);
    await Promise.all(files.map(file => updateImportsInFile(file)));
    console.log('✅ All import paths updated.');
  } catch (error) {
    console.error(`❌ Error during execution: ${error.message}`);
  }
};

run();
