# ARQ Monitor Dashboard

A modern, real-time monitoring dashboard for [ARQ](https://github.com/samuelcolvin/arq) task queues built with SvelteKit.

## Features

- **Real-time Dashboard**: Monitor queue health, job counts, and success rates with auto-refreshing stats
- **Job Browser**: Search, filter, and sort through all your ARQ jobs with pagination
- **Job Details**: Inspect individual job arguments, results, and error stack traces
- **Dark Mode**: Sleek IDE-style UI with dark mode support
- **Docker Ready**: Simple deployment with Docker and docker-compose

## Prerequisites

- **Node.js** 18+ (for running the dashboard)
- **Python 3.8+** (required for unpickling ARQ job data)
- **Redis** (where your ARQ jobs are stored)
- **pnpm** (recommended) or npm

## Quick Start

### Using Docker (Recommended)

```bash
git clone https://github.com/yourusername/arq-dashboard.git
cd arq-dashboard

# Start with docker-compose (includes Redis for testing)
docker-compose up -d

# Open http://localhost:3000
```

### Local Development

```bash
# Install dependencies
pnpm install

# Start Redis (if not already running)
docker run -d -p 6379:6379 redis:7-alpine

# Set environment variables
export REDIS_URL=redis://localhost:6379

# Start development server
pnpm dev

# Open http://localhost:5173
```

## Configuration

### Environment Variables

| Variable    | Description                   | Default                  |
| ----------- | ----------------------------- | ------------------------ |
| `REDIS_URL` | Redis connection URL          | `redis://localhost:6379` |
| `PORT`      | Server port (production only) | `3000`                   |

### Connecting to Your ARQ Redis Instance

Update the `REDIS_URL` environment variable to point to your ARQ Redis instance:

```bash
# Using docker-compose
# Edit docker-compose.yml
services:
  arq-monitor:
    environment:
      - REDIS_URL=redis://your-redis-host:6379

# Or for local development
export REDIS_URL=redis://your-redis-host:6379
pnpm dev
```

**Note**: The dashboard only reads from Redis (read-only access). It will not modify or delete any job data.

## ARQ Redis Key Patterns

ARQ Monitor reads data from these Redis keys (read-only):

| Key Pattern             | Description              |
| ----------------------- | ------------------------ |
| `arq:queue:{name}`      | Queued jobs (sorted set) |
| `arq:in-progress`       | Currently running jobs   |
| `arq:result:{job_id}`   | Job results              |
| `arq:job:{job_id}`      | Job metadata             |
| `arq:health-check:{id}` | Worker health checks     |

## Development

```bash
# Install dependencies
pnpm install

# Start dev server with hot reload
pnpm dev

# Type checking
pnpm check

# Linting
pnpm lint

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## How It Works

ARQ stores job data in Redis using Python's pickle serialization format. This dashboard:

1. Connects to your Redis instance (read-only)
2. Scans for ARQ keys (`arq:queue:*`, `arq:job:*`, `arq:result:*`)
3. Unpickles job data using a Python helper script
4. Displays the data in a real-time dashboard

The dashboard uses a hybrid approach for unpickling:

- First tries a JavaScript pickle parser for speed
- Falls back to Python's native `pickle` module for compatibility

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) (Svelte 5) with TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4
- **Components**: shadcn-svelte inspired components
- **Charts**: [Apache ECharts](https://echarts.apache.org/)
- **Redis Client**: [ioredis](https://github.com/redis/ioredis)
- **Serialization**: [pickleparser](https://github.com/ewfian/pickleparser) + Python fallback
- **Icons**: [Lucide Svelte](https://lucide.dev/)

## Project Structure

```
arq-dashboard/
├── src/
│   ├── lib/
│   │   ├── components/       # UI components
│   │   │   ├── ui/          # Base shadcn-style components
│   │   │   └── *.svelte     # App-specific components
│   │   ├── server/          # Server-side code
│   │   │   ├── redis.ts     # Redis client singleton
│   │   │   └── arq.ts       # ARQ data access layer
│   │   ├── stores/          # Svelte stores (theme, etc.)
│   │   ├── types.ts         # TypeScript interfaces
│   │   └── utils.ts         # Utility functions
│   ├── routes/
│   │   ├── +layout.svelte   # App layout with sidebar
│   │   ├── +page.svelte     # Dashboard overview
│   │   ├── jobs/            # Job list & detail pages
│   │   └── api/             # API endpoints (SSE, actions)
│   └── app.css              # Global styles & theme
├── scripts/
│   └── unpickle.py          # Python helper for pickle decoding
├── Dockerfile               # Production Docker image
└── docker-compose.yml       # Local development setup
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
