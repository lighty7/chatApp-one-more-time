# Deployment Overview

Quick deployment guide. See [DEPLOYMENT-detailed.md](DEPLOYMENT-detailed.md) for comprehensive documentation.

## Quick Start

### Docker Compose (Production)

```bash
docker-compose -f docker/docker-compose.prod.yml up -d
```

### Kubernetes

```bash
kubectl apply -f kubernetes/
```

## Quick Links

- [Detailed Deployment](DEPLOYMENT-detailed.md)
- [Docker Setup](DOCKER.md)
- [CI/CD](../CI-CD.md)
