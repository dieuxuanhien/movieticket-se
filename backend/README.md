<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Supabase Backend Service

## Table of Contents
- [Supabase Backend Service](#supabase-backend-service)
  - [Table of Contents](#table-of-contents)
  - [1. Description](#1-description)
  - [2. Prerequisites](#2-prerequisites)
  - [3. Setup Instructions](#3-setup-instructions)
  - [4. Development](#4-development)
  - [5. Code Quality](#5-code-quality)
    - [5.1 ESLint](#51-eslint)
    - [5.2 Prettier](#52-prettier)
    - [5.3 Pre-commit Hooks](#53-pre-commit-hooks)
    - [5.2 Hot Reload Development](#52-hot-reload-development)
      - [Configuration](#configuration)
      - [Features](#features)
      - [Usage](#usage)
      - [Performance Optimization](#performance-optimization)
      - [Best Practices](#best-practices)
  - [6. Testing](#6-testing)
  - [7. Deployment](#7-deployment)
  - [8. License](#8-license)

## 1. Description
Supabase Backend Service is a backend service for the Supabase platform. It provides robust API endpoints, real-time communications, and secure data handling for seamless user interactions and content management.

## 2. Prerequisites
Before setting up the project, ensure you have the following installed:

1. Install pnpm globally:
    ```bash
    # Using npm
    npm install -g pnpm

    # Using Homebrew (macOS)
    brew install pnpm

    # Using Scoop (Windows)
    scoop install pnpm
    ```

2. Other required tools:
- Node.js (v18 or higher) - For running the JavaScript runtime environment
- PostgreSQL (v14 or higher) - Primary database for data persistence
- Supabase account - For authentication and real-time features
- Docker (optional) - For containerized development and deployment

## 3. Setup Instructions
1. Install NestJS CLI globally:
    ```bash
    pnpm add -g @nestjs/cli
    ```

2. Clone and install dependencies:
    ```bash
    pnpm install
    ```

3. Configure Git hooks for consistent code quality:
    ```bash
    pnpm husky install
    ```

4. Set up your environment variables:
    ```bash
    cp .env.example .env
    ```
    Configure the following essential variables in your `.env`:
    - `DATABASE_URL`: Your PostgreSQL connection string
    - `SUPABASE_URL`: Your Supabase project URL
    - `SUPABASE_KEY`: Your Supabase API key
    - `JWT_SECRET`: Your JWT signing secret

5. Initialize and seed your database:
    ```bash
    npx prisma migrate dev    # Apply database migrations
    npx prisma generate      # Generate Prisma Client
    npx prisma db seed      # Seed initial data
    ```

## 4. Development
Choose the appropriate mode for your development needs:
```bash
# Standard development with basic features
pnpm run start

# Development with hot-reload enabled
pnpm run start:dev

# Development with linting and type checking
pnpm run dev

# Production-ready build with optimizations
pnpm run start:prod
```

## 5. Code Quality
We maintain high code quality standards through automated tools and practices:

### 5.1 ESLint
Our ESLint configuration ensures consistent code style with:
- Strict TypeScript rules for type safety
- Integration with Prettier for formatting
- Custom rules for clean code practices
- Import sorting and organization

Run the linter:
```bash
pnpm run lint        # Check for issues
pnpm run lint:fix    # Automatically fix issues
```

### 5.2 Prettier
Consistent code formatting is enforced with the following rules:
- Single quotes for strings
- Trailing commas in multiline statements
- 2-space indentation
- 80-character line length limit
- Semicolons required
- No trailing spaces

### 5.3 Pre-commit Hooks
Our Git hooks automatically ensure code quality:
- Lint staged files
- Format code with Prettier
- Run relevant tests
- Validate commit messages
- Block commits that don't meet standards

### 5.2 Hot Reload Development
Our development environment is configured with advanced hot reload capabilities to enhance developer productivity:

#### Configuration
The hot reload system is configured in `nest-cli.json`:
```json
{
  "watchOptions": {
    "watchExclusions": ["node_modules", "dist"],
    "watchAssets": true
  }
}
```

#### Features
- **Fast Refresh**: Automatically recompiles and restarts on code changes
- **Memory Efficient**: Uses incremental compilation
- **Selective Reload**: Only reloads affected modules
- **Asset Watching**: Monitors static files and templates
- **Debug Support**: Maintains debugging sessions during reloads

#### Usage
```bash
# Start with basic hot reload
pnpm run start:dev

# Start with debug mode enabled
pnpm run start:debug

# Start with verbose logging
pnpm run start:dev --verbose
```

#### Performance Optimization
- Excludes `node_modules` and `dist` directories
- Implements debouncing for rapid changes
- Supports concurrent compilation
- Maintains TypeScript type checking

#### Best Practices
1. Use `.gitignore` patterns in `watchExclusions`
2. Avoid watching large directories
3. Configure appropriate debounce intervals
4. Utilize memory limits for large projects

## 6. Testing
Comprehensive testing suite for reliable code:
```bash
# Run unit tests with Jest
pnpm run test

# Run end-to-end tests with Cypress
pnpm run test:e2e

# Generate test coverage report
pnpm run test:cov
```

## 7. Deployment
Deploy your application following these steps:

1. Prepare for production:
   - Review the [NestJS deployment guide](https://docs.nestjs.com/deployment)
   - Ensure all environment variables are configured
   - Build the production bundle

2. Deploy using Mau (NestJS Official Platform):
    ```bash
    pnpm install -g mau
    mau deploy
    ```

3. Monitor your deployment:
   - Check application logs
   - Monitor performance metrics
   - Set up alerts for critical issues

## 8. Database Seeding & API Testing

### 8.1 Seeding the Database

The project includes comprehensive seed data for testing and development:

```bash
# Seed the database with sample data
pnpm prisma db seed

# Reset database and reseed (⚠️  Deletes all data)
pnpm prisma migrate reset
```

**What gets seeded:**
- 15 Genres (Action, Comedy, Drama, Horror, etc.)
- 6 Cinemas across Hanoi, Ho Chi Minh, and Da Nang
- 14 Halls with different types (STANDARD, VIP, IMAX)
- 1,600+ Seats auto-generated for each hall
- 12 Popular movies with genres and ratings
- 210 Showtimes for the next 7 days
- Dynamic ticket pricing based on seat type and format
- 7 Users with different roles (Admin, Manager, Staff, User)
- 14 Concessions (snacks, drinks, combos)
- Sample cinema reviews

### 8.2 API Testing with Postman

A complete Postman collection with **80+ requests** is included:

**Import the collection:**
1. Open Postman
2. Click "Import"
3. Select `postman-collection.json`
4. Set environment variable: `baseUrl = http://localhost:3000`

**Collection includes:**
- Authentication (Sign Up, Sign In, Token Management)
- Movies (CRUD, Now Showing, Coming Soon, Showtimes)
- Genres (Full CRUD operations)
- Cinemas (List by city, CRUD, Halls, Showtimes)
- Halls (CRUD, Seat management)
- Showtimes (CRUD, Seat availability)
- Bookings (Seat locking, Booking creation, Payment)
- Tickets (View, Scan for staff)
- Concessions (CRUD for food & beverages)
- Reviews (Cinema reviews with ratings)
- Users (User management, Role assignment)
- Seats (Get and update seat information)
- Health (System health check)

**Sample Credentials** (after seeding):
- Admin: `admin@movieticket.com` (ID: admin-user-001)
- Manager: `manager.hanoi@movieticket.com` (ID: manager-user-001)
- Staff: `staff1@movieticket.com` (ID: staff-user-001)
- User: `user1@example.com` (ID: user-001)

⚠️ **Note**: Users must be created in Supabase Auth with matching emails and IDs.

### 8.3 Additional Documentation

- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Complete guide for seeding and testing
- **[SEEDED_DATA.md](./SEEDED_DATA.md)** - Quick reference for all seeded data
- **[../docs/API_TESTING_WORKFLOW.md](../docs/API_TESTING_WORKFLOW.md)** - Visual workflow diagrams
- **[../docs/TESTING_SETUP_COMPLETE.md](../docs/TESTING_SETUP_COMPLETE.md)** - Setup summary

### 8.4 Quick Testing Workflow

```bash
# 1. Seed the database
pnpm prisma db seed

# 2. Start the development server
pnpm run start:dev

# 3. Import Postman collection and start testing

# 4. View database in GUI (optional)
pnpm prisma studio

# 5. Access Swagger documentation
# http://localhost:3000/api/docs
```

## 9. License
This project is protected under the [MIT License](https://github.com/nestjs/nest/blob/master/LICENSE). See the LICENSE file for details.