import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  FileText,
  MapPin,
  Calendar,
  Layers,
  Thermometer,
  Droplets,
  Wind,
  Trees,
  CloudRain,
  Sparkles,
  Download,
  Trash2,
  Edit2,
  Check,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { DatabaseSavedReport, SavedReportMetadata } from '../../types/database.js';
import { reportService } from '../../services/reportService.js';
import { Button } from '../../components/ui/Button.js';
import { useLocation } from '../../context/LocationContext.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DatabaseSavedReport | null;
  onReportUpdated?: (updatedReport: DatabaseSavedReport) => void;
  onReportDeleted?: (deletedReportId: string) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  report,
  onReportUpdated,
  onReportDeleted,
}) => {
  const navigate = useNavigate();
  const { selectLocation } = useLocation();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!isOpen || !report) return null;

  const meta: SavedReportMetadata = (report.metadata || {}) as SavedReportMetadata;
  const formattedDate = new Date(report.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleStartRename = () => {
    setEditedTitle(report.title);
    setIsEditingTitle(true);
    setRenameError(null);
  };

  const handleSaveRename = async () => {
    if (!editedTitle.trim() || editedTitle.trim() === report.title) {
      setIsEditingTitle(false);
      return;
    }

    setRenaming(true);
    setRenameError(null);
    try {
      const updated = await reportService.renameSavedReport(report.id, editedTitle.trim());
      setIsEditingTitle(false);
      if (onReportUpdated) {
        onReportUpdated(updated);
      }
    } catch (err: any) {
      setRenameError(sanitizeErrorMessage(err, 'Failed to rename report.'));
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await reportService.deleteSavedReport(report.id);
      if (onReportDeleted) {
        onReportDeleted(report.id);
      }
      onClose();
    } catch (err: any) {
      setDeleteError(sanitizeErrorMessage(err, 'Failed to delete report.'));
      setDeleting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      if (report.file_url) {
        const link = document.createElement('a');
        link.href = report.file_url;
        link.setAttribute('download', `${report.title.replace(/\s+/g, '_')}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Generate client-side PDF on demand from saved metadata
        const res = await reportService.generateReport(
          report.location_id || 'saved-location',
          undefined,
          meta.targetYear || 2035,
          {
            locationName: meta.locationName,
            country: meta.country,
            latitude: meta.coordinates?.latitude,
            longitude: meta.coordinates?.longitude,
            currentTemperature: meta.climateIndicators?.temperature,
            currentHumidity: meta.climateIndicators?.humidity,
            currentWindSpeed: meta.climateIndicators?.windSpeed,
            currentDescription: meta.climateIndicators?.description,
            currentAqi: meta.climateIndicators?.airQualityIndex,
            projectedTemperature: meta.climateIndicators?.temperature,
            heatRiskLevel: meta.riskResults?.heatRiskLevel,
            floodRiskLevel: meta.riskResults?.floodRiskLevel,
            sustainabilityScoreBefore: meta.simulation?.sustainabilityScoreBefore,
            sustainabilityScoreAfter: meta.simulation?.sustainabilityScoreAfter,
            sustainabilityScoreImprovement: meta.simulation?.sustainabilityScoreImprovement,
          }
        );
        const link = document.createElement('a');
        link.href = res.downloadUrl;
        link.setAttribute('download', `${report.title.replace(/\s+/g, '_')}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      setDownloadError(sanitizeErrorMessage(err, 'Failed to download report.'));
    } finally {
      setDownloading(false);
    }
  };

  const handleLoadInDashboard = async () => {
    if (meta.coordinates) {
      await selectLocation({
        name: meta.locationName || 'Saved Location',
        country: meta.country || 'Region',
        latitude: meta.coordinates.latitude,
        longitude: meta.coordinates.longitude,
      });
    }
    onClose();
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-dark-surface border border-border-gray rounded-xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border-gray bg-mid-dark/60 flex-shrink-0">
          <div className="flex items-start space-x-3 flex-grow mr-4">
            <div className="p-2 bg-mid-dark rounded-full text-spotify-green flex-shrink-0 mt-0.5">
              <FileText size={20} />
            </div>
            <div className="flex-grow">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="bg-mid-dark border border-spotify-green rounded px-2 py-1 text-sm text-text-base outline-none w-full font-title font-bold"
                    autoFocus
                    disabled={renaming}
                  />
                  <button
                    onClick={handleSaveRename}
                    disabled={renaming || !editedTitle.trim()}
                    className="p-1 rounded bg-spotify-green text-black hover:bg-spotify-green/90 transition-colors"
                    title="Save title"
                  >
                    {renaming ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    disabled={renaming}
                    className="p-1 rounded bg-mid-dark text-text-silver hover:text-text-base transition-colors"
                    title="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h3 className="text-base font-title font-bold text-text-base leading-snug">
                    {report.title}
                  </h3>
                  <button
                    onClick={handleStartRename}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-silver hover:text-spotify-green"
                    title="Rename report"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
              {renameError && (
                <p className="text-[11px] text-red-400 mt-1">{renameError}</p>
              )}
              <span className="text-xs text-text-silver flex items-center gap-2 mt-1">
                <span>Created {formattedDate}</span>
                <span>•</span>
                <span className="text-spotify-green font-semibold uppercase text-[10px] tracking-wider">
                  {report.status}
                </span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-text-silver hover:text-text-base hover:bg-mid-dark transition-colors flex-shrink-0"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-grow font-sans text-xs">
          {/* Location & Context Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-mid-dark/50 border border-border-gray rounded-lg">
            <div className="space-y-0.5">
              <span className="text-text-silver text-[11px] flex items-center gap-1">
                <MapPin size={12} className="text-spotify-green" /> Location
              </span>
              <p className="text-text-base font-medium truncate">
                {meta.locationName || 'Unknown'}, {meta.country || ''}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-text-silver text-[11px]">Coordinates</span>
              <p className="text-text-base font-medium">
                {meta.coordinates
                  ? `${Math.abs(meta.coordinates.latitude).toFixed(4)}° ${meta.coordinates.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(meta.coordinates.longitude).toFixed(4)}° ${meta.coordinates.longitude >= 0 ? 'E' : 'W'}`
                  : 'Unavailable'}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-text-silver text-[11px] flex items-center gap-1">
                <Calendar size={12} className="text-spotify-green" /> Target Year
              </span>
              <p className="text-text-base font-medium">{meta.targetYear || 2035}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-text-silver text-[11px] flex items-center gap-1">
                <Layers size={12} className="text-spotify-green" /> Scenario
              </span>
              <p className="text-text-base font-medium truncate">
                {meta.scenario || 'Baseline'}
              </p>
            </div>
          </div>

          {/* Climate Indicators Breakdown */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-silver">
              Climate Indicators
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-mid-dark/40 border border-border-gray/70 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-text-silver">
                  <span>Temperature</span>
                  <Thermometer size={14} className="text-amber-400" />
                </div>
                <p className="text-sm font-bold text-text-base">
                  {meta.climateIndicators?.temperature !== undefined && meta.climateIndicators?.temperature !== null
                    ? `${meta.climateIndicators.temperature}°C`
                    : 'Unavailable'}
                </p>
                <span className="text-[10px] text-text-silver">
                  {meta.climateIndicators?.description || 'Observed ambient'}
                </span>
              </div>

              <div className="p-3 bg-mid-dark/40 border border-border-gray/70 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-text-silver">
                  <span>Air Quality</span>
                  <Wind size={14} className="text-blue-400" />
                </div>
                <p className="text-sm font-bold text-text-base">
                  {meta.climateIndicators?.airQualityIndex !== undefined && meta.climateIndicators?.airQualityIndex !== null
                    ? `${meta.climateIndicators.airQualityIndex} AQI`
                    : 'Unavailable'}
                </p>
                <span className="text-[10px] text-text-silver">
                  {meta.climateIndicators?.airQualityCategory || 'Monitored'}
                </span>
              </div>

              <div className="p-3 bg-mid-dark/40 border border-border-gray/70 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-text-silver">
                  <span>Water Stress</span>
                  <Droplets size={14} className="text-cyan-400" />
                </div>
                <p className="text-sm font-bold text-text-base">
                  {meta.climateIndicators?.waterAvailability !== undefined && meta.climateIndicators?.waterAvailability !== null
                    ? `${meta.climateIndicators.waterAvailability}%`
                    : 'Low Stress'}
                </p>
                <span className="text-[10px] text-text-silver">Availability Index</span>
              </div>

              <div className="p-3 bg-mid-dark/40 border border-border-gray/70 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-text-silver">
                  <span>Green Cover</span>
                  <Trees size={14} className="text-spotify-green" />
                </div>
                <p className="text-sm font-bold text-text-base">
                  {meta.climateIndicators?.greenCover !== undefined && meta.climateIndicators?.greenCover !== null
                    ? `${meta.climateIndicators.greenCover}%`
                    : 'Monitored'}
                </p>
                <span className="text-[10px] text-text-silver">Canopy density</span>
              </div>

              <div className="p-3 bg-mid-dark/40 border border-border-gray/70 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-text-silver">
                  <span>Heat Risk</span>
                  <Thermometer size={14} className="text-rose-400" />
                </div>
                <p className="text-sm font-bold text-rose-400">
                  {meta.riskResults?.heatRiskLevel || 'MODERATE'}
                </p>
                <span className="text-[10px] text-text-silver">Severity Rating</span>
              </div>

              <div className="p-3 bg-mid-dark/40 border border-border-gray/70 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-text-silver">
                  <span>Flood Risk</span>
                  <CloudRain size={14} className="text-sky-400" />
                </div>
                <p className="text-sm font-bold text-sky-400">
                  {meta.riskResults?.floodRiskLevel || 'LOW'}
                </p>
                <span className="text-[10px] text-text-silver">Inundation Rating</span>
              </div>
            </div>
          </div>

          {/* AI Advisor Climate Summary */}
          {(report.summary || meta.aiSummary) && (
            <div className="p-4 bg-mid-dark/60 border border-border-gray rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-spotify-green font-bold text-xs">
                <Sparkles size={16} />
                <span>AI Climate Intelligence Summary</span>
              </div>
              <p className="text-xs text-text-silver leading-relaxed">
                {report.summary || meta.aiSummary}
              </p>
            </div>
          )}

          {/* Resilience Recommendations */}
          {meta.resilienceRecommendations && meta.resilienceRecommendations.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-silver">
                Recommended Resilience Interventions
              </h4>
              <div className="space-y-2">
                {meta.resilienceRecommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="p-3 bg-mid-dark/40 border border-border-gray/60 rounded-lg space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-text-base text-xs">{rec.title}</span>
                      {rec.priority && (
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            rec.priority === 'HIGH'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {rec.priority} Priority
                        </span>
                      )}
                    </div>
                    {rec.reason && (
                      <p className="text-[11px] text-text-silver leading-relaxed">{rec.reason}</p>
                    )}
                    {rec.expectedImpact && (
                      <div className="text-[10px] text-spotify-green font-medium">
                        Expected Impact: {rec.expectedImpact}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete Confirmation Alert */}
          {isConfirmingDelete && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <AlertTriangle size={16} />
                <span>Delete this report permanently?</span>
              </div>
              <p className="text-xs text-text-silver">
                This action cannot be undone. This report will be removed from your Supabase saved reports database.
              </p>
              {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting && <Loader2 size={14} className="animate-spin mr-1" />}
                  <span>{deleting ? 'Deleting...' : 'Yes, Delete'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {downloadError && (
            <div className="mt-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between text-xs text-red-400">
              <div className="flex items-center space-x-1.5">
                <AlertTriangle size={13} className="shrink-0" />
                <span>{downloadError}</span>
              </div>
              <button
                onClick={() => setDownloadError(null)}
                className="underline text-[10px] hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-gray bg-mid-dark/60 flex-shrink-0">
          <div>
            {!isConfirmingDelete && (
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete Report</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadInDashboard}
              className="flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <ExternalLink size={14} />
              <span>Load in Dashboard</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-1.5 text-xs cursor-pointer"
            >
              {downloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span>{downloading ? 'Compiling PDF...' : 'Download PDF'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
