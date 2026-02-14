# Docker - Detailed

Complete Docker configuration and usage guide for ChatterBox.

## Overview

ChatterBox uses Docker for both development and production deployments.

## Project Structure

```
chatterbox/
├── docker/
│   ├── Dockerfile          # App container
│   ├── docker-compose.dev.yml
│   └── docker-compose.prod.yml
├── Dockerfile              # Root Dockerfile
├── .dockerignore
└── docker/
```

---

## Docker Compose Files

### Development

Located at: `docker/docker-compose.dev.yml`

Services:
- **app**: Node.js application (port 3000)
- **mongodb**: MongoDB database (port 27017)
- **redis**: Redis cache (port 6379)
- **minio**: S3 storage (ports 9000, 9001)

```bash
# Start development environment
docker-compose -f docker/docker-compose.dev.yml up -d

# View logs
docker-compose -f docker/docker-compose.dev.yml logs -f

# Stop
docker-compose -f docker/docker-compose.dev.yml down
```

### Production

Located at: `docker/docker-compose.prod.yml`

Features:
- Resource limits
- 2 replicas
- MongoDB replica set
- Redis with persistence

```bash
# Start production environment
docker-compose -f docker/docker-compose.prod.yml up -d

# Scale instances
docker-compose -f docker/docker-compose.prod.yml up -d --scale app=3
```

---

## Dockerfile

### Root Dockerfile

```dockerfile
FROM node:21-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api || exit 1

CMD ["npm", "start"]
```

### Docker/Subdirectory Dockerfile

Also available at `docker/Dockerfile` for custom configurations.

---

## Environment Variables

### Development

```bash
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/chat
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=dev-secret
S3_ENABLED=false
```

### Production

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/chat
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-production-secret
S3_ENABLED=true
S3_ENDPOINT=https://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=chat-files
```

---

## Volume Mounts

### Development

```yaml
volumes:
  - ./uploads:/app/uploads
```

### Production

Production uses named volumes for data persistence:
- `mongodb-data`: MongoDB data
- `redis-data`: Redis data
- `minio-data`: MinIO data

---

## Health Checks

### Application

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/api"]
  interval: 30s
  timeout: 3s
  start_period: 5s
  retries: 3
```

### MongoDB

```yaml
command: mongod --replSet rs0 --bind_ip_all
```

### Redis

```yaml
command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

---

## Building Images

### Build Development Image

```bash
docker build -t chatterbox:dev .
```

### Build Production Image

```bash
docker build -f docker/Dockerfile -t chatterbox:prod .
```

### Build with Docker Compose

```bash
# Development
docker-compose -f docker/docker-compose.dev.yml build

# Production
docker-compose -f docker/docker-compose.prod.yml build
```

---

## Kubernetes

For production Kubernetes deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).

### Basic K8s Resources

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatterbox
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chatterbox
  template:
    spec:
      containers:
      - name: app
        image: chatterbox:prod
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
```

---

## Troubleshooting

### View Logs

```bash
# All services
docker-compose -f docker/docker-compose.dev.yml logs

# Specific service
docker-compose -f docker/docker-compose.dev.yml logs app
docker-compose -f docker/docker-compose.dev.yml logs mongodb
```

### Access Container

```bash
docker exec -it chatterbox-app-1 sh
```

### Check Status

```bash
docker-compose -f docker/docker-compose.dev.yml ps
```

---

## Related Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [Architecture](ARCHITECTURE.md)
- [Testing](TESTING.md)
