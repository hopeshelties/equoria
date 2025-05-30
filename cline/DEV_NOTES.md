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
