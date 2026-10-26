import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_TA = [
  'ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்',
  'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'
];

const MONTH_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_SHORT_TA = ['ஜன', 'பிப்', 'மார்ச்', 'ஏப்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆக', 'செப்', 'அக்', 'நவ', 'டிச'];

const DAY_NAMES_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_NAMES_TA = ['ஞா', 'தி', 'செ', 'பு', 'வி', 'வெ', 'ச'];

export default function DatePicker({
  value = '',
  onChange,
  label,
  placeholder,
  required = false,
  className = '',
  min,
  max,
  showPresets = true,
  disabled = false,
  id,
  lang = 'en'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const monthNames = lang === 'ta' ? MONTH_NAMES_TA : MONTH_NAMES_EN;
  const monthShort = lang === 'ta' ? MONTH_SHORT_TA : MONTH_SHORT_EN;
  const dayNames = lang === 'ta' ? DAY_NAMES_TA : DAY_NAMES_EN;

  // Selected date object
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const initialYear = selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate.getFullYear() : new Date().getFullYear();
  const initialMonth = selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate.getMonth() : new Date().getMonth();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  // Sync view when value changes from outside
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const formatLocalDate = (year, month, day) => {
    const yStr = year.toString();
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  };

  const handlePreset = (preset) => {
    const today = new Date();
    if (preset === 'today') {
      const d = formatLocalDate(today.getFullYear(), today.getMonth(), today.getDate());
      onChange(d);
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    } else if (preset === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const d = formatLocalDate(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      onChange(d);
      setViewYear(yesterday.getFullYear());
      setViewMonth(yesterday.getMonth());
    } else if (preset === 'prevWeek') {
      const prevWeek = new Date(today);
      prevWeek.setDate(today.getDate() - 7);
      const d = formatLocalDate(prevWeek.getFullYear(), prevWeek.getMonth(), prevWeek.getDate());
      onChange(d);
      setViewYear(prevWeek.getFullYear());
      setViewMonth(prevWeek.getMonth());
    }
    setIsOpen(false);
  };

  // Generate calendar days
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays = [];

  // Previous month filler days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarDays.push({
      day: d,
      isCurrentMonth: false,
      dateStr: formatLocalDate(y, m, d)
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      dateStr: formatLocalDate(viewYear, viewMonth, i)
    });
  }

  // Next month filler days to complete grid (35 or 42)
  const remainingCells = (calendarDays.length <= 35 ? 35 : 42) - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      dateStr: formatLocalDate(y, m, i)
    });
  }

  // Format display text
  const todayStr = formatLocalDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  let displayValue = placeholder || (lang === 'ta' ? 'தேதியைத் தேர்ந்தெடுக்கவும்' : 'Select date');
  let isToday = false;
  let isYesterday = false;

  if (value) {
    if (value === todayStr) {
      isToday = true;
    } else {
      const yDate = new Date();
      yDate.setDate(yDate.getDate() - 1);
      const yStr = formatLocalDate(yDate.getFullYear(), yDate.getMonth(), yDate.getDate());
      if (value === yStr) isYesterday = true;
    }

    const d = new Date(value + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const tagText = isToday 
        ? (lang === 'ta' ? ' (இன்று)' : ' (Today)') 
        : isYesterday 
        ? (lang === 'ta' ? ' (நேற்று)' : ' (Yesterday)') 
        : '';
      displayValue = `${day}/${month}/${year}${tagText}`;
    } else {
      displayValue = value;
    }
  }

  return (
    <div ref={containerRef} className={`custom-datepicker-container ${className}`} style={{ position: 'relative' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      {/* Main trigger button */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(!isOpen);
          }
        }}
        className="form-control custom-picker-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          borderColor: isOpen ? 'var(--primary-500)' : value ? 'var(--primary-300)' : 'var(--border-color)',
          boxShadow: isOpen ? '0 0 0 3px rgba(6, 78, 59, 0.15)' : 'none',
          userSelect: 'none',
          background: 'var(--bg-card)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <CalendarIcon size={16} color={value ? 'var(--primary-600)' : 'var(--text-light)'} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: value ? 600 : 400, color: value ? 'var(--text-main)' : 'var(--text-light)', fontSize: '0.875rem' }}>
            {displayValue}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          {value && !required && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: 'var(--text-light)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear date"
            >
              <X size={13} />
            </button>
          )}
          {isToday && (
            <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#ecfdf5', color: '#065f46', fontWeight: 700 }}>
              {lang === 'ta' ? 'இன்று' : 'Today'}
            </span>
          )}
        </div>
      </div>

      {/* Calendar Dropdown Popover */}
      {isOpen && (
        <div 
          className="custom-picker-popover animate-fadeIn"
          style={{
            position: 'absolute',
            zIndex: 9999,
            top: 'calc(100% + 4px)',
            left: 0,
            width: '290px',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
            backdropFilter: 'blur(12px)'
          }}
        >
          {/* Month / Year Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.65rem' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="btn btn-outline btn-sm"
              style={{ padding: '0.25rem 0.5rem', borderRadius: '6px' }}
            >
              <ChevronLeft size={15} />
            </button>

            <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: 'var(--primary-700)' }}>{monthNames[viewMonth]}</span>
              <span>{viewYear}</span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="btn btn-outline btn-sm"
              style={{ padding: '0.25rem 0.5rem', borderRadius: '6px' }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          {showPresets && (
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => handlePreset('today')}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: value === todayStr ? 'var(--primary-50)' : 'transparent', borderColor: value === todayStr ? 'var(--primary-500)' : 'var(--border-color)' }}
              >
                {lang === 'ta' ? 'இன்று' : 'Today'}
              </button>
              <button
                type="button"
                onClick={() => handlePreset('yesterday')}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '6px' }}
              >
                {lang === 'ta' ? 'நேற்று' : 'Yesterday'}
              </button>
              <button
                type="button"
                onClick={() => handlePreset('prevWeek')}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '6px' }}
              >
                {lang === 'ta' ? '-7 நாட்கள்' : '-7 Days'}
              </button>
            </div>
          )}

          {/* Weekday Names Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.35rem' }}>
            {dayNames.map((d, i) => (
              <div key={d} style={{ color: i === 0 || i === 6 ? '#d97706' : 'inherit' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {calendarDays.map((item, idx) => {
              const isSelected = value === item.dateStr;
              const isTodayCell = todayStr === item.dateStr;
              const isOutOfRange = (min && item.dateStr < min) || (max && item.dateStr > max);

              return (
                <button
                  key={`${item.dateStr}-${idx}`}
                  type="button"
                  disabled={Boolean(isOutOfRange)}
                  onClick={() => {
                    if (!isOutOfRange) {
                      onChange(item.dateStr);
                      setIsOpen(false);
                    }
                  }}
                  style={{
                    height: '30px',
                    borderRadius: '6px',
                    border: isTodayCell && !isSelected ? '1px solid var(--primary-500)' : 'none',
                    background: isSelected 
                      ? 'var(--primary-600)' 
                      : isTodayCell 
                      ? 'rgba(6, 78, 59, 0.08)' 
                      : 'transparent',
                    color: isSelected 
                      ? '#ffffff' 
                      : !item.isCurrentMonth 
                      ? 'var(--text-light)' 
                      : isOutOfRange 
                      ? '#cbd5e1' 
                      : 'var(--text-main)',
                    fontWeight: isSelected ? 800 : isTodayCell ? 700 : item.isCurrentMonth ? 500 : 400,
                    cursor: isOutOfRange ? 'not-allowed' : 'pointer',
                    fontSize: '0.78rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Direct Input Fallback Helper */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.72rem' }}>
            <span style={{ color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={11} />
              {lang === 'ta' ? 'நேரடி தேதி:' : 'Manual:'}
            </span>
            <input
              type="date"
              value={value || ''}
              min={min}
              max={max}
              onChange={(e) => {
                onChange(e.target.value);
                setIsOpen(false);
              }}
              style={{
                fontSize: '0.72rem',
                padding: '2px 5px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
