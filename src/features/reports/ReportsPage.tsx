import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Calendar,
  MapPin,
  Loader2,
  ExternalLink,
  Layers,
  LogIn,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { useAuth } from '../../context/AuthContext.js';
import { reportService } from '../../services/reportService.js';
import { DatabaseSavedReport, SavedReportMetadata } from '../../types/database.js';
import { ReportDetailModal } from './ReportDetailModal.js';
import { AuthModal } from '../../components/AuthModal.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';

export const ReportsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState<DatabaseSavedReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [selectedReport, setSelectedReport] = useState<DatabaseSavedReport | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchReports = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getSavedReports();
      setReports(data);
    } catch (err: any) {
      setError(sanitizeErrorMessage(err, 'Failed to retrieve saved reports.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchReports();
    }
  }, [user, authLoading]);

  const handleOpenReport = (report: DatabaseSavedReport) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
  };

  const handleReportUpdated = (updatedReport: DatabaseSavedReport) => {
    setReports((prev) =>
      prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
    );
    setSelectedReport(updatedReport);
  };

  const handleReportDeleted = (deletedReportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== deletedReportId));
    if (selectedReport?.id === deletedReportId) {
      setIsDetailModalOpen(false);
      setSelectedReport(null);
    }
  };

  const handleDownload = async (report: DatabaseSavedReport) => {
    setDownloadingId(report.id);
    setDownloadError(null);
    try {
      const meta: SavedReportMetadata = (report.metadata || {}) as SavedReportMetadata;
      if (report.file_url) {
        const link = document.createElement('a');
        link.href = report.file_url;
        link.setAttribute('download', `${report.title.replace(/\s+/g, '_')}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Generate client-side PDF from saved metadata
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
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-dark-surface rounded-lg shadow-medium gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-lg font-title font-bold text-text-base">Saved Climate Reports</h2>
            <p className="text-xs text-text-silver font-sans">
              Review, inspect, and export your saved climate action intelligence
            </p>
          </div>
        </div>

        {user && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus size={15} />
            <span>New Report</span>
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      {authLoading || loading ? (
        <div className="min-h-[380px] flex flex-col items-center justify-center space-y-3 bg-dark-surface rounded-lg">
          <Loader2 className="animate-spin text-spotify-green" size={32} />
          <span className="text-sm text-text-silver font-sans">Retrieving saved reports...</span>
        </div>
      ) : !user ? (
        /* Unauthenticated User State */
        <Card className="min-h-[380px] flex flex-col items-center justify-center text-center p-8">
          <div className="p-4 bg-mid-dark rounded-full mb-4 text-spotify-green">
            <LogIn size={36} />
          </div>
          <h3 className="text-lg font-title font-bold text-text-base mb-2 font-sans">
            Authentication Required
          </h3>
          <p className="text-sm text-text-silver max-w-md leading-relaxed font-sans mb-6">
            Saved reports are securely tied to your user account via Supabase Row Level Security. Sign in or create an account to view and manage your climate reports.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2"
          >
            <LogIn size={16} />
            <span>Sign In to View Reports</span>
          </Button>
        </Card>
      ) : error ? (
        /* Error State */
        <Card className="min-h-[380px] flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="p-3 bg-red-500/10 text-red-400 rounded-full">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-title font-bold text-text-base">Unable to Load Reports</h4>
            <p className="text-xs text-red-400 font-sans max-w-sm">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchReports}>
            Retry
          </Button>
        </Card>
      ) : reports.length === 0 ? (
        /* Empty State */
        <Card className="min-h-[380px] flex flex-col items-center justify-center text-center p-8">
          <div className="p-4 bg-mid-dark rounded-full mb-4 text-text-silver">
            <FileText size={44} />
          </div>
          <h3 className="text-lg font-title font-bold text-text-base mb-2 font-sans">
            No Saved Reports Yet
          </h3>
          <p className="text-sm text-text-silver max-w-md leading-relaxed font-sans mb-6">
            Generate and save climate risk assessments and scenario simulations on the Dashboard. Your saved reports will appear here for reference and PDF export.
          </p>
          <Button variant="primary" size="md" onClick={() => navigate('/dashboard')}>
            Explore Dashboard
          </Button>
        </Card>
      ) : (
        /* Report Grid */
        <div className="space-y-4">
          {downloadError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between text-xs text-red-400">
              <div className="flex items-center space-x-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{downloadError}</span>
              </div>
              <button
                onClick={() => setDownloadError(null)}
                className="underline text-[11px] hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const meta: SavedReportMetadata = (report.metadata || {}) as SavedReportMetadata;
            const formattedDate = new Date(report.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <Card
                key={report.id}
                className="flex flex-col justify-between p-5 min-h-[260px] hover:border-light-border/70 transition-all duration-200 group"
              >
                <div className="space-y-3.5">
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      onClick={() => handleOpenReport(report)}
                      className="text-sm font-title font-bold text-text-base line-clamp-2 hover:text-spotify-green cursor-pointer transition-colors"
                      title={report.title}
                    >
                      {report.title}
                    </h4>
                    <span className="text-[10px] bg-spotify-green/10 text-spotify-green px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0">
                      {report.status}
                    </span>
                  </div>

                  {/* Context Info */}
                  <div className="space-y-1.5 font-sans text-xs text-text-silver">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-spotify-green flex-shrink-0" />
                      <span className="truncate text-text-base font-medium">
                        {meta.locationName || 'Selected Location'}
                        {meta.country ? `, ${meta.country}` : ''}
                      </span>
                    </div>

                    {meta.coordinates && (
                      <div className="pl-5 text-[11px] text-text-silver/80">
                        {Math.abs(meta.coordinates.latitude).toFixed(4)}° {meta.coordinates.latitude >= 0 ? 'N' : 'S'},{' '}
                        {Math.abs(meta.coordinates.longitude).toFixed(4)}° {meta.coordinates.longitude >= 0 ? 'E' : 'W'}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-spotify-green flex-shrink-0" />
                        <span>Year: <strong className="text-text-base">{meta.targetYear || 2035}</strong></span>
                      </div>

                      {meta.scenario && (
                        <div className="flex items-center gap-1 text-[11px] bg-mid-dark px-2 py-0.5 rounded text-text-silver">
                          <Layers size={12} className="text-spotify-green" />
                          <span className="truncate max-w-[120px]">{meta.scenario}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges Preview */}
                  {(meta.riskResults?.heatRiskLevel || meta.riskResults?.floodRiskLevel) && (
                    <div className="flex items-center gap-2 pt-1">
                      {meta.riskResults.heatRiskLevel && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase">
                          Heat: {meta.riskResults.heatRiskLevel}
                        </span>
                      )}
                      {meta.riskResults.floodRiskLevel && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold uppercase">
                          Flood: {meta.riskResults.floodRiskLevel}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-border-gray/50 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-text-silver font-sans">
                    <span>Saved {formattedDate}</span>
                    <button
                      onClick={() => handleOpenReport(report)}
                      className="text-spotify-green hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink size={12} />
                      <span>Open</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-grow flex items-center justify-center gap-1.5 text-xs"
                      onClick={() => handleOpenReport(report)}
                    >
                      <FileText size={13} />
                      <span>Open Report</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center justify-center px-2.5"
                      onClick={() => handleDownload(report)}
                      disabled={downloadingId === report.id}
                      title="Download PDF"
                      aria-label={`Download PDF for ${report.title}`}
                    >
                      {downloadingId === report.id ? (
                        <Loader2 size={13} className="animate-spin text-spotify-green" />
                      ) : (
                        <Download size={13} />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      <ReportDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        onReportUpdated={handleReportUpdated}
        onReportDeleted={handleReportDeleted}
      />

      {/* Auth Modal for Unauthenticated Users */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode="signin"
      />
    </div>
  );
};

export default ReportsPage;
