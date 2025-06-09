# Database Setup Guide

This guide will help you set up and fix database connection issues for the P2P Transfer application.

## Quick Fix

If you're seeing database connection errors, run this command:

```bash
cd backend
node setup-database.js
```

## Manual Setup

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database

```bash
# Create user (if needed)
createuser -s postgres

# Create database
createdb file_transfer

# Or using psql
psql -U postgres -c "CREATE DATABASE file_transfer;"
```

### 3. Configure Environment

Copy and edit the environment file:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Initialize Database

Run the setup script:
```bash
node setup-database.js
```

Or manually initialize:
```bash
node scripts/initDb.js
```

## Common Issues

### ECONNREFUSED Error
- PostgreSQL is not running
- Wrong host/port configuration
- Solution: `brew services start postgresql` (macOS)

### Authentication Failed
- Wrong username/password
- Solution: Check credentials in `.env` file

### Database Does Not Exist
- Database not created
- Solution: `createdb file_transfer`

### Connection Pool Issues
- Too many connections
- Solution: Restart the application

## Environment Variables

Required variables in `.env`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=file_transfer
DB_USER=postgres
DB_PASSWORD=your_password

# Or use DATABASE_URL for production
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

## Testing Connection

Test your database connection:
```bash
node test-db-connection.js
```

## Production Setup

For production (Render.com, Railway, etc.), the platform will provide `DATABASE_URL` automatically. No manual setup needed.

## Troubleshooting

1. **Check PostgreSQL status:**
   ```bash
   brew services list | grep postgresql
   ```

2. **Check database exists:**
   ```bash
   psql -l | grep file_transfer
   ```

3. **Test connection manually:**
   ```bash
   psql -h localhost -U postgres -d file_transfer
   ```

4. **Reset database:**
   ```bash
   dropdb file_transfer
   createdb file_transfer
   node setup-database.js
   ```

## Docker Setup (Alternative)

Use Docker Compose for easy setup:
```bash
docker-compose up -d postgres
node setup-database.js
```
