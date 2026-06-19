import { useState, useEffect, useRef } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const CustomDatePicker = ({
  value = '',
  onChange,
  label = 'Departure Date',
  placeholder = 'Select date…',
  id = 'custom-date-picker',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Date states for calendar navigation
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const containerRef = useRef(null);

  // Parse external value on load/change
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed
        if (!isNaN(year) && !isNaN(month)) {
          setCurrentMonth(month);
          setCurrentYear(year);
        }
      }
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format YYYY-MM-DD to display string DD-MM-YYYY
  const formatDisplay = (valStr) => {
    if (!valStr) return '';
    const parts = valStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return valStr;
  };

  // Helper date calculations
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getStartDayOfWeek = (month, year) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day) => {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateVal = `${currentYear}-${monthStr}-${dayStr}`;
    onChange?.(dateVal);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(today.getDate()).padStart(2, '0');
    const dateVal = `${year}-${monthStr}-${dayStr}`;
    onChange?.(dateVal);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange?.('');
    setIsOpen(false);
  };

  // Render variables
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const startDay = getStartDayOfWeek(currentMonth, currentYear);

  const dayCells = [];
  // Empty offset days
  for (let i = 0; i < startDay; i++) {
    dayCells.push(<div key={`empty-${i}`} className="w-8 h-8" />);
  }

  // Real days
  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const cellDateStr = `${currentYear}-${monthStr}-${dayStr}`;

    const isSelected = value === cellDateStr;
    const isToday = todayDateStr === cellDateStr;

    dayCells.push(
      <button
        key={`day-${day}`}
        type="button"
        onClick={() => handleSelectDay(day)}
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all cursor-pointer hover:scale-[1.08] active:scale-[0.92]
          ${isSelected
            ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-400'
            : isToday
              ? 'border border-emerald-500/50 text-emerald-400 hover:bg-slate-800'
              : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
          }`}
      >
        {day}
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-400 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 border border-slate-800 rounded-lg bg-slate-900/50 hover:bg-slate-900/80 text-slate-100 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all duration-200 text-sm text-left cursor-pointer"
        >
          <span className={value ? 'text-slate-100' : 'text-slate-500'}>
            {value ? formatDisplay(value) : placeholder}
          </span>
          <span className="text-slate-500 hover:text-slate-300">
            📅
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-4 w-72 backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              ◀
            </button>
            <span className="text-sm font-bold text-slate-100">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              ▶
            </button>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-[10px] font-bold text-slate-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 justify-items-center">
            {dayCells}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors hover:scale-105 active:scale-95 cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors hover:scale-105 active:scale-95 cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
