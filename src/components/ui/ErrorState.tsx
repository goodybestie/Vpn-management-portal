import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  id?: string;
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  id,
  title = 'Failed to load telemetry',
  message,
  onRetry,
}) => {
  return (
    <div id={id} className="flex flex-col items-center justify-center p-8 text-center bg-white border border-red-200 rounded-lg shadow-xs">
      <div className="p-3 bg-red-50 text-red-600 rounded-lg mb-3 border border-red-100">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-600 max-w-md mt-1 mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
};
