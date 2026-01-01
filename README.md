# ARQ Monitor

A modern, real-time monitoring dashboard for [ARQ](https://github.com/samuelcolvin/arq) task queues built with SvelteKit.

![ARQ Monitor Dashboard](https://via.placeholder.com/800x400?text=ARQ+Monitor+Dashboard)

## Features

- **Real-time Dashboard**: Monitor queue health, job counts, and success rates with auto-refreshing stats
- **Job Browser**: Search, filter, and sort through all your ARQ jobs with pagination
- **Job Details**: Inspect individual job arguments, results, and error stack traces
- **Dark Mode**: Beautiful dark-first UI with light mode toggle
- **Docker Ready**: Simple deployment with Docker and docker-compose

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/arq-dashboard.git
cd arq-dashboard

# Start with docker-compose (includes Redis)
docker-compose up -d

# Open http://localhost:3000
```

### Local Development

```bash
# Install dependencies
npm install

# Start Redis (if not already running)
docker run -d -p 6379:6379 redis:7-alpine

# Set environment variables
export REDIS_URL=redis://localhost:6379

# Start development server
npm run dev

# Open http://localhost:5173
```

## Configuration

### Environment Variables

| Variable    | Description                     | Default                   |
| ----------- | ------------------------------- | ------------------------- |
| `REDIS_URL` | Redis connection URL            | `redis://localhost:6379`  |
| `PORT`      | Server port (production only)   | `3000`                    |

### Connecting to Your Redis

Update the `REDIS_URL` environment variable to point to your ARQ Redis instance:

```bash
# docker-compose.yml
services:
  arq-monitor:
    environment:
      - REDIS_URL=redis://your-redis-host:6379
```

Or for local development:

```bash
export REDIS_URL=redis://your-redis-host:6379
npm run dev
```

## ARQ Redis Key Patterns

ARQ Monitor reads data from these Redis keys (read-only):

| Key Pattern              | Description              |
| ------------------------ | ------------------------ |
| `arq:queue:{name}`       | Queued jobs (sorted set) |
| `arq:in-progress`        | Currently running jobs   |
| `arq:result:{job_id}`    | Job results              |
| `arq:job:{job_id}`       | Job metadata             |
| `arq:health-check:{id}`  | Worker health checks     |

## Development

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) with TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4
- **Components**: Custom shadcn-style components
- **Charts**: [Apache ECharts](https://echarts.apache.org/)
- **Redis Client**: [ioredis](https://github.com/redis/ioredis)
- **Icons**: [Lucide](https://lucide.dev/)

## Project Structure

```
src/
├── lib/
│   ├── components/       # UI components
│   │   ├── ui/          # Base shadcn-style components
│   │   └── *.svelte     # App-specific components
│   ├── server/          # Server-side code
│   │   ├── redis.ts     # Redis client
│   │   └── arq.ts       # ARQ data queries
│   ├── stores/          # Svelte stores
│   ├── types.ts         # TypeScript interfaces
│   └── utils.ts         # Utility functions
├── routes/
│   ├── +layout.svelte   # App layout
│   ├── +page.svelte     # Dashboard
│   ├── jobs/            # Job list & detail pages
│   └── api/             # API endpoints
└── app.css              # Global styles
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
