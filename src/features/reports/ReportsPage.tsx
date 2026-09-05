import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, MapPin, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { reportService, ReportRecord } from '../../services/reportService.js';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getReports();
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve saved reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownload = (downloadUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center space-x-3 p-4 bg-dark-surface rounded-lg shadow-medium">
        <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
          <FileText size={24} />
        </div>
        <div>
          <h2 className="text-lg font-title font-bold text-text-base">Saved Climate Reports</h2>
          <p className="text-xs text-text-silver font-sans">Review and download generated climate action summaries</p>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center space-y-3 bg-dark-surface rounded-lg">
          <Loader2 className="animate-spin text-spotify-green" size={32} />
          <span className="text-sm text-text-silver font-sans">Retrieving saved reports...</span>
        </div>
      ) : error ? (
        <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-6">
          <p className="text-sm text-red-500 mb-4 font-semibold">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchReports}>
            Retry
          </Button>
        </Card>
      ) : reports.length === 0 ? (
        <Card className="min-h-[400px] flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-mid-dark rounded-full mb-4">
            <FileText size={48} className="text-text-silver" />
          </div>
          <h3 className="text-lg font-title font-bold text-text-base mb-2 font-sans">No Reports Generated Yet</h3>
          <p className="text-sm text-text-silver max-w-sm leading-relaxed font-sans mb-4">
            Reports generated on the dashboard will appear here for reference and immediate PDF download.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const formattedDate = new Date(report.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card key={report.id} className="flex flex-col justify-between p-5 min-h-[220px]">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-title font-bold text-text-base line-clamp-2">
                      {report.title}
                    </h4>
                    <span className="text-[10px] bg-spotify-green/10 text-spotify-green px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {report.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 font-sans text-xs text-text-silver">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-spotify-green" />
                      <span className="truncate">
                        {report.locations?.name || 'Unknown Location'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-spotify-green" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 flex items-center justify-center gap-2"
                  onClick={() => handleDownload(report.file_url, report.title)}
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
