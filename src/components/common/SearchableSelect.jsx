import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Plus } from 'lucide-react';

/**
 * Normalizes any option input format (string, { value, label }, { id, name }, etc.)
 * into a consistent SelectOption object.
 */
function normalizeOption(item) {
  if (item === null || item === undefined) return null;
  if (typeof item === 'string' || typeof item === 'number') {
    const str = String(item);
    return {
      id: str,
      value: str,
      label: str,
      subLabel: '',
      group: '',
      badge: '',
      icon: null,
      disabled: false
    };
  }
  if (typeof item === 'object') {
    const rawVal = item.value !== undefined ? item.value : (item.id !== undefined ? item.id : (item.name || item.label || ''));
    const val = (rawVal && typeof rawVal === 'object') ? (rawVal.en || rawVal.name || JSON.stringify(rawVal)) : String(rawVal ?? '');
    const rawLbl = item.label || item.name || item.title || val;
    const lbl = (rawLbl && typeof rawLbl === 'object') ? (rawLbl.en || rawLbl.ta || rawLbl.name || JSON.stringify(rawLbl)) : String(rawLbl ?? '');
    return {
      id: item.id !== undefined ? String(item.id) : val,
      value: val,
      label: lbl,
      subLabel: item.subLabel || item.phone || item.rate ? (item.phone || (item.rate ? `₹${item.rate}` : item.subLabel)) : '',
      group: typeof item.group === 'string' ? item.group : (typeof item.category === 'string' ? item.category : ''),
      badge: item.badge || item.unit || '',
      icon: item.icon || null,
      disabled: Boolean(item.disabled)
    };
  }
  return null;
}

function formatBadge(badge, lang) {
  if (!badge) return '';
  if (lang !== 'ta') return badge;
  const str = String(badge).trim();
  const map = {
    'per_hour': 'மணிக்கு',
    'per hour': 'மணிக்கு',
    '/ hour': 'மணிக்கு',
    '/hour': 'மணிக்கு',
    'per_acre': 'ஏக்கருக்கு',
    'per acre': 'ஏக்கருக்கு',
    '/ acre': 'ஏக்கருக்கு',
    '/acre': 'ஏக்கருக்கு',
    'per_km': 'கி.மீக்கு',
    'per km': 'கி.மீக்கு',
    '/ km': 'கி.மீக்கு',
    '/km': 'கி.மீக்கு',
    'per_trip': 'டிரிப்பிற்கு',
    'per trip': 'டிரிப்பிற்கு',
    '/ trip': 'டிரிப்பிற்கு',
    '/trip': 'டிரிப்பிற்கு',
    'daily_bata': 'தினசரி படி',
    'daily bata': 'தினசரி படி',
    'monthly': 'மாத சம்பளம்',
    'hour': 'மணி',
    'acre': 'ஏக்கர்',
    'km': 'கி.மீ',
    'trip': 'டிரிப்',
    'cash': 'ரொக்கம் / கையில்',
    'hand': 'கையில்',
    'bank': 'வங்கி',
    'bank_account': 'வங்கி கணக்கு',
    'upi': 'UPI / GPAY',
    'credit': 'கடன் / நிலுவை',
    'paid': 'செலுத்தப்பட்டது',
    'unpaid': 'நிலுவை',
    'active': 'செயலில்',
    'inactive': 'முடக்கப்பட்டது',
    'combo': 'கூட்டு',
    'tractor': 'டிராக்டர்'
  };
  return map[str.toLowerCase()] || str;
}

function formatSubLabel(subLabel, lang) {
  if (!subLabel) return '';
  if (lang !== 'ta') return subLabel;
  const str = String(subLabel).trim();
  const map = {
    'driver': 'டிரைவர்',
    'admin': 'அட்மின்',
    'operator': 'இயக்குபவர்',
    'manager': 'மேலாளர்',
    'collector': 'வசூலிப்பாளர்',
    'you': 'நீங்கள்'
  };
  const lower = str.toLowerCase();
  return map[lower] || str;
}

export default function SearchableSelect({
  value = '',
  onChange,
  options = [],
  label,
  placeholder,
  searchPlaceholder,
  required = false,
  disabled = false,
  allowCustom = false,
  customButtonText,
  clearable,
  className = '',
  id,
  lang = 'en',
  icon: PrefixIcon
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Default placeholders
  const defaultPlaceholder = placeholder || (lang === 'ta' ? 'தேர்ந்தெடுக்கவும்...' : 'Select option...');
  const defaultSearchPlaceholder = searchPlaceholder || (lang === 'ta' ? 'தேட...' : 'Search options...');

  // Normalize options array
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options.map(normalizeOption).filter(Boolean);
  }, [options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (value === '' || value === null || value === undefined) return null;
    const strVal = String(value);
    const strLower = strVal.toLowerCase();
    return (
      normalizedOptions.find(
        (opt) => opt.value === strVal || opt.id === strVal || String(opt.label || '').toLowerCase() === strLower
      ) || {
        id: strVal,
        value: strVal,
        label: strVal,
        subLabel: '',
        group: '',
        badge: '',
        icon: null,
        disabled: false
      }
    );
  }, [normalizedOptions, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) => {
      const matchLabel = String(opt.label || '').toLowerCase().includes(q);
      const matchSub = opt.subLabel ? String(opt.subLabel).toLowerCase().includes(q) : false;
      const matchGroup = opt.group ? String(opt.group).toLowerCase().includes(q) : false;
      const matchValue = opt.value ? String(opt.value).toLowerCase().includes(q) : false;
      return matchLabel || matchSub || matchGroup || matchValue;
    });
  }, [normalizedOptions, searchQuery]);

  // Group filtered options
  const groupedOptions = useMemo(() => {
    const ungrouped = [];
    const groups = {};

    filteredOptions.forEach((opt) => {
      if (opt.group) {
        if (!groups[opt.group]) groups[opt.group] = [];
        groups[opt.group].push(opt);
      } else {
        ungrouped.push(opt);
      }
    });

    return { ungrouped, groups };
  }, [filteredOptions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input with brief delay
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    const chosenVal = option.value !== undefined ? option.value : option.label;
    onChange(chosenVal);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleUseCustom = () => {
    if (!searchQuery.trim()) return;
    onChange(searchQuery.trim());
    setIsOpen(false);
    setSearchQuery('');
  };

  const canClear = clearable !== undefined ? clearable : (!required && Boolean(value));

  return (
    <div ref={containerRef} className={`custom-select-container ${className}`} style={{ position: 'relative' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      {/* Main trigger button */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            if (!disabled) setIsOpen(true);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        className="form-control custom-select-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          borderColor: isOpen ? 'var(--primary-500)' : value ? 'var(--border-color)' : 'var(--border-color)',
          boxShadow: isOpen ? '0 0 0 3px rgba(6, 78, 59, 0.15)' : 'none',
          userSelect: 'none',
          background: 'var(--bg-card)',
          minHeight: '38px',
          padding: '0.5rem 0.75rem',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {PrefixIcon && <PrefixIcon size={16} color="var(--primary-600)" style={{ flexShrink: 0 }} />}
          
          {selectedOption && value ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                {selectedOption.label}
              </span>
              {selectedOption.subLabel && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', opacity: 0.85 }}>
                  ({formatSubLabel(selectedOption.subLabel, lang)})
                </span>
              )}
              {selectedOption.badge && (
                <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'var(--bg-subtle)', color: 'var(--primary-700)', fontWeight: 600 }}>
                  {formatBadge(selectedOption.badge, lang)}
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>
              {defaultPlaceholder}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, marginLeft: '0.5rem' }}>
          {canClear && !disabled && (
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
              title="Clear selection"
            >
              <X size={13} />
            </button>
          )}

          <ChevronDown
            size={15}
            color={isOpen ? 'var(--primary-600)' : 'var(--text-light)'}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </div>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          className="custom-select-popover animate-fadeIn"
          style={{
            position: 'absolute',
            zIndex: 9999,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            minWidth: '220px',
            maxHeight: '300px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
            backdropFilter: 'blur(12px)',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={defaultSearchPlaceholder}
              style={{
                width: '100%',
                padding: '0.45rem 1.8rem 0.45rem 2rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                outline: 'none'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0]);
                  } else if (allowCustom && searchQuery.trim()) {
                    handleUseCustom();
                  }
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-light)',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options Scroll List */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            {/* Ungrouped items */}
            {groupedOptions.ungrouped.map((opt) => {
              const isSelected = String(value) === String(opt.value) || String(value) === String(opt.id) || String(value).toLowerCase() === String(opt.label || '').toLowerCase();

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    textAlign: 'left',
                    background: isSelected ? 'var(--primary-600)' : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--text-main)',
                    border: 'none',
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    opacity: opt.disabled ? 0.45 : 1,
                    transition: 'all 0.12s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !opt.disabled) e.currentTarget.style.background = 'var(--bg-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !opt.disabled) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: isSelected ? 700 : 500 }}>
                      {opt.label}
                    </span>
                    {opt.subLabel && (
                      <span style={{ fontSize: '0.72rem', color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--text-light)' }}>
                        {formatSubLabel(opt.subLabel, lang)}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                    {opt.badge && (
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '4px',
                        background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
                        color: isSelected ? '#ffffff' : 'var(--text-light)'
                      }}>
                        {formatBadge(opt.badge, lang)}
                      </span>
                    )}
                    {isSelected && <Check size={14} color="#ffffff" />}
                  </div>
                </button>
              );
            })}

            {/* Grouped items */}
            {Object.entries(groupedOptions.groups).map(([groupTitle, groupItems]) => (
              <div key={groupTitle} style={{ paddingTop: '0.35rem' }}>
                <div style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--primary-700)',
                  background: 'var(--primary-50)',
                  borderRadius: '4px',
                  marginBottom: '2px'
                }}>
                  {groupTitle}
                </div>
                {groupItems.map((opt) => {
                  const isSelected = String(value) === String(opt.value) || String(value) === String(opt.id) || String(value).toLowerCase() === String(opt.label || '').toLowerCase();

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        textAlign: 'left',
                        background: isSelected ? 'var(--primary-600)' : 'transparent',
                        color: isSelected ? '#ffffff' : 'var(--text-main)',
                        border: 'none',
                        cursor: opt.disabled ? 'not-allowed' : 'pointer',
                        opacity: opt.disabled ? 0.45 : 1,
                        transition: 'all 0.12s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !opt.disabled) e.currentTarget.style.background = 'var(--bg-subtle)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !opt.disabled) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: isSelected ? 700 : 500 }}>
                          {opt.label}
                        </span>
                        {opt.subLabel && (
                          <span style={{ fontSize: '0.72rem', color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--text-light)' }}>
                            {formatSubLabel(opt.subLabel, lang)}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                        {opt.badge && (
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
                            color: isSelected ? '#ffffff' : 'var(--text-light)'
                          }}>
                            {formatBadge(opt.badge, lang)}
                          </span>
                        )}
                        {isSelected && <Check size={14} color="#ffffff" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Empty state & custom option button */}
            {filteredOptions.length === 0 && (
              <div style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.78rem' }}>
                <p style={{ marginBottom: allowCustom && searchQuery.trim() ? '0.5rem' : '0' }}>
                  {lang === 'ta' ? `"${searchQuery}" பொருந்தவில்லை` : `No matching options for "${searchQuery}"`}
                </p>
                {allowCustom && searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={handleUseCustom}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', gap: '0.3rem', fontSize: '0.75rem', padding: '0.4rem' }}
                  >
                    <Plus size={13} />
                    <span>{customButtonText || (lang === 'ta' ? `புதிதாகச் சேர் "${searchQuery.trim()}"` : `Use "${searchQuery.trim()}"`)}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
