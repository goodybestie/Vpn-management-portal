import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  id?: string;
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  id,
  icon: Icon = Inbox,
  title,
  description,
  action,
}) => {
  return (
    <div id={id} className="flex flex-col items-center justify-center p-8 text-center rounded-lg bg-white border border-slate-200 shadow-xs">
      <div className="p-3 bg-slate-50 rounded-lg text-slate-400 mb-3 border border-slate-200">
        <Icon className="w-5 h-5 text-slate-500" />
      </div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
