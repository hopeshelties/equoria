# API Specifications

## Base URL
- `/api/`

## Endpoints
- **GET /api/horses/:id**: Retrieve a horse by ID.
  - Response: `{ success: true, data: { id, name, ... }, error: null }`
  - Status: 200 (success), 404 (not found), 500 (server error).
- **POST /api/horses**: Create a new horse.
  - Body: `{ name, sex, date_of_birth, breed_id, ... }`
  - Response: `{ success: true, data: { id, name, ... }, error: null }`
  - Status: 201 (created), 400 (bad request), 500 (server error).

## Conventions
- Use JSON for request/response bodies.
- Validate inputs with `express-validator` or `zod`.
- Include `X-Request-ID` header for tracing.
- Use `helmet` for security headers.

## References
- @docs/architecture.md