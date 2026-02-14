# Docker Overview

Quick Docker setup guide. See [DOCKER-detailed.md](DOCKER-detailed.md) for comprehensive documentation.

## Quick Start

```bash
# Development
docker-compose -f docker/docker-compose.dev.yml up -d

# Production
docker-compose -f docker/docker-compose.prod.yml up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| app | 3000 | Node.js application |
| mongodb | 27017 | MongoDB database |
| redis | 6379 | Redis cache |
| minio | 9000 | S3-compatible storage |

## Quick Links

- [Detailed Docker](DOCKER-detailed.md)
- [Deployment Guide](DEPLOYMENT.md)
