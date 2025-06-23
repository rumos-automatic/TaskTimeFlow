# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TaskTimeFlow is a next-generation task management SaaS that combines innovative 3-screen UI (Task Pool × Timeline × Focus) with complete Google Calendar/Tasks integration. It solves the problem of tasks piling up without execution by implementing timeboxing and Kanban fusion.

**Core Concept**: "Drag & drop task cards to timeline, sync with Google Calendar/Tasks for the ultimate timeboxing task management app"

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Shadcn/UI
- **Backend**: Supabase (BaaS) + Vercel Edge Functions
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth with Google OAuth
- **Real-time**: Supabase Realtime (WebSocket)
- **Hosting**: Vercel (Global CDN)
- **AI Integration**: OpenAI GPT-4, Claude, Google Gemini (Edge APIs)

## Development Commands (Once initialized)

```bash
# Install dependencies
npm install

# Development
npm run dev           # Run development server
npm run build         # Build for production
npm run start         # Start production server

# Testing
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:e2e      # E2E tests only

# Linting & Formatting
npm run lint          # Run ESLint
npm run format        # Run Prettier

# Database (Supabase)
npm run db:push       # Push schema changes
npm run db:migrate    # Run migrations
npm run db:studio     # Open database studio
```

## Core Features - Revolutionary 3-Screen UI

### 1. Task Pool Screen (Left)
- Google Tasks integration with real-time sync
- Category tabs (Work/Personal/Custom)
- Priority-based color coding (High:Red, Med:Yellow, Low:Green)
- Draggable task cards with sync indicators
- Voice input support for new tasks

### 2. Timeline/Calendar Screen (Center)
- **Timeline View**: Daily time axis display (1-hour units)
- **Calendar View**: Weekly/Monthly view switching
- Google Calendar bi-directional sync
- Visual highlighting of available time slots
- Drag & drop task placement with time-slot magnets
- Distinct display for Events (purple) vs Tasks (blue)

### 3. Focus Screen (Right)
- Pomodoro timer (25min/customizable)
- Progress ring visualization
- Task statistics (completed/remaining)
- Current/next task display
- Gradient background for focus mode

## Advanced Operation Experience

### PC Version
- Full keyboard shortcuts support
  - `Ctrl/Cmd + 1,2,3`: Screen switching
  - `Space`: Timer start/stop
  - `Ctrl/Cmd + N`: New task
- Tab/Split view mode switching
- 3-finger trackpad swipe support

### Mobile Version
- Horizontal swipe for screen switching
- Edge-pull (cross-screen drag & drop)
- Haptic feedback
- One-handed operation optimization

## Smart Features

- **Quick Dock**: Always display top 3 frequently used tasks
- **Timeboxing**: Auto-suggest tasks for available time slots
- **Context Aware**: Prioritize short tasks during travel time

## Architecture Notes

- **State Management**: Zustand for client state, TanStack Query for server state
- **Real-time Sync**: Supabase Realtime for live updates
- **Optimistic UI**: Instant updates with error rollback
- **Theme System**: Multiple themes including glassmorphism
- **PWA Support**: Offline functionality for basic features

## Google API Integration

- **Scopes**: Calendar, Tasks, UserInfo
- **Sync Strategy**: Bi-directional real-time synchronization
- **Conflict Resolution**: Smart merge strategies
- **Rate Limiting**: Queue management with retry logic
- **Duplicate Prevention**: Sync IDs and checksum validation

## Development Phases

### Phase 1: MVP (3 months)
- **Month 1**: Infrastructure, authentication, Google integration
- **Month 2**: 3-screen UI implementation, drag & drop
- **Month 3**: Sync functionality, beta testing

### Phase 2: Pro Version (3 months)
- **Month 4-5**: Multi-AI integration (GPT-4, Claude, Gemini)
- **Month 6**: Analytics, advanced integrations

### Phase 3: Enterprise (6 months)
- **Month 7-12**: Team features, B2B functionality

## Business Model

### Pricing Tiers
- **Free**: Basic features, 5 projects/month
- **Personal**: $9.99/month (unlimited tasks, Google sync)
- **Pro**: $19.99/month (AI features, advanced analytics)
- **Team**: $49.99/month (5 users, team features)
- **Enterprise**: Custom pricing

### Success Metrics
- **DAU/MAU**: 40%+ target
- **Task Completion Rate**: 70%+ target
- **6-month Retention**: 60%+ target

## Important Files

- `/docs/requirements.md` - Detailed requirements and specifications
- `/docs/system-design.md` - System architecture and design
- `/docs/tech-stack-decision.md` - Technology choices and rationale
- `/docs/ui-design-concept.md` - UI/UX design concepts
- `/docs/development-roadmap.md` - Development timeline and milestones
- `/docs/database-schema.md` - Database schema and data models
- `/docs/api-specification.md` - API endpoints and specifications
- `/docs/auth-architecture.md` - Authentication and authorization design