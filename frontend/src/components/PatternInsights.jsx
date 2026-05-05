/**
 * PatternInsights.jsx
 * -------------------
 * Displays detected patterns, trend analysis, support/resistance levels,
 * and candlestick patterns with visual indicators.
 */

import React from 'react';
import { 
  Sparkles, TrendingUp, TrendingDown, Activity, 
  ArrowUpCircle, ArrowDownCircle, Target, Shield,
  Zap, BarChart2
} from 'lucide-react';

const PatternInsights = ({ 
  patterns,
  trend,
  trendStrength,
  rsiCondition,
  support,
  resistance,
  candlestickPatterns,
  currentPrice
}) => {
  const getPatternIcon = (pattern) => {
    const iconMap = {
      'uptrend': <TrendingUp className="w-4 h-4" />,
      'downtrend': <TrendingDown className="w-4 h-4" />,
      'overbought': <ArrowUpCircle className="w-4 h-4" />,
      'oversold': <ArrowDownCircle className="w-4 h-4" />,
      'near_resistance': <Target className="w-4 h-4" />,
      'near_support': <Shield className="w-4 h-4" />,
      'doji': <Activity className="w-4 h-4" />,
      'hammer': <Zap className="w-4 h-4" />,
      'shooting_star': <Zap className="w-4 h-4" />,
      'bullish_engulfing': <TrendingUp className="w-4 h-4" />,
      'bearish_engulfing': <TrendingDown className="w-4 h-4" />,
    };
    return iconMap[pattern] || <Sparkles className="w-4 h-4" />;
  };

  const getPatternColor = (pattern) => {
    if (pattern.includes('bullish') || pattern === 'uptrend' || pattern === 'hammer' || pattern === 'oversold') {
      return 'bg-green-500/10 text-green-400 border-green-500/30';
    }
    if (pattern.includes('bearish') || pattern === 'downtrend' || pattern === 'shooting_star' || pattern === 'overbought') {
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
    if (pattern.includes('support') || pattern.includes('resistance')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
    return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  };

  const getPatternLabel = (pattern) => {
    const labelMap = {
      'uptrend': 'Uptrend',
      'downtrend': 'Downtrend',
      'overbought': 'Overbought',
      'oversold': 'Oversold',
      'near_resistance': 'Near Resistance',
      'near_support': 'Near Support',
      'doji': 'Doji Pattern',
      'hammer': 'Hammer Pattern',
      'shooting_star': 'Shooting Star',
      'bullish_engulfing': 'Bullish Engulfing',
      'bearish_engulfing': 'Bearish Engulfing',
    };
    return labelMap[pattern] || pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTrendIcon = () => {
    if (trend === 'bullish') return <TrendingUp className="w-5 h-5 text-green-400" />;
    if (trend === 'bearish') return <TrendingDown className="w-5 h-5 text-red-400" />;
    return <Activity className="w-5 h-5 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend === 'bullish') return 'text-green-400 bg-green-500/10';
    if (trend === 'bearish') return 'text-red-400 bg-red-500/10';
    return 'text-gray-400 bg-gray-500/10';
  };

  const getStrengthColor = () => {
    if (trendStrength === 'strong') return 'text-green-400';
    if (trendStrength === 'moderate') return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getRSIColor = () => {
    const normalized = rsiCondition?.toString().toLowerCase();
    if (normalized === 'overbought') return 'text-red-400 bg-red-500/10';
    if (normalized === 'oversold') return 'text-green-400 bg-green-500/10';
    return 'text-gray-400 bg-gray-500/10';
  };

  const calculateDistanceToLevel = (level) => {
    if (!level || !currentPrice) return null;
    const distance = ((level - currentPrice) / currentPrice) * 100;
    return distance.toFixed(2);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Pattern Insights</h3>
      </div>

      {/* Trend Analysis */}
      <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-xl mb-4">
        <div className={`p-2 rounded-lg ${getTrendColor()}`}>
          {getTrendIcon()}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-400">Trend Direction</div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold capitalize text-white">{trend}</span>
            <span className={`text-sm font-medium ${getStrengthColor()}`}>
              ({trendStrength} strength)
            </span>
          </div>
        </div>
      </div>

      {/* RSI Condition */}
      <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-xl mb-4">
        <div className={`p-2 rounded-lg ${getRSIColor()}`}>
          <BarChart2 className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-400">RSI Condition</div>
          <span className="text-lg font-semibold capitalize text-white">{rsiCondition}</span>
        </div>
      </div>

      {/* Support & Resistance */}
      {(support || resistance) && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Support & Resistance</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {support && (
              <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Support</span>
                </div>
                <div className="text-lg font-semibold text-green-400">{support.toFixed(2)}</div>
                {currentPrice && (
                  <div className="text-xs text-gray-500 mt-1">
                    {calculateDistanceToLevel(support)}% below current
                  </div>
                )}
              </div>
            )}
            {resistance && (
              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Resistance</span>
                </div>
                <div className="text-lg font-semibold text-red-400">{resistance.toFixed(2)}</div>
                {currentPrice && (
                  <div className="text-xs text-gray-500 mt-1">
                    +{calculateDistanceToLevel(resistance)}% above current
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Candlestick Patterns */}
      {candlestickPatterns && candlestickPatterns.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Candlestick Patterns</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {candlestickPatterns.map((pattern, index) => (
              <span
                key={index}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getPatternColor(pattern)}`}
              >
                {getPatternIcon(pattern)}
                {getPatternLabel(pattern)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* All Detected Patterns */}
      {patterns && patterns.length > 0 && (
        <div className="pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">All Detected Patterns</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {patterns.filter(p => !candlestickPatterns?.includes(p)).map((pattern, index) => (
              <span
                key={index}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${getPatternColor(pattern)}`}
              >
                {getPatternIcon(pattern)}
                {getPatternLabel(pattern)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* No Patterns Message */}
      {(!patterns || patterns.length === 0) && (!candlestickPatterns || candlestickPatterns.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No significant patterns detected</p>
          <p className="text-xs mt-1">Try a different timeframe for more insights</p>
        </div>
      )}
    </div>
  );
};

export default PatternInsights;
