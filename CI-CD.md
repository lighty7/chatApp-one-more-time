# Chatterbox - CI/CD Guide

## 🚀 Continuous Integration/Deployment Pipeline

### Workflow Overview

The CI/CD pipeline runs automatically on:
- **Push** to `main` or `develop` branches
- **Pull Requests** to `main` branch

### Pipeline Stages

#### 1. **Test Stage** 
- ✅ Node.js matrix testing (18.x, 20.x)
- ✅ Unit tests execution
- ✅ ESLint code linting
- ✅ Bundle size analysis

#### 2. **Security Stage**
- 🔍 Dependency vulnerability scanning
- 🔒 Secret detection with TruffleHog

#### 3. **Build Stage**
- 🏗️ Application build verification
- 🚀 Health check validation

#### 4. **Deploy Stage** (main branch only)
- 🌐 Automatic deployment to Render
- 📊 Production health monitoring

### Required Secrets

Add these to your GitHub repository settings:

```
RENDER_SERVICE_ID=your_render_service_id
RENDER_API_KEY=your_render_api_key
```

### Getting Render Credentials

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click Account → API Keys → Create API Key
3. Find your service ID in service settings
4. Add both as repository secrets

### Local Development Commands

```bash
# Run tests
npm test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Security audit
npm run security:check
```

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature development

### Monitoring

- ✅ Automated test results
- ✅ Security vulnerability alerts
- ✅ Code quality metrics
- ✅ Deployment status notifications

### Performance Metrics

The pipeline monitors:
- 📦 Bundle sizes
- ⚡ Build times
- 🔐 Security scan results
- 🧪 Test coverage

### Troubleshooting

**Build fails on secrets:**
- Check GitHub repository secrets
- Verify Render API key permissions

**Tests fail:**
- Run `npm test` locally
- Check Node.js version compatibility

**Linting errors:**
- Run `npm run lint:fix`
- Review ESLint configuration

---