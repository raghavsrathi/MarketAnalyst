# TradeAnalytics - Automated Stock & Crypto Chart Analysis

A production-ready web application for automated technical analysis of stocks and cryptocurrencies. Built with **FastAPI** backend and **React + Vite** frontend.

![Dashboard Preview](https://img.shields.io/badge/React-18.3.1-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-green) ![License](https://img.shields.io/badge/license-MIT-yellow)

## Features

### Backend (FastAPI)
- **Data Fetching**: OHLCV data from Yahoo Finance (yfinance)
- **Technical Indicators**: 
  - RSI (Relative Strength Index)
  - MACD (Moving Average Convergence Divergence)
  - EMA (9, 21, 200 periods)
  - Bollinger Bands
- **Pattern Detection**:
  - Trend analysis (EMA crossover)
  - RSI overbought/oversold conditions
  - Support & Resistance levels (swing highs/lows)
  - Candlestick patterns (Doji, Hammer, Shooting Star, Engulfing)
- **Signal Generation**: Weighted scoring system producing Buy/Sell/Hold recommendations
- **WebSocket Support**: Live streaming updates (bonus feature)

### Frontend (React + Vite)
- **Interactive Charts**: TradingView Lightweight Charts with:
  - Candlestick visualization
  - EMA overlays (9 & 21 periods)
  - Bollinger Bands
  - Support/Resistance levels
- **Signal Panel**: Clear Buy/Sell/Hold recommendation with confidence score
- **Pattern Insights**: Visual display of detected patterns and trend analysis
- **Indicator Panel**: Real-time indicator values with status indicators
- **Live Mode**: WebSocket streaming for real-time updates
- **Responsive Design**: Works on desktop and mobile

## Project Structure

```
Trading/
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── requirements.txt        # Python dependencies
│   └── services/
│       ├── data_fetcher.py     # Yahoo Finance data fetching
│       ├── indicators.py       # Technical indicator computation
│       ├── pattern_detector.py # Pattern detection algorithms
│       └── signal_engine.py    # Signal aggregation & scoring
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── pages/
│       │   └── Dashboard.jsx   # Main dashboard
│       ├── components/
│       │   ├── SearchBar.jsx    # Symbol/interval selector
│       │   ├── ChartComponent.jsx # TradingView chart
│       │   ├── SignalPanel.jsx  # Trading signals
│       │   ├── PatternInsights.jsx # Pattern analysis
│       │   ├── IndicatorPanel.jsx # Indicator display
│       │   ├── LoadingState.jsx # Loading spinner
│       │   └── ErrorState.jsx   # Error display
│       └── services/
│           └── api.js           # API communication layer
```

## API Endpoints

### GET `/health`
Health check endpoint.

```json
{
  "status": "ok",
  "message": "Trading Analysis API is running."
}
```

### GET `/intervals`
Returns supported timeframe intervals.

```json
{
  "intervals": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1wk", "1mo"]
}
```

### GET `/analyze?symbol=AAPL&interval=1d`
Main analysis endpoint.

**Parameters:**
- `symbol` (required): Ticker symbol (e.g., AAPL, BTC-USD)
- `interval` (optional): Timeframe (default: 1d)

**Response:**
```json
{
  "symbol": "AAPL",
  "interval": "1d",
  "bars": 500,
  "current_price": 185.92,
  
  "candles": [
    {
      "time": 1704067200,
      "open": 182.5,
      "high": 186.2,
      "low": 181.8,
      "close": 185.92,
      "volume": 45000000
    }
  ],
  
  "indicators": {
    "rsi": 68.5,
    "macd_line": 2.34,
    "macd_signal": 1.89,
    "macd_histogram": 0.45,
    "ema_short": 184.12,
    "ema_long": 181.45,
    "ema_200": 175.23,
    "bb_upper": 189.45,
    "bb_middle": 182.50,
    "bb_lower": 175.55,
    "bb_width": 7.63
  },
  
  "series": {
    "rsi": [...],
    "ema_short": [...],
    "ema_long": [...],
    "bb_upper": [...],
    "bb_lower": [...],
    "bb_middle": [...]
  },
  
  "trend": "bullish",
  "trend_strength": "strong",
  "rsi_condition": "neutral",
  "support": 175.50,
  "resistance": 192.00,
  "candlestick_patterns": [],
  "patterns": ["uptrend", "near_resistance"],
  
  "macd_signal": "buy",
  "recommendation": "buy",
  "confidence": "high",
  "score": 3.5,
  "signal_breakdown": {
    "rsi": 0,
    "macd": 2.0,
    "ema_trend": 2.0,
    "bollinger_bands": -0.75,
    "support_resistance": 0,
    "candlestick": 0
  },
  "summary": "BUY: Bullish EMA trend; RSI neutral (68.5); MACD buy crossover. Score: +3.50"
}
```

### WS `/ws/live?symbol=AAPL&interval=1d&refresh_seconds=60`
WebSocket endpoint for live updates.

## Signal Logic

### RSI Signal
- RSI > 80 → Strong Sell (-2.0)
- RSI > 70 → Mild Sell (-1.5)
- RSI > 60 → Weak Sell (-0.5)
- RSI < 20 → Strong Buy (+2.0)
- RSI < 30 → Mild Buy (+1.5)
- RSI < 40 → Weak Buy (+0.5)
- 40-60 → Neutral (0)

### MACD Signal
- MACD Line > Signal Line → Buy (+1.5)
- MACD Line < Signal Line → Sell (-1.5)
- Histogram confirmation adds ±0.5

### EMA Trend Signal
- Bullish trend × strength multiplier
- Strong: ×2.0, Moderate: ×1.0, Weak: ×0.5

### Bollinger Bands Signal
- Price ≥95% of band range → Sell (-1.5)
- Price ≥80% of band range → Weak Sell (-0.75)
- Price ≤5% of band range → Buy (+1.5)
- Price ≤20% of band range → Weak Buy (+0.75)

### Final Recommendation
- Score ≥ +2.0 → **BUY**
- Score ≤ -2.0 → **SELL**
- Otherwise → **HOLD**

## Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
# Or: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Usage

1. Open the frontend in your browser (http://localhost:5173)
2. Enter a stock or crypto symbol (e.g., AAPL, BTC-USD)
3. Select a timeframe interval
4. Click "Analyze" to fetch data
5. View the chart with technical indicators
6. Check the signal panel for trading recommendations
7. Review pattern insights for additional context

## Popular Symbols

### Stocks
- AAPL (Apple)
- MSFT (Microsoft)
- GOOGL (Alphabet)
- AMZN (Amazon)
- TSLA (Tesla)
- META (Meta Platforms)
- NVDA (NVIDIA)
- SPY (S&P 500 ETF)

### Crypto
- BTC-USD (Bitcoin)
- ETH-USD (Ethereum)
- SOL-USD (Solana)
- ADA-USD (Cardano)

## Technologies Used

### Backend
- **FastAPI**: Modern, fast web framework
- **yfinance**: Yahoo Finance data fetching
- **pandas**: Data manipulation
- **pandas-ta**: Technical analysis indicators
- **numpy**: Numerical computing
- **uvicorn**: ASGI server

### Frontend
- **React 18**: UI library
- **Vite**: Build tool
- **Tailwind CSS**: Utility-first CSS
- **Lightweight Charts**: TradingView charting library
- **Lucide React**: Icons

## Development

### Backend Development
```bash
cd backend
python main.py
```

Auto-reload is enabled. The API docs are available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Frontend Development
```bash
cd frontend
npm run dev
```

Hot module replacement is enabled.

## Production Deployment

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend Build
```bash
cd frontend
npm run build
```

Static files will be in `frontend/dist/` for deployment.

## Contributing

Contributions are welcome! Please ensure:
1. Code follows existing style
2. Add tests for new features
3. Update documentation as needed

## Disclaimer

**IMPORTANT**: This software is for educational and informational purposes only. It does not constitute financial advice. Trading stocks and cryptocurrencies involves significant risk. Always do your own research and consider consulting a financial advisor before making investment decisions.

## License

MIT License - See LICENSE file for details.

## Acknowledgments

- Data provided by [Yahoo Finance](https://finance.yahoo.com)
- Charts powered by [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/)
