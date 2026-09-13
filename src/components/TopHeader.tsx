import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, X, Loader2, MapPin, LogOut, User, Activity, CheckCircle2, Radio, Info } from 'lucide-react';
import { Input } from './ui/Input.js';
import { useLocation } from '../context/LocationContext.js';
import { useWeather } from '../context/WeatherContext.js';
import { LocationService, LocationSuggestion } from '../services/locationService.js';
import { AuthModal } from './AuthModal.js';
import { useAuth } from '../context/AuthContext.js';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen?: boolean;
  currentUser?: any;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleSidebar, sidebarOpen }) => {
  const { user: authUser, profile, signOut: handleSignOut } = useAuth();
  const { selectedLocation, selectLocation, clearLocation, formatLocationName } = useLocation();
  const { status: weatherStatus, weather } = useWeather();

  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [notificationsDismissed, setNotificationsDismissed] = useState<boolean>(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const containerRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);


  // Sync search input query with global selected location
  useEffect(() => {
    if (selectedLocation && !isTypingRef.current) {
      setQuery(selectedLocation.displayName || formatLocationName(selectedLocation));
    } else if (!selectedLocation && !isTypingRef.current) {
      setQuery('');
    }
  }, [selectedLocation, formatLocationName]);

  // Execute explicit search (triggered only on Enter or search button click)
  const executeSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError('Please enter at least 2 characters.');
      setIsOpen(true);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSearchLoading(true);
    setSearchError(null);
    setIsOpen(true);
    setActiveIndex(-1);

    try {
      const data = await LocationService.searchLocations(trimmed, 5, controller.signal);
      setResults(data);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || axiosIsCancel(err)) {
        return;
      }
      console.error('[TopHeader] Location search failure:', err);
      setSearchError(err.message || 'Location search is temporarily unavailable.');
      setResults([]);
    } finally {
      if (!controller.signal.aborted) {
        setSearchLoading(false);
      }
    }
  };

  // Helper function to check axios cancellation
  const axiosIsCancel = (err: any) => {
    return err && (err.__CANCEL__ === true || err.code === 'ERR_CANCELED');
  };

  // Debounced auto-search as user types
  useEffect(() => {
    if (!isTypingRef.current) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(trimmed);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingRef.current = true;
    const val = e.target.value;
    setQuery(val);
    setSearchError(null);
    if (val.trim().length >= 2) {
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    if (results.length > 0 || searchError) {
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    isTypingRef.current = false;
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSearchError(null);
    clearLocation();
  };

  const handleSelect = async (loc: LocationSuggestion) => {
    isTypingRef.current = false;
    setIsOpen(false);
    setResults([]);
    setSearchError(null);
    const cleanName = loc.displayName || formatLocationName(loc);
    setQuery(cleanName);

    // Map fields to domain LocationContext format
    await selectLocation({
      id: loc.id,
      name: loc.name,
      city: loc.city || loc.name,
      region: loc.state || loc.region,
      state: loc.state || loc.region,
      country: loc.country,
      countryCode: loc.countryCode,
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezone: loc.timezone,
      displayName: loc.displayName || cleanName,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && activeIndex >= 0 && activeIndex < results.length) {
        handleSelect(results[activeIndex]);
      } else if (isOpen && results.length > 0) {
        handleSelect(results[0]);
      } else {
        executeSearch(query);
      }
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      setActiveIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : -1));
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      setActiveIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : -1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <header className="h-20 bg-[#07110f]/80 backdrop-blur-xl border-b border-white/[0.07] flex items-center justify-between px-6 z-40 sticky top-0">
      <div className="flex items-center space-x-4 flex-1 max-w-xl relative" ref={containerRef}>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2.5 text-[#8ea39a] hover:text-[#f5fff8] hover:bg-white/[0.05] rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#32f26b] flex-shrink-0"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          id="toggle-sidebar-btn"
        >
          <Menu size={20} />
        </button>
        <div className="w-full relative">
          <Input
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Search location and press Enter..."
            icon={
              <button
                type="button"
                onClick={() => executeSearch(query)}
                className="cursor-pointer text-[#8ea39a] hover:text-[#32f26b] transition-colors focus:outline-none"
                title="Click to search"
              >
                {searchLoading ? (
                  <Loader2 size={16} className="animate-spin text-[#32f26b]" />
                ) : (
                  <Search size={16} />
                )}
              </button>
            }
            autoComplete="off"
            id="global-location-search"
            aria-label="Search for a location"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="search-results-listbox"
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8ea39a] hover:text-[#f5fff8] p-1 rounded-md hover:bg-white/[0.05] focus:outline-none cursor-pointer transition-colors"
              aria-label="Clear search input"
            >
              <X size={15} />
            </button>
          )}

          {/* Results Dropdown Menu */}
          {isOpen && (searchLoading || searchError || results.length > 0 || (!searchLoading && isTypingRef.current && query.trim().length >= 2)) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0d1b18]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-heavy z-50 max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
              {searchLoading && (
                <div className="p-4 text-xs text-[#8ea39a] text-center flex items-center justify-center space-x-2">
                  <Loader2 size={14} className="animate-spin text-[#32f26b]" />
                  <span>Searching global climate locations...</span>
                </div>
              )}
              {searchError && (
                <div className="p-4 text-xs text-[#f87171] text-center flex flex-col items-center gap-2">
                  <span>{searchError}</span>
                  <button
                    type="button"
                    onClick={() => executeSearch(query)}
                    className="text-xs text-[#32f26b] hover:underline cursor-pointer font-semibold"
                  >
                    Retry Search
                  </button>
                </div>
              )}
              {!searchLoading && !searchError && results.length === 0 && (
                <div className="p-4 text-xs text-[#8ea39a] text-center">
                  No matching location found
                </div>
              )}
              {!searchError && results.length > 0 && (
                <ul className="py-1" role="listbox" id="search-results-listbox">
                  {results.map((result, idx) => (
                    <li
                      key={`${result.latitude}-${result.longitude}-${idx}`}
                      id={`search-option-${idx}`}
                      role="option"
                      aria-selected={activeIndex === idx}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`px-4 py-3 cursor-pointer transition-colors duration-150 flex items-center space-x-3 ${
                        activeIndex === idx ? 'bg-[#10221e] text-[#f5fff8]' : 'text-[#8ea39a] hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-white/[0.03] text-[#32f26b] flex-shrink-0">
                        <MapPin size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="block text-sm font-semibold truncate text-[#f5fff8]">
                            {result.name}
                          </span>
                          <span className="text-[10px] text-[#19d9c5]/80 font-mono flex-shrink-0 px-1.5 py-0.5 rounded bg-white/[0.03]">
                            {result.latitude.toFixed(4)}°, {result.longitude.toFixed(4)}°
                          </span>
                        </div>
                        {(result.region || result.country) && (
                          <span className="block text-[11px] text-[#8ea39a] truncate mt-0.5">
                            {[result.region, result.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-5">
        {selectedLocation ? (
          <div 
            className="hidden lg:flex items-center space-x-2.5 bg-[#0d1b18] px-3.5 py-1.5 rounded-full border border-white/[0.08] select-none transition-colors shadow-subtle"
            title={
              weatherStatus === 'LOADING'
                ? 'Fetching weather data...'
                : weatherStatus === 'AVAILABLE'
                ? `Real-time weather active (${weather?.temperature?.toFixed(1) ?? ''}°C, ${weather?.description ?? ''})`
                : 'Weather data unavailable'
            }
          >
            {weatherStatus === 'LOADING' ? (
              <>
                <Loader2 size={13} className="text-[#8ea39a] animate-spin" />
                <span className="text-[10px] text-[#8ea39a] font-bold uppercase tracking-wider">
                  STREAMING TELEMETRY
                </span>
              </>
            ) : weatherStatus === 'AVAILABLE' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-[#32f26b] shadow-[0_0_8px_rgba(50,242,107,0.8)] animate-pulse" />
                <span className="text-[10px] text-[#32f26b] font-bold uppercase tracking-wider">
                  LIVE TELEMETRY
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-[#8ea39a]/40" />
                <span className="text-[10px] text-[#8ea39a] font-bold uppercase tracking-wider">
                  TELEMETRY STANDBY
                </span>
              </>
            )}
          </div>
        ) : (
          <div 
            className="hidden lg:flex items-center space-x-2 bg-[#0d1b18] px-3.5 py-1.5 rounded-full border border-white/[0.07] select-none"
            title="Search a location to activate live climate and weather data"
          >
            <div className="w-2 h-2 rounded-full bg-[#8ea39a]/40" />
            <span className="text-[10px] text-[#8ea39a] font-bold uppercase tracking-wider">
              READY
            </span>
          </div>
        )}

        {/* Notifications & System Telemetry Popover */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className="relative p-2.5 text-[#8ea39a] hover:text-[#f5fff8] hover:bg-white/[0.04] rounded-xl focus:outline-none cursor-pointer transition-colors"
            aria-label="View notifications and system telemetry"
            title="System notifications & telemetry"
          >
            <Bell size={19} />
            {!notificationsDismissed && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#32f26b] shadow-[0_0_6px_rgba(50,242,107,0.8)] animate-pulse" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#0d1b18]/95 backdrop-blur-2xl border border-white/[0.09] rounded-2xl shadow-heavy z-50 p-4.5 font-sans text-xs space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                <div className="flex items-center space-x-2">
                  <Activity size={16} className="text-[#32f26b]" />
                  <span className="font-bold text-[#f5fff8] text-sm">System Telemetry & Health</span>
                </div>
                <div className="flex items-center space-x-2">
                  {!notificationsDismissed && (
                    <button
                      onClick={() => setNotificationsDismissed(true)}
                      className="text-[10px] text-[#32f26b] hover:underline cursor-pointer font-medium"
                    >
                      Clear alerts
                    </button>
                  )}
                  <button
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-[#8ea39a] hover:text-white cursor-pointer p-0.5"
                    aria-label="Close notifications panel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Telemetry Status Strip */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-[#091614] border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Radio size={14} className="text-[#32f26b]" />
                    <span className="text-[#c7d4cf]">OpenWeather Engine</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    weatherStatus === 'AVAILABLE' ? 'bg-[#32f26b]/15 text-[#32f26b] border border-[#32f26b]/30' :
                    weatherStatus === 'LOADING' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}>
                    {weatherStatus === 'AVAILABLE' ? 'ONLINE' : weatherStatus === 'LOADING' ? 'SYNCING' : 'OFFLINE'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#091614] border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 size={14} className="text-[#32f26b]" />
                    <span className="text-[#c7d4cf]">NASA POWER Climate Data</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#32f26b]/15 text-[#32f26b] border border-[#32f26b]/30">
                    OPERATIONAL
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#091614] border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 size={14} className="text-[#32f26b]" />
                    <span className="text-[#c7d4cf]">Gemini Reasoning Layer</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#32f26b]/15 text-[#32f26b] border border-[#32f26b]/30">
                    STANDBY / DETERMINISTIC
                  </span>
                </div>
              </div>

              {/* Location Regional Advisory Notice */}
              <div className="p-3 bg-[#091614] rounded-xl border border-white/[0.06] space-y-1">
                <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-[#f5fff8]">
                  <Info size={13} className="text-[#32f26b]" />
                  <span>Regional Advisory</span>
                </div>
                <p className="text-[11px] text-[#8ea39a] leading-relaxed">
                  {selectedLocation
                    ? `Monitoring active environmental parameters for ${selectedLocation.displayName || selectedLocation.name}. Real-time indicators are operating normally.`
                    : 'No location actively monitored. Search a city above to stream live environmental telemetry.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {authUser ? (
          <div className="flex items-center space-x-3 pl-4 border-l border-white/[0.08]">
            <div className="hidden md:block text-right">
              <h4 className="text-xs font-semibold text-[#f5fff8]">
                {profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User'}
              </h4>
              <p className="text-[10px] text-[#8ea39a]">
                {authUser.email || 'Sustainability Lead'}
              </p>
            </div>
            <div className="h-9 w-9 bg-[#0d1b18] rounded-full flex items-center justify-center text-[#8ea39a] border border-white/[0.08] overflow-hidden">
              {profile?.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture ? (
                <img
                  src={profile?.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture}
                  alt={profile?.full_name || 'User'}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={18} />
              )}
            </div>
            <button
              onClick={async () => {
                try {
                  await handleSignOut();
                } catch (err) {
                  console.error('[TopHeader] Sign out error:', err);
                }
              }}
              title="Sign Out"
              className="p-1.5 text-[#8ea39a] hover:text-red-400 transition-colors duration-150 cursor-pointer rounded-lg hover:bg-white/[0.04]"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2.5 pl-4 border-l border-white/[0.08] font-sans text-xs">
            <button
              onClick={() => {
                setAuthModalMode('signin');
                setIsAuthModalOpen(true);
              }}
              className="text-[#c7d4cf] hover:text-white transition-colors duration-150 font-medium cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthModalMode('signup');
                setIsAuthModalOpen(true);
              }}
              className="bg-[#32f26b] hover:bg-[#32f26b]/90 text-[#07110f] px-4 py-1.5 rounded-xl font-bold transition-all duration-150 cursor-pointer shadow-[0_0_12px_rgba(50,242,107,0.22)] hover:shadow-[0_0_18px_rgba(50,242,107,0.35)]"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authModalMode}
        onAuthSuccess={() => {}}
      />
    </header>
  );
};
export default TopHeader;
