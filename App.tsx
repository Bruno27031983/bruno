
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceState, AttendanceLog, UserSettings } from './types';
import { 
  getISODate, 
  calculateDailyHours, 
  formatHours, 
  getDaysInMonth, 
  formatDateSlovak
} from './utils/dateUtils';
import StatCard from './components/StatCard';

const STORAGE_KEY = 'bruno_attendance_data_v3';

const DEFAULT_SETTINGS: UserSettings = {
  userName: 'BRUNO',
  hourlyWage: 0,
  taxRate: 0
};

const App: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [state, setState] = useState<AttendanceState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        settings: parsed.settings || DEFAULT_SETTINGS
      };
    }
    return { records: {}, settings: DEFAULT_SETTINGS };
  });

  // Keep time updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateManualField = (dateKey: string, field: 'manualArrival' | 'manualDeparture' | 'manualBreak', value: any) => {
    setState(prev => {
      const currentDay = prev.records[dateKey] || { date: dateKey, logs: [] };
      return {
        ...prev,
        records: {
          ...prev.records,
          [dateKey]: {
            ...currentDay,
            [field]: value
          }
        }
      };
    });
  };

  const updateSettings = (updates: Partial<UserSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
  };

  const setNowForField = (dateKey: string, field: 'manualArrival' | 'manualDeparture') => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
    
    const newLog: AttendanceLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: now.getTime(),
      type: field === 'manualArrival' ? 'arrival' : 'departure'
    };

    setState(prev => {
      const currentDay = prev.records[dateKey] || { date: dateKey, logs: [] };
      return {
        ...prev,
        records: {
          ...prev.records,
          [dateKey]: {
            ...currentDay,
            [field]: timeStr,
            logs: [...currentDay.logs, newLog]
          }
        }
      };
    });
  };

  const currentMonthDays = useMemo(() => {
    return getDaysInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const stats = useMemo(() => {
    let totalHours = 0;
    let daysWorked = 0;

    currentMonthDays.forEach(day => {
      const dateKey = getISODate(day);
      const record = state.records[dateKey];
      if (record) {
        const h = calculateDailyHours(record);
        totalHours += h;
        if (h > 0) daysWorked++;
      }
    });

    const grossEarnings = totalHours * (state.settings.hourlyWage || 0);
    const netEarnings = grossEarnings * (1 - (state.settings.taxRate || 0) / 100);

    return {
      totalHours,
      daysWorked,
      average: daysWorked ? totalHours / daysWorked : 0,
      grossEarnings,
      netEarnings
    };
  }, [currentMonthDays, state]);

  const todayKey = getISODate(new Date());

  const monthNames = [
    'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
    'Júl', 'August', 'September', 'Október', 'November', 'December'
  ];

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 md:px-8 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center space-x-3 min-w-[150px]">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <i className="fas fa-clock text-xl"></i>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight uppercase">
                {state.settings.userName || 'BRUNO'}
              </h1>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Dochádzkový systém</p>
            </div>
          </div>

          {/* Central Settings Trigger (The Blue Box Area from Image) */}
          <div className="flex-1 flex justify-center">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="group relative flex items-center space-x-3 px-6 py-2.5 bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-2xl transition-all shadow-sm hover:shadow-indigo-100/50"
            >
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-0.5 group-hover:scale-105 transition-transform">Nastavenia</span>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-sliders-h text-gray-400 group-hover:text-indigo-500 transition-colors"></i>
                  <span className="text-sm font-bold text-gray-700">{state.settings.userName || 'Profil'}</span>
                  <i className="fas fa-chevron-down text-[10px] text-gray-300 group-hover:text-indigo-400"></i>
                </div>
              </div>
            </button>
          </div>
          
          {/* Clock Section */}
          <div className="text-right min-w-[150px] hidden md:block">
            <p className="text-2xl font-black text-indigo-600 tabular-nums">
              {currentTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-sm font-medium text-gray-400">{formatDateSlovak(currentTime)}</p>
          </div>
        </div>
      </header>

      {/* Settings Modal (Rozkliknutelné) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity">
          <div 
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 pb-4 border-b border-gray-50 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">Môj Profil</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Konfigurácia vašej mzdy a údajov</p>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Meno Používateľa</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                    <i className="fas fa-user-tag"></i>
                  </div>
                  <input 
                    type="text"
                    value={state.settings.userName}
                    onChange={(e) => updateSettings({ userName: e.target.value })}
                    className="w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-gray-800 placeholder:text-gray-300"
                    placeholder="Napíšte svoje meno..."
                  />
                </div>
              </div>

              {/* Wage & Tax Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Mzda (€/hod)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                      <i className="fas fa-coins"></i>
                    </div>
                    <input 
                      type="number"
                      step="0.01"
                      value={state.settings.hourlyWage || ''}
                      onChange={(e) => updateSettings({ hourlyWage: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-100 focus:bg-white rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-gray-800 placeholder:text-gray-300"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Daň (%)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-rose-500 transition-colors">
                      <i className="fas fa-percentage"></i>
                    </div>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={state.settings.taxRate || ''}
                      onChange={(e) => updateSettings({ taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-rose-100 focus:bg-white rounded-2xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-bold text-gray-800 placeholder:text-gray-300"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black shadow-xl shadow-gray-200 hover:bg-black hover:-translate-y-1 active:translate-y-0 transition-all text-sm uppercase tracking-widest"
              >
                Potvrdiť nastavenia
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8 space-y-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Odpracované spolu" 
            value={formatHours(stats.totalHours)} 
            icon="fa-business-time" 
            color="bg-indigo-600" 
            trend={`${stats.daysWorked} odpracovaných dní`}
          />
          <StatCard 
            label="Denný priemer" 
            value={formatHours(stats.average)} 
            icon="fa-bolt" 
            color="bg-emerald-500" 
          />
          <StatCard 
            label="Hrubý zárobok" 
            value={stats.grossEarnings.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })} 
            icon="fa-wallet" 
            color="bg-amber-500" 
          />
          <StatCard 
            label="Čistý zárobok" 
            value={stats.netEarnings.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })} 
            icon="fa-hand-holding-usd" 
            color="bg-violet-600" 
          />
        </div>

        {/* Month Selector & Interactive Calendar View */}
        <section className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-white to-gray-50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <i className="far fa-calendar-alt mr-3 text-indigo-600"></i>
              Mesačný denník
            </h2>
            <div className="flex items-center bg-gray-100 rounded-2xl p-1 shadow-inner">
              <button 
                onClick={() => {
                  if (selectedMonth === 0) {
                    setSelectedMonth(11);
                    setSelectedYear(prev => prev - 1);
                  } else {
                    setSelectedMonth(prev => prev - 1);
                  }
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-md transition-all text-gray-600"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <div className="px-6 font-bold text-gray-800 min-w-[160px] text-center">
                {monthNames[selectedMonth]} {selectedYear}
              </div>
              <button 
                onClick={() => {
                  if (selectedMonth === 11) {
                    setSelectedMonth(0);
                    setSelectedYear(prev => prev + 1);
                  } else {
                    setSelectedMonth(prev => prev + 1);
                  }
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-md transition-all text-gray-600"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5 w-40">Dátum</th>
                  <th className="px-4 py-5 text-center">Príchod</th>
                  <th className="px-4 py-5 text-center">Odchod</th>
                  <th className="px-4 py-5 text-center">Prestávka (min)</th>
                  <th className="px-4 py-5 text-center">Trvanie</th>
                  <th className="px-6 py-5 text-right">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentMonthDays.map(day => {
                  const dateKey = getISODate(day);
                  const record = state.records[dateKey];
                  const hours = calculateDailyHours(record);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = dateKey === todayKey;

                  return (
                    <tr key={dateKey} className={`${isToday ? 'bg-red-50/70' : ''} ${isWeekend ? 'bg-slate-50/30' : ''} hover:bg-indigo-50/20 transition-colors group`}>
                      {/* Date Column */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`font-bold ${isToday ? 'text-red-600' : isWeekend ? 'text-gray-400' : 'text-gray-900'}`}>
                            {day.getDate()}. {monthNames[day.getMonth()]}
                          </span>
                          <span className={`text-[10px] uppercase font-bold tracking-tighter ${isToday ? 'text-red-400' : 'text-gray-400'}`}>
                            {day.toLocaleDateString('sk-SK', { weekday: 'long' })}
                          </span>
                        </div>
                      </td>

                      {/* Manual Arrival Input with Trigger */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-1">
                          <input 
                            type="time"
                            value={record?.manualArrival || ''}
                            onChange={(e) => updateManualField(dateKey, 'manualArrival', e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-500 focus:ring-0 text-sm font-medium text-gray-700 p-1 rounded-md transition-all outline-none"
                            placeholder="--:--"
                          />
                          <button 
                            onClick={() => setNowForField(dateKey, 'manualArrival')}
                            title="Nastaviť aktuálny čas"
                            className={`p-1.5 rounded-lg transition-all ${isToday ? 'text-red-400 hover:text-red-600 hover:bg-red-100' : 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                          >
                            <i className="fas fa-play text-[10px]"></i>
                          </button>
                        </div>
                      </td>

                      {/* Manual Departure Input with Trigger */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-1">
                          <input 
                            type="time"
                            value={record?.manualDeparture || ''}
                            onChange={(e) => updateManualField(dateKey, 'manualDeparture', e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-500 focus:ring-0 text-sm font-medium text-gray-700 p-1 rounded-md transition-all outline-none"
                            placeholder="--:--"
                          />
                          <button 
                            onClick={() => setNowForField(dateKey, 'manualDeparture')}
                            title="Nastaviť aktuálny čas"
                            className={`p-1.5 rounded-lg transition-all ${isToday ? 'text-red-400 hover:text-red-600 hover:bg-red-100' : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'}`}
                          >
                            <i className="fas fa-stop text-[10px]"></i>
                          </button>
                        </div>
                      </td>

                      {/* Manual Break Input */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <input 
                            type="number"
                            min="0"
                            step="5"
                            value={record?.manualBreak || ''}
                            onChange={(e) => updateManualField(dateKey, 'manualBreak', e.target.value === '' ? undefined : parseInt(e.target.value))}
                            className="w-16 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-500 focus:ring-0 text-sm font-medium text-gray-700 p-1 rounded-md transition-all outline-none text-center"
                            placeholder="0"
                          />
                          <span className={`text-[10px] font-bold ${isToday ? 'text-red-400' : 'text-gray-400'}`}>MIN</span>
                        </div>
                      </td>

                      {/* Calculated Duration */}
                      <td className="px-4 py-4 text-center">
                        <div className={`inline-flex items-center px-4 py-1 rounded-xl text-xs font-black transition-all shadow-sm ${hours > 0 ? (isToday ? 'bg-red-600 text-white' : 'bg-gray-800 text-white') : 'bg-gray-100 text-gray-300 shadow-none'}`}>
                          {hours > 0 ? formatHours(hours) : '0h 0m'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                           <button 
                             onClick={() => {
                               if (window.confirm('Naozaj chcete vymazať všetky záznamy pre tento deň?')) {
                                 setState(prev => {
                                   const newRecords = { ...prev.records };
                                   delete newRecords[dateKey];
                                   return { ...prev, records: newRecords };
                                 });
                               }
                             }}
                             className={`p-2 transition-colors opacity-0 group-hover:opacity-100 ${isToday ? 'text-red-300 hover:text-red-600' : 'text-gray-300 hover:text-rose-500'}`}
                           >
                             <i className="far fa-trash-alt"></i>
                           </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-4 md:px-8 mt-12 mb-20 text-center">
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest opacity-60">
          {state.settings.userName || 'BRUNO'} v3.5 • Bezpečné lokálne úložisko dát
        </p>
      </footer>
    </div>
  );
};

export default App;
