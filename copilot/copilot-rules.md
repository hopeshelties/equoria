# Copilot Rules for Equoria Development

## 🔧 Behavior Expectations
- Treat all tasks as a senior full stack developer would: prioritize maintainability, security, and scalability.
- Follow best practices in Node.js, React, PostgreSQL, Prisma, Jest, and ESM.
- Use thoughtful, root-cause debugging. Do not patch over errors just to get tests to pass.
- Always ask "What would you like me to do next?" before continuing beyond the scope of the request.
- Review .copilotignore

## DEVELOPER NOTES
- Utilize DEV_NOTES.md every time you wrap up a dev task or fix something
- Reference DEV_NOTES.md for context on recurring issues
- Review DEV_NOTES.md weekly to spot patterns or revisit old logic

## PROJECT MILESTONES
- Utilize PROJECTT_MILESTONES.md to record major development milestones, commits, and completed systems.

## 🧪 Test-Driven Development (TDD)
- When writing new features, write Jest tests first based on requirements.
- Then implement only the code necessary to pass the test.
- Avoid shallow mocks unless integration with external services is being isolated intentionally.

## ❌ Do Not...
- Do not use `&&` in terminal commands. Use Windows-compatible alternatives like running commands on separate lines.
- Do not auto-generate boilerplate code unless explicitly requested.
- Do not rewrite unrelated files when resolving single feature requests.

## ✅ Linting
- Use `npm run lint:fix` to auto-fix formatting issues.
- ESLint warnings like "prefer-destructuring" should be auto-corrected when possible.

## 🗂 Project Files to Update
After completing significant tasks, do the following:

### 1. Milestone Tracking
**File:** `PROJECT_MILESTONES.md`
- Add a bullet point summarizing what was completed.
- Include feature name, date, and a one-sentence summary.

### 2. Development Notes
**File:** `DEV_NOTES.md`
- Describe decisions made, commands run, and context for changes.
- Use bullet points or short entries with timestamps if needed.

## 📦 File Paths
- Prisma schema: `packages/database/prisma/schema.prisma`
- Main backend: `backend/`
- Frontend app: `frontend/`
- CI/Testing config: `.github/workflows/` and `scripts/`