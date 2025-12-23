
import React from 'react';
import { LogType } from '../types';
import { FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';

interface AttendanceTriggerProps {
  onLog: (type: LogType) => void;
  lastLogType?: LogType;
}

const AttendanceTrigger: React.FC<AttendanceTriggerProps> = ({ onLog, lastLogType }) => {
  const isCheckedIn = lastLogType === 'arrival';

  return (
    <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center text-center space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">Dnešná dochádzka</h2>
        <p className="text-gray-500">Zaznamenajte svoj príchod alebo odchod jedným klikom.</p>
      </div>

      <div className="flex gap-4 w-full max-w-md">
        <button
          onClick={() => onLog('arrival')}
          disabled={isCheckedIn}
          className={`flex-1 py-4 px-6 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${
            isCheckedIn 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 shadow-xl transform hover:-translate-y-1'
          }`}
        >
          <FaSignInAlt className="text-2xl mb-2" />
          <span className="font-bold">Príchod</span>
        </button>

        <button
          onClick={() => onLog('departure')}
          disabled={!isCheckedIn}
          className={`flex-1 py-4 px-6 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${
            !isCheckedIn
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200 shadow-xl transform hover:-translate-y-1'
          }`}
        >
          <FaSignOutAlt className="text-2xl mb-2" />
          <span className="font-bold">Odchod</span>
        </button>
      </div>

      {isCheckedIn && (
        <div className="flex items-center text-indigo-600 font-medium animate-pulse">
          <div className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></div>
          Práve pracujete...
        </div>
      )}
    </div>
  );
};

export default AttendanceTrigger;
