# Unified Stock Analysis API

**Production-ready, unified backend for Indian stock analysis**

Combines yfinance (historical data) + Upstox API (live price, trading) in a single Express server.

**Optimized for 100-300 concurrent users with aggressive caching and rate limiting.**

## Features

- **Upstox Integration**: OAuth2 flow, real-time market data, trading API
- **Historical Data**: yfinance integration for NSE/BSE stocks
- **Technical Analysis**: SMA(20,50), EMA(20), RSI(14), Trend Detection
- **High Performance**: Optimized for 100-300 concurrent users
  - In-memory caching (120s for analysis, 10s for prices)
  - Intelligent rate limiting (300 req/min)
  - Response compression (60-80% size reduction)
  - Request performance monitoring
- **WebSocket**: Real-time market data streaming
- **Database**: MS SQL Server/MongoDB for instrument storage
- **Security**: Rate limiting, CORS, Helmet security headers
- **Order Protection**: Duplicate order detection (30s lock)

## Tech Stack

- Node.js + Express
- MS SQL Server (Sequelize ORM)
- MongoDB (optional)
- WebSocket (ws)
- Winston (logging)
- yfinance (via Python integration)

## Quick Start

### 1. Clone & Install

```bash
git clone <repo>
cd upstox-backend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:
```env
UPSTOX_API_KEY=your_key_here
UPSTOX_SECRET=your_secret_here
UPSTOX_REDIRECT_URI=http://localhost:3000/auth/callback

DATABASE_URL=Server=localhost;Database=indian_stocks;User Id=sa;Password=YourPassword;Encrypt=true;TrustServerCertificate=true;
# OR
MONGODB_URI=mongodb://localhost:27017/indian_stocks

PORT=3000
FRONTEND_URL=http://localhost:5173
```

### 3. Python Setup (for yfinance)

```bash
pip install yfinance pandas
```

### 4. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Authentication (Upstox OAuth)
```bash
# 1. Get login URL
GET /auth/login

# 2. After Upstox auth, callback happens at
GET /auth/callback?code=xxx

# 3. Set token manually (optional)
POST /auth/token
Body: { "accessToken": "xxx" }
```

### Stocks
```bash
# List all stocks
GET /stocks?page=1&limit=50&exchange=NSE

# Popular stocks
GET /stocks/popular

# Stock details
GET /stocks/RELIANCE

# Sync instruments from Upstox
POST /stocks/sync
```

### Analysis
```bash
# Technical analysis
GET /analyze?symbol=RELIANCE&interval=1d&period=1y

# Historical data only
GET /historical?symbol=RELIANCE&interval=1d&period=1y

# Real-time quote (requires Upstox auth)
GET /quote?symbol=RELIANCE

# Clear analysis cache
POST /analysis/clear-cache
```

### WebSocket

Connect to: `ws://localhost:3000/ws/market-data`

```javascript
// Subscribe to instruments
{
  "type": "subscribe",
  "instruments": ["NSE_EQ|RELIANCE", "NSE_EQ|TCS"]
}

// Unsubscribe
{
  "type": "unsubscribe",
  "instruments": ["NSE_EQ|RELIANCE"]
}
```

## Sample Response

### /analyze?symbol=RELIANCE&interval=1d

```json
{
  "success": true,
  "data": {
    "symbol": "RELIANCE",
    "exchange": "NSE",
    "interval": "1d",
    "currentPrice": 2456.75,
    "change": 1.25,
    "volume": 15234567,
    "indicators": {
      "sma20": 2412.35,
      "sma50": 2389.50,
      "ema20": 2421.80,
      "rsi14": 58.25
    },
    "trend": {
      "direction": "BULLISH",
      "strength": 2.82,
      "sma20": 2412.35,
      "sma50": 2389.50
    },
    "levels": {
      "support": 2405.20,
      "resistance": 2470.00
    },
    "signal": {
      "recommendation": "BUY",
      "confidence": "MEDIUM",
      "reasons": [
        "RSI neutral (58.2)",
        "Strong uptrend (BULLISH)"
      ]
    },
    "lastUpdated": "2024-01-15T10:30:00Z",
    "dataPoints": 252,
    "candles": [...]
  },
  "cached": false
}
```

## Database Schema

### Instruments Table
```sql
CREATE TABLE instruments (
  id SERIAL PRIMARY KEY,
  instrument_key VARCHAR(50) UNIQUE NOT NULL,
  tradingsymbol VARCHAR(50) NOT NULL,
  name VARCHAR(200),
  exchange VARCHAR(10) NOT NULL,
  instrument_type VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Analysis Cache Table
```sql
CREATE TABLE analysis_cache (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(50) NOT NULL,
  exchange VARCHAR(10) NOT NULL,
  interval VARCHAR(10) NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(symbol, exchange, interval)
);
```

## Deployment

### Railway (Recommended)

1. Push to GitHub
2. Connect Railway to repo
3. Set environment variables in Railway dashboard
4. Deploy automatically

```bash
# Manual deploy
railway login
railway link
railway up
```

### Heroku

```bash
heroku create my-stock-api
heroku config:set UPSTOX_API_KEY=xxx
heroku config:set DATABASE_URL=xxx

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

git push heroku main
```

## Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React/Vue)   │
└────────┬────────┘
         │
         │ HTTP / WebSocket
         ▼
┌─────────────────────────────────────────┐
│          Indian Stock API               │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Auth    │  │  Stocks  │  │Analysis│ │
│  │Controller│  │Controller│  │Controller│
│  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │             │            │      │
│  ┌────┴─────────────┴────────────┴────┐ │
│  │         Services Layer            │ │
│  │  Upstox │ yfinance │ Analysis    │ │
│  └────────────────────────────────────┘ │
│       │             │                  │
│  ┌────┴─────────────┴────┐            │
│  │     Data Sources       │            │
│  │ Upstox API │ yfinance  │            │
│  └────────────────────────┘            │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │  MS SQL Server / MongoDB / Cache    │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Troubleshooting

### "Python not available" error
- Install Python 3.8+
- Run: `pip install yfinance pandas`
- Set: `PYTHON_PATH=python` in .env

### Upstox OAuth fails
- Verify UPSTOX_API_KEY and UPSTOX_SECRET
- Check redirect_uri matches Upstox app settings
- Use `/auth/login` to get correct auth URL

### Database connection fails
- Server works without database (in-memory mode)
- For production, set DATABASE_URL or individual DB_* variables
- MS SQL Server: Install locally or use Azure SQL / AWS RDS

## License

MIT

## Support

For issues and feature requests, please open a GitHub issue.
