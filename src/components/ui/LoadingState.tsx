import React from 'react';

interface LoadingStateProps {
  id?: string;
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  id,
  message = 'Loading WireGuard portal telemetry...',
}) => {
  return (
    <div id={id} className="flex flex-col items-center justify-center p-12 text-center">
      <div className="relative w-9 h-9 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
        <div className="absolute inset-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-semibold text-slate-800">{message}</p>
      <span className="text-xs text-slate-500 mt-1">Communicating with WireGuard API service</span>
    </div>
  );
};
