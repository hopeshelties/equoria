## Command, Descript

## npm
npm install,Install all project dependencies listed in package.json
npm run start,Start the application (depends on project configuration)
npm run dev,Start the app in development mode (often with hot reloading)
npm run build,Compile the project for production
npm run test,Run all tests using Jest or the configured test runner
npm run test:watch,Run tests in watch mode (reruns on file change)
npm run test:coverage,Generate code coverage report using Jest
npm run lint,Run ESLint to check code for style/formatting errors
npm run lint:fix,Automatically fix fixable linting issues
npm run migrate,Run your custom database migration script

## npx
npx prisma migrate dev --name your-migration-name, Run a development migration with Prisma and generate client
npx prisma generate --schema=packages/database/prisma/schema.prisma, Regenerate Prisma client from schema
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma, Applies pending migrations in production or CI.
npx prisma migrate reset --schema=packages/database/prisma/schema.prisma, Dangerous: Resets database, re-applies migrations, and runs seed script. Use only in dev/test.
npx prisma studio --schema=packages/database/prisma/schema.prisma, Opens a visual interface to browse and edit your database.
npx prisma db pull --schema=packages/database/prisma/schema.prisma, Pulls your database schema into your schema.prisma (useful for reverse-engineering an existing DB).
npx prisma db push --schema=packages/database/prisma/schema.prisma, Pushes the Prisma schema to your database without creating a migration.

## Testing & Linting
npx jest Runs all Jest test suites.
npx jest --watch Re-runs relevant tests on file change.
npx jest path/to/testFile.test.js Runs a specific test file.
npx eslint . --ext .js,.jsx --fix Auto-fixes lint errors in all files recursively.

## Formatting
npx prettier --write . Formats all code in the repo using Prettier settings.
npx prettier --check . Checks formatting without changing anything.









node scripts/testXpSystem.js, Run manual XP and level system test script
