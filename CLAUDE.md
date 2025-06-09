# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TaskTimeFlow is a productivity web application that combines Kanban-style task management with timeboxing through timeline views. It features Google Calendar and Google Tasks integration for seamless synchronization.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: NestJS + TypeScript + Prisma
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth with Google OAuth
- **Real-time**: Socket.io
- **Monorepo**: Turborepo

## Project Structure

```
TaskTimeFlow/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── ui/           # Shared UI components
│   ├── types/        # Shared TypeScript types
│   └── utils/        # Shared utilities
├── docs/             # Project documentation
└── docker-compose.yml
```

## Development Commands (Once initialized)

```bash
# Install dependencies
pnpm install

# Development
pnpm dev              # Run all apps in development mode
pnpm dev:web          # Run only frontend
pnpm dev:api          # Run only backend

# Build
pnpm build            # Build all apps
pnpm build:web        # Build frontend
pnpm build:api        # Build backend

# Testing
pnpm test             # Run all tests
pnpm test:unit        # Unit tests only
pnpm test:e2e         # E2E tests only

# Linting & Formatting
pnpm lint             # Run ESLint
pnpm format           # Run Prettier

# Database
pnpm db:push          # Push schema changes
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio
```

## Key Features

1. **Kanban Board**: Drag-and-drop task cards with status management
2. **Timeline View**: Time-boxed task scheduling with calendar integration
3. **Google Integration**: Bi-directional sync with Google Calendar and Tasks
4. **Pomodoro Timer**: Built-in timer with task tracking
5. **Time Tracking**: Automatic recording of actual vs estimated time

## Architecture Notes

- **State Management**: Zustand for client state, TanStack Query for server state
- **Real-time Sync**: WebSocket connections for live updates
- **Optimistic UI**: Updates appear instantly, with rollback on errors
- **Theme System**: Multiple themes including glassmorphism

## Google API Integration

- Scopes required: Calendar, Tasks, UserInfo
- Uses sync IDs to prevent duplicates
- Implements conflict resolution strategies
- Rate limiting with queue management

## Development Phases

1. **Phase 1**: Basic infrastructure and authentication
2. **Phase 2**: Core Kanban and Timeline features
3. **Phase 3**: Google integration
4. **Phase 4**: Advanced features (Pomodoro, reporting)
5. **Phase 5**: Commercialization (Stripe, subscriptions)

## Important Files

- `/docs/requirements.md` - Detailed requirements
- `/docs/system-design.md` - System architecture
- `/docs/tech-stack-decision.md` - Technology choices
- `/docs/ui-design-concept.md` - UI/UX concepts
- `/docs/development-roadmap.md` - Development timeline