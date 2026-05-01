/**
 * Dashboard.jsx
 * -------------
 * Main dashboard page that brings together all components:
 * SearchBar, ChartComponent, SignalPanel, PatternInsights, and IndicatorPanel.
 * Handles data fetching and state management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Wifi, WifiOff, Zap } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import ChartComponent from '../components/ChartComponent';
import SignalPanel from '../components/SignalPanel';
import PatternInsights from '../components/PatternInsights';
import IndicatorPanel from '../components/IndicatorPanel';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { fetchAnalysis, createLiveWebSocket } from '../services/api';

const Dashboard = () => {
  // State
  const [symbol, setSymbol] = useState('AAPL');
  const [interval, setInterval] = useState('1d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liveMode, setLiveMode] = useState(false);
  const [wsConnection, setWsConnection] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch analysis data
  const fetchData = useCallback(async () => {
    if (!symbol.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchAnalysis(symbol, interval);
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle live mode toggle
  useEffect(() => {
    if (liveMode) {
      // Close existing connection
      if (wsConnection) {
        wsConnection.close();
      }
      
      // Create new WebSocket connection
      const ws = createLiveWebSocket(
        symbol,
        interval,
        (newData) => {
          // Merge WebSocket data with existing data to preserve series
          setData(prev => ({
            ...prev,
            ...newData,
            current_price: newData.current_price,
            last_updated: new Date().toISOString(),
          }));
          setLastUpdated(new Date());
        },
        (err) => {
          console.error('WebSocket error:', err);
          setLiveMode(false);
        }
      );
      
      setWsConnection(ws);
      
      return () => {
        ws.close();
      };
    } else {
      if (wsConnection) {
        wsConnection.close();
        setWsConnection(null);
      }
    }
  }, [liveMode, symbol, interval]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = () => {
    fetchData();
  };

  const toggleLiveMode = () => {
    setLiveMode(!liveMode);
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <LineChart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">TradeAnalytics</h1>
                <p className="text-xs text-gray-400">AI-Powered Technical Analysis</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Live Mode Toggle */}
              <button
                onClick={toggleLiveMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  liveMode 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
                disabled={!data}
              >
                {liveMode ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {liveMode ? 'Live' : 'Offline'}
              </button>
              
              {lastUpdated && (
                <span className="text-xs text-gray-500 hidden sm:block">
                  Updated: {formatLastUpdated()}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <SearchBar
          symbol={symbol}
          interval={interval}
          onSymbolChange={setSymbol}
          onIntervalChange={setInterval}
          onAnalyze={handleAnalyze}
          isLoading={loading}
        />

        {/* Loading State */}
        {loading && <LoadingState />}

        {/* Error State */}
        {error && !loading && (
          <ErrorState 
            error={error} 
            onRetry={handleAnalyze}
          />
        )}

        {/* Dashboard Content */}
        {!loading && !error && data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Chart */}
            <div className="lg:col-span-2 space-y-6">
              <ChartComponent
                candles={data.candles}
                indicators={data.series}
                support={data.support}
                resistance={data.resistance}
                trend={data.trend}
                symbol={data.symbol}
                interval={data.interval}
              />
              
              {/* Indicator Panel - Full Width Below Chart */}
              <IndicatorPanel indicators={data.indicators} />
            </div>

            {/* Right Column - Signals & Insights */}
            <div className="space-y-6">
              <SignalPanel
                recommendation={data.recommendation}
                confidence={data.confidence}
                score={data.score}
                macdSignal={data.macd_signal}
                signalBreakdown={data.signal_breakdown}
                summary={data.summary}
              />
              
              <PatternInsights
                patterns={data.patterns}
                trend={data.trend}
                trendStrength={data.trend_strength}
                rsiCondition={data.rsi_condition}
                support={data.support}
                resistance={data.resistance}
                candlestickPatterns={data.candlestick_patterns}
                currentPrice={data.current_price}
              />
            </div>
          </div>
        )}

        {/* Empty State - No Data Yet */}
        {!loading && !error && !data && (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <div className="p-4 bg-gray-800/50 rounded-full mb-4">
              <Zap className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Ready to Analyze
            </h3>
            <p className="text-gray-400 max-w-md">
              Enter a stock or crypto symbol above to get started with technical analysis, 
              pattern detection, and trading signals.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>
              Data provided by Yahoo Finance. Analysis is for educational purposes only.
            </p>
            <div className="flex items-center gap-4">
              <span>Indicators: RSI, MACD, EMA, Bollinger Bands</span>
              <span className="text-gray-700">|</span>
              <span>Patterns: Trend, Support/Resistance, Candlestick</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
