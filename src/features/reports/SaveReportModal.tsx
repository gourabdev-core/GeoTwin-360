import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  FileText,
  MapPin,
  Calendar,
  Layers,
  Thermometer,
  Wind,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { reportService } from '../../services/reportService.js';
import { Button } from '../../components/ui/Button.js';
import { DatabaseSavedReport, SavedReportMetadata } from '../../types/database.js';
import { AuthModal } from '../../components/AuthModal.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';

interface SaveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (report: DatabaseSavedReport) => void;
  location: {
    id?: string;
    name: string;
    country: string;
    latitude: number;
    longitude: number;
  } | null;
  targetYear: number;
  scenario: string;
  currentClimate?: {
    temperature?: number | null;
    humidity?: number | null;
    windSpeed?: number | null;
    description?: string | null;
  } | null;
  climateMetrics?: {
    temperature?: { value: number; unit: string };
    airQuality?: { aqi: number; category: string };
    waterAvailability?: { value: number | string; stressLevel?: string };
    greenCover?: { value: number; unit: string };
    co2Emissions?: { value: string | number; unit: string };
  } | null;
  riskResults?: {
    heatRiskLevel?: string | null;
    floodRiskLevel?: string | null;
    overallRiskScore?: number | null;
  };
  simulationResult?: {
    simulationId?: string;
    interventions?: string[];
    sustainabilityScore?: {
      before: number;
      after: number;
      improvement: number;
    };
  } | null;
  aiSummary?: string | null;
  recommendations?: Array<{
    title: string;
    priority?: string;
    reason?: string;
    targetRisks?: string[];
    expectedImpact?: string;
    nextStep?: string;
  }>;
  pdfUrl?: string | null;
}

export const SaveReportModal: React.FC<SaveReportModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  location,
  targetYear,
  scenario,
  currentClimate,
  climateMetrics,
  riskResults,
  simulationResult,
  aiSummary,
  recommendations,
  pdfUrl,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<DatabaseSavedReport | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Initialize title whenever opened or location changes
  useEffect(() => {
    if (isOpen && location) {
      setTitle(`Climate Action Report - ${location.name} (${targetYear})`);
      setError(null);
      setSuccessReport(null);
    }
  }, [isOpen, location, targetYear]);

  if (!isOpen || !location) return null;

  const scenarioDisplayName =
    scenario === 'resilience'
      ? 'Resilience Plan 2035'
      : scenario === 'accelerated'
      ? 'Accelerated Emissions'
      : 'Baseline Scenario';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!title.trim()) {
      setError('Please provide a report title.');
      return;
    }

    setSaving(true);
    setError(null);

    const metadata: SavedReportMetadata = {
      locationName: location.name,
      country: location.country,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      targetYear,
      scenario: scenarioDisplayName,
      climateIndicators: {
        temperature:
          climateMetrics?.temperature?.value ?? currentClimate?.temperature ?? null,
        humidity: currentClimate?.humidity ?? null,
        windSpeed: currentClimate?.windSpeed ?? null,
        description: currentClimate?.description ?? null,
        airQualityIndex: climateMetrics?.airQuality?.aqi ?? null,
        airQualityCategory: climateMetrics?.airQuality?.category ?? null,
        waterAvailability:
          typeof climateMetrics?.waterAvailability?.value === 'number'
            ? climateMetrics.waterAvailability.value
            : typeof climateMetrics?.waterAvailability?.value === 'string'
            ? parseFloat(climateMetrics.waterAvailability.value) || null
            : null,
        greenCover: climateMetrics?.greenCover?.value ?? null,
        co2Emissions: climateMetrics?.co2Emissions?.value !== undefined && climateMetrics?.co2Emissions?.value !== null ? String(climateMetrics.co2Emissions.value) : null,
      },
      riskResults: {
        heatRiskLevel: riskResults?.heatRiskLevel ?? null,
        floodRiskLevel: riskResults?.floodRiskLevel ?? null,
        overallRiskScore: riskResults?.overallRiskScore ?? null,
      },
      resilienceRecommendations: recommendations || [
        {
          title: 'Urban Canopy Expansion',
          priority: 'HIGH',
          reason: 'Mitigates urban heat island effect and protects vulnerable populations.',
          expectedImpact: 'Lowers localized surface temperatures by up to 1.5°C.',
        },
        {
          title: 'Stormwater Retention Infrastructure',
          priority: 'MEDIUM',
          reason: 'Improves aquifer absorption capacity during extreme rainfall events.',
          expectedImpact: 'Reduces localized inundation risks by up to 25%.',
        },
      ],
      aiSummary:
        aiSummary ||
        `Climate risk assessment and adaptation scenario report for ${location.name} in target year ${targetYear}.`,
      simulation: simulationResult
        ? {
            sustainabilityScoreBefore: simulationResult.sustainabilityScore?.before,
            sustainabilityScoreAfter: simulationResult.sustainabilityScore?.after,
            sustainabilityScoreImprovement: simulationResult.sustainabilityScore?.improvement,
            interventions: simulationResult.interventions,
          }
        : undefined,
    };

    try {
      const saved = await reportService.saveReport({
        title: title.trim(),
        locationId: location.id || null,
        summary: metadata.aiSummary || null,
        fileUrl: pdfUrl || null,
        metadata,
      });

      setSuccessReport(saved);
      if (onSaved) {
        onSaved(saved);
      }
    } catch (err: any) {
      setError(sanitizeErrorMessage(err, 'Failed to save report. Please check your database connection.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
        <div className="relative w-full max-w-xl bg-dark-surface border border-border-gray rounded-xl shadow-2xl overflow-hidden my-8">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-gray bg-mid-dark/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-title font-bold text-text-base">
                  Save Climate Report
                </h3>
                <p className="text-xs text-text-silver">
                  Store complete climate scenario intelligence to your account
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-text-silver hover:text-text-base hover:bg-mid-dark transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Unauthenticated State Notice */}
            {!user ? (
              <div className="p-4 bg-mid-dark/80 border border-light-border/40 rounded-lg text-center space-y-3">
                <div className="inline-flex p-3 rounded-full bg-spotify-green/10 text-spotify-green mb-1">
                  <LogIn size={24} />
                </div>
                <h4 className="text-sm font-title font-bold text-text-base">
                  Authentication Required
                </h4>
                <p className="text-xs text-text-silver max-w-sm mx-auto leading-relaxed">
                  Saved reports are securely tied to your user profile with Row Level Security. Sign in or create an account to save and manage reports.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <LogIn size={14} />
                    <span>Sign In to Save</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : successReport ? (
              /* Success State */
              <div className="py-6 text-center space-y-4">
                <div className="inline-flex p-3 rounded-full bg-spotify-green/20 text-spotify-green">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-title font-bold text-text-base">
                    Report Saved Successfully
                  </h4>
                  <p className="text-xs text-text-silver max-w-sm mx-auto">
                    Your report <span className="text-text-base font-semibold">"{successReport.title}"</span> has been saved and is available in your Saved Reports library.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate('/reports');
                    }}
                  >
                    View in Saved Reports
                  </Button>
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleSave} className="space-y-4">
                {/* Title Field */}
                <div>
                  <label className="block text-xs font-semibold text-text-base mb-1.5 uppercase tracking-wider font-sans">
                    Report Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Climate Resilience Plan - Kolkata 2035"
                    className="w-full bg-mid-dark border border-border-gray focus:border-spotify-green rounded-md px-3.5 py-2.5 text-sm text-text-base outline-none transition-colors"
                    disabled={saving}
                    required
                  />
                </div>

                {/* Snapshot Context Grid */}
                <div className="bg-mid-dark/50 border border-border-gray rounded-lg p-3.5 space-y-3 font-sans text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-silver block">
                    Report Data Snapshot
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-text-silver">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-spotify-green flex-shrink-0" />
                      <span className="truncate text-text-base font-medium">
                        {location.name}, {location.country}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-spotify-green flex-shrink-0" />
                      <span>Year: <strong className="text-text-base">{targetYear}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 col-span-2">
                      <Layers size={14} className="text-spotify-green flex-shrink-0" />
                      <span className="truncate">
                        Scenario: <strong className="text-text-base">{scenarioDisplayName}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Thermometer size={14} className="text-spotify-green flex-shrink-0" />
                      <span>
                        Heat Risk: <strong className="text-text-base">{riskResults?.heatRiskLevel || 'MODERATE'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ShieldAlert size={14} className="text-spotify-green flex-shrink-0" />
                      <span>
                        Flood Risk: <strong className="text-text-base">{riskResults?.floodRiskLevel || 'LOW'}</strong>
                      </span>
                    </div>

                    {climateMetrics?.airQuality && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Wind size={14} className="text-spotify-green flex-shrink-0" />
                        <span>
                          Air Quality: <strong className="text-text-base">{climateMetrics.airQuality.aqi} AQI ({climateMetrics.airQuality.category})</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {aiSummary && (
                    <div className="pt-2 border-t border-border-gray/50 flex items-start gap-2 text-[11px] text-text-silver leading-relaxed">
                      <Sparkles size={14} className="text-spotify-green flex-shrink-0 mt-0.5" />
                      <p className="line-clamp-2">{aiSummary}</p>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={saving || !title.trim()}
                    className="flex items-center gap-2"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    <span>{saving ? 'Saving...' : 'Save to My Reports'}</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode="signin"
      />
    </>
  );
};
