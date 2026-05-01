/**
 * ChartComponent.jsx
 * ------------------
 * Interactive chart using TradingView Lightweight Charts.
 * Displays OHLCV candlesticks with technical indicator overlays.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { Maximize2, Minimize2, Layers } from 'lucide-react';

const ChartComponent = ({ 
  candles, 
  indicators, 
  support, 
  resistance,
  trend,
  symbol,
  interval 
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const [showEMA, setShowEMA] = useState(true);
  const [showBB, setShowBB] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

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
        vertLine: {
          color: '#6b7280',
          width: 1,
          style: 2,
          labelBackgroundColor: '#374151',
        },
        horzLine: {
          color: '#6b7280',
          width: 1,
          style: 2,
          labelBackgroundColor: '#374151',
        },
      },
      rightPriceScale: {
        borderColor: '#4b5563',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#4b5563',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    // Create candlestick series
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

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!chartRef.current || !candles || candles.length === 0) return;

    const { candlestick, emaShort, emaLong, bbUpper, bbMiddle, bbLower, support: supportLine, resistance: resistanceLine } = seriesRef.current;

    // Set candlestick data
    candlestick.setData(candles.map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })));

    // Set EMA data
    if (indicators?.ema_short?.length > 0) {
      emaShort.setData(indicators.ema_short);
      emaShort.applyOptions({ visible: showEMA });
    }
    if (indicators?.ema_long?.length > 0) {
      emaLong.setData(indicators.ema_long);
      emaLong.applyOptions({ visible: showEMA });
    }

    // Set Bollinger Bands data
    if (indicators?.bb_upper?.length > 0) {
      bbUpper.setData(indicators.bb_upper);
      bbUpper.applyOptions({ visible: showBB });
    }
    if (indicators?.bb_middle?.length > 0) {
      bbMiddle.setData(indicators.bb_middle);
      bbMiddle.applyOptions({ visible: showBB });
    }
    if (indicators?.bb_lower?.length > 0) {
      bbLower.setData(indicators.bb_lower);
      bbLower.applyOptions({ visible: showBB });
    }

    // Set Support/Resistance lines
    if (support && candles.length > 0) {
      const firstTime = candles[0].time;
      const lastTime = candles[candles.length - 1].time;
      supportLine.setData([
        { time: firstTime, value: support },
        { time: lastTime, value: support },
      ]);
    }

    if (resistance && candles.length > 0) {
      const firstTime = candles[0].time;
      const lastTime = candles[candles.length - 1].time;
      resistanceLine.setData([
        { time: firstTime, value: resistance },
        { time: lastTime, value: resistance },
      ]);
    }

    // Fit content
    chartRef.current.timeScale().fitContent();
  }, [candles, indicators, support, resistance, showEMA, showBB]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    }, 100);
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

      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        className="flex-1"
        style={{ height: isFullscreen ? 'calc(100% - 60px)' : '440px' }}
      />
    </div>
  );
};

export default ChartComponent;
