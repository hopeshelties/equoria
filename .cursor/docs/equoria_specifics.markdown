# Equoria-Specific Features and Requirements

## Project Overview
- Mobile-first horse simulation game for iOS and Android.
- Free-to-play with IAPs for cosmetics, trait analysis, premium riders, seasonal events.
- Built with React Native, Node.js/Express, PostgreSQL (JSONB), Tailwind CSS.
- Reference `@docs/001_project_overview.mdc`.

## Tech Stack
- React Native with `nativewind`/`tailwind-rn`, Node.js/Express, PostgreSQL with `pg`.
- TDD with Jest, RNTL, Supertest, and `pgtest`/`testcontainers`.
- ESLint, Prettier, and GitHub Actions for CI/CD.
- Optional: Sentry/LogRocket, `pg_stat_statements`.
- Reference `@docs/002_tech_stack.mdc`.

## UI/UX
- Mobile-first for 6"–7" screens.
- Global bottom nav: Dashboard, Stable, Competitions, World, Search, Chat.
- Animated trait reveal (card flip) with `react-native-reanimated`.
- Stable list: filter tray, pagination, batch actions.
- Artisan dashboard and rider heatmap load <500ms.
- Reference `@docs/003_ui_ux_guidelines.mdc`.

## Breeding Mechanics
- `determinePhenotype()` validates against `breeds` table JSONB fields: `allowed_alleles`, `disallowed_combinations`, `allele_weights`, etc.
- Store genotypes in `horses.genotype` (JSONB).
- Reference `@docs/004_breeding_mechanics.mdc`.

## Event System
- Scheduled, randomized, and player-triggered events.
- Tracked in `event_history` with tier-based weighting.
- Premium players get extra clues/maps.
- Reference `@docs/005_event_systems.mdc`.

## Permissions
- Roles: Player, Moderator, Admin.
- Moderator tools: flag review, chat mute, ban queue.
- Admin tools: breed manager, economy control, leaderboard reset.
- Log actions in `mod_actions`.
- Reference `@docs/006_permissions_and_moderation.mdc`.

## Frameworks
- React Native: functional components, Hooks, `nativewind`.
- Express.js: RESTful APIs, middleware (JWT, rate limiting).
- PostgreSQL: JSONB for genetics, breed profiles.
- Reference `@docs/007_frameworks.mdc`.

## Frontend Coding
- ES6+, functional components, Tailwind utilities.
- File structure: `frontend/components/`, `screens/`, `navigation/`.
- Tests with Jest/RNTL before implementation.
- Reference `@docs/008_frontendcoding.mdc`.

## Testing (TDD)
- TDD-first: Jest (unit), Supertest (integration), RNTL (UI).
- 100% coverage for genetics, utilities, critical screens.
- Use `.env.test` for isolated test DB.
- Reference `@docs/009_testing_and_tdd.mdc`.