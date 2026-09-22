import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate';
  };
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
}) => {
  const badgeStyles = {
    emerald: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    rose: 'bg-red-50 text-red-700 border-red-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div
      id={id}
      className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          {title}
        </span>
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-1">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">
          {value}
        </div>
        {badge && (
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
              badgeStyles[badge.variant]
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 text-xs text-slate-500 flex items-center justify-between pt-2.5 border-t border-slate-100">
          <span>{subtitle}</span>
          {trend && <span className="text-blue-600 font-medium">{trend}</span>}
        </div>
      )}
    </div>
  );
};
