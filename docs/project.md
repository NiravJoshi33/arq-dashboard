# Product Requirements Document: ARQ Monitoring Dashboard

## Overview

**Product Name**: ARQ Monitor  
**Version**: 1.0 (Monitoring Only)  
**Target Users**: Python developers using ARQ task queue library  
**Problem**: Existing ARQ monitoring tool (arq-ui) is outdated (2+ years unmaintained), Python-based, and lacks modern UI/UX  
**Solution**: Modern TypeScript-based monitoring dashboard with real-time updates and better developer experience

## Goals & Success Metrics

**Primary Goals**:

- Provide real-time visibility into ARQ job execution and queue health
- Deliver superior UX compared to existing arq-ui
- Enable quick debugging of failed jobs and performance bottlenecks

**Success Metrics**:

- Dashboard loads in <2 seconds
- Real-time updates with <1 second latency
- Support monitoring of queues with 10,000+ jobs without performance degradation
- GitHub stars/adoption within ARQ community

## User Personas

**Primary**: Backend developer running ARQ workers in development/staging environments who needs to debug job failures and monitor queue health

**Secondary**: DevOps engineer monitoring production ARQ workers who needs alerting and historical trends

## Core Features (v1.0 - Monitoring Only)

### 1. Dashboard Overview

**Priority**: P0  
**Description**: High-level metrics and system health at a glance

**Requirements**:

- Display total jobs (queued, in-progress, complete, failed)
- Show active worker count
- Display queue depth per queue name
- Show success/failure rates (last hour, last 24h)
- Real-time updates (polling or SSE every 2-5 seconds)
- Visual indicators for health status (green/yellow/red)

**Acceptance Criteria**:

- All metrics load within 1 second on initial page load
- Auto-refresh without full page reload
- Mobile-responsive layout

### 2. Job List & Search

**Priority**: P0  
**Description**: Browse and search all jobs with filtering capabilities

**Requirements**:

- Paginated job list (50 jobs per page)
- Columns: Job ID, Function Name, Status, Queue, Enqueued At, Started At, Completed At, Duration
- Filter by: status (queued/in-progress/complete/failed), queue name, function name, time range
- Search by job ID or function name
- Sort by any column
- Click job to view details

**Acceptance Criteria**:

- Search returns results in <500ms for queues with 10k jobs
- Filters work in combination
- Sorting persists across pagination

### 3. Job Detail View

**Priority**: P0  
**Description**: Deep inspection of individual job execution

**Requirements**:

- Display job metadata: ID, function name, queue, status, timestamps
- Show job arguments (formatted JSON)
- Display job result (for completed jobs)
- Show error details and stack trace (for failed jobs)
- Display retry count and next retry time (if applicable)
- Show execution duration

**Acceptance Criteria**:

- Large argument/result payloads (>100KB) are collapsed by default
- Stack traces are syntax-highlighted
- Timestamps show in user's local timezone

### 4. Queue View

**Priority**: P1  
**Description**: Monitor individual queues

**Requirements**:

- List all active queues discovered from Redis
- Per-queue metrics: depth, processing rate, avg duration, error rate
- Timeline chart showing queue depth over last hour
- Click queue to filter jobs by that queue

**Acceptance Criteria**:

- Queues without jobs in last 24h are hidden by default (with toggle to show)
- Processing rate calculated as jobs/minute

### 5. Worker Status

**Priority**: P1  
**Description**: View active ARQ workers (read-only)

**Requirements**:

- List active workers with hostname/ID
- Show worker health: last heartbeat timestamp
- Display current job being processed by each worker
- Worker uptime
- Mark workers as "stale" if no heartbeat in >60 seconds

**Acceptance Criteria**:

- Workers auto-discovered from Redis (no manual configuration)
- Stale workers shown with warning indicator

### 6. Failed Jobs View

**Priority**: P1  
**Description**: Dedicated view for debugging failures

**Requirements**:

- List all failed jobs with error summary
- Group by error type/message
- Show failure rate trend (chart)
- Quick access to error stack traces
- Time-based filtering (last hour, 24h, 7d)

**Acceptance Criteria**:

- Failed jobs sorted by most recent first
- Error grouping collapses duplicate errors

### 7. Timeline/Activity Feed

**Priority**: P2  
**Description**: Visual timeline of job activity

**Requirements**:

- Real-time stream of job events (enqueued, started, completed, failed)
- Color-coded by status
- Pausable stream (stops auto-scroll)
- Filter by event type

**Acceptance Criteria**:

- Shows last 100 events
- Auto-scrolls when new events arrive (unless user has scrolled up)

## Technical Architecture

**Frontend**:

- Framework: SvelteKit (TypeScript)
- Use Component Library for Faster development
- Styling: TailwindCSS
- Charts: Chart.js or Apache ECharts
- Real-time: Server-Sent Events (SSE) or polling

**Backend**:

- SvelteKit server endpoints (`+server.ts`)
- Redis client: `ioredis`
- Direct Redis key inspection (no ARQ Python dependency)

**Data Layer**:

- Read-only access to Redis
- ARQ Redis key patterns:
  - `arq:queue:{queue_name}` - queued jobs
  - `arq:in-progress` - running jobs
  - `arq:result:{job_id}` - job results
  - `arq:job:{job_id}` - job metadata

**Deployment**:

- Docker image (single container)
- Environment variables: REDIS_URL, PORT
- No authentication in v1.0 (assumes private network or reverse proxy auth)

## Non-Functional Requirements

**Performance**:

- Dashboard initial load: <2s
- Real-time update latency: <1s
- Support 10,000+ jobs without UI degradation

**Scalability**:

- Single Redis instance (no clustering required)
- Horizontal scaling not required for v1.0

**Security**:

- No built-in authentication (deploy behind auth proxy)
- Read-only Redis access (no job mutations)
- Environment-based Redis credentials

**Browser Support**:

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Out of Scope (v1.0)

**Deferred to v2.0+**:

- Job retry/abort actions
- Worker restart/control
- Job re-enqueue
- Historical data persistence (beyond Redis TTL)
- Authentication/authorization
- Multi-tenancy
- Alerting/notifications
- Export/download job data
- Custom dashboards
- Job scheduling/cron

## UI/UX Guidelines

**Design Principles**:

- Dark mode first (with light mode toggle)
- Minimal, clean interface
- Instant feedback for all interactions
- Progressive disclosure (hide complexity until needed)

**Color Coding**:

- Green: Completed/healthy
- Blue: In-progress/queued
- Red: Failed/error
- Yellow: Warning/stale
- Gray: Inactive/unknown

## Data Retention

- Display data available in Redis only
- No separate database for historical data
- Warning message if Redis has short TTL configured
- Recommendation to configure ARQ with `keep_result` for debugging

## Documentation Requirements

- README with installation (Docker + local dev)
- Environment variable reference
- Architecture diagram showing Redis key usage
- Screenshots of key features
- Contributing guidelines

## Release Plan

**Phase 1** (Week 1-2): Core monitoring

- Dashboard overview
- Job list and detail view
- Basic Redis integration

**Phase 2** (Week 3): Enhanced views

- Queue view
- Worker status
- Failed jobs view

**Phase 3** (Week 4): Polish

- Timeline feed
- Charts/visualizations
- Dark mode
- Documentation

**Launch**: GitHub release, README with demo GIF, post to ARQ discussions

## Future Iterations (v2.0+)

- Job control actions (retry, abort, delete)
- Worker management (restart, scale)
- Persistent historical data (separate DB)
- Authentication layer
- Webhooks/alerts
- API for programmatic access
- Job dependencies visualization
- Performance analytics

---

**Document Version**: 1.0  
**Last Updated**: January 1, 2026  
**Owner**: [Your name]  
**Status**: Draft → Review → Approved

[1](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/8848143/d6ed436d-225e-4a63-af35-7d48111a1c5f/image.jpg)
