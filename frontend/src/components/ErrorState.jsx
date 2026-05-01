/**
 * ErrorState.jsx
 * --------------
 * Displays an error message with retry functionality.
 */

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorState = ({ error, onRetry }) => {
  const isSymbolError = error?.message?.toLowerCase().includes('invalid') || 
                        error?.message?.toLowerCase().includes('no data');
  
  const getErrorTitle = () => {
    if (isSymbolError) return 'Invalid Symbol';
    if (error?.statusCode === 502) return 'Data Unavailable';
    return 'Analysis Failed';
  };

  const getErrorMessage = () => {
    if (isSymbolError) {
      return 'The symbol you entered could not be found. Please check the ticker and try again.';
    }
    if (error?.statusCode === 502) {
      return 'Unable to fetch market data. The data provider may be temporarily unavailable.';
    }
    return error?.message || 'An unexpected error occurred while analyzing the market data.';
  };

  const getSuggestions = () => {
    if (isSymbolError) {
      return [
        'Check for typos in the symbol (e.g., AAPL not APPL)',
        'Try the full symbol format for crypto (e.g., BTC-USD)',
        'Use common symbols like AAPL, MSFT, SPY, BTC-USD',
      ];
    }
    return [
      'Check your internet connection',
      'The market may be closed for this symbol',
      'Try a different timeframe interval',
    ];
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-6">
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <h3 className="text-xl font-semibold text-red-400">{getErrorTitle()}</h3>
        </div>
        
        <p className="text-gray-300 mb-4">{getErrorMessage()}</p>
        
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400 mb-2 font-medium">Suggestions:</p>
          <ul className="space-y-1">
            {getSuggestions().map((suggestion, index) => (
              <li key={index} className="text-sm text-gray-500 flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 
                       text-white rounded-lg font-medium transition-colors duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
