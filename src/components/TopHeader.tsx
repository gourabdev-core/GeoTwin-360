import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, SunDim, X, Loader2, MapPin, LogOut, User } from 'lucide-react';
import { Input } from './ui/Input.js';
import { useLocation } from '../context/LocationContext.js';
import { apiClient } from '../services/api.js';
import { LocationContext as LocationModel } from '../types/domain.js';
import { AuthModal } from './AuthModal.js';

import { User as FirebaseUser, signOut } from 'firebase/auth';
import { auth } from '../firebase.js';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  currentUser: FirebaseUser | null;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleSidebar, currentUser }) => {
  const { selectedLocation, selectLocation, loading: contextLoading } = useLocation();

  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const containerRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const formatLocationName = (loc: LocationModel) => {
    if (!loc) return '';
    return [loc.name, loc.region, loc.country].filter(Boolean).join(', ');
  };

  // Sync search input query with global selected location
  useEffect(() => {
    if (selectedLocation && !isTypingRef.current) {
      setQuery(formatLocationName(selectedLocation));
    } else if (!selectedLocation && !isTypingRef.current) {
      setQuery('');
    }
  }, [selectedLocation]);

  // Debounced API search trigger
  useEffect(() => {
    if (query.trim().length < 2 || !isTypingRef.current) {
      setResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    // Cancel previous pending search request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      setActiveIndex(-1);

      try {
        const response = await apiClient.get('/locations/search', {
          params: { q: query.trim(), limit: 5 },
          signal: controller.signal
        });
        setResults(response.data.data);
      } catch (err: any) {
        if (err.name === 'CanceledError' || axiosIsCancel(err)) {
          // Ignore cancellation errors
          return;
        }
        console.error('[TopHeader] Location search API failure:', err);
        setSearchError(err.message || 'Location search is temporarily unavailable.');
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(delayDebounce);
      if (controller.signal.aborted === false) {
        // Clear references
      }
    };
  }, [query]);

  // Helper function to check axios cancel (since axios is imported/compiled, we can check property or do inline check)
  const axiosIsCancel = (err: any) => {
    return err && err.__CANCEL__ === true;
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingRef.current = true;
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    setIsOpen(true);
  };

  const handleClear = () => {
    isTypingRef.current = false;
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSearchError(null);
  };

  const handleSelect = async (loc: any) => {
    isTypingRef.current = false;
    setIsOpen(false);
    setQuery(formatLocationName(loc));

    // Map fields to domain LocationContext format
    await selectLocation({
      name: loc.name,
      city: loc.city || loc.name,
      region: loc.region,
      country: loc.country,
      countryCode: loc.countryCode,
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezone: loc.timezone
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <header className="h-20 bg-near-black border-b border-border-gray flex items-center justify-between px-6 z-40">
      <div className="flex items-center space-x-4 flex-1 max-w-lg relative" ref={containerRef}>
        <button
          onClick={onToggleSidebar}
          className="p-2 text-text-silver hover:text-text-base md:hidden focus:outline-none"
        >
          <Menu size={20} />
        </button>
        <div className="w-full relative">
          <Input
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Search for a location..."
            icon={searchLoading ? <Loader2 size={16} className="animate-spin text-spotify-green" /> : <Search size={16} />}
            autoComplete="off"
            id="global-location-search"
            aria-label="Search for a location"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-silver hover:text-text-base focus:outline-none"
              aria-label="Clear search input"
            >
              <X size={16} />
            </button>
          )}

          {/* Results Dropdown Menu */}
          {isOpen && (query.trim().length >= 2 || searchLoading || searchError || results.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-mid-dark border border-border-gray rounded-lg shadow-heavy z-50 max-h-64 overflow-y-auto">
              {searchLoading && results.length === 0 && (
                <div className="p-4 text-xs text-text-silver text-center flex items-center justify-center space-x-2">
                  <Loader2 size={12} className="animate-spin text-spotify-green" />
                  <span>Loading locations...</span>
                </div>
              )}
              {searchError && (
                <div className="p-4 text-xs text-text-negative text-center">
                  {searchError}
                </div>
              )}
              {!searchLoading && !searchError && results.length === 0 && query.trim().length >= 2 && (
                <div className="p-4 text-xs text-text-silver text-center">
                  No results found
                </div>
              )}
              {!searchError && results.length > 0 && (
                <ul className="py-1" role="listbox" id="search-results-listbox">
                  {results.map((result, idx) => (
                    <li
                      key={`${result.latitude}-${result.longitude}-${idx}`}
                      role="option"
                      aria-selected={activeIndex === idx}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`px-4 py-3 cursor-pointer transition-colors duration-150 flex items-center space-x-3 ${
                        activeIndex === idx ? 'bg-dark-card text-text-base' : 'text-text-silver'
                      }`}
                    >
                      <MapPin size={16} className="text-spotify-green flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm font-bold truncate text-text-base">
                          {result.name}
                        </span>
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
        <div className="hidden lg:flex items-center space-x-2 bg-mid-dark px-4 py-2 rounded-full border border-transparent">
          <SunDim size={16} className="text-text-silver" />
          <span className="text-xs text-text-silver font-bold uppercase tracking-wider select-none">
            {contextLoading ? 'Syncing...' : selectedLocation ? 'Weather Ready' : 'Weather Unavailable'}
          </span>
        </div>

        <button className="relative p-2 text-text-silver hover:text-text-base focus:outline-none" aria-label="Notifications">
          <Bell size={20} />
        </button>

        {currentUser ? (
          <div className="flex items-center space-x-3 pl-4 border-l border-border-gray">
            <div className="hidden md:block text-right">
              <h4 className="text-xs font-bold text-text-base">
                {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
              </h4>
              <p className="text-[10px] text-text-silver">
                {currentUser.email || 'Sustainability Lead'}
              </p>
            </div>
            <div className="h-9 w-9 bg-mid-dark rounded-full flex items-center justify-center text-text-silver border border-border-gray">
              <User size={18} />
            </div>
            <button
              onClick={async () => {
                try {
                  await signOut(auth);
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
