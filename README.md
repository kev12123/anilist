# Ani.list

A modern social network for anime fans — track, review, score, and discuss anime with the community.

**Not a streaming site.** Just the social layer.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Fastify (Node.js) |
| Database | SQLite via Prisma |
| Cache | Redis |
| Real-time | Socket.io (DMs, live discussions) |
| Auth | JWT (email/password) |
| Anime Data | AniList GraphQL API (free, no key needed) |

## Project Structure

```
anilist/
├── apps/
│   ├── web/          # Next.js 14 frontend (port 3000)
│   └── api/          # Fastify backend (port 4000, socket 4001)
├── packages/
│   └── db/           # Prisma schema + SQLite
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Redis running locally (`docker run -d -p 6379:6379 redis:7-alpine`)

### Setup

```bash
# 1. Install dependencies
cd anilist
pnpm install

# 2. Set up environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Create the database env file (Prisma needs this to find the DB)
# On Windows (PowerShell):
"DATABASE_URL=file:./dev.db" | Out-File -FilePath packages/db/.env -Encoding utf8
# On Mac/Linux:
# echo "DATABASE_URL=file:./dev.db" > packages/db/.env

# 4. Run database migrations
cd packages/db
pnpm push

# 5. Start everything
cd ../..
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:4000
- API health: http://localhost:4000/health

## Docker (All-in-one)

```bash
# Build and start all services
docker compose up --build

# First run - run migrations
docker compose exec api npx prisma db push --schema=../../packages/db/prisma/schema.prisma
```

## Features

- 🔍 **Browse & Search** — powered by AniList API, cached in Redis
- 📋 **My List** — track anime as Watching / Completed / Plan to Watch / Dropped
- ⭐ **Reviews & Scores** — rate and review anime + individual episodes
- 💬 **Discussions** — threaded discussions on each anime page
- 📨 **Direct Messages** — real-time DMs via Socket.io
- 👥 **Social** — follow users, activity feed
- 🌑 **Dark theme** — always

## Environment Variables

### API (`apps/api/.env`)
```
PORT=4000
SOCKET_PORT=4001
JWT_SECRET=your-secret-here
DATABASE_URL=file:../../packages/db/dev.db
REDIS_HOST=localhost
REDIS_PORT=6379
WEB_URL=http://localhost:3000
```

### Web (`apps/web/.env`)
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4001
API_URL=http://localhost:4000
```
