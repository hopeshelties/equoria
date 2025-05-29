# 🐎 Equoria - Horse Breeding & Competition Simulation

[![Node.js CI](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-215%20passing-brightgreen)](https://github.com/your-repo/equoria)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A comprehensive horse breeding and competition simulation game backend built with Node.js, Express, and PostgreSQL.

## 🌟 Features

- **🏇 Competition System**: Advanced horse competition simulation with realistic scoring
- **🧬 Breeding Mechanics**: Complex genetic system for horse breeding
- **📊 Statistics Tracking**: Comprehensive stat system with 10+ attributes
- **🏆 Prize Distribution**: Dynamic prize allocation and stat gains
- **🔒 Security**: Enterprise-grade security with rate limiting, CORS, and helmet
- **🔐 Authentication**: Complete JWT-based authentication system
- **🧪 Test Coverage**: 262+ tests with comprehensive coverage
- **📝 Logging**: Structured logging with Winston
- **🗄️ Database**: PostgreSQL with Prisma ORM and migrations
- **📚 API Documentation**: Interactive Swagger/OpenAPI documentation
- **❤️ Health Monitoring**: Comprehensive health checks with database status
- **🐳 Docker Ready**: Production-ready Docker configuration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/equoria.git
   cd equoria
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install database dependencies
   cd ../packages/database
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cd ../../backend
   cp .env.example .env

   # Edit .env with your database credentials
   DATABASE_URL="postgresql://username:password@localhost:5432/equoria"
   PORT=3000
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Run migrations
   cd ../packages/database
   npx prisma migrate deploy

   # Generate Prisma client
   npx prisma generate
   ```

5. **Start the server**
   ```bash
   cd ../../backend
   npm run dev
   ```

The server will start on `http://localhost:3000`

## 📁 Project Structure

```
equoria/
├── backend/                 # Main application
│   ├── controllers/         # Route controllers
│   ├── middleware/          # Custom middleware
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   ├── logic/              # Business logic
│   ├── errors/             # Custom error classes
│   └── tests/              # Test files
├── packages/
│   └── database/           # Database package
│       ├── prisma/         # Prisma schema & migrations
│       └── prismaClient.js # Prisma client setup
└── docs/                   # Documentation
```

## 🔧 API Endpoints

### Health & Monitoring
- `GET /ping` - Simple ping/pong health check
- `GET /health` - Comprehensive health check with database status

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)

### Breeds
- `GET /api/breeds` - Get all horse breeds
- `GET /api/breeds/:id` - Get breed by ID
- `POST /api/breeds` - Create new breed

### Competitions
- `POST /api/competition/enter` - Enter horses in competition

### Traits
- `POST /api/traits/discover/:horseId` - Trigger trait discovery for a horse
- `GET /api/traits/horse/:horseId` - Get all traits for a horse
- `GET /api/traits/definitions` - Get all trait definitions
- `GET /api/traits/discovery-status/:horseId` - Get discovery status for a horse
- `POST /api/traits/batch-discover` - Trigger discovery for multiple horses
- `GET /api/traits/competition-impact/:horseId` - Analyze trait impact for specific discipline
- `GET /api/traits/competition-comparison/:horseId` - Compare trait impact across all disciplines
- `GET /api/traits/competition-effects` - Get all trait competition effects and definitions

### Grooms
- `POST /api/grooms/assign` - Assign a groom to a foal
- `POST /api/grooms/ensure-default/:foalId` - Ensure foal has default groom assignment
- `GET /api/grooms/assignments/:foalId` - Get all assignments for a foal
- `POST /api/grooms/interact` - Record a groom interaction with a foal
- `GET /api/grooms/user/:userid` - Get all grooms for a user
- `POST /api/grooms/hire` - Hire a new groom for a user
- `GET /api/grooms/definitions` - Get groom system definitions

### Documentation
- `GET /api-docs` - Interactive API documentation (Swagger UI)
- `GET /api-docs.json` - OpenAPI specification JSON

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Categories
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Model Tests**: Database model testing
- **Middleware Tests**: Security and validation testing

## 🏗️ Development

### Available Scripts

```bash
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm test            # Run test suite
npm run seed        # Seed database with sample data
npm run seed:shows  # Seed competition shows
```

### Code Quality

The project follows strict coding standards:

- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Jest**: Testing framework
- **ES Modules**: Modern JavaScript modules

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: API request throttling
- **Input Validation**: Request validation with express-validator
- **Error Handling**: Structured error responses
- **Logging**: Security event logging

## 🗄️ Database Schema

### Core Models

- **Horse**: Complete horse data with stats and genetics
- **Breed**: Horse breed definitions
- **User**: User accounts and progression
- **Show**: Competition events
- **CompetitionResult**: Competition history and results

### Key Features

- **Prisma ORM**: Type-safe database access
- **Migrations**: Version-controlled schema changes
- **Relationships**: Complex data relationships
- **Indexing**: Optimized query performance

## 🎮 Game Mechanics

### Competition System

The competition system uses a sophisticated scoring algorithm:

```
🏇 FinalScore =
  BaseStatScore (weighted: 50/30/20)
+ TraitBonus (+5 if discipline matches horse trait)
+ TrainingScore (0–100, optional)
+ SaddleBonus (flat number)
+ BridleBonus (flat number)
+ RiderBonus (% of subtotal)
- RiderPenalty (% of subtotal)
+ HealthModifier (% adjustment based on rating)
+ RandomLuck (±9% for realism)
```

### Stat System

Horses have 10 core statistics:
- Speed, Stamina, Agility, Balance, Precision
- Intelligence, Boldness, Flexibility, Obedience, Focus

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TDD (Test-Driven Development)
- Write comprehensive tests for new features
- Use meaningful commit messages
- Update documentation for API changes
- Ensure all tests pass before submitting PR

## 📊 Performance

- **Response Time**: < 100ms for most endpoints
- **Throughput**: 1000+ requests/minute
- **Database**: Optimized queries with indexing
- **Memory**: Efficient memory usage with connection pooling

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```bash
   # Check PostgreSQL is running
   sudo service postgresql status

   # Verify DATABASE_URL in .env
   ```

2. **Prisma Client Error**
   ```bash
   # Regenerate Prisma client
   cd packages/database
   npx prisma generate
   ```

3. **Port Already in Use**
   ```bash
   # Change PORT in .env or kill process
   lsof -ti:3000 | xargs kill -9
   ```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern Node.js best practices
- Inspired by real horse breeding and competition mechanics
- Community-driven development approach

---

**Made with ❤️ by the Equoria Team**