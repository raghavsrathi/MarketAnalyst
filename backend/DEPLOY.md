# Deployment Guide

Complete guide for deploying the Indian Stock Analysis API with MS SQL Server.

## Railway Deployment (Recommended)

### Step 1: Create Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### Step 2: Add MS SQL Server (via Docker)

Railway doesn't have native MS SQL support, so use a Docker service:

1. Click "New" → "Service" → "Add Empty Service"
2. Set image: `mcr.microsoft.com/mssql/server:2022-latest`
3. Add variables:
```
ACCEPT_EULA=Y
MSSQL_SA_PASSWORD=YourStrong@Password
MSSQL_PID=Express
```
4. Map port 1433

### Step 3: Environment Variables

In Railway dashboard → Variables, add:

```
UPSTOX_API_KEY=your_key
UPSTOX_SECRET=your_secret
UPSTOX_REDIRECT_URI=https://your-app.up.railway.app/auth/callback
FRONTEND_URL=https://your-frontend.netlify.app
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
```

### Step 4: Deploy

Railway auto-deploys on git push. Or click "Deploy" in dashboard.

### Step 5: Domain

Railway provides a free domain: `https://your-app.up.railway.app`

---

## Heroku Deployment

### Step 1: Create App

```bash
heroku create indian-stock-api
```

### Step 2: Add MS SQL Server

Heroku doesn't support MS SQL natively. Options:
- Use **Azure SQL Database** (recommended for MS SQL)
- Use **AWS RDS for SQL Server**
- Use a **Docker container** with MS SQL

**Azure SQL (recommended):**
```bash
# Create Azure SQL Database via Azure Portal or CLI
# Get connection string and set in Heroku:
heroku config:set DATABASE_URL="Server=your-server.database.windows.net;Database=indian_stocks;User Id=your-user;Password=YourPassword;Encrypt=true;TrustServerCertificate=false;"
```

### Step 3: Set Config

```bash
heroku config:set UPSTOX_API_KEY=xxx
heroku config:set UPSTOX_SECRET=xxx
heroku config:set UPSTOX_REDIRECT_URI=https://indian-stock-api.herokuapp.com/auth/callback
heroku config:set NODE_ENV=production
```

### Step 4: Deploy

```bash
git push heroku main
heroku open
```

---

## VPS / Self-Hosted

### Prerequisites

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm python3 python3-pip curl

# Install MS SQL Server (Ubuntu 20.04/22.04)
curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
sudo add-apt-repository "$(curl -fsSL https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/mssql-server-2022.list)"
sudo apt update
sudo apt install -y mssql-server
sudo /opt/mssql/bin/mssql-conf setup

# Install SQL Server command-line tools
curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list
sudo apt update
sudo apt install -y mssql-tools unixodbc-dev

# Install yfinance
pip3 install yfinance pandas
```

### Setup

```bash
git clone <repo>
cd upstox-backend
npm install --production

# Database - Create using sqlcmd
sqlcmd -S localhost -U SA -P 'YourPassword' -Q "CREATE DATABASE indian_stocks;"

# Environment
cp .env.example .env
# Edit .env with your values

# Start
npm start
```

### PM2 (Process Manager)

```bash
npm install -g pm2

pm2 start src/server.js --name "stock-api"
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Windows Server Deployment

### Step 1: Install MS SQL Server

1. Download SQL Server Express from Microsoft
2. Install with default settings
3. Enable TCP/IP in SQL Server Configuration Manager
4. Open port 1433 in Windows Firewall

### Step 2: Create Database

```sql
-- Using SQL Server Management Studio (SSMS)
CREATE DATABASE indian_stocks;
GO

-- Create login (optional)
CREATE LOGIN stock_user WITH PASSWORD = 'YourStrong@Password';
USE indian_stocks;
CREATE USER stock_user FOR LOGIN stock_user;
ALTER ROLE db_owner ADD MEMBER stock_user;
```

### Step 3: Install Node.js App

```powershell
# Install Node.js (LTS version from nodejs.org)
# Clone and setup
git clone <repo>
cd upstox-backend
npm install

# Install node-windows for service management
npm install -g node-windows
npm link node-windows

# Create Windows Service
node src/scripts/install-service.js
```

### Step 4: Environment Variables (Windows)

```powershell
# Using PowerShell as Administrator
[Environment]::SetEnvironmentVariable("DATABASE_URL", "Server=localhost;Database=indian_stocks;User Id=sa;Password=YourPassword;Encrypt=true;TrustServerCertificate=true;", "Machine")
[Environment]::SetEnvironmentVariable("UPSTOX_API_KEY", "your_key", "Machine")
[Environment]::SetEnvironmentVariable("UPSTOX_SECRET", "your_secret", "Machine")
[Environment]::SetEnvironmentVariable("NODE_ENV", "production", "Machine")
```

---

## Upstox App Configuration

### Step 1: Create App

1. Go to [Upstox Developer](https://developer.upstox.com/)
2. Create new app
3. Set redirect URI to your deployed URL:
   - Railway: `https://your-app.up.railway.app/auth/callback`
   - Heroku: `https://your-app.herokuapp.com/auth/callback`
   - Local: `http://localhost:3000/auth/callback`

### Step 2: Get Credentials

Copy `API Key` and `Secret` to your environment variables.

### Step 3: Test OAuth

```bash
curl https://your-api.com/auth/login
```

Open the returned URL, login to Upstox, and you'll be redirected back with a code.

---

## Verification

After deployment, test these endpoints:

```bash
# Health check
curl https://your-api.com/health

# Popular stocks
curl https://your-api.com/stocks/popular

# Analysis (no auth required)
curl "https://your-api.com/analyze?symbol=RELIANCE&interval=1d"
```

Expected response for analysis:
```json
{
  "success": true,
  "data": {
    "symbol": "RELIANCE",
    "currentPrice": 2456.75,
    "indicators": { "sma20": 2412.35, "rsi14": 58.25 },
    "signal": { "recommendation": "BUY", "confidence": "MEDIUM" }
  }
}
```

---

## Troubleshooting

### Python not found
```bash
# Check python path
which python3

# Set in environment
PYTHON_PATH=/usr/bin/python3
```

### Database connection fails
- Check `DATABASE_URL` format: `Server=host;Database=dbname;User Id=user;Password=pass;Encrypt=true;TrustServerCertificate=true;`
- For Azure SQL: Use `Encrypt=true;TrustServerCertificate=false;`
- For local Docker: Use `Encrypt=true;TrustServerCertificate=true;`
- Verify MS SQL Server is running: `sudo systemctl status mssql-server`
- Check firewall allows port 1433

### CORS errors
- Ensure `FRONTEND_URL` matches your frontend domain exactly
- Include `https://` prefix
- No trailing slash

---

## Monitoring

### Railway
- Built-in metrics and logs in dashboard
- Go to your service → "Logs" tab

### Heroku
```bash
heroku logs --tail
```

### Self-hosted with PM2
```bash
pm2 logs
pm2 monit
```

---

## SSL / HTTPS

### Railway: Auto-enabled

### Heroku: Auto-enabled

### Self-hosted (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## Next Steps

1. ✅ Deploy backend
2. ✅ Update frontend API_BASE_URL
3. ✅ Test with `RELIANCE` symbol
4. ✅ Set up Upstox OAuth
5. ✅ Enable real-time WebSocket
