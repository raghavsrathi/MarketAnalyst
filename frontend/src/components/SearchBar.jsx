/**
 * SearchBar.jsx
 * -------------
 * Component for selecting stock/crypto symbol and timeframe interval.
 * Includes quick-select dropdown for popular symbols.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, Clock, ChevronDown, TrendingUp, Bitcoin, Star, Globe } from 'lucide-react';
import { INTERVALS, POPULAR_SYMBOLS } from '../services/api';

const SearchBar = ({ symbol, interval, onSymbolChange, onIntervalChange, onAnalyze, isLoading }) => {
  const [inputValue, setInputValue] = useState(symbol);
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [showIntervalDropdown, setShowIntervalDropdown] = useState(false);
  const [filteredSymbols, setFilteredSymbols] = useState(POPULAR_SYMBOLS);
  const symbolDropdownRef = useRef(null);
  const intervalDropdownRef = useRef(null);

  // Update input when symbol prop changes
  useEffect(() => {
    setInputValue(symbol);
  }, [symbol]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (symbolDropdownRef.current && !symbolDropdownRef.current.contains(event.target)) {
        setShowSymbolDropdown(false);
      }
      if (intervalDropdownRef.current && !intervalDropdownRef.current.contains(event.target)) {
        setShowIntervalDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter symbols based on input
  useEffect(() => {
    const filtered = POPULAR_SYMBOLS.filter(
      s => 
        s.symbol.toLowerCase().includes(inputValue.toLowerCase()) ||
        s.name.toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredSymbols(filtered);
  }, [inputValue]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setShowSymbolDropdown(true);
  };

  const handleSymbolSelect = (selectedSymbol) => {
    setInputValue(selectedSymbol);
    onSymbolChange(selectedSymbol);
    setShowSymbolDropdown(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSymbolChange(inputValue.trim().toUpperCase());
      onAnalyze();
      setShowSymbolDropdown(false);
    }
  };

  const handleIntervalSelect = (selectedInterval) => {
    onIntervalChange(selectedInterval);
    setShowIntervalDropdown(false);
  };

  const getSelectedIntervalLabel = () => {
    return INTERVALS.find(i => i.value === interval)?.label || interval;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Crypto':
        return <Bitcoin className="w-4 h-4 text-orange-400" />;
      case 'ETF':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'Indian Stock':
        return <Globe className="w-4 h-4 text-orange-500" />;
      case 'US Stock':
        return <Star className="w-4 h-4 text-blue-400" />;
      default:
        return <Star className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 mb-6">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        {/* Symbol Input */}
        <div className="flex-1 relative" ref={symbolDropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setShowSymbolDropdown(true)}
              placeholder="Enter symbol (e.g., AAPL, RELIANCE.NS, BTC-USD)"
              className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg 
                         text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 
                         focus:ring-1 focus:ring-blue-500 transition-all"
              disabled={isLoading}
            />
          </div>

          {/* Symbol Dropdown */}
          {showSymbolDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 
                            rounded-lg shadow-xl max-h-80 overflow-y-auto z-50">
              <div className="p-2 text-xs text-gray-500 uppercase font-semibold tracking-wider">
                Popular Symbols
              </div>
              {filteredSymbols.length > 0 ? (
                filteredSymbols.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => handleSymbolSelect(item.symbol)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700/50 
                               transition-colors text-left"
                  >
                    {getCategoryIcon(item.category)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{item.symbol}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">{item.name}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-gray-500 text-center">
                  Press Enter to search for "{inputValue}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interval Selector */}
        <div className="relative" ref={intervalDropdownRef}>
          <button
            type="button"
            onClick={() => setShowIntervalDropdown(!showIntervalDropdown)}
            className="flex items-center gap-2 px-4 py-3 bg-gray-900/50 border border-gray-600 
                       rounded-lg text-white hover:border-gray-500 focus:outline-none 
                       focus:border-blue-500 transition-all min-w-[160px]"
            disabled={isLoading}
          >
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="flex-1 text-left">{getSelectedIntervalLabel()}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showIntervalDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Interval Dropdown */}
          {showIntervalDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 
                            rounded-lg shadow-xl max-h-64 overflow-y-auto z-50 min-w-[200px]">
              {INTERVALS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleIntervalSelect(item.value)}
                  className={`w-full flex flex-col items-start px-3 py-2.5 hover:bg-gray-700/50 
                             transition-colors text-left ${interval === item.value ? 'bg-blue-600/20 border-l-2 border-blue-500' : ''}`}
                >
                  <span className={`font-medium ${interval === item.value ? 'text-blue-400' : 'text-white'}`}>
                    {item.label}
                  </span>
                  <span className="text-xs text-gray-500">{item.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Analyze Button */}
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 
                     disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium 
                     rounded-lg transition-colors min-w-[120px]"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4" />
              Analyze
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SearchBar;
