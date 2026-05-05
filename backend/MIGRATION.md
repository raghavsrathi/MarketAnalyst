# Backend Migration Guide

## What Was Done

✅ **Merged two backends into one:**
- `/backend` (Python FastAPI) → Removed
- `/upstox-backend` (Node.js Express) → Moved to `/backend`
- **Result**: Single unified Node.js backend

## Current Structure

```
/backend/                           ← Unified backend (Node.js)
  ├── index.js                    ← Entry point
  ├── package.json                ← Dependencies
  ├── .env.example                ← Environment config
  ├── src/
  │   ├── server.js               ← Express server setup
  │   ├── routes/
  │   │   └── index.js           ← All API routes
  │   ├── controllers/
  │   │   ├── analysisController.js   ← /analyze (yfinance)
  │   │   ├── priceController.js      ← /price (Upstox)
  │   │   ├── orderController.js      ← /order (Upstox)
  │   │   └── stocksController.js     ← /stocks
  │   ├── services/
  │   │   ├── yfinanceService.js    ← yfinance integration
  │   │   ├── upstoxService.js      ← Upstox API
  │   │   ├── cacheService.js       ← In-memory caching
  │   │   └── python/
  │   │       └── yfinance_fetcher.py  ← Python subprocess script
  │   ├── middleware/
  │   │   ├── rateLimiter.js        ← Rate limiting
  │   │   ├── cacheMiddleware.js    ← Response caching
  │   │   ├── validator.js         ← Input validation
  │   │   ├── errorHandler.js      ← Global error handling
  │   │   └── performance.js       ← Performance monitoring
  │   ├── config/
  │   │   ├── database.js          ← MS SQL config
  │   │   └── upstox.js            ← Upstox settings
  │   └── utils/
  │       └── logger.js            ← Winston logging
  └── backup-python/              ← Python backup (old code)

/upstox-backend/                   ← Can be deleted after verification
```

## Available APIs

| Endpoint | Method | Description | Source |
|----------|--------|-------------|--------|
| `/health` | GET | Health check | - |
| `/analyze?symbol=RELIANCE` | GET | Technical analysis | yfinance |
| `/price?symbol=RELIANCE` | GET | Live price | Upstox/Fallback |
| `/order` | POST | Place order | Upstox |
| `/order/:id/status` | GET | Order status | Upstox |
| `/stocks` | GET | List stocks | Database |
| `/metrics` | GET | Cache stats | - |
| `/performance` | GET | Performance metrics | - |

## Quick Start

```bash
cd d:\Trading\backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env
# Edit .env with your settings

# Test database connection
npm run test-db

# Start server
npm run dev
```

## Test APIs

```bash
# Health check
curl http://localhost:8080/health

# Get price (cached 10s)
curl "http://localhost:8080/price?symbol=RELIANCE"

# Get analysis (cached 120s)
curl "http://localhost:8080/analyze?symbol=RELIANCE&interval=1d"
```

## Deployment

### Local
```bash
npm run dev
```

### Railway (Production)
```bash
railway login
railway up
```

See `RAILWAY_DEPLOY.md` for detailed steps.

## Cleanup

After verifying everything works, you can delete:
```bash
# Remove old Python backend backup (optional)
Remove-Item -Path d:\Trading\backend-python-backup -Recurse -Force

# Remove upstox-backend folder (now merged into /backend)
Remove-Item -Path d:\Trading\upstox-backend -Recurse -Force
```

## What Was Preserved

✅ yfinance functionality (via Python subprocess)
✅ Upstox API integration
✅ MS SQL Server database support
✅ All performance optimizations (caching, rate limiting)
✅ Frontend compatibility (same API responses)

## Next Steps

1. ✅ Verify `npm install` works
2. ✅ Test `npm run test-db`
3. ✅ Test `npm run dev`
4. ✅ Test APIs with curl
5. ⬜ Deploy to Railway
6. ⬜ Update frontend API URL
7. ⬜ Delete old folders (after verification)
