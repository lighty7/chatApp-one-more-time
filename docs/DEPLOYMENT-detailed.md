# Deployment - Detailed

Comprehensive deployment guide for ChatterBox.

## Overview

ChatterBox can be deployed using Docker Compose or Kubernetes.

---

## Docker Compose Deployment

### Prerequisites

- Docker 20+
- Docker Compose 2+

### Steps

1. **Configure Environment**

```bash
cp .env.example .env
# Edit .env with production values
```

2. **Required Environment Variables**

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/chat
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-secure-secret-key
S3_ENABLED=true
S3_ENDPOINT=https://minio.example.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=chat-files
```

3. **Start Services**

```bash
docker-compose -f docker/docker-compose.prod.yml up -d
```

4. **Verify Deployment**

```bash
# Check status
docker-compose -f docker/docker-compose.prod.yml ps

# Check logs
docker-compose -f docker/docker-compose.prod.yml logs -f app
```

---

## Kubernetes Deployment

### Prerequisites

- Kubernetes 1.28+
- kubectl configured
- Ingress controller (nginx)

### Resources

Create the following K8s manifests:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatterbox
  namespace: chat-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chatterbox
  template:
    metadata:
      labels:
        app: chatterbox
    spec:
      containers:
      - name: app
        image: chatterbox:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: chatterbox-secrets
              key: mongodb-uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: chatterbox-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: chatterbox
  namespace: chat-system
spec:
  selector:
    app: chatterbox
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chatterbox
  namespace: chat-system
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  rules:
  - host: chat.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: chatterbox
            port:
              number: 80
  tls:
  - hosts:
    - chat.example.com
    secretName: chatterbox-tls
```

### Apply Resources

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml

# Check status
kubectl get pods -n chat-system
kubectl get services -n chat-system
```

---

## Cloud Deployment

### Render

1. Connect GitHub repository
2. Configure environment variables
3. Deploy automatically via CI/CD

### Heroku

```bash
# Create app
heroku create chatterbox-app

# Set environment
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret

# Deploy
git push heroku main
```

---

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "2.0.0"
}
```

### Logs

```bash
# Docker
docker logs -f chatterbox-app

# Kubernetes
kubectl logs -n chat-system -l app.kubernetes.io/name=chatterbox
```

### Metrics

Integrate with:
- Prometheus
- Grafana
- DataDog

---

## Scaling

### Horizontal Scaling

```bash
# Docker Compose
docker-compose -f docker/docker-compose.prod.yml up -d --scale app=3

# Kubernetes
kubectl scale deployment chatterbox --replicas=5
```

### Auto-scaling (Kubernetes)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: chatterbox-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chatterbox
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Backup

### MongoDB

```bash
# Backup
docker exec mongodb mongodump --out /backup

# Restore
docker exec mongodb mongorestore /backup
```

### Redis

```bash
# Backup RDB
docker exec redis redis-cli BGSAVE

# Copy backup
docker cp redis:/data/dump.rdb ./backup/
```

---

## Related Documentation

- [Docker Setup](DOCKER.md)
- [CI/CD](CI-CD.md)
- [Architecture](ARCHITECTURE.md)
- [Troubleshooting](TROUBLESHOOTING.md)
