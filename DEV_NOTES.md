# 🧠 Developer Notes

This file serves as an informal developer log and scratchpad. Use it to jot down observations, questions, TODO breadcrumbs, decisions made during dev,rationales or working notes Copilot should remember. Think of it as the developer's whiteboard.
Entry Template:

### YYYY-MM-DD
- 🧪 Summary of testing/debug attempts
- ⚙️ Implementation notes
- ❗️ Issues discovered
- ✅ Fixes or decisions made
- 🤖 Copilot reminders/adjustments

## Tips:
Add to this file every time you wrap up a dev task or fix something
Let Copilot reference this for context on recurring issues
Review weekly to spot patterns or revisit old logic

## Logging Format
- **[Date]** [Change Area] - [Summary or Problem]
  - [Details / Commands Run / Files Affected]

## Notes

- **[2025-05-29]** Prisma Config - Explicit schema path added to avoid ambiguity
  - Updated: scripts/migrate.js to use --schema flag
  - Path: packages/database/prisma/schema.prisma

- **[2025-05-29]** XP System - Manual test script validated XP rollover and level-up logic

- **[2025-01-XX]** Major Test Infrastructure Overhaul - Fixed critical testing issues
  - ✅ Applied database migrations to test database (equoria_test)
  - ✅ Fixed variable reference issues: mockAddXp → mockAddXpToUser, mockGetPlayerWithHorses → mockGetUserWithHorses
  - ✅ Added missing Jest imports to multiple test files
  - ✅ Created missing files: progressionController.js, leaderboardService.js, horseModelTraitHelpers.js
  - ✅ Updated resultModel.js with missing functions
  - 📊 Result: Improved from major failures to 41 test suites passing (774 tests)

- **[2025-01-XX]** Terminology Standardization Complete - Player/Owner → User migration
  - ✅ Verified no files with "player" or "owner" in filenames exist
  - ✅ Updated all variable references in tests
  - ✅ Database schema relations updated (owner → user)
  - ✅ Removed all 🎯 migration comments
  - 🎯 Next: Complete Prisma schema to match schema.sql (missing many tables)

- **[2025-01-XX]** Database Schema Analysis - Identified major gap
  - ❗️ Current Prisma schema only has User and basic Horse models
  - ❗️ schema.sql has 12+ additional tables: Breed, Stable, Groom, Show, CompetitionResult, etc.
  - 🔧 Need to add missing tables to Prisma schema for full functionality
