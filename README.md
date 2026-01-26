# The Last of Guss

> **Disclaimer**: This is a joke/demo application designed to stress-test backend architecture. The frontend intentionally lacks optimizations to simulate high request loads to the server, real-time data processing, and race condition handling. The goal is to demonstrate how the backend handles concurrent requests, data consistency, and scalability under pressure.

A competitive tap-based game where players compete in timed rounds to achieve the highest score. Built with modern web technologies featuring a NestJS backend and React frontend.

**Live Demo**: [tlog.mayk05.pro](https://tlog.mayk05.pro)

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

## 📞 Support

For technical issues, feature requests, or questions about the game mechanics, please refer to the documentation or create an issue in the project repository.

---

**"The Last of Guss"** - Where every tap counts and every second matters! 🎮
