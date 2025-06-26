# The Last of Guss

A competitive tap-based game where players compete in timed rounds to achieve the highest score. Built with modern web technologies featuring a NestJS backend and React frontend.

## 🎮 Game Overview

### What is "The Last of Guss"?

"The Last of Guss" is a real-time competitive tapping game where players race against time and each other to accumulate the most points during active rounds. The game features a unique scoring system, role-based gameplay, and special mechanics that make every round exciting.

### Game Rules

#### 🏆 Scoring System
- **Basic Scoring**: 1 tap = 1 point
- **Bonus Scoring**: Every 11th tap = 10 points (instead of 1)
- **Example**: Taps 1-10 = 10 points, tap 11 = 10 points, taps 12-21 = 10 points, tap 22 = 10 points, etc.

#### 👥 Player Roles
The game features three distinct player roles with different abilities:

| Role | Assignment | Abilities |
|------|------------|-----------|
| **Admin** | Username: `admin` | Can create new rounds, full game access |
| **Survivor** | Any other username | Normal player with full scoring |
| **Nikita** | Username: `nikita` or `Никита` | Can tap but always gets 0 points (spectator mode) |

*Role assignment happens automatically during user registration based on username.*

#### ⏰ Round Phases
Each game round consists of two phases:

1. **Cooldown Phase** (30 seconds default)
   - Players cannot tap
   - Preparation time before the round begins
   - Players can see the countdown timer

2. **Active Phase** (60 seconds default)
   - Players can tap and earn points
   - Real-time scoring updates
   - Competitive leaderboard

3. **Ended**
   - Round automatically ends when time expires
   - Final scores are calculated and displayed
   - Winner is determined

#### 🎯 Victory Conditions
- **Winner**: Player with the highest score when the round ends
- **Ties**: Multiple winners possible if scores are equal
- **Special Rule**: Nikita players cannot win (always 0 points)

## 🏗️ Architecture

### Technology Stack

#### Backend (`tlog-backend/`)
- **Runtime**: Node.js 18 + TypeScript
- **Framework**: NestJS v10 with Fastify adapter
- **Database**: PostgreSQL 15 with Prisma ORM
- **Authentication**: JWT with 24h access tokens + 7d refresh tokens
- **API Documentation**: Swagger/OpenAPI 3
- **Testing**: Jest with 80%+ coverage requirement

#### Frontend (`frontend/`)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Modern CSS with responsive design
- **State Management**: React hooks and context
- **HTTP Client**: Axios for API communication

### System Features

#### 🔐 Security & Authentication
- **JWT-based Authentication**: Secure token-based auth system
- **Role-based Access Control**: Automatic role assignment and enforcement
- **Password Security**: bcrypt hashing with 12 salt rounds
- **Token Refresh**: Automatic token renewal for seamless UX

#### ⚡ Performance & Scalability
- **Stateless Design**: API supports horizontal scaling
- **Concurrent Safety**: Database transactions with row-level locking
- **Race Condition Protection**: Prevents scoring conflicts under high load
- **Optimized Database**: Strategic use of BIGINT and UUID primary keys

#### 📊 Real-time Features
- **Live Scoring**: Real-time point updates during rounds
- **Round Status**: Live countdown timers and phase transitions
- **Leaderboards**: Dynamic ranking updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- pnpm (recommended) or npm

### 1. Clone the Repository
```bash
git clone <repository-url>
cd TLoG
```

### 2. Backend Setup
```bash
cd tlog-backend

# Install dependencies
pnpm install

# Environment setup
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# Database setup
pnpm prisma generate
pnpm prisma migrate deploy

# Start backend server
pnpm run start:dev
```

The backend API will be available at `http://localhost:3000` with Swagger docs at `http://localhost:3000/docs`.

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

The frontend will be available at `http://localhost:5173`.

### 4. Docker Setup (Alternative)
```bash
# Start all services with Docker Compose
docker-compose up -d

# The application will be available at:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:3001
# - Database: localhost:5432
```

## 🎯 Game Flow

### For Players

1. **Registration/Login**
   - Create account or login with existing credentials
   - Role is automatically assigned based on username
   - Receive JWT tokens for authentication

2. **Waiting for Rounds**
   - View list of available rounds
   - See upcoming round schedules
   - Check leaderboards from previous rounds

3. **Round Participation**
   - Join active rounds during cooldown phase
   - Wait for active phase to begin
   - Tap rapidly to accumulate points
   - Watch real-time leaderboard updates

4. **Results**
   - View final scores when round ends
   - See personal statistics and ranking
   - Prepare for next round

### For Admins

1. **Round Management**
   - Create new rounds with custom timing
   - Schedule rounds for optimal player participation
   - Monitor round statistics and player engagement

2. **System Administration**
   - Access to all game data and statistics
   - User management capabilities
   - System health monitoring

## 📊 Database Schema

### Core Entities

```sql
-- Users with role-based access
users (
  id: BIGINT PRIMARY KEY,
  username: VARCHAR UNIQUE,
  password_hash: VARCHAR,
  role: ENUM('admin', 'survivor', 'nikita'),
  created_at: TIMESTAMP
)

-- Game rounds with timing
rounds (
  id: UUID PRIMARY KEY,
  created_at: TIMESTAMP,
  starts_at: TIMESTAMP,
  ends_at: TIMESTAMP
)

-- Player performance per round
player_round_stats (
  round_id: UUID,
  user_id: BIGINT,
  taps: INTEGER,
  points: INTEGER,
  PRIMARY KEY (round_id, user_id)
)

-- Audit trail of all taps
tap_events (
  id: BIGINT PRIMARY KEY,
  timestamp: TIMESTAMP,
  round_id: UUID,
  user_id: BIGINT
)
```

## 🔧 Configuration

### Environment Variables

#### Backend (`tlog-backend/.env`)
```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/guss

# Game Settings
ROUND_DURATION=60          # Active phase duration (seconds)
COOLDOWN_DURATION=30       # Cooldown phase duration (seconds)

# Server
PORT=3000                  # API server port

# Security
JWT_SECRET=your-secret-key # JWT signing secret (required)
```

#### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3000  # Backend API URL
```

## 🧪 Testing

### Backend Testing
```bash
cd tlog-backend

# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Coverage report
pnpm run test:cov
```

### Frontend Testing
```bash
cd frontend

# Component tests
pnpm run test

# E2E tests
pnpm run test:e2e
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `GET /auth/profile` - User profile

### Game Endpoints
- `GET /rounds` - List rounds
- `POST /rounds` - Create round (admin only)
- `GET /rounds/:id` - Round details
- `POST /tap/:roundId` - Submit tap

### Interactive Documentation
Visit `http://localhost:3000/docs` when the backend is running for complete Swagger documentation.

## 🚀 Deployment

### Production Considerations

#### Backend
- Use PostgreSQL with connection pooling (PgBouncer)
- Set up read replicas for statistics queries
- Configure proper JWT secrets and security headers
- Enable structured logging and monitoring

#### Frontend
- Build optimized production bundle
- Configure proper API endpoints
- Set up CDN for static assets
- Enable GZIP compression

#### Infrastructure
- Horizontal scaling support for API servers
- Database clustering for high availability
- Load balancing and health checks
- Monitoring and alerting setup

## 🤝 Contributing

1. **Code Style**: Follow TypeScript best practices and project conventions
2. **Testing**: Maintain 80%+ test coverage
3. **Documentation**: Update docs for any API changes
4. **Commits**: Use conventional commit messages
5. **Architecture**: Follow the established patterns and file organization

## 🔮 Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket integration for live scoring
- **Tournaments**: Multi-round tournament system
- **Achievements**: Player badges and milestone tracking
- **Social Features**: Friend lists and private rooms
- **Analytics**: Advanced player statistics and insights
- **Mobile App**: Native mobile applications

### Technical Improvements
- **Caching**: Redis integration for performance
- **Monitoring**: Comprehensive metrics and alerting
- **CI/CD**: Automated testing and deployment pipelines
- **Internationalization**: Multi-language support

## 📞 Support

For technical issues, feature requests, or questions about the game mechanics, please refer to the documentation or create an issue in the project repository.

---

**"The Last of Guss"** - Where every tap counts and every second matters! 🎮
