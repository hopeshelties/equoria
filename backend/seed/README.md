# Horse Seeding Documentation

This directory contains the horse seeding functionality for the Equoria backend.

## Files

- `horseSeed.js` - Main seeding script
- `horseSeed.test.js` - Comprehensive test suite
- `README.md` - This documentation file

## Usage

### Running the Seed Script

From the backend directory, you can run the seeding script using npm scripts:

```bash
# Production seeding
npm run seed

# Development seeding (with NODE_ENV=development)
npm run seed:dev

# Or run directly
node seed/horseSeed.js
```

### What the Seed Script Does

1. **Environment Setup**: Loads environment variables and validates `DATABASE_URL`
2. **Reference Records**: Ensures required User and Stable records exist (IDs 1 and 2)
3. **Breed Management**: Finds or creates breed records for horse data
4. **Duplicate Prevention**: Checks for existing horses to avoid duplicates
5. **Horse Creation**: Creates horses using the `horseModel.createHorse()` function
6. **Summary Reporting**: Provides detailed success/failure statistics

### Sample Data

The script includes 3 sample horses:

1. **Midnight Comet** (4 years, Stallion, Thoroughbred)
2. **Golden Dawn** (5 years, Mare, Arabian)
3. **Shadowfax Spirit** (1 year, Colt, Thoroughbred)

### Features

- **Duplicate Prevention**: Won't create horses with existing names
- **Relationship Handling**: Properly creates/links breeds, owners, and stables
- **Error Handling**: Graceful failure with detailed error reporting
- **Validation**: Uses horseModel validation for data consistency
- **Comprehensive Logging**: Detailed success/failure information

### Output Examples

**Successful Run:**

```
[seed] Environment loaded successfully
[seed] Starting to seed horses with Prisma...
[seed] Ensured User ID 1 exists.
[seed] Ensured User ID 2 exists.
[seed] Ensured Stable ID 1 exists.
[seed] Ensured Stable ID 2 exists.
[seed] Found existing breed: Thoroughbred (ID: 1)
[seed] Successfully inserted horse: Midnight Comet (ID: 1)
[seed] --- Horse Seeding Summary ---
[seed] Successfully inserted: 3 horses
[seed] Skipped duplicates: 0 horses
[seed] Failed to insert: 0 horses
[seed] Horse seeding completed successfully.
[seed] All seeding operations completed successfully.
[seed] Prisma client disconnected.
```

**Duplicate Prevention:**

```
[seed] Horse "Midnight Comet" already exists, skipping...
[seed] Skipped duplicates: 1 horses
```

### Requirements

- PostgreSQL database with Prisma schema applied
- Valid `DATABASE_URL` environment variable
- All npm dependencies installed

### Testing

Run the comprehensive test suite:

```bash
npm test -- backend/seed/horseSeed.test.js
```

The test suite covers:

- Breed finding and creation
- Horse existence checking
- Reference record creation
- Error handling scenarios
- Database failure recovery

### Error Handling

The script handles various error scenarios:

- **Missing Environment Variables**: Exits with clear error message
- **Database Connection Issues**: Logs errors and continues where possible
- **Duplicate Data**: Skips existing horses without failing
- **Invalid Data**: Uses horseModel validation to catch issues
- **Partial Failures**: Reports success/failure statistics

### Security Notes

- Database URL is validated but not logged for security
- All database operations use Prisma Client for SQL injection protection
- Error messages are detailed but don't expose sensitive information
