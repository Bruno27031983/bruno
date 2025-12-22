
import { DayRecord } from '../types';

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('sk-SK', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateSlovak = (date: Date): string => {
  return date.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const getISODate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const calculateDailyHours = (record?: DayRecord): number => {
  if (!record) return 0;

  // Use manual entries if they exist (Arrival and Departure)
  if (record.manualArrival && record.manualDeparture) {
    const [arrH, arrM] = record.manualArrival.split(':').map(Number);
    const [depH, depM] = record.manualDeparture.split(':').map(Number);
    
    const arrivalMinutes = arrH * 60 + arrM;
    const departureMinutes = depH * 60 + depM;
    const breakMinutes = record.manualBreak || 0;

    let diff = departureMinutes - arrivalMinutes - breakMinutes;
    return Math.max(0, diff / 60);
  }

  // Fallback to logs
  if (record.logs.length < 2) return 0;
  
  let totalMs = 0;
  const sortedLogs = [...record.logs].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sortedLogs.length - 1; i++) {
    const current = sortedLogs[i];
    const next = sortedLogs[i + 1];

    if (current.type === 'arrival' && next.type === 'departure') {
      totalMs += (next.timestamp - current.timestamp);
      i++; // Skip the pair
    }
  }

  return totalMs / (1000 * 60 * 60);
};

export const formatHours = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

export const getDaysInMonth = (year: number, month: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};
