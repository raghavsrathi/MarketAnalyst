/**
 * LoadingState.jsx
 * ----------------
 * Displays a loading spinner and message while data is being fetched.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingState = ({ message = 'Loading analysis...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
      <p className="text-gray-400 text-lg animate-pulse">{message}</p>
      <p className="text-gray-500 text-sm mt-2">
        Fetching market data and computing indicators...
      </p>
    </div>
  );
};

export default LoadingState;
