# Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Python 3.8+ (included in Docker image)
- Access to your ARQ Redis instance

## Production Deployment

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/arq-dashboard.git
cd arq-dashboard

# Create environment file
cp .env.example .env

# Edit .env to point to your Redis
nano .env

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f arq-monitor

# Stop
docker-compose down
```

### Option 2: Docker Only

```bash
# Build the image
docker build -t arq-dashboard .

# Run the container
docker run -d \
  -p 3000:3000 \
  -e REDIS_URL=redis://your-redis-host:6379 \
  --name arq-monitor \
  arq-dashboard

# View logs
docker logs -f arq-monitor
```

### Option 3: Node.js Direct

```bash
# Install dependencies
pnpm install --prod

# Build
pnpm build

# Start
REDIS_URL=redis://your-redis-host:6379 PORT=3000 node build
```

## Environment Variables

| Variable    | Required | Default                  | Description                |
| ----------- | -------- | ------------------------ | -------------------------- |
| `REDIS_URL` | Yes      | `redis://localhost:6379` | Redis connection URL       |
| `PORT`      | No       | `3000`                   | HTTP server port           |
| `HOST`      | No       | `0.0.0.0`                | HTTP server host           |

## Health Check

The application exposes a health check endpoint at `/` that returns 200 OK when healthy.

Docker health check runs every 30 seconds.

## Security Considerations

- The dashboard has **read-only** access to Redis
- No authentication is built-in (use reverse proxy with auth if needed)
- Recommended to run behind a reverse proxy (nginx, Caddy, Traefik)
- Use Redis ACLs to restrict dashboard access if needed

## Reverse Proxy Example (nginx)

```nginx
server {
    listen 80;
    server_name arq-monitor.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

- Check container logs: `docker logs arq-monitor`
- Health check: `curl http://localhost:3000/`
- Redis connection status shown in dashboard header

## Troubleshooting

### Dashboard shows "Redis Disconnected"

- Verify `REDIS_URL` is correct
- Check Redis is accessible from the container
- Check Redis logs: `docker logs redis`

### Jobs not displaying

- Ensure your ARQ workers are writing to the same Redis instance
- Check Redis keys exist: `redis-cli KEYS "arq:*"`
- Verify Python 3 is available in the container

### Build fails

- Ensure Node.js 18+ is installed
- Clear cache: `pnpm store prune && rm -rf node_modules && pnpm install`
- Check for TypeScript errors: `pnpm check`
