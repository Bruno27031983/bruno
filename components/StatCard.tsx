
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend, color }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} text-white`}>
        <i className={`fas ${icon} text-xl`}></i>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {trend && <p className="text-xs text-green-600 mt-1 font-semibold">{trend}</p>}
      </div>
    </div>
  );
};

export default StatCard;
