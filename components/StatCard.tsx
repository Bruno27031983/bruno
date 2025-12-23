
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend, color }) => {
  return (
    <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-center text-center md:text-left space-y-2 md:space-y-0 md:space-x-4">
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${color} text-white shrink-0`}>
        <div className="text-base md:text-xl">{icon}</div>
      </div>
      <div className="min-w-0 w-full overflow-hidden">
        <p className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-tight md:tracking-normal truncate">{label}</p>
        <h3 className="text-sm md:text-2xl font-black text-gray-900 truncate">{value}</h3>
        {trend && <p className="hidden md:block text-xs text-green-600 mt-1 font-semibold">{trend}</p>}
      </div>
    </div>
  );
};

export default StatCard;
