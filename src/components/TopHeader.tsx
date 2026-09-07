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
    <header className="h-20 bg-near-black border-b border-border-gray flex items-center justify-between px-6 z-40">
      <div className="flex items-center space-x-4 flex-1 max-w-lg relative" ref={containerRef}>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 text-text-silver hover:text-text-base hover:bg-mid-dark rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-spotify-green flex-shrink-0"
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
                className="cursor-pointer text-text-silver hover:text-spotify-green transition-colors focus:outline-none"
                title="Click to search"
              >
                {searchLoading ? (
                  <Loader2 size={16} className="animate-spin text-spotify-green" />
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
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-silver hover:text-text-base focus:outline-none cursor-pointer"
              aria-label="Clear search input"
            >
              <X size={16} />
            </button>
          )}

          {/* Results Dropdown Menu */}
          {isOpen && (searchLoading || searchError || results.length > 0 || (!searchLoading && isTypingRef.current && query.trim().length >= 2)) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-mid-dark border border-border-gray rounded-lg shadow-heavy z-50 max-h-64 overflow-y-auto">
              {searchLoading && (
                <div className="p-4 text-xs text-text-silver text-center flex items-center justify-center space-x-2">
                  <Loader2 size={12} className="animate-spin text-spotify-green" />
                  <span>Searching locations...</span>
                </div>
              )}
              {searchError && (
                <div className="p-4 text-xs text-text-negative text-center flex flex-col items-center gap-2">
                  <span>{searchError}</span>
                  <button
                    type="button"
                    onClick={() => executeSearch(query)}
                    className="text-xs text-spotify-green hover:underline cursor-pointer font-bold"
                  >
                    Retry Search
                  </button>
                </div>
              )}
              {!searchLoading && !searchError && results.length === 0 && (
                <div className="p-4 text-xs text-text-silver text-center">
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
                      className={`px-4 py-2.5 cursor-pointer transition-colors duration-150 flex items-center space-x-3 ${
                        activeIndex === idx ? 'bg-dark-card text-text-base' : 'text-text-silver'
                      }`}
                    >
                      <MapPin size={16} className="text-spotify-green flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="block text-sm font-bold truncate text-text-base">
                            {result.name}
                          </span>
                          <span className="text-[10px] text-text-silver/60 font-mono flex-shrink-0">
                            {result.latitude.toFixed(4)}°, {result.longitude.toFixed(4)}°
                          </span>
                        </div>
                        {(result.region || result.country) && (
                          <span className="block text-[11px] text-text-silver truncate mt-0.5">
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

      <div className="flex items-center space-x-6">
        {selectedLocation ? (
          <div 
            className="hidden lg:flex items-center space-x-2 bg-mid-dark px-4 py-2 rounded-full border border-transparent select-none transition-colors"
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
                <Loader2 size={14} className="text-text-silver animate-spin" />
                <span className="text-xs text-text-silver font-bold uppercase tracking-wider">
                  WEATHER LOADING
                </span>
              </>
            ) : weatherStatus === 'AVAILABLE' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-spotify-green animate-pulse" />
                <span className="text-xs text-spotify-green font-bold uppercase tracking-wider">
                  WEATHER AVAILABLE
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-text-silver/50" />
                <span className="text-xs text-text-silver font-bold uppercase tracking-wider">
                  WEATHER UNAVAILABLE
                </span>
              </>
            )}
          </div>
        ) : (
          <div 
            className="hidden lg:flex items-center space-x-2 bg-mid-dark px-4 py-2 rounded-full border border-transparent select-none"
            title="Search a location to activate live climate and weather data"
          >
            <div className="w-2 h-2 rounded-full bg-text-silver/40" />
            <span className="text-xs text-text-silver/70 font-bold uppercase tracking-wider">
              STANDBY
            </span>
          </div>
        )}

        {/* Notifications & System Telemetry Popover */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className="relative p-2 text-text-silver hover:text-text-base focus:outline-none cursor-pointer transition-colors"
            aria-label="View notifications and system telemetry"
            title="System notifications & telemetry"
          >
            <Bell size={20} />
            {!notificationsDismissed && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-spotify-green animate-pulse" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-mid-dark border border-border-gray rounded-xl shadow-2xl z-50 p-4 font-sans text-xs space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-border-gray/40 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Activity size={15} className="text-spotify-green" />
                  <span className="font-bold text-text-base text-sm">System Telemetry & Alerts</span>
                </div>
                <div className="flex items-center space-x-2">
                  {!notificationsDismissed && (
                    <button
                      onClick={() => setNotificationsDismissed(true)}
                      className="text-[10px] text-spotify-green hover:underline cursor-pointer"
                    >
                      Clear alerts
                    </button>
                  )}
                  <button
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-text-silver hover:text-white cursor-pointer p-0.5"
                    aria-label="Close notifications panel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Telemetry Status Strip */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-dark-surface border border-border-gray/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Radio size={14} className="text-spotify-green" />
                    <span className="text-text-silver">Live Weather Engine</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    weatherStatus === 'AVAILABLE' ? 'bg-spotify-green/20 text-spotify-green' :
                    weatherStatus === 'LOADING' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {weatherStatus === 'AVAILABLE' ? 'ONLINE' : weatherStatus === 'LOADING' ? 'CONNECTING' : 'OFFLINE'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-dark-surface border border-border-gray/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-spotify-green" />
                    <span className="text-text-silver">NASA POWER Climate Data</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-spotify-green/20 text-spotify-green">
                    OPERATIONAL
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-dark-surface border border-border-gray/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-spotify-green" />
                    <span className="text-text-silver">Gemini Intelligence Layer</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-spotify-green/20 text-spotify-green">
                    STANDBY / DETERMINISTIC
                  </span>
                </div>
              </div>

              {/* Location Regional Advisory Notice */}
              <div className="p-3 bg-dark-card rounded-lg border border-border-gray/30 space-y-1">
                <div className="flex items-center space-x-1.5 text-[11px] font-bold text-text-base">
                  <Info size={13} className="text-spotify-green" />
                  <span>Regional Advisory</span>
                </div>
                <p className="text-[11px] text-text-silver leading-relaxed">
                  {selectedLocation
                    ? `Monitoring active environmental parameters for ${selectedLocation.displayName || selectedLocation.name}. Real-time indicators are operating normally.`
                    : 'No location actively monitored. Search a city above to stream live environmental telemetry.'}
                </p>
              </div>
            </div>
          )}
        </div>


        {authUser ? (
          <div className="flex items-center space-x-3 pl-4 border-l border-border-gray">
            <div className="hidden md:block text-right">
              <h4 className="text-xs font-bold text-text-base">
                {profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User'}
              </h4>
              <p className="text-[10px] text-text-silver">
                {authUser.email || 'Sustainability Lead'}
              </p>
            </div>
            <div className="h-9 w-9 bg-mid-dark rounded-full flex items-center justify-center text-text-silver border border-border-gray overflow-hidden">
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
              className="p-1.5 text-text-silver hover:text-red-400 transition-colors duration-150 cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3 pl-4 border-l border-border-gray font-sans text-xs">
            <button
              onClick={() => {
                setAuthModalMode('signin');
                setIsAuthModalOpen(true);
              }}
              className="text-gray-300 hover:text-white transition-colors duration-150 font-medium cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthModalMode('signup');
                setIsAuthModalOpen(true);
              }}
              className="bg-spotify-green hover:bg-spotify-green/90 text-black px-4 py-1.5 rounded-md font-semibold transition-colors duration-150 cursor-pointer"
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
