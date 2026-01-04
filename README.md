# KeepAlive Manager

A full-stack Next.js admin application for managing PostgreSQL keepalive targets. Built with Next.js, Prisma, and Tailwind CSS, running on Vercel with Edge runtime.

## Features

- **Admin Dashboard**: Secure web interface for managing targets
- **PostgreSQL Targets**: Monitor and keep alive PostgreSQL databases via HTTP endpoints
- **Smart Scheduling**: Configure per-target frequencies (daily, 12h, 6h, hourly)
- **Run History**: Track all keepalive execution results
- **HMAC-Signed Config**: Generate secure `KEEPALIVE_TARGETS` environment variable
- **Edge Runtime**: All API routes run on Vercel Edge for optimal performance
- **Encrypted Credentials**: AES-256-GCM encryption for sensitive data

## Architecture

- **Framework**: Next.js 15+ with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Session-based with iron-session
- **Runtime**: Vercel Edge Runtime
- **Styling**: Tailwind CSS

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Authentication
ADMIN_PASSWORD="your-secure-admin-password"
SESSION_SECRET="your-long-random-session-secret-at-least-32-characters"

# Keepalive Configuration
KEEPALIVE_SECRET="your-long-random-keepalive-secret-for-hmac-signing"

# Vercel Cron
CRON_SECRET="your-cron-secret-for-vercel"

# Optional Configuration
RUN_TIMEOUT_MS="8000"
RUN_CONCURRENCY="5"
HISTORY_RETENTION_DAYS="30"
```

### 3. Initialize Database

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Or push schema without migrations (development)
pnpm db:push
```

### 4. Run Development Server

```bash
pnpm dev
```

Visit `http://localhost:3000` and login with your `ADMIN_PASSWORD`.

## Usage

### Managing Targets

1. **Login**: Navigate to `/login` and enter your admin password
2. **Add Target**: Click "Add Target" and provide:
   - Name: Friendly identifier
   - Type: PostgreSQL (only option currently)
   - Frequency: How often to ping (daily, 12h, 6h, 1h)
   - Credentials: JSON with `httpEndpoint` or `DATABASE_URL`
   - Active: Enable/disable target

Example credentials:
```json
{
  "httpEndpoint": "https://your-project.vercel.app/api/keepalive",
  "DATABASE_URL": "postgresql://..."
}
```

3. **Edit/Delete**: Use actions in the targets table

### Manual Runs

Click "Run Now" to immediately execute all active targets.

### Generate KEEPALIVE_TARGETS

1. Navigate to the "Generate KEEPALIVE_TARGETS" section
2. Click "Generate KEEPALIVE_TARGETS"
3. Copy the output to your `.env` file in consumer projects

The generated variable is HMAC-signed and includes all active targets.

### View History

The "Run History" section shows recent execution results with:
- Target name
- Success/failure status
- Duration
- Trigger type (manual/cron)
- Timestamp
- Error message (if any)

## Scheduled Execution

Vercel Cron runs `/api/run/cron` every 10 minutes. The application:
1. Checks which targets are due based on their frequency
2. Executes due targets concurrently (respects `RUN_CONCURRENCY`)
3. Records results in the database

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with admin password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Check auth status

### Targets
- `GET /api/targets` - List all targets
- `POST /api/targets` - Create target
- `GET /api/targets/[id]` - Get target
- `PATCH /api/targets/[id]` - Update target
- `DELETE /api/targets/[id]` - Delete target

### Execution
- `POST /api/run/manual` - Manual run (requires auth)
- `GET/POST /api/run/cron` - Cron endpoint (requires `CRON_SECRET`)

### History
- `GET /api/history` - Get run history (paginated)

### Generator
- `POST /api/generate/keepalive-targets` - Generate signed config

### Schedule
- `GET /api/schedule` - Get available frequencies

## Database Schema

```prisma
model Target {
  id          String   @id @default(uuid())
  name        String
  type        String   // "postgresql"
  credentials String   // Encrypted JSON
  isActive    Boolean  @default(true)
  frequency   String   @default("daily")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  runItems    RunItem[]
}

model Run {
  id          String    @id @default(uuid())
  triggerType String    // "cron" | "manual"
  status      String    // "running" | "completed" | "failed"
  startedAt   DateTime  @default(now())
  finishedAt  DateTime?
  runItems    RunItem[]
}

model RunItem {
  id           String   @id @default(uuid())
  runId        String
  targetId     String
  status       String   // "success" | "failure"
  durationMs   Int?
  errorMessage String?
  createdAt    DateTime @default(now())
  run          Run
  target       Target
}
```

## Security Features

1. **Password-based authentication** with rate limiting (5 attempts per 15 min)
2. **Session cookies**: HttpOnly, Secure, SameSite=Strict
3. **Credentials encryption**: AES-256-GCM at rest
4. **HMAC signatures**: Verify integrity of `KEEPALIVE_TARGETS`
5. **CRON_SECRET validation**: Prevent unauthorized cron execution
6. **No public endpoints**: All require authentication

## Deployment

### Deploy to Vercel

```bash
vercel deploy
```

### Set Environment Variables

Configure all required environment variables in Vercel dashboard:
- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `KEEPALIVE_SECRET`
- `CRON_SECRET`

### Run Migrations

After deployment, run migrations:

```bash
vercel env pull .env.production.local
pnpm db:migrate
```

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema to database (no migrations)
- `pnpm db:migrate` - Run migrations
- `pnpm db:studio` - Open Prisma Studio

## License

MIT
