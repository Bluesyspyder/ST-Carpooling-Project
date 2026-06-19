import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAutocomplete, fetchGeocode } from '../services/locationService.js';
import useCurrentLocation from '../hooks/useCurrentLocation.js';

/**
 * Reusable smart address search input.
 *
 * - Debounced Mapbox autocomplete (300 ms)
 * - In-memory suggestion cache (avoids re-fetching identical queries)
 * - Keyboard navigation (↑ ↓ Enter Escape)
 * - Clear (×) button to reset the field
 * - Optional "Use Current Location" item in dropdown
 * - Mobile-friendly touch targets
 *
 * Props:
 *   value               – controlled display string
 *   onChange            – fn({ address, latitude, longitude, provider, providerPlaceId })
 *   placeholder         – string
 *   label               – optional label above input
 *   disabled            – bool
 *   showCurrentLocation – bool (adds GPS option in dropdown)
 */
const AddressAutocomplete = ({
  value = '',
  onChange,
  placeholder = 'Search address…',
  label,
  disabled = false,
  showCurrentLocation = false,
}) => {
  const [inputText, setInputText] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selected, setSelected] = useState(false); // true once user picks a suggestion

  const debounceRef = useRef(null);
  const cacheRef = useRef({});  // query → suggestions[]
  const wrapperRef = useRef(null);

  const { getCurrentLocation, loading: gpsLoading, error: gpsError } = useCurrentLocation();

  // Sync external value (chip selections, form reset)
  useEffect(() => {
    setInputText(value);
    if (!value) setSelected(false);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Input handler ─────────────────────────────────────────────────────
  const handleInput = useCallback((e) => {
    const text = e.target.value;
    setInputText(text);
    setSelected(false);
    setActiveIndex(-1);

    clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    // Check cache first
    const cacheKey = text.trim().toLowerCase();
    if (cacheRef.current[cacheKey]) {
      setSuggestions(cacheRef.current[cacheKey]);
      setOpen(true);
      return;
    }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);

        try {
          const results = await fetchAutocomplete(text);
          let list = results || [];

          cacheRef.current[cacheKey] = list;
          setSuggestions(list);
          setOpen(true);
        } catch (err) {
          console.error(err);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 300);
  }, []);

  // ── Selection ─────────────────────────────────────────────────────────
  const handleSelect = useCallback(async (suggestion) => {
    setInputText(suggestion.address);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    setSelected(true);

    if (suggestion.latitude != null && suggestion.longitude != null) {
      onChange?.(suggestion);
    } else {
      setLoading(true);
      try {
        const geoResult = await fetchGeocode(suggestion.address);
        if (geoResult && geoResult.latitude != null) {
          onChange?.({ ...suggestion, latitude: geoResult.latitude, longitude: geoResult.longitude });
        } else {
          onChange?.(suggestion);
        }
      } catch (e) {
        console.error('Geocode fallback failed', e);
        onChange?.(suggestion);
      } finally {
        setLoading(false);
      }
    }
  }, [onChange]);

  // ── Clear field ───────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setInputText('');
    setSuggestions([]);
    setOpen(false);
    setSelected(false);
    setActiveIndex(-1);
    onChange?.({ address: '', latitude: null, longitude: null });
  }, [onChange]);

  // ── GPS ───────────────────────────────────────────────────────────────
  const handleCurrentLocation = useCallback(async () => {
    setOpen(false);
    const loc = await getCurrentLocation();
    if (loc) {
      setInputText(loc.address);
      setSelected(true);
      onChange?.(loc);
    }
  }, [getCurrentLocation, onChange]);

  // ── Keyboard navigation ───────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (!open) return;
    const total = suggestions.length + (showCurrentLocation ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      } else if (showCurrentLocation && activeIndex === suggestions.length) {
        handleCurrentLocation();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [open, suggestions, activeIndex, showCurrentLocation, handleSelect, handleCurrentLocation]);

  const dropdownVisible = open && (suggestions.length > 0 || loading || showCurrentLocation);
  const showClear = inputText.length > 0 && !loading && !gpsLoading;

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      )}

      {/* Input */}
      <div className="relative">
        {/* Search icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          type="text"
          value={inputText}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0 && !selected) setOpen(true); }}
          placeholder={placeholder}
          disabled={disabled || gpsLoading}
          autoComplete="off"
          className={`w-full bg-slate-800/60 border rounded-lg pl-10 pr-10 py-3 text-white placeholder-slate-500
            focus:outline-none focus:ring-1 transition-all disabled:opacity-50 text-sm
            ${selected
              ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/30'
              : 'border-slate-600/50 focus:border-violet-500 focus:ring-violet-500/30'
            }`}
        />

        {/* Right side: spinner or clear button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {(loading || gpsLoading) ? (
            <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          ) : showClear ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-500 hover:text-slate-200 transition-colors p-0.5 rounded"
              tabIndex={-1}
              aria-label="Clear"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : selected ? (
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          ) : null}
        </div>
      </div>

      {/* GPS error */}
      {gpsError && (
        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
          <span>⚠</span> {gpsError}
        </p>
      )}

      {/* Dropdown */}
      {dropdownVisible && (
        <ul className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600/50 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
          {/* GPS option */}
          {showCurrentLocation && (
            <li
              onMouseDown={(e) => { e.preventDefault(); handleCurrentLocation(); }}
              className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors border-b border-slate-700/50
                ${activeIndex === suggestions.length
                  ? 'bg-violet-600/20 text-violet-300'
                  : 'text-slate-300 hover:bg-slate-700/50'}`}
            >
              <span className="text-lg flex-shrink-0">📍</span>
              <div>
                <p className="text-sm font-medium">Use Current Location</p>
                <p className="text-xs text-slate-500">GPS-based · needs browser permission</p>
              </div>
            </li>
          )}

          {/* Loading skeleton */}
          {loading && suggestions.length === 0 && (
            <li className="px-4 py-3 text-slate-400 text-sm flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              Searching…
            </li>
          )}

          {/* Suggestions */}
          {suggestions.map((s, i) => (
            <li
              key={s.providerPlaceId || i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors
                ${i < suggestions.length - 1 ? 'border-b border-slate-700/30' : ''}
                ${i === activeIndex
                  ? 'bg-violet-600/20 text-violet-300'
                  : 'text-slate-200 hover:bg-slate-700/50'}`}
            >
              <span className="text-slate-500 mt-0.5 text-sm flex-shrink-0">📌</span>
              <div className="min-w-0">
                <p className="text-sm leading-snug">{s.address}</p>

                {s.distance && Number.isFinite(s.distance) && (
                  <p className="text-xs text-slate-500 mt-1">
                    {s.distance.toFixed(1)} km away
                  </p>
                )}                {s.provider && (
                  <p className="text-xs text-slate-500 mt-0.5">{s.provider}</p>
                )}
              </div>
            </li>
          ))}

          {/* No results */}
          {!loading && suggestions.length === 0 && !showCurrentLocation && (
            <li className="px-4 py-3 text-slate-400 text-sm text-center">
              No results found
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
