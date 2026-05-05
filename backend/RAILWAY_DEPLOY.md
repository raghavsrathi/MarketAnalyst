# Railway Deployment Guide - Performance Optimized

Deploy the high-performance stock analysis API on Railway for 100-300 concurrent users.

## Quick Deploy Steps

### 1. Create Railway Project
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and create project
railway login
railway init
```

### 2. Set Environment Variables

In Railway Dashboard → Variables, add:

```env
# Upstox
UPSTOX_API_KEY=your_key_here
UPSTOX_SECRET=your_secret_here
UPSTOX_REDIRECT_URI=https://your-app.up.railway.app/auth/callback

# Database (Railway will provide DATABASE_URL if you add PostgreSQL, 
# but we're using MS SQL so use these:)
DB_HOST=your-db-host
DB_PORT=1433
DB_NAME=indian_stocks
DB_USER=sa
DB_PASSWORD=your_password
DB_ENCRYPT=true
DB_TRUST_CERT=true

# Performance
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
FRONTEND_URL=https://trading-chart-analyzer.netlify.app

# Caching
ANALYSIS_CACHE_TTL=120
PRICE_CACHE_TTL=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=300

# Timeouts
YFINANCE_TIMEOUT=15000
UPSTOX_TIMEOUT=10000
```

### 3. Deploy
```bash
railway up
```

## Railway.toml Configuration

Create `railway.toml` in project root:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node src/server.js"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
numReplicas = 1
```

## Performance Optimization Tips

### 1. Enable Compression
Already enabled via `compression()` middleware. Reduces payload size by 60-80%.

### 2. Use In-Memory Caching
The API uses Node-Cache for:
- `/analyze` → 120 seconds TTL
- `/price` → 10 seconds TTL
- Order deduplication → 30 seconds TTL

### 3. Rate Limiting
- 300 requests/minute per IP for general endpoints
- 30 requests/minute for `/analyze` (computationally expensive)

### 4. Database Connection Pooling
MS SQL connection pool configured for 10 max connections.

### 5. Health Checks
```bash
curl https://your-app.up.railway.app/health
curl https://your-app.up.railway.app/metrics  # Cache stats
curl https://your-app.up.railway.app/performance  # Performance stats
```

## Monitoring

### Performance Metrics Endpoint
```bash
curl https://your-app.up.railway.app/performance
```

Returns:
```json
{
  "success": true,
  "data": {
    "total": 1523,
    "success": 1498,
    "error": 25,
    "slow": 12,
    "cached": 892,
    "avgResponseTime": 45.2,
    "requestsPerSecond": "15.20",
    "cacheHitRate": "58.56",
    "uptimeFormatted": "101s"
  }
}
```

### Cache Stats
```bash
curl https://your-app.up.railway.app/metrics
```

## Load Testing

Test with `autocannon`:

```bash
npm install -g autocannon

# Test /health endpoint
autocannon -c 100 -d 30 https://your-app.up.railway.app/health

# Test /analyze (cached)
autocannon -c 50 -d 60 "https://your-app.up.railway.app/analyze?symbol=RELIANCE&interval=1d"

# Test /price (cached 10s)
autocannon -c 100 -d 30 "https://your-app.up.railway.app/price?symbol=RELIANCE"
```

## Expected Performance

| Endpoint | Concurrent Users | Response Time | Cache Hit Rate |
|----------|-----------------|---------------|----------------|
| /health | 300 | < 50ms | N/A |
| /price (cached) | 300 | < 10ms | 90%+ |
| /price (fresh) | 100 | < 200ms | 0% |
| /analyze (cached) | 300 | < 20ms | 80%+ |
| /analyze (fresh) | 50 | < 500ms | 0% |

## Troubleshooting

### 502 Errors
1. Check health endpoint responds
2. Verify PORT env var is set
3. Check Railway logs: `railway logs`

### High Memory Usage
- Cache auto-cleans every 60 seconds
- Set `maxKeys` in cacheService.js if needed
- Add Redis for distributed caching

### Slow Response Times
1. Enable caching (should be automatic)
2. Check `/performance` for slow request rate
3. Review `SLOW_REQUEST_THRESHOLD` in logs

## Horizontal Scaling (Optional)

For >300 users, enable Railway replicas:

1. Add Redis for shared caching:
   ```bash
   railway add redis
   ```

2. Update cacheService.js to use Redis

3. Increase replicas in railway.toml:
   ```toml
   [deploy]
   numReplicas = 3
   ```

## Next Steps

1. Deploy to Railway
2. Test with `autocannon`
3. Monitor `/performance` endpoint
4. Scale as needed

---

**Target: < 500ms for cached analysis, stable under 300 concurrent users**
