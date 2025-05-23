# Equoria Project Architecture

## Overview
- **Frontend**: React with TypeScript, Tailwind CSS, and Redux Toolkit for state management.
- **Backend**: Node.js with Express, organized into controllers, services, and models.
- **Database**: PostgreSQL with `public.horses`, `public.breeds`, `public.users`, `public.stables` tables.
- **Authentication**: JWT-based authentication with refresh tokens.
- **API**: RESTful endpoints under `/api/` (e.g., `/api/horses/:id`).

## File Structure
```
Equoria/
├── src/
│   ├── client/         # React frontend
│   ├── server/         # Node.js/Express backend
│   ├── database/       # Database schemas and migrations
├── docs/               # Architecture, API specs, database schema
├── .cursor/rules/      # Cursor rules for AI guidance
```

## Key Conventions
- Follow RESTful API design for backend endpoints.
- Use functional components and Hooks in React.
- Optimize database queries with indexes and parameterized queries.
- Reference `@docs/api_specs.md` for endpoint details and `@docs/database_schema.md` for schema.

## References
- @docs/api_specs.md
- @docs/database_schema.md