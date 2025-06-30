# The Last of Guss - Backend API

A high-performance, scalable backend API for "The Last of Guss" tap-based game built with NestJS, TypeScript, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- pnpm (recommended) or npm

### Installation

1. **Clone and navigate to backend directory:**
   ```bash
   cd tlog-backend
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory as .env.example

4. **Database Setup:**
   ```bash
   # Generate Prisma client
   pnpm prisma generate
   
   # Run database migrations
   pnpm prisma migrate deploy
   
   # (Optional) Seed the database
   pnpm prisma db seed
   ```

5. **Start the server:**
   ```bash
   # Development mode
   pnpm run start:dev
   
   # Production mode
   pnpm run start:prod
   ```

The API will be available at `http://localhost:3000` with Swagger documentation at `http://localhost:3000/docs`.

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18 + TypeScript (strict mode)
- **Framework**: NestJS v10 with Fastify adapter
- **Database**: PostgreSQL 15 with Prisma ORM
- **Authentication**: JWT with role-based access control
- **Documentation**: Swagger/OpenAPI 3
- **Testing**: Jest with 80%+ coverage requirement

### Module Structure
```
src/
├── config/          # Configuration management
├── database/        # Prisma service and database utilities
├── logger/          # Logging infrastructure
├── modules/         # Feature modules
│   ├── auth/        # Authentication & authorization
│   ├── user/        # User management
│   ├── rounds/      # Game rounds management
│   ├── taps/        # Tap scoring system
│   ├── stats/       # Statistics and leaderboards
│   └── game.module.ts  # Module aggregator
└── swagger/         # API documentation
```

## 🔐 Authentication System

### User Registration & Login
- **Signup**: `POST /auth/signup` - Creates new user with auto-assigned role
- **Login**: `POST /auth/login` - Returns JWT access and refresh tokens
- **Token Refresh**: `POST /auth/refresh` - Renews tokens using refresh token
- **Profile**: `GET /auth/profile` - Returns current user information

### Role-Based Access Control

User roles are automatically assigned based on username during registration:

| Username | Role | Permissions |
|----------|------|-------------|
| `admin` | admin | Can create rounds, access all endpoints |
| `nikita` or `Никита` | nikita | Can tap but gets 0 points |
| Any other | survivor | Normal player with full scoring |

### JWT Token System
- **Access Token**: 24-hour expiry for API access
- **Refresh Token**: 7-day expiry for token renewal
- **Security**: bcrypt password hashing with 12 salt rounds

## 🎮 Game Rules & Mechanics

### Scoring System
- **1 tap = 1 point** for normal players
- **Every 11th tap = 10 points** (bonus scoring)
- **Nikita role**: Taps are recorded but always receives 0 points

### Round Phases
1. **Cooldown Phase**: `COOLDOWN_DURATION` seconds - taps are rejected
2. **Active Phase**: `ROUND_DURATION` seconds - taps are accepted
3. **Ended**: Round automatically ends when `ends_at < current_time`

### Concurrency & Scaling
- **Stateless Design**: Works with multiple API instances
- **Transaction Safety**: Uses Prisma transactions with `FOR UPDATE` locks
- **Race Condition Protection**: Row-level locking prevents scoring conflicts

## 📊 Database Schema

### Primary Key Strategy
- **Users**: `BIGINT AUTOINCREMENT` for high-performance joins
- **Rounds**: `UUID` for distributed system uniqueness
- **Tap Events**: `BIGINT AUTOINCREMENT` for append-only performance
- **Player Stats**: Composite key `(round_id, user_id)`

### Core Tables
```sql
users (id: BIGINT, username: UNIQUE, password_hash, role: ENUM, created_at)
rounds (id: UUID, created_at, starts_at, ends_at)
player_round_stats (round_id: UUID, user_id: BIGINT, taps: INT, points: INT)
tap_events (id: BIGINT, timestamp, round_id: UUID, user_id: BIGINT)
```

## 🛠️ Development

### Available Scripts
```bash
# Development
pnpm run start:dev        # Start with hot reload
pnpm run start:debug      # Start with debugger

# Production
pnpm run build            # Build the application
pnpm run start:prod       # Start production server

# Testing
pnpm run test             # Run unit tests
pnpm run test:e2e         # Run end-to-end tests
pnpm run test:cov         # Run tests with coverage

# Database
pnpm run prisma:generate  # Generate Prisma client
pnpm run prisma:migrate   # Run migrations
pnpm run prisma:studio    # Open Prisma Studio
```

### Code Quality
- **ESLint**: Enforces code style and quality
- **Prettier**: Automatic code formatting
- **TypeScript Strict**: Full type safety
- **One Class Per File**: Mandatory organization rule

### Testing Strategy
- **Unit Tests**: Co-located with modules (`*.spec.ts`)
- **E2E Tests**: Separate test directory (`*.e2e-spec.ts`)
- **Coverage**: Minimum 80% required
- **Mocking**: Comprehensive service mocking for isolation

## 📚 API Documentation

### Swagger UI
Access interactive API documentation at `http://localhost:3000/docs` when the server is running.

### Core Endpoints

#### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `GET /auth/profile` - Get user profile

#### Game Management
- `GET /rounds` - List all rounds
- `POST /rounds` - Create new round (admin only)
- `GET /rounds/:id` - Get round details with stats
- `POST /tap/:roundId` - Submit a tap for scoring

## 🔧 Configuration

### Environment Variables
All configuration is validated at startup using Joi schemas:

```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/guss

# Game Settings
ROUND_DURATION=60          # Active phase duration in seconds
COOLDOWN_DURATION=30       # Cooldown phase duration in seconds

# Server
PORT=3000                  # API server port

# Security
JWT_SECRET=change-me       # JWT signing secret (REQUIRED)
```

### Configuration Profiles
- `app.config.ts` - Server and game timing settings
- `db.config.ts` - Database connection settings
- `jwt.config.ts` - JWT and authentication settings

## 🚦 Production Deployment

### Prerequisites
- PostgreSQL 15+ with connection pooling (PgBouncer recommended)
- Node.js 18+ runtime
- Environment variables properly configured

### Performance Considerations
- **Horizontal Scaling**: API is stateless and supports multiple instances
- **Database**: Use read replicas for statistics queries
- **Connection Pooling**: PgBouncer in transaction mode recommended
- **Monitoring**: Structured logging with correlation IDs

### Health Checks
The API provides health check endpoints for container orchestration:
- Application health monitoring
- Database connectivity checks
- Memory and performance metrics

## 🧪 Testing

### Running Tests
```bash
# Unit tests only
pnpm run test

# E2E tests
pnpm run test:e2e

# Coverage report
pnpm run test:cov
```

### Test Structure
- **Unit Tests**: Test individual services and controllers
- **Integration Tests**: Test complete request flows
- **E2E Tests**: Test full application scenarios
- **Fixtures**: Reusable test data and mocks

## 📈 Monitoring & Logging

### Structured Logging
- **Development**: Colorized console output
- **Production**: JSON-formatted logs
- **Correlation IDs**: Request tracking across services
- **Performance**: HTTP request duration logging

### Metrics
- Database query performance
- Authentication success/failure rates
- Game round participation metrics
- API response times

## 🤝 Contributing

1. Follow the established code organization rules
2. Maintain 80%+ test coverage
3. Use conventional commit messages
4. Ensure all tests pass before submitting PR
5. Update documentation for API changes

## 📝 License

This project is part of "The Last of Guss" game implementation.
