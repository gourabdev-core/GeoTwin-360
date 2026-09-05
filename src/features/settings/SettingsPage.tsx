import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Mail,
  Building2,
  Shield,
  Calendar,
  Copy,
  Check,
  Sliders,
  Thermometer,
  Globe,
  LogOut,
  Database,
  Cpu,
  CloudSun,
  Lock,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { useAuth } from '../../context/AuthContext.js';
import { usePreferences } from '../../context/PreferencesContext.js';
import { useLocation } from '../../context/LocationContext.js';
import { AuthModal } from '../../components/AuthModal.js';
import { profileRepository } from '../../repositories/profileRepository.js';
import { apiClient } from '../../services/api.js';
import { supabase } from '../../config/supabase.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';

const ROLE_OPTIONS = [
  'Sustainability Lead',
  'Urban Planner',
  'Climate Risk Analyst',
  'ESG Manager',
  'GIS Specialist',
  'Municipal Official',
  'Environmental Researcher',
];

const BENCHMARK_CITIES = [
  { id: 'loc-22.5726-88.3639', name: 'Kolkata, West Bengal, India' },
  { id: 'loc-28.6139-77.2090', name: 'Delhi, India' },
  { id: 'loc-19.0760-72.8777', name: 'Mumbai, Maharashtra, India' },
  { id: 'loc-12.9716-77.5946', name: 'Bengaluru, Karnataka, India' },
  { id: 'loc-13.0827-80.2707', name: 'Chennai, Tamil Nadu, India' },
  { id: 'loc-51.5074--0.1278', name: 'London, United Kingdom' },
  { id: 'loc-40.7128--74.0060', name: 'New York, United States' },
];

const BENCHMARK_CITY_COORDINATES: Record<string, { lat: number; lng: number; name: string; city: string; country: string }> = {
  'loc-22.5726-88.3639': { lat: 22.572646, lng: 88.363895, name: 'Kolkata, West Bengal, India', city: 'Kolkata', country: 'India' },
  'loc-28.6139-77.2090': { lat: 28.6139, lng: 77.2090, name: 'Delhi, India', city: 'Delhi', country: 'India' },
  'loc-19.0760-72.8777': { lat: 19.0760, lng: 72.8777, name: 'Mumbai, Maharashtra, India', city: 'Mumbai', country: 'India' },
  'loc-12.9716-77.5946': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru, Karnataka, India', city: 'Bengaluru', country: 'India' },
  'loc-13.0827-80.2707': { lat: 13.0827, lng: 80.2707, name: 'Chennai, Tamil Nadu, India', city: 'Chennai', country: 'India' },
  'loc-51.5074--0.1278': { lat: 51.5074, lng: -0.1278, name: 'London, United Kingdom', city: 'London', country: 'United Kingdom' },
  'loc-40.7128--74.0060': { lat: 40.7128, lng: -74.0060, name: 'New York, United States', city: 'New York', country: 'United States' },
};

export const SettingsPage: React.FC = () => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { preferences, updatePreferences, isSaving: isPrefsSaving, saveStatus: prefsSaveStatus } = usePreferences();
  const { selectedLocation, selectLocation } = useLocation();

  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  // Profile form state
  const [fullName, setFullName] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [role, setRole] = useState<string>('Sustainability Lead');
  const [isProfileSaving, setIsProfileSaving] = useState<boolean>(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Sign out confirmation dialog
  const [showSignOutConfirm, setShowSignOutConfirm] = useState<boolean>(false);

  // Copied UUID feedback
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Local state for preferences form
  const [tempUnit, setTempUnit] = useState<'celsius' | 'fahrenheit'>(preferences.temperatureUnit);
  const [targetYear, setTargetYear] = useState<2030 | 2035 | 2040 | 2050>(preferences.defaultTargetYear);
  const [scenario, setScenario] = useState<'baseline' | 'resilience' | 'accelerated'>(preferences.defaultScenario);
  const [defaultLocId, setDefaultLocId] = useState<string>(preferences.defaultLocationId || 'loc-22.5726-88.3639');

  // Synchronize profile form with current authenticated profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setOrganization(profile.organization || '');
      setRole(profile.role || 'Sustainability Lead');
    } else if (user) {
      const meta = user.user_metadata || {};
      setFullName(meta.full_name || meta.name || user.email?.split('@')[0] || '');
      setOrganization('');
      setRole('Sustainability Lead');
    }
  }, [profile, user]);

  // Synchronize preferences state
  useEffect(() => {
    setTempUnit(preferences.temperatureUnit);
    setTargetYear(preferences.defaultTargetYear);
    setScenario(preferences.defaultScenario);
    if (preferences.defaultLocationId) {
      setDefaultLocId(preferences.defaultLocationId);
    }
  }, [preferences]);

  // Copy User ID
  const handleCopyUserId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsProfileSaving(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setProfileErrorMsg('Full name cannot be empty.');
      setIsProfileSaving(false);
      return;
    }

    try {
      // Attempt backend API patch first
      let updated = false;
      try {
        const res = await apiClient.patch('/profile', {
          full_name: trimmedName,
          organization: organization.trim() || null,
          role: role.trim(),
        });
        if (res.data?.status === 'success') {
          updated = true;
        }
      } catch {
        // Fallback to Supabase profile repository
      }

      if (!updated) {
        await profileRepository.updateProfile(user.id, {
          full_name: trimmedName,
          organization: organization.trim() || null,
          role: role.trim(),
        });
      }

      // Also sync Supabase auth user metadata so session-based identity displays update immediately
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: trimmedName,
            name: trimmedName,
            role: role.trim(),
            organization: organization.trim() || null,
          },
        });
      } catch {
        // Non-blocking if auth update metadata is restricted
      }

      await refreshProfile();
      setProfileSuccessMsg('Profile updated successfully.');
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      setProfileErrorMsg(sanitizeErrorMessage(err, 'Failed to update profile. Please try again.'));
    } finally {
      setIsProfileSaving(false);
    }
  };

  // Handle Preferences Save
  const handleSavePreferences = async () => {
    const selectedCity = BENCHMARK_CITIES.find(c => c.id === defaultLocId);
    const locName = selectedCity 
      ? selectedCity.name 
      : (selectedLocation?.displayName || selectedLocation?.name || preferences.defaultLocationName);

    await updatePreferences({
      temperatureUnit: tempUnit,
      defaultTargetYear: targetYear,
      defaultScenario: scenario,
      defaultLocationId: defaultLocId,
      defaultLocationName: locName,
    });

    // If default location was changed to a known benchmark city, update the active location
    if (defaultLocId && defaultLocId !== selectedLocation?.id && BENCHMARK_CITY_COORDINATES[defaultLocId]) {
      const coord = BENCHMARK_CITY_COORDINATES[defaultLocId];
      await selectLocation({
        id: defaultLocId,
        latitude: coord.lat,
        longitude: coord.lng,
        name: coord.name,
        displayName: coord.name,
        city: coord.city,
        country: coord.country,
      });
    }
  };

  // Format account created date
  const formatAccountDate = (dateStr?: string) => {
    if (!dateStr) return 'Not available';
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex items-center space-x-3 p-4 bg-dark-surface rounded-lg shadow-medium border border-border-gray/30">
        <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
          <Settings size={24} />
        </div>
        <div>
          <h2 className="text-lg font-title font-bold text-text-base">System Settings</h2>
          <p className="text-xs text-text-silver">
            Manage user profile, account details, application preferences, and data provider telemetry
          </p>
        </div>
      </div>

      {/* Unauthenticated State Notification */}
      {!user && (
        <Card className="border border-border-gray/40 bg-mid-dark/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-dark-card rounded-full text-spotify-green border border-border-gray/40">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-base">Guest Mode Active</h3>
                <p className="text-xs text-text-silver mt-0.5">
                  Sign in with your account to persist user profiles and sync preferences across devices.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAuthModalMode('signin');
                  setIsAuthModalOpen(true);
                }}
                className="flex-1 sm:flex-initial"
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setAuthModalMode('signup');
                  setIsAuthModalOpen(true);
                }}
                className="flex-1 sm:flex-initial"
              >
                Create Account
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Profile & Account Info (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Profile Card */}
          <Card className="border border-border-gray/30">
            <div className="flex items-center space-x-2.5 mb-5 pb-3 border-b border-border-gray/30">
              <User size={18} className="text-spotify-green" />
              <h3 className="text-sm font-title font-bold text-text-base uppercase tracking-wider">
                User Profile
              </h3>
            </div>

            {user ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Feedback Alerts */}
                {profileSuccessMsg && (
                  <div className="flex items-center space-x-2 p-3 bg-spotify-green/10 border border-spotify-green/30 rounded-md text-spotify-green text-xs font-medium">
                    <CheckCircle2 size={16} />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}
                {profileErrorMsg && (
                  <div className="flex items-center space-x-2 p-3 bg-red-950/40 border border-red-800/40 rounded-md text-red-300 text-xs font-medium">
                    <AlertCircle size={16} />
                    <span>{profileErrorMsg}</span>
                  </div>
                )}

                {/* Avatar & Display Name preview */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-14 w-14 rounded-full bg-mid-dark border border-border-gray flex items-center justify-center text-text-base text-lg font-bold font-title uppercase select-none">
                    {fullName.trim().charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-base">{fullName || 'User'}</h4>
                    <p className="text-xs text-text-silver">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-dark-card border border-border-gray/40 rounded text-spotify-green">
                      {role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-silver uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full bg-mid-dark text-text-base text-xs rounded-md px-3 py-2.5 border border-border-gray/50 focus:border-spotify-green outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-silver uppercase tracking-wider mb-1.5">
                      Professional Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-mid-dark text-text-base text-xs rounded-md px-3 py-2.5 border border-border-gray/50 focus:border-spotify-green outline-none transition-colors cursor-pointer"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-dark-surface text-text-base">
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-silver uppercase tracking-wider mb-1.5">
                    Organization / Municipality (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <Building2 size={15} className="absolute left-3 text-text-silver pointer-events-none" />
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g. City Council or Urban Resilience Initiative"
                      className="w-full bg-mid-dark text-text-base text-xs rounded-md pl-9 pr-3 py-2.5 border border-border-gray/50 focus:border-spotify-green outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isProfileSaving}
                    className="flex items-center space-x-2"
                  >
                    {isProfileSaving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Save Profile</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="py-8 text-center space-y-3">
                <div className="h-12 w-12 mx-auto rounded-full bg-mid-dark flex items-center justify-center text-text-silver border border-border-gray/40">
                  <User size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-base">No Active Profile</h4>
                  <p className="text-xs text-text-silver max-w-sm mx-auto mt-1 leading-relaxed">
                    Sign in to customize your identity, organization, and professional role across climate reports.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAuthModalMode('signin');
                    setIsAuthModalOpen(true);
                  }}
                >
                  Sign In to Continue
                </Button>
              </div>
            )}
          </Card>

          {/* Account Information Card */}
          {user && (
            <Card className="border border-border-gray/30">
              <div className="flex items-center space-x-2.5 mb-5 pb-3 border-b border-border-gray/30">
                <Shield size={18} className="text-spotify-green" />
                <h3 className="text-sm font-title font-bold text-text-base uppercase tracking-wider">
                  Account Details
                </h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Account UUID */}
                  <div className="p-3 bg-mid-dark rounded-md border border-border-gray/30">
                    <span className="block text-[11px] font-semibold text-text-silver uppercase tracking-wider mb-1">
                      User Identifier (UUID)
                    </span>
                    <div className="flex items-center justify-between space-x-2">
                      <span className="text-xs font-mono text-text-base truncate select-all">
                        {user.id}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUserId}
                        title="Copy UUID"
                        className="p-1.5 text-text-silver hover:text-spotify-green transition-colors rounded hover:bg-dark-card cursor-pointer"
                      >
                        {copiedId ? <Check size={14} className="text-spotify-green" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Registered Email */}
                  <div className="p-3 bg-mid-dark rounded-md border border-border-gray/30">
                    <span className="block text-[11px] font-semibold text-text-silver uppercase tracking-wider mb-1">
                      Email Address
                    </span>
                    <div className="flex items-center space-x-2">
                      <Mail size={14} className="text-text-silver flex-shrink-0" />
                      <span className="text-xs font-medium text-text-base truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Auth Provider */}
                  <div className="p-3 bg-mid-dark rounded-md border border-border-gray/30">
                    <span className="block text-[11px] font-semibold text-text-silver uppercase tracking-wider mb-1">
                      Authentication Provider
                    </span>
                    <div className="flex items-center space-x-2">
                      <Lock size={14} className="text-text-silver" />
                      <span className="text-xs font-medium text-text-base capitalize">
                        {user.app_metadata?.provider || 'Email & Password'}
                      </span>
                    </div>
                  </div>

                  {/* Account Created At */}
                  <div className="p-3 bg-mid-dark rounded-md border border-border-gray/30">
                    <span className="block text-[11px] font-semibold text-text-silver uppercase tracking-wider mb-1">
                      Member Since
                    </span>
                    <div className="flex items-center space-x-2">
                      <Calendar size={14} className="text-text-silver" />
                      <span className="text-xs font-medium text-text-base">
                        {formatAccountDate(user.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Application Preferences Card */}
          <Card className="border border-border-gray/30">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-border-gray/30">
              <div className="flex items-center space-x-2.5">
                <Sliders size={18} className="text-spotify-green" />
                <h3 className="text-sm font-title font-bold text-text-base uppercase tracking-wider">
                  Application Preferences
                </h3>
              </div>
              {prefsSaveStatus === 'saved' && (
                <span className="flex items-center space-x-1.5 text-xs text-spotify-green font-medium">
                  <CheckCircle2 size={14} />
                  <span>Preferences Saved</span>
                </span>
              )}
            </div>

            <div className="space-y-5">
              {/* Temperature Unit Preference */}
              <div>
                <label className="block text-xs font-semibold text-text-silver uppercase tracking-wider mb-2">
                  Temperature Display Unit
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => setTempUnit('celsius')}
                    className={`flex items-center justify-center space-x-2 p-2.5 rounded-md text-xs font-bold transition-all border cursor-pointer ${
                      tempUnit === 'celsius'
                        ? 'bg-spotify-green text-black border-spotify-green shadow-sm'
                        : 'bg-mid-dark text-text-silver border-border-gray/40 hover:text-text-base hover:bg-dark-card'
                    }`}
                  >
                    <Thermometer size={14} />
                    <span>Celsius (°C)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempUnit('fahrenheit')}
                    className={`flex items-center justify-center space-x-2 p-2.5 rounded-md text-xs font-bold transition-all border cursor-pointer ${
                      tempUnit === 'fahrenheit'
                        ? 'bg-spotify-green text-black border-spotify-green shadow-sm'
                        : 'bg-mid-dark text-text-silver border-border-gray/40 hover:text-text-base hover:bg-dark-card'
                    }`}
                  >
                    <Thermometer size={14} />
                    <span>Fahrenheit (°F)</span>
                  </button>
                </div>
              </div>

              {/* Default Target Year */}
              <div>
                <label className="block text-xs font-semibold text-text-silver uppercase tracking-wider mb-2">
                  Default Simulation Horizon
                </label>
                <div className="grid grid-cols-4 gap-2 max-w-md">
                  {([2030, 2035, 2040, 2050] as const).map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setTargetYear(yr)}
                      className={`p-2 rounded-md text-xs font-bold transition-all border cursor-pointer ${
                        targetYear === yr
                          ? 'bg-spotify-green text-black border-spotify-green shadow-sm'
                          : 'bg-mid-dark text-text-silver border-border-gray/40 hover:text-text-base hover:bg-dark-card'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Scenario */}
              <div>
                <label className="block text-xs font-semibold text-text-silver uppercase tracking-wider mb-2">
                  Default Climate Scenario
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'baseline', label: 'Baseline', desc: 'Observed trend continuation' },
                    { id: 'resilience', label: 'Resilience Plan', desc: 'Targeted mitigation pathway' },
                    { id: 'accelerated', label: 'Accelerated', desc: 'Higher emission trajectory' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setScenario(s.id as any)}
                      className={`p-3 rounded-md text-left transition-all border cursor-pointer ${
                        scenario === s.id
                          ? 'bg-dark-card text-text-base border-spotify-green shadow-sm ring-1 ring-spotify-green'
                          : 'bg-mid-dark text-text-silver border-border-gray/40 hover:bg-dark-card'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-base">{s.label}</span>
                        {scenario === s.id && (
                          <span className="h-2 w-2 rounded-full bg-spotify-green" />
                        )}
                      </div>
                      <p className="text-[10px] text-text-silver mt-1">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Starting Location */}
              <div>
                <label className="block text-xs font-semibold text-text-silver uppercase tracking-wider mb-2">
                  Default Starting Location
                </label>
                <div className="max-w-md">
                  <div className="relative flex items-center">
                    <Globe size={15} className="absolute left-3 text-text-silver pointer-events-none" />
                    <select
                      value={defaultLocId}
                      onChange={(e) => setDefaultLocId(e.target.value)}
                      className="w-full bg-mid-dark text-text-base text-xs rounded-md pl-9 pr-3 py-2.5 border border-border-gray/50 focus:border-spotify-green outline-none transition-colors cursor-pointer"
                    >
                      {BENCHMARK_CITIES.map((city) => (
                        <option key={city.id} value={city.id} className="bg-dark-surface text-text-base">
                          {city.name}
                        </option>
                      ))}
                      {selectedLocation && !BENCHMARK_CITIES.some(c => c.id === selectedLocation.id) && (
                        <option value={selectedLocation.id} className="bg-dark-surface text-text-base">
                          {selectedLocation.displayName || selectedLocation.name} (Current)
                        </option>
                      )}
                    </select>
                  </div>
                  <p className="text-[10px] text-text-silver mt-1.5">
                    Preloads initial telemetry if no geographic coordinates are provided in the URL.
                  </p>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isPrefsSaving}
                  onClick={handleSavePreferences}
                  className="flex items-center space-x-2"
                >
                  {isPrefsSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Preferences</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: System Telemetry & Sign Out (1 Col) */}
        <div className="space-y-6">
          {/* Data Providers & System Status Card */}
          <Card className="border border-border-gray/30">
            <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-border-gray/30">
              <Database size={18} className="text-spotify-green" />
              <h3 className="text-sm font-title font-bold text-text-base uppercase tracking-wider">
                System Telemetry
              </h3>
            </div>

            <p className="text-xs text-text-silver mb-4 leading-relaxed">
              Provider adapters operate securely through server-side environment variables. API keys remain protected and are never transmitted to client browsers.
            </p>

            <div className="space-y-3">
              {/* NASA POWER */}
              <div className="p-3 bg-mid-dark rounded-md border border-border-gray/30 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <CloudSun size={16} className="text-blue-400" />
                  <div>
                    <h5 className="text-xs font-bold text-text-base">NASA POWER API</h5>
                    <p className="text-[10px] text-text-silver">Solar & Meteorology</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-spotify-green/10 text-spotify-green border border-spotify-green/20">
                  Active
                </span>
              </div>

              {/* OpenWeather */}
              <div className="p-3 bg-mid-dark rounded-md border border-border-gray/30 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <CloudSun size={16} className="text-amber-400" />
                  <div>
                    <h5 className="text-xs font-bold text-text-base">OpenWeather API</h5>
                    <p className="text-[10px] text-text-silver">Live Telemetry & AQI</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-spotify-green/10 text-spotify-green border border-spotify-green/20">
                  Active
                </span>
              </div>

              {/* Gemini Reasoning */}
              <div className="p-3 bg-mid-dark rounded-md border border-border-gray/30 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Cpu size={16} className="text-purple-400" />
                  <div>
                    <h5 className="text-xs font-bold text-text-base">Gemini Intelligence</h5>
                    <p className="text-[10px] text-text-silver">Decision reasoning layer</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-spotify-green/10 text-spotify-green border border-spotify-green/20">
                  Active
                </span>
              </div>

              {/* Supabase Database */}
              <div className="p-3 bg-mid-dark rounded-md border border-border-gray/30 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Database size={16} className="text-emerald-400" />
                  <div>
                    <h5 className="text-xs font-bold text-text-base">Supabase Cloud</h5>
                    <p className="text-[10px] text-text-silver">PostgreSQL + PostGIS RLS</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-spotify-green/10 text-spotify-green border border-spotify-green/20">
                  Connected
                </span>
              </div>
            </div>
          </Card>

          {/* Session / Sign Out Card */}
          {user ? (
            <Card className="border border-border-gray/30">
              <div className="flex items-center space-x-2.5 mb-3 pb-3 border-b border-border-gray/30">
                <LogOut size={18} className="text-red-400" />
                <h3 className="text-sm font-title font-bold text-text-base uppercase tracking-wider">
                  Session
                </h3>
              </div>

              <p className="text-xs text-text-silver mb-4 leading-relaxed">
                Signed in as <span className="text-text-base font-semibold">{user.email}</span>. Signing out clears your local session tokens.
              </p>

              {showSignOutConfirm ? (
                <div className="p-3 bg-mid-dark border border-red-900/40 rounded-md space-y-3">
                  <p className="text-xs text-red-300 font-medium">
                    Are you sure you want to sign out of GeoTwin 360?
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setShowSignOutConfirm(false);
                        await signOut();
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Confirm Sign Out
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSignOutConfirm(false)}
                      className="px-3 py-1.5 bg-dark-card hover:bg-border-gray/40 text-text-silver text-xs rounded font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSignOutConfirm(true)}
                  className="w-full text-red-400 border-red-900/40 hover:border-red-500 hover:text-red-300 flex items-center justify-center space-x-2"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </Button>
              )}
            </Card>
          ) : (
            <Card className="border border-border-gray/30">
              <div className="flex items-center space-x-2.5 mb-3 pb-3 border-b border-border-gray/30">
                <Lock size={18} className="text-spotify-green" />
                <h3 className="text-sm font-title font-bold text-text-base uppercase tracking-wider">
                  Authentication
                </h3>
              </div>
              <p className="text-xs text-text-silver mb-4 leading-relaxed">
                You are currently accessing GeoTwin 360 in guest mode. Sign in to access your saved reports and sync preferences.
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setAuthModalMode('signin');
                  setIsAuthModalOpen(true);
                }}
                className="w-full"
              >
                Sign In / Sign Up
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authModalMode}
        onAuthSuccess={async () => {
          setIsAuthModalOpen(false);
          await refreshProfile();
        }}
      />
    </div>
  );
};

export default SettingsPage;
