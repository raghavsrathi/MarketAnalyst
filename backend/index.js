/**
 * Unified Stock Analysis API
 * --------------------------
 * Single entry point for all backend services
 * 
 * Includes:
 * - /analyze (yfinance technical analysis)
 * - /price (Upstox live price)
 * - /order (Upstox trading)
 * - /stocks (stock listing)
 * 
 * Optimized for 100-300 concurrent users
 */

const { server, startServer } = require('./src/server');

// Start server with port conflict handling
const PORT = process.env.PORT || 8080;

function startOnPort(port) {
  server.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Unified Stock Analysis API                          ║
║                                                            ║
║   Port: ${port.toString().padEnd(47)}║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(40)}║
║                                                            ║
║   Endpoints:                                               ║
║   • /health           → Health check                      ║
║   • /analyze          → Technical analysis (yfinance)     ║
║   • /price            → Live price (Upstox)               ║
║   • /order            → Place order (Upstox)              ║
║   • /stocks           → Stock listings                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use.`);
      const nextPort = port + 1;
      if (nextPort <= port + 5) {
        console.log(`🔄 Trying port ${nextPort}...`);
        startOnPort(nextPort);
      } else {
        console.error('❌ Could not find an available port. Stop the process on port 8080 and try again.');
        process.exit(1);
      }
    } else {
      console.error('❌ Server error:', err.message);
      process.exit(1);
    }
  });
}

startOnPort(PORT);

module.exports = { server, startServer };
