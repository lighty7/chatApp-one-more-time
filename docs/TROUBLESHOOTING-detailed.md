# Troubleshooting - Detailed

Comprehensive troubleshooting guide for ChatterBox.

## Table of Contents

1. [Database Issues](#database-issues)
2. [WebSocket Issues](#websocket-issues)
3. [Authentication Issues](#authentication-issues)
4. [File Upload Issues](#file-upload-issues)
5. [Performance Issues](#performance-issues)
6. [Deployment Issues](#deployment-issues)

---

## Database Issues

### MongoDB Connection Error

**Error:**
```
Error: MongoServerSelectionError: connect ECONNREFUSED
```

**Solution:**
1. Check MongoDB is running:
   ```bash
   docker ps | grep mongo
   ```

2. Verify MONGODB_URI in .env:
   ```
   MONGODB_URI=mongodb://localhost:27017/chat
   ```

3. Check MongoDB logs:
   ```bash
   docker logs mongodb
   ```

---

### MongoDB Authentication Error

**Error:**
```
Error: Authentication failed
```

**Solution:**
1. Verify credentials in MONGODB_URI:
   ```
   mongodb://username:password@host:port/database?authSource=admin
   ```

2. Create user in MongoDB:
   ```bash
   docker exec -it mongodb mongosh
   use admin
   db.createUser({
     user: "admin",
     pwd: "password",
     roles: [{ role: "readWrite", db: "chat" }]
   })
   ```

---

### Redis Connection Error

**Error:**
```
Error: Redis connection refused
```

**Solution:**
1. Check Redis is running:
   ```bash
   docker ps | grep redis
   ```

2. Verify Redis configuration:
   ```
   REDIS_HOST=redis
   REDIS_PORT=6379
   ```

3. Test Redis connection:
   ```bash
   docker exec -it redis redis-cli ping
   # Should return: PONG
   ```

---

## WebSocket Issues

### Connection Refused

**Error:**
```
Error: connect ECONNREFUSED
```

**Solution:**
1. Check server is running:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. Verify CORS settings in .env:
   ```
   ALLOWED_ORIGINS=http://localhost:3000
   ```

3. Check nginx WebSocket proxy:
   ```nginx
   location / {
     proxy_pass http://backend;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
   }
   ```

---

### Authentication Failed

**Error:**
```
Error: unauthorized
```

**Solution:**
1. Verify JWT token is valid:
   ```javascript
   // Decode token
   const decoded = jwt.decode(token);
   console.log(decoded);
   ```

2. Check JWT_SECRET matches:
   ```bash
   # Server and .env should have same JWT_SECRET
   ```

3. Verify token not expired:
   ```javascript
   const decoded = jwt.decode(token);
   if (decoded.exp < Date.now() / 1000) {
     // Token expired, need refresh
   }
   ```

---

## Authentication Issues

### Login Failed

**Error:**
```
Invalid credentials
```

**Solution:**
1. Check user exists:
   ```bash
   docker exec -it mongodb mongosh
   use chat
   db.users.findOne({ email: "user@example.com" })
   ```

2. Verify password hash:
   ```javascript
   const bcrypt = require('bcryptjs');
   const user = db.users.findOne({ email: "user@example.com" });
   bcrypt.compare("inputpassword", user.password)
   ```

3. Check JWT configuration:
   ```
   JWT_SECRET=your-secret-key
   ```

---

### Token Refresh Failed

**Error:**
```
Token refresh failed
```

**Solution:**
1. Verify refresh token exists in database
2. Check refresh token not expired
3. Ensure refresh endpoint is accessible

---

## File Upload Issues

### Upload Failed

**Error:**
```
Error: File upload failed
```

**Solution:**
1. Check upload directory permissions:
   ```bash
   chmod 755 uploads/
   ```

2. Verify file size limit (max 10MB)
3. Check file type is allowed:
   ```javascript
   const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
   ```

### S3/MinIO Issues

**Error:**
```
Error: S3 upload failed
```

**Solution:**
1. Verify S3 credentials:
   ```
   S3_ENABLED=true
   S3_ENDPOINT=https://minio:9000
   S3_ACCESS_KEY=minioadmin
   S3_SECRET_KEY=minioadmin
   S3_BUCKET=chat-files
   ```

2. Check MinIO is running:
   ```bash
   docker ps | grep minio
   ```

3. Verify bucket exists:
   ```bash
   docker exec minio mc ls local/chat-files
   ```

---

## Performance Issues

### High Memory Usage

**Symptoms:**
- Server response time increases
- OOM errors in logs

**Solution:**
1. Check MongoDB connection pool:
   ```javascript
   mongoose.connect(uri, {
     maxPoolSize: 10,
     serverSelectionTimeoutMS: 5000
   });
   ```

2. Enable Redis caching
3. Scale horizontally

---

### Slow Queries

**Solution:**
1. Add MongoDB indexes:
   ```javascript
   MessageSchema.index({ conversationId: 1, createdAt: -1 });
   UserSchema.index({ username: 'text' });
   ```

2. Check query performance:
   ```javascript
   db.messages.find({ conversationId: '...' }).explain('executionStats')
   ```

---

## Deployment Issues

### Docker Build Fails

**Error:**
```
Step X/Y : npm ci failed
```

**Solution:**
1. Clear npm cache:
   ```bash
   docker builder prune
   ```

2. Check package.json syntax
3. Verify Node.js version compatibility

---

### Kubernetes Pod Crash

**Solution:**
1. Check pod status:
   ```bash
   kubectl get pods -n chat-system
   kubectl describe pod <pod-name> -n chat-system
   ```

2. Check logs:
   ```bash
   kubectl logs <pod-name> -n chat-system
   ```

3. Verify environment variables:
   ```bash
   kubectl get pod <pod-name> -n chat-system -o json | jq '.spec.containers[0].env'
   ```

---

### Health Check Failed

**Error:**
```
Liveness probe failed
```

**Solution:**
1. Check health endpoint:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. Verify all dependencies (MongoDB, Redis) are accessible
3. Increase probe timeouts

---

## Getting Help

### Collect Debug Information

```bash
# System info
uname -a
docker --version
node --version

# Application logs
docker logs chatterbox-app

# Network status
netstat -tulpn | grep LISTEN

# Environment
env | grep -E '(NODE_|MONGODB|REDIS|JWT)'
```

### Logs Locations

| Environment | Log Command |
|-------------|-------------|
| Docker | `docker logs -f chatterbox-app` |
| Kubernetes | `kubectl logs -n chat-system <pod>` |
| Production | Check cloud provider dashboard |

---

## Related Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [Docker Setup](DOCKER.md)
- [Security](SECURITY.md)
