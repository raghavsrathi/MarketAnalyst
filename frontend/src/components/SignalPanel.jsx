/**
 * SignalPanel.jsx
 * ----------------
 * Displays trading signals: recommendation, confidence, and score breakdown.
 * Shows Buy/Sell/Hold recommendation with visual indicators.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Target, Activity, BarChart3 } from 'lucide-react';
import { getRecommendationColor, getSignalIcon } from '../services/api';

const SignalPanel = ({ 
  recommendation, 
  confidence, 
  score, 
  macdSignal,
  signalBreakdown,
  summary 
}) => {
  const getRecommendationIcon = () => {
    switch (recommendation?.toLowerCase()) {
      case 'buy':
        return <TrendingUp className="w-8 h-8" />;
      case 'sell':
        return <TrendingDown className="w-8 h-8" />;
      default:
        return <Minus className="w-8 h-8" />;
    }
  };

  const getConfidenceColor = (conf) => {
    switch (conf?.toLowerCase()) {
      case 'high':
        return 'text-green-400 bg-green-500/10';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10';
      default:
        return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getScoreBarColor = (score) => {
    if (score >= 2) return 'bg-green-500';
    if (score <= -2) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getScorePosition = (score) => {
    // Map score from -5 to +5 to 0-100%
    const normalized = Math.max(-5, Math.min(5, score));
    return ((normalized + 5) / 10) * 100;
  };

  const getSignalScoreColor = (value) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getSignalLabel = (key) => {
    const labels = {
      rsi: 'RSI Signal',
      macd: 'MACD Signal',
      ema_trend: 'EMA Trend',
      bollinger_bands: 'Bollinger Bands',
      support_resistance: 'Support/Resistance',
      candlestick: 'Candlestick Pattern',
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <Target className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Trading Signal</h3>
      </div>

      {/* Main Recommendation */}
      <div className={`flex items-center gap-4 p-5 rounded-xl border-2 mb-5 ${getRecommendationColor(recommendation)}`}>
        <div className="p-3 rounded-full bg-white/10">
          {getRecommendationIcon()}
        </div>
        <div>
          <div className="text-sm opacity-80 mb-0.5">Recommendation</div>
          <div className="text-3xl font-bold uppercase tracking-wider">
            {recommendation}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(confidence)}`}>
            <Activity className="w-3 h-3" />
            {confidence} confidence
          </div>
        </div>
      </div>

      {/* Score Gauge */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-400">Signal Score</span>
          <span className={`font-mono font-semibold ${getSignalScoreColor(score)}`}>
            {score > 0 ? '+' : ''}{score}
          </span>
        </div>
        <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
          {/* Center marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 -translate-x-1/2 z-10" />
          
          {/* Score bar */}
          <div 
            className={`absolute top-0 bottom-0 rounded-full transition-all duration-500 ${getScoreBarColor(score)}`}
            style={{
              left: score >= 0 ? '50%' : `${getScorePosition(score)}%`,
              right: score >= 0 ? `${100 - getScorePosition(score)}%` : '50%',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Sell</span>
          <span>Hold</span>
          <span>Buy</span>
        </div>
      </div>

      {/* Signal Breakdown */}
      {signalBreakdown && Object.keys(signalBreakdown).length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Signal Breakdown</span>
          </div>
          <div className="space-y-2">
            {Object.entries(signalBreakdown).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-1.5 px-3 bg-gray-900/50 rounded-lg">
                <span className="text-sm text-gray-400">{getSignalLabel(key)}</span>
                <span className={`font-mono text-sm font-medium ${getSignalScoreColor(value)}`}>
                  {value > 0 ? '+' : ''}{value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MACD Signal */}
      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg mb-4">
        <span className="text-sm text-gray-400">MACD Signal</span>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${
            macdSignal === 'buy' ? 'text-green-400' :
            macdSignal === 'sell' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {getSignalIcon(macdSignal)} {macdSignal?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="pt-4 border-t border-gray-700/50">
          <p className="text-sm text-gray-300 leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
};

export default SignalPanel;
