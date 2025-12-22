
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AttendanceState, UserSettings } from './types';
import { 
  getISODate, 
  calculateDailyHours, 
  formatHours, 
  getDaysInMonth
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
  const [isPersisted, setIsPersisted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Persistent Storage API - požiadať o trvalé úložisko
  useEffect(() => {
    const requestPersistentStorage = async () => {
      if (navigator.storage && navigator.storage.persist) {
        const persisted = await navigator.storage.persisted();
        if (!persisted) {
          const result = await navigator.storage.persist();
          setIsPersisted(result);
          if (result) {
            console.log('✅ Úložisko je teraz trvalé - dáta sa nebudú mazať automaticky!');
          } else {
            console.log('⚠️ Trvalé úložisko nebolo povolené.');
          }
        } else {
          setIsPersisted(true);
          console.log('✅ Úložisko je už trvalé.');
        }
      }
    };
    requestPersistentStorage();
  }, []);

  const todayKey = getISODate(new Date());

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

  const handleTimeChange = (dateKey: string, field: 'manualArrival' | 'manualDeparture', val: string) => {
    let sanitized = val.replace(/[^0-9]/g, '');
    if (sanitized.length > 4) sanitized = sanitized.slice(0, 4);
    updateManualField(dateKey, field, sanitized);
  };

  const handleTimeBlur = (dateKey: string, field: 'manualArrival' | 'manualDeparture', val: string) => {
    let raw = val.replace(/[^0-9]/g, '');
    if (raw.length === 4) {
      updateManualField(dateKey, field, raw.slice(0, 2) + ':' + raw.slice(2));
    } else if (raw.length === 3) {
      updateManualField(dateKey, field, '0' + raw.slice(0, 1) + ':' + raw.slice(1));
    } else if (raw.length > 0 && raw.length < 3) {
      updateManualField(dateKey, field, `${raw.padStart(2, '0')}:00`);
    }
  };

  const handleTimeFocus = (dateKey: string, field: string, currentVal: string = '') => {
    const stripped = currentVal.replace(':', '');
    updateManualField(dateKey, field as any, stripped);
  };

  const setNowForField = (dateKey: string, field: 'manualArrival' | 'manualDeparture') => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }).replace(/\s/g, '');
    updateManualField(dateKey, field, timeStr);
  };

  const updateSettings = (updates: Partial<UserSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(prev => prev - 1); }
    else { setSelectedMonth(prev => prev - 1); }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(prev => prev + 1); }
    else { setSelectedMonth(prev => prev + 1); }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `zaloha_dochadzka_${todayKey}.json`);
    link.click();
  };

  const currentMonthDays = useMemo(() => getDaysInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const monthNames = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];

  const stats = useMemo(() => {
    let totalHours = 0; let daysWorked = 0;
    currentMonthDays.forEach(day => {
      const record = state.records[getISODate(day)];
      if (record) { const h = calculateDailyHours(record); totalHours += h; if (h > 0) daysWorked++; }
    });
    const gross = totalHours * (state.settings.hourlyWage || 0);
    return { totalHours, daysWorked, grossEarnings: gross, netEarnings: gross * (1 - (state.settings.taxRate || 0) / 100) };
  }, [currentMonthDays, state]);

  const handleExportPdf = async () => {
    // Zozbierať všetky zapísané dni
    const recordedDays = currentMonthDays
      .map(day => {
        const dateKey = getISODate(day);
        const record = state.records[dateKey];
        if (!record || calculateDailyHours(record) === 0) return null;
        return {
          date: `${day.getDate()}. ${monthNames[day.getMonth()]}`,
          arrival: record.manualArrival || '--:--',
          departure: record.manualDeparture || '--:--',
          break: record.manualBreak || 0,
          hours: formatHours(calculateDailyHours(record))
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    const daysDetail = recordedDays.map(d =>
      `${d.date} | ${d.arrival} - ${d.departure} | Prestávka: ${d.break} min | ${d.hours}`
    ).join('\n');

    const summaryText = `
VÝKAZ PRÁCE - ${state.settings.userName}
Mesiac: ${monthNames[selectedMonth]} ${selectedYear}
----------------------------------
${daysDetail}
----------------------------------
CELKOM ODPRACOVANÉ: ${formatHours(stats.totalHours)}
Počet dní: ${stats.daysWorked}
----------------------------------
Vygenerované v aplikácii BRUNO
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Dochádzka ${state.settings.userName}`,
          text: summaryText,
        });
      } catch (err) {
        // Fallback ak používateľ zruší share alebo nastane chyba
        if ((err as Error).name !== 'AbortError') {
          window.print();
        }
      }
    } else {
      // Klasický tisk/pdf na desktopoch
      window.print();
    }
  };

  const handleClearMonth = () => {
    const monthName = monthNames[selectedMonth];
    if (confirm(`Naozaj chcete vymazať VŠETKY záznamy pre mesiac ${monthName} ${selectedYear}? Táto akcia je nevratná!`)) {
      setState(prev => {
        const newRecords = { ...prev.records };
        currentMonthDays.forEach(day => {
          const dateKey = getISODate(day);
          delete newRecords[dateKey];
        });
        return { ...prev, records: newRecords };
      });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.records) { setState(imported); alert('Dáta úspešne nahraté!'); }
      } catch (err) { alert('Chyba súboru.'); }
    };
    reader.readAsText(file);
  };

  const inputClasses = "bg-white border-2 border-gray-900 text-black text-xs font-black px-1 py-2 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-center placeholder:text-gray-300";

  return (
    <div className="min-h-screen pb-20 bg-slate-50 font-['Inter',sans-serif]">
      {/* Header */}
      <header className="no-print bg-white border-b border-gray-100 sticky top-0 z-30 px-4 md:px-8 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0"><i className="fas fa-clock text-xl"></i></div>
            <div>
              <h1 className="text-base md:text-xl font-black uppercase leading-none text-gray-900">{state.settings.userName}</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Live Tracker</p>
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="px-4 py-2 bg-white border-2 border-gray-900 rounded-xl font-black text-xs text-gray-900 hover:bg-gray-50 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none uppercase">
            Nastavenia
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-6 border-4 border-gray-900 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900">Nastavenia</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-black p-2"><i className="fas fa-times text-xl"></i></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-900">Vaše Meno</label>
                <input type="text" value={state.settings.userName} onChange={(e) => updateSettings({ userName: e.target.value })} className="w-full p-4 bg-white border-2 border-gray-900 rounded-2xl font-black text-gray-900 outline-none focus:border-indigo-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-900">Mzda (€/hod)</label>
                  <input type="number" value={state.settings.hourlyWage || ''} onChange={(e) => updateSettings({ hourlyWage: parseFloat(e.target.value) || 0 })} className="w-full p-4 bg-white border-2 border-gray-900 rounded-2xl font-black text-gray-900 text-center focus:border-indigo-600" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-900">Daň (%)</label>
                  <input type="number" value={state.settings.taxRate || ''} onChange={(e) => updateSettings({ taxRate: parseFloat(e.target.value) || 0 })} className="w-full p-4 bg-white border-2 border-gray-900 rounded-2xl font-black text-gray-900 text-center focus:border-indigo-600" />
                </div>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">Uložiť Zmeny</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 space-y-6">
        
        {/* Print Header (Iba v PDF) */}
        <div className="hidden print:block mb-8">
          <div className="flex justify-between items-end border-b-8 border-black pb-4">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter">Dochádzkový výkaz</h1>
              <p className="text-xl font-bold text-gray-500 uppercase">{monthNames[selectedMonth]} {selectedYear}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black uppercase text-gray-400">Pracovník</p>
              <p className="text-2xl font-black uppercase text-gray-900">{state.settings.userName}</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
          <StatCard label="Odpracované" value={formatHours(stats.totalHours)} icon="fa-briefcase" color="bg-indigo-600" trend={`${stats.daysWorked} dní`} />
          <StatCard label="Hrubá Mzda" value={stats.grossEarnings.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })} icon="fa-coins" color="bg-amber-500" />
          <StatCard label="Čistá Mzda" value={stats.netEarnings.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })} icon="fa-wallet" color="bg-emerald-500" />
          <StatCard label="Zdanenie" value={`${state.settings.taxRate}%`} icon="fa-percent" color="bg-rose-500" />
        </div>

        {/* Calendar Section */}
        <section className="bg-white rounded-[2rem] shadow-xl border-4 border-gray-900 overflow-hidden print:border-0 print:shadow-none print:rounded-none">
          <div className="p-4 md:p-6 border-b-4 border-gray-900 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 no-print">
            <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">Mesačný výkaz</h2>
            <div className="flex items-center gap-1 bg-white border-2 border-gray-900 rounded-xl p-1">
              <button onClick={handlePrevMonth} className="p-2 hover:text-indigo-600 transition-colors text-gray-900"><i className="fas fa-chevron-left"></i></button>
              <span className="px-4 font-black text-sm uppercase min-w-[140px] text-center text-gray-900">{monthNames[selectedMonth]} {selectedYear}</span>
              <button onClick={handleNextMonth} className="p-2 hover:text-indigo-600 transition-colors text-gray-900"><i className="fas fa-chevron-right"></i></button>
            </div>
          </div>

          {/* Mobile View (Iba pre web) */}
          <div className="md:hidden divide-y-2 divide-gray-100 no-print">
            {currentMonthDays.map(day => {
              const dateKey = getISODate(day);
              const record = state.records[dateKey];
              const hours = calculateDailyHours(record);
              const isToday = dateKey === todayKey;
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div key={dateKey} className={`p-4 ${isToday ? 'bg-blue-100 border-l-4 border-blue-600' : ''} ${isWeekend ? 'bg-slate-50' : ''}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-xl font-black ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>{day.getDate()}.</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{day.toLocaleDateString('sk-SK', { weekday: 'short' })}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black border-2 ${hours > 0 ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-300 border-gray-100'}`}>
                      {hours > 0 ? formatHours(hours) : '--'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="relative group">
                      <input type="text" inputMode="numeric" placeholder="Príchod" value={record?.manualArrival || ''} onFocus={() => handleTimeFocus(dateKey, 'manualArrival', record?.manualArrival)} onChange={(e) => handleTimeChange(dateKey, 'manualArrival', e.target.value)} onBlur={(e) => handleTimeBlur(dateKey, 'manualArrival', e.target.value)} className={`${inputClasses} w-full pr-6`} />
                      <button onClick={() => setNowForField(dateKey, 'manualArrival')} className="absolute right-1 top-1/2 -translate-y-1/2 text-emerald-500 text-[10px]"><i className="fas fa-play"></i></button>
                    </div>
                    <div className="relative group">
                      <input type="text" inputMode="numeric" placeholder="Odchod" value={record?.manualDeparture || ''} onFocus={() => handleTimeFocus(dateKey, 'manualDeparture', record?.manualDeparture)} onChange={(e) => handleTimeChange(dateKey, 'manualDeparture', e.target.value)} onBlur={(e) => handleTimeBlur(dateKey, 'manualDeparture', e.target.value)} className={`${inputClasses} w-full pr-6`} />
                      <button onClick={() => setNowForField(dateKey, 'manualDeparture')} className="absolute right-1 top-1/2 -translate-y-1/2 text-rose-500 text-[10px]"><i className="fas fa-stop"></i></button>
                    </div>
                    <input type="text" inputMode="numeric" placeholder="Prest." value={record?.manualBreak || ''} onChange={(e) => updateManualField(dateKey, 'manualBreak', e.target.value === '' ? undefined : parseInt(e.target.value))} className={`${inputClasses} w-full`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table View (Pre Desktop a PDF) */}
          <div className="hidden md:block print:block print-table-container">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest border-b-4 border-gray-900 text-gray-500 print:bg-white print:border-black">
                <tr>
                  <th className="px-6 py-5">Dátum</th>
                  <th className="px-4 py-5 text-center">Príchod</th>
                  <th className="px-4 py-5 text-center">Odchod</th>
                  <th className="px-4 py-5 text-center">Prestávka</th>
                  <th className="px-4 py-5 text-center">Odpracované</th>
                  <th className="px-6 py-5 text-right no-print">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-100 print:divide-black/10">
                {currentMonthDays.map(day => {
                  const dateKey = getISODate(day);
                  const record = state.records[dateKey];
                  const hours = calculateDailyHours(record);
                  const isToday = dateKey === todayKey;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <tr key={dateKey} className={`${isToday ? 'bg-blue-100 border-l-4 border-blue-600' : isWeekend ? 'bg-gray-50/50' : ''} print:bg-transparent`}>
                      <td className="px-6 py-4">
                        <span className="font-black block text-sm text-gray-900 print:text-black">{day.getDate()}. {monthNames[day.getMonth()]}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-500">{day.toLocaleDateString('sk-SK', { weekday: 'long' })}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="hidden print:block font-bold">{record?.manualArrival || '--:--'}</span>
                        <div className="print:hidden relative inline-block w-32">
                          <input type="text" value={record?.manualArrival || ''} onFocus={() => handleTimeFocus(dateKey, 'manualArrival', record?.manualArrival)} onChange={(e) => handleTimeChange(dateKey, 'manualArrival', e.target.value)} onBlur={(e) => handleTimeBlur(dateKey, 'manualArrival', e.target.value)} className={`${inputClasses} w-full py-3 pr-8`} />
                          <button onClick={() => setNowForField(dateKey, 'manualArrival')} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500"><i className="fas fa-play text-xs"></i></button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="hidden print:block font-bold">{record?.manualDeparture || '--:--'}</span>
                        <div className="print:hidden relative inline-block w-32">
                          <input type="text" value={record?.manualDeparture || ''} onFocus={() => handleTimeFocus(dateKey, 'manualDeparture', record?.manualDeparture)} onChange={(e) => handleTimeChange(dateKey, 'manualDeparture', e.target.value)} onBlur={(e) => handleTimeBlur(dateKey, 'manualDeparture', e.target.value)} className={`${inputClasses} w-full py-3 pr-8`} />
                          <button onClick={() => setNowForField(dateKey, 'manualDeparture')} className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-500"><i className="fas fa-stop text-xs"></i></button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="hidden print:block font-bold">{record?.manualBreak ? `${record.manualBreak} min` : '0'}</span>
                        <input type="text" value={record?.manualBreak || ''} onChange={(e) => updateManualField(dateKey, 'manualBreak', e.target.value === '' ? undefined : parseInt(e.target.value))} className={`${inputClasses} w-20 py-3 print:hidden`} />
                      </td>
                      <td className="px-4 py-4 text-center font-black">
                        {hours > 0 ? formatHours(hours) : <span className="text-gray-300 print:text-gray-100">--</span>}
                      </td>
                      <td className="px-6 py-4 text-right no-print">
                        <button onClick={() => setState(p => { const r = {...p.records}; delete r[dateKey]; return {...p, records: r} })} className="text-gray-300 hover:text-rose-600 p-2"><i className="far fa-trash-alt"></i></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* PDF Sumár v pätke tabuľky */}
              <tfoot className="bg-black text-white print:bg-transparent print:text-black">
                <tr className="border-t-4 border-black">
                  <td colSpan={4} className="px-6 py-5 text-right font-black uppercase text-sm">Spolu za mesiac:</td>
                  <td className="px-4 py-5 text-center font-black text-xl underline">{formatHours(stats.totalHours)}</td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Akcie */}
        <div className="no-print flex flex-col gap-4">
          <button onClick={handleExportPdf} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">
            <i className="fas fa-share-alt text-xl"></i> ODOSLAŤ VÝKAZ
          </button>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={exportData} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]"><i className="fas fa-download"></i> ZÁLOHA</button>
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-white text-gray-900 rounded-2xl font-black uppercase tracking-widest border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.05)]"><i className="fas fa-upload"></i> OBNOVIŤ</button>
          </div>
          <button onClick={handleClearMonth} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(225,29,72,0.3)]"><i className="fas fa-trash-sweep"></i> VYMAZAŤ MESIAC</button>

          {/* Persistent Storage Indikátor */}
          <div className={`flex items-center justify-center gap-2 p-3 rounded-xl ${isPersisted ? 'bg-emerald-50 border-2 border-emerald-500' : 'bg-amber-50 border-2 border-amber-500'}`}>
            <div className={`w-3 h-3 rounded-full ${isPersisted ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
            <span className={`text-xs font-black uppercase tracking-wider ${isPersisted ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isPersisted ? '🔒 Dáta chránené' : '⚠️ Dáta nechránené'}
            </span>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
        </div>
      </main>
    </div>
  );
};

export default App;
