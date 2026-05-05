/**
 * IndicatorPanel.jsx
 * ------------------
 * Displays current technical indicator values with visual indicators
 * and status interpretations.
 */

import React from 'react';
import { 
  Activity, BarChart3, Waves, TrendingUp, 
  TrendingDown, Minus, AlertTriangle 
} from 'lucide-react';

const IndicatorPanel = ({ indicators }) => {
  if (!indicators) return null;

  const {
    rsi,
    macd = {},
    ema = {},
    bollinger = {},
    macd_line,
    macd_signal,
    macd_histogram,
    ema_short,
    ema_long,
    ema_200,
    bb_upper,
    bb_middle,
    bb_lower,
    bb_width,
  } = indicators;

  const macdLine = macd?.line ?? macd_line ?? null;
  const macdSignal = macd?.signal ?? macd_signal ?? null;
  const macdHistogram = macd?.histogram ?? macd_histogram ?? null;
  const emaShort = ema?.ema9 ?? ema_short ?? null;
  const emaLong = ema?.ema21 ?? ema_long ?? null;
  const ema200 = ema?.ema200 ?? ema_200 ?? null;
  const bbUpper = bollinger?.upper ?? bb_upper ?? null;
  const bbMiddle = bollinger?.middle ?? bb_middle ?? null;
  const bbLower = bollinger?.lower ?? bb_lower ?? null;
  const bbWidth = bollinger?.width ?? bb_width ?? null;

  const formatNumber = (val, decimals = 2) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return Number(val).toFixed(decimals);
  };

  const getRSIStatus = (value) => {
    if (value === null || value === undefined) return { label: 'N/A', color: 'text-gray-400', bg: 'bg-gray-500/10' };
    if (value >= 70) return { label: 'Overbought', color: 'text-red-400', bg: 'bg-red-500/10' };
    if (value <= 30) return { label: 'Oversold', color: 'text-green-400', bg: 'bg-green-500/10' };
    if (value >= 60) return { label: 'High', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    if (value <= 40) return { label: 'Low', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    return { label: 'Neutral', color: 'text-gray-400', bg: 'bg-gray-500/10' };
  };

  const getMACDStatus = (line, signal) => {
    if (line === null || signal === null) return { label: 'N/A', icon: Minus, color: 'text-gray-400' };
    if (line > signal) return { label: 'Bullish', icon: TrendingUp, color: 'text-green-400' };
    if (line < signal) return { label: 'Bearish', icon: TrendingDown, color: 'text-red-400' };
    return { label: 'Neutral', icon: Minus, color: 'text-gray-400' };
  };

  const getBBStatus = (width) => {
    if (width === null) return { label: 'N/A', desc: 'No data' };
    if (width > 10) return { label: 'High Volatility', desc: 'Wide bands indicate high volatility' };
    if (width < 5) return { label: 'Low Volatility', desc: 'Narrow bands suggest consolidation' };
    return { label: 'Normal', desc: 'Average volatility conditions' };
  };

  const getEMATrend = (short, long) => {
    if (short === null || long === null) return { label: 'N/A', color: 'text-gray-400' };
    if (short > long) return { label: 'Bullish Crossover', color: 'text-green-400' };
    if (short < long) return { label: 'Bearish Crossover', color: 'text-red-400' };
    return { label: 'Neutral', color: 'text-gray-400' };
  };

  const rsiStatus = getRSIStatus(rsi);
  const macdStatus = getMACDStatus(macdLine, macdSignal);
  const bbStatus = getBBStatus(bbWidth);
  const emaTrend = getEMATrend(emaShort, emaLong);

  const MacdIcon = macdStatus.icon;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Technical Indicators</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* RSI */}
        <div className="p-4 bg-gray-900/50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">RSI (14)</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${rsiStatus.bg} ${rsiStatus.color}`}>
              {rsiStatus.label}
            </span>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-2xl font-bold ${rsiStatus.color}`}>
              {formatNumber(rsi, 1)}
            </span>
            <span className="text-sm text-gray-500 mb-1">/ 100</span>
          </div>
          {/* RSI Bar */}
          <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                rsi >= 70 ? 'bg-red-500' : rsi <= 30 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${rsi || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>30</span>
            <span>70</span>
            <span>100</span>
          </div>
        </div>

        {/* MACD */}
        <div className="p-4 bg-gray-900/50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">MACD</span>
            </div>
            <div className={`flex items-center gap-1 ${macdStatus.color}`}>
              <MacdIcon className="w-4 h-4" />
              <span className="text-xs font-medium">{macdStatus.label}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Line</span>
              <span className={`font-mono text-sm font-medium ${macdLine > macdSignal ? 'text-green-400' : 'text-gray-400'}`}>
                {formatNumber(macdLine, 3)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Signal</span>
              <span className="font-mono text-sm text-gray-400">
                {formatNumber(macdSignal, 3)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-700/50">
              <span className="text-xs text-gray-500">Histogram</span>
              <span className={`font-mono text-sm font-medium ${macdHistogram > 0 ? 'text-green-400' : macdHistogram < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {macdHistogram > 0 ? '+' : ''}{formatNumber(macdHistogram, 3)}
              </span>
            </div>
          </div>
        </div>

        {/* EMA */}
        <div className="p-4 bg-gray-900/50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-gray-300">EMA</span>
            </div>
            <span className={`text-xs font-medium ${emaTrend.color}`}>
              {emaTrend.label}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-xs text-gray-500">EMA 9</span>
              </div>
              <span className="font-mono text-sm text-white">
                {formatNumber(emaShort)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-xs text-gray-500">EMA 21</span>
              </div>
              <span className="font-mono text-sm text-white">
                {formatNumber(emaLong)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-700/50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                <span className="text-xs text-gray-500">EMA 200</span>
              </div>
              <span className="font-mono text-sm text-gray-400">
                {formatNumber(ema200)}
              </span>
            </div>
          </div>
        </div>

        {/* Bollinger Bands */}
        <div className="p-4 bg-gray-900/50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-pink-400" />
              <span className="text-sm font-medium text-gray-300">Bollinger Bands</span>
            </div>
            <span className={`text-xs font-medium ${bbWidth > 10 ? 'text-yellow-400' : 'text-gray-400'}`}>
              {bbStatus.label}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Upper</span>
              <span className="font-mono text-sm text-purple-400">
                {formatNumber(bbUpper)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Middle</span>
              <span className="font-mono text-sm text-gray-400">
                {formatNumber(bbMiddle)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Lower</span>
              <span className="font-mono text-sm text-purple-400">
                {formatNumber(bbLower)}
              </span>
            </div>
            {bbWidth !== null && (
              <div className="flex items-center justify-between pt-1 border-t border-gray-700/50">
                <span className="text-xs text-gray-500">Width</span>
                <span className="font-mono text-sm text-cyan-400">
                  {formatNumber(bbWidth, 2)}%
                </span>
              </div>
            )}
          </div>
          {bbWidth !== null && (
            <p className="text-xs text-gray-500 mt-2">{bbStatus.desc}</p>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500 font-medium">Indicator Guide</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            RSI &lt; 30: Oversold (Buy signal)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            RSI &gt; 70: Overbought (Sell signal)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            MACD Line &gt; Signal: Bullish
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            BB Width: Market volatility
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorPanel;
