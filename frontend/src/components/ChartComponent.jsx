/**
 * ChartComponent.jsx
 * ------------------
 * Interactive chart using TradingView Lightweight Charts.
 * Displays OHLCV candlesticks with technical indicator overlays.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { Maximize2, Minimize2, Layers } from 'lucide-react';

// Helper to convert various time formats to Unix timestamp (seconds)
// Handles both PascalCase (API) and camelCase (internal) field names
const toUnixTimestamp = (time) => {
  if (time === undefined || time === null) return null;
  // Already a number (Unix timestamp)
  if (typeof time === 'number') {
  // If already in seconds, return directly
  if (time < 1e12) return time;

  // If milliseconds, convert
  return Math.floor(time / 1000);
}
  // BusinessDay object
  if (typeof time === 'object' && time.year && time.month && time.day) {
    const date = new Date(time.year, time.month - 1, time.day);
    return Math.floor(date.getTime() / 1000);
  }
  // String date like "2025-12-04 00:00:00" or ISO format
  if (typeof time === 'string') {
    const ts = Math.floor(new Date(time).getTime() / 1000);
    return isNaN(ts) ? null : ts;
  }
  return null;
};

// Helper to validate and convert candle data
// Handles both PascalCase (API: Date, Open, High, Low, Close) and camelCase (internal: time, open, high, low, close)
const convertCandles = (candles) => {
  if (!Array.isArray(candles)) return [];
  return candles
    .map((c, index) => {
      // Support both PascalCase (API) and camelCase (normalized) field names
      const time = toUnixTimestamp(c.time ?? c.Date);
      if (time === null) {
        console.warn(`Invalid candle time at index ${index}:`, c);
        return null;
      }
      return {
        time,
        // Defensive: PascalCase API fields take priority, fallback to camelCase
        open: Number(c.open ?? c.Open) || 0,
        high: Number(c.high ?? c.High) || 0,
        low: Number(c.low ?? c.Low) || 0,
        close: Number(c.close ?? c.Close) || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
};

// Helper to convert indicator data (line series)
// Handles both PascalCase (API: Date, Value) and camelCase (internal: time, value)
const convertIndicatorData = (data) => {
  if (!Array.isArray(data)) return [];
  return data
    .map((point, index) => {
      // Support both PascalCase (API) and camelCase (normalized) field names
      const time = toUnixTimestamp(point.time ?? point.Date);
      if (time === null) {
        console.warn(`Invalid indicator time at index ${index}:`, point);
        return null;
      }
      // Defensive: PascalCase API Value/Close take priority, fallback chain for value
      const value = Number(point.value ?? point.Value ?? point.Close ?? point.close ?? 0) || 0;
      return { time, value };
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
};

const ChartComponent = ({ 
  candles, 
  indicators, 
  support, 
  resistance,
  trend,
  symbol,
  interval,
  isLoading = false,
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const macdContainerRef = useRef(null);
  const macdChartRef = useRef(null);
  const macdSeriesRef = useRef({});
  const [showEMA, setShowEMA] = useState(true);
  const [showBB, setShowBB] = useState(true);
  const [showMACD, setShowMACD] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize charts
  useEffect(() => {
  if (!chartContainerRef.current || !macdContainerRef.current) return;

  // FIX: Reset seriesRef at the start of every mount.
  seriesRef.current = {};
  macdSeriesRef.current = {};

  // Main chart options
  const chartOptions = {
    layout: {
      background: { type: ColorType.Solid, color: '#1a1a1a' },
      textColor: '#d1d5db',
    },
    grid: {
      vertLines: { color: '#374151', style: 1 },
      horzLines: { color: '#374151', style: 1 },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: '#6b7280', width: 1, style: 2, labelBackgroundColor: '#374151' },
      horzLine: { color: '#6b7280', width: 1, style: 2, labelBackgroundColor: '#374151' },
    },
    rightPriceScale: {
      borderColor: '#4b5563',
      scaleMargins: { top: 0.1, bottom: 0.1 },
    },
    timeScale: {
      borderColor: '#4b5563',
      timeVisible: true,
      secondsVisible: false,
    },
    handleScroll: { vertTouchDrag: false },
    // FIX: Remove autosize:true — ResizeObserver will own sizing exclusively.
    // Mixing both causes the canvas to reset to 0×0.
    width: chartContainerRef.current.clientWidth,
    height: chartContainerRef.current.clientHeight,
  };

  const chart = createChart(chartContainerRef.current, chartOptions);
  chartRef.current = chart;

  // MACD chart options
  const macdChartOptions = {
    layout: {
      background: { type: ColorType.Solid, color: '#1a1a1a' },
      textColor: '#d1d5db',
    },
    grid: {
      vertLines: { color: '#374151', style: 1 },
      horzLines: { color: '#374151', style: 1 },
    },
    rightPriceScale: {
      borderColor: '#4b5563',
      scaleMargins: { top: 0.1, bottom: 0.1 },
    },
    timeScale: {
      borderColor: '#4b5563',
      timeVisible: true,
      secondsVisible: false,
      visible: false, // Hide time scale on MACD chart (synced with main)
    },
    handleScroll: { vertTouchDrag: false },
    width: macdContainerRef.current.clientWidth,
    height: 120,
  };

  const macdChart = createChart(macdContainerRef.current, macdChartOptions);
  macdChartRef.current = macdChart;

  const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    seriesRef.current.candlestick = candlestickSeries;

   // Create EMA series
    const emaShortSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      title: 'EMA 9',
    });
    seriesRef.current.emaShort = emaShortSeries;

    const emaLongSeries = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: 'EMA 21',
    });
    seriesRef.current.emaLong = emaLongSeries;

    // Create Bollinger Bands series
    const bbUpperSeries = chart.addLineSeries({
      color: '#a855f7',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Upper',
    });
    seriesRef.current.bbUpper = bbUpperSeries;

    const bbMiddleSeries = chart.addLineSeries({
      color: '#a855f7',
      lineWidth: 1,
      lineStyle: 3,
      title: 'BB Middle',
    });
    seriesRef.current.bbMiddle = bbMiddleSeries;

    const bbLowerSeries = chart.addLineSeries({
      color: '#a855f7',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Lower', 
    });
    seriesRef.current.bbLower = bbLowerSeries;

    // Support/Resistance lines
    const supportSeries = chart.addLineSeries({
      color: '#22c55e',
      lineWidth: 2,
      lineStyle: 1,
      title: 'Support',
    });
    seriesRef.current.support = supportSeries;

    const resistanceSeries = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
      lineStyle: 1,
      title: 'Resistance',
    });
    seriesRef.current.resistance = resistanceSeries;

  // Create MACD series
  const macdLineSeries = macdChart.addLineSeries({
    color: '#f59e0b',
    lineWidth: 2,
    title: 'MACD Line',
  });
  macdSeriesRef.current.macdLine = macdLineSeries;

  const macdSignalSeries = macdChart.addLineSeries({
    color: '#3b82f6',
    lineWidth: 2,
    title: 'MACD Signal',
  });
  macdSeriesRef.current.macdSignal = macdSignalSeries;

  const macdHistogramSeries = macdChart.addHistogramSeries({
    color: '#22c55e',
    title: 'MACD Histogram',
  });
  macdSeriesRef.current.macdHistogram = macdHistogramSeries;

  // Sync time scales between charts
  chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
    if (timeRange && macdChartRef.current) {
      macdChartRef.current.timeScale().setVisibleLogicalRange(chart.timeScale().getVisibleLogicalRange());
    }
  });

  const resizeObserver = new ResizeObserver((entries) => {
    requestAnimationFrame(() => {
      if (!chartRef.current || !entries[0]) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chartRef.current.applyOptions({
          width: Math.floor(width),
          height: Math.floor(height),
        });
      }
    });
  });

  resizeObserver.observe(chartContainerRef.current);
  resizeObserver.observe(macdContainerRef.current);

  // FIX: Initial size also needs RAF for the same reason
  requestAnimationFrame(() => {
    if (!chartRef.current || !chartContainerRef.current) return;
    const { clientWidth, clientHeight } = chartContainerRef.current;
    if (clientWidth > 0 && clientHeight > 0) {
      chartRef.current.applyOptions({
        width: clientWidth,
        height: clientHeight,
      });
    }
    if (macdChartRef.current && macdContainerRef.current) {
      const { clientWidth: macdWidth } = macdContainerRef.current;
      if (macdWidth > 0) {
        macdChartRef.current.applyOptions({ width: macdWidth });
      }
    }
  });

  return () => {
    resizeObserver.disconnect();
    chart.remove();
    macdChart.remove();
    chartRef.current = null;
    macdChartRef.current = null;
    seriesRef.current = {};
    macdSeriesRef.current = {};
  };
}, []);

  // Update chart data
  useEffect(() => {
    console.log('Chart Data:', { candles, indicators });
    // FIX: Guard against stale refs from StrictMode's double-invoke
    if (!chartRef.current || !seriesRef.current.candlestick || !candles || candles.length === 0) return;

    const { candlestick, emaShort, emaLong, bbUpper, bbMiddle, bbLower, support: supportLine, resistance: resistanceLine } = seriesRef.current;

    // Set candlestick data
    console.log('Incoming candles:', candles.slice(0, 2));
    const validCandles = convertCandles(candles);
    if (validCandles.length > 0) {
      candlestick.setData(validCandles);
    } else {
      console.warn('No valid candles to display');
    }
    console.log('Converted candles:', validCandles.slice(0, 2));

    const lastCandleTime = validCandles.length > 0 ? validCandles[validCandles.length - 1].time : null;
    const buildPointSeries = (value) => {
      return lastCandleTime != null && value != null ? [{ time: lastCandleTime, value }] : [];
    };

    // Set EMA data
    const emaShortSource = Array.isArray(indicators?.ema_short)
      ? indicators.ema_short
      : buildPointSeries(indicators?.ema?.ema9 ?? indicators?.ema9 ?? indicators?.ema_short?.[0]?.value);
    const emaLongSource = Array.isArray(indicators?.ema_long)
      ? indicators.ema_long
      : buildPointSeries(indicators?.ema?.ema21 ?? indicators?.ema21 ?? indicators?.ema_long?.[0]?.value);

    const emaShortData = convertIndicatorData(emaShortSource);
    if (emaShortData.length > 0) {
      emaShort.setData(emaShortData);
      emaShort.applyOptions({ visible: showEMA });
    }

    const emaLongData = convertIndicatorData(emaLongSource);
    if (emaLongData.length > 0) {
      emaLong.setData(emaLongData);
      emaLong.applyOptions({ visible: showEMA });
    }

    // Set Bollinger Bands data
    const bbUpperSource = Array.isArray(indicators?.bb_upper)
      ? indicators.bb_upper
      : buildPointSeries(indicators?.bollinger?.upper ?? indicators?.bb_upper);
    const bbMiddleSource = Array.isArray(indicators?.bb_middle)
      ? indicators.bb_middle
      : buildPointSeries(indicators?.bollinger?.middle ?? indicators?.bb_middle);
    const bbLowerSource = Array.isArray(indicators?.bb_lower)
      ? indicators.bb_lower
      : buildPointSeries(indicators?.bollinger?.lower ?? indicators?.bb_lower);

    const bbUpperData = convertIndicatorData(bbUpperSource);
    const bbMiddleData = convertIndicatorData(bbMiddleSource);
    const bbLowerData = convertIndicatorData(bbLowerSource);

    if (bbUpperData.length > 0) {
      bbUpper.setData(bbUpperData);
      bbUpper.applyOptions({ visible: showBB });
    }
    if (bbMiddleData.length > 0) {
      bbMiddle.setData(bbMiddleData);
      bbMiddle.applyOptions({ visible: showBB });
    }
    if (bbLowerData.length > 0) {
      bbLower.setData(bbLowerData);
      bbLower.applyOptions({ visible: showBB });
    }

    console.log('Bollinger:', {
      upper: bbUpperData,
      middle: bbMiddleData,
      lower: bbLowerData,
    });
    // if (indicators?.bb_middle?.length > 0) {
    //   const bbMiddleData = convertIndicatorData(indicators.bb_middle);
    //   if (bbMiddleData.length > 0) {
    //     bbMiddle.setData(bbMiddleData);
    //     bbMiddle.applyOptions({ visible: showBB });
    //   }
    // }
    // if (indicators?.bb_lower?.length > 0) {
    //   const bbLowerData = convertIndicatorData(indicators.bb_lower);
    //   if (bbLowerData.length > 0) {
    //     bbLower.setData(bbLowerData);
    //     bbLower.applyOptions({ visible: showBB });
    //   }
    // }

    // Set Support/Resistance lines
    if (support && validCandles.length > 0) {
      const firstTime = validCandles[0].time;
      const lastTime = validCandles[validCandles.length - 1].time;
      supportLine.setData([
        { time: firstTime, value: support },
        { time: lastTime, value: support },
      ]);
    }

    if (resistance && validCandles.length > 0) {
      const firstTime = validCandles[0].time;
      const lastTime = validCandles[validCandles.length - 1].time;
      resistanceLine.setData([
        { time: firstTime, value: resistance },
        { time: lastTime, value: resistance },
      ]);
    }

    // Set MACD data on separate chart
    if (macdChartRef.current) {
      const macdLineSource = Array.isArray(indicators?.macd_line)
        ? indicators.macd_line
        : buildPointSeries(indicators?.macd?.line ?? indicators?.macd_line);
      const macdSignalSource = Array.isArray(indicators?.macd_signal)
        ? indicators.macd_signal
        : buildPointSeries(indicators?.macd?.signal ?? indicators?.macd_signal);
      const macdHistogramSource = Array.isArray(indicators?.macd_histogram)
        ? indicators.macd_histogram
        : buildPointSeries(indicators?.macd?.histogram ?? indicators?.macd_histogram);

      const macdLineData = convertIndicatorData(macdLineSource);
      const macdSignalData = convertIndicatorData(macdSignalSource);
      const macdHistogramData = convertIndicatorData(macdHistogramSource);

      if (macdLineData.length > 0 && macdSeriesRef.current.macdLine) {
        macdSeriesRef.current.macdLine.setData(macdLineData);
        macdSeriesRef.current.macdLine.applyOptions({ visible: showMACD });
      }
      if (macdSignalData.length > 0 && macdSeriesRef.current.macdSignal) {
        macdSeriesRef.current.macdSignal.setData(macdSignalData);
        macdSeriesRef.current.macdSignal.applyOptions({ visible: showMACD });
      }
      if (macdHistogramData.length > 0 && macdSeriesRef.current.macdHistogram) {
        macdSeriesRef.current.macdHistogram.setData(macdHistogramData);
        macdSeriesRef.current.macdHistogram.applyOptions({ visible: showMACD });
      }

      macdChartRef.current.timeScale().fitContent();
    }

    // Fit content
    chartRef.current.timeScale().fitContent();
  }, [candles, indicators, support, resistance, showEMA, showBB, showMACD]);

  const toggleFullscreen = () => {
  setIsFullscreen(prev => !prev);
  // FIX: RAF instead of setTimeout — waits for DOM repaint, not arbitrary delay
  requestAnimationFrame(() => {
    if (chartRef.current && chartContainerRef.current) {
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
    }
    if (macdChartRef.current && macdContainerRef.current) {
      macdChartRef.current.applyOptions({
        width: macdContainerRef.current.clientWidth,
      });
    }
  });
};

  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-gray-900 p-4' 
    : 'relative h-[500px] bg-gray-900/50 rounded-xl overflow-hidden';

  return (
    <div className={containerClass}>
      {/* Chart Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">
            {symbol} <span className="text-gray-400 text-sm">({interval})</span>
          </h3>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            trend === 'bullish' ? 'bg-green-500/20 text-green-400' :
            trend === 'bearish' ? 'bg-red-500/20 text-red-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {trend?.toUpperCase()}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Indicator Toggles */}
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setShowEMA(!showEMA)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                showEMA ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              EMA
            </button>
            <button
              onClick={() => setShowBB(!showBB)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                showBB ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              BB
            </button>
            <button
              onClick={() => setShowMACD(!showMACD)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                showMACD ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              MACD
            </button>
          </div>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400 px-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-blue-500"></span> EMA 9
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-amber-500"></span> EMA 21
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-purple-500"></span> BB
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-orange-500"></span> MACD
            </span>
            {support && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-green-500"></span> S
              </span>
            )}
            {resistance && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-red-500"></span> R
              </span>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-x-0 bottom-0 top-[60px] bg-gray-900/70 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-300 font-medium">Updating...</span>
          </div>
        </div>
      )}

      {/* Chart Containers */}
      <div className="flex flex-col gap-1">
        {/* Main Price Chart */}
        <div 
          ref={chartContainerRef} 
          className="w-full"
          style={{ 
            height: isFullscreen ? 'calc(100% - 180px)' : '320px',
            minHeight: '320px',
          }}
        />
        {/* MACD Chart */}
        <div
          ref={macdContainerRef}
          className="w-full border-t border-gray-700"
          style={{
            height: '120px',
            minHeight: '120px',
          }}
        />
      </div>
    </div>
  );
};

export default ChartComponent;
