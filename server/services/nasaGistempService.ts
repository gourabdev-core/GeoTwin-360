import axios from 'axios';

export type TimelineStatus =
  | 'OBSERVED'
  | 'CURRENT/YTD'
  | 'PROJECTED'
  | 'MODELLED'
  | 'UNAVAILABLE'
  | 'observed'
  | 'year_to_date'
  | 'projected';

export interface ClimateTimelineDataPoint {
  year: number;
  value: number | null;
  status: TimelineStatus;
  source: string;
  methodology?: string;
  baseline: string;
  scenario?: string;
  location?: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  updatedAt: string;
  note?: string;
  projectedValue?: number | null;
}

export interface ClimateTimelineDataset {
  source: string;
  sourceUrl: string;
  baseline: string;
  description: string;
  updatedAt: string;
  disclaimer: string;
  timeline: ClimateTimelineDataPoint[];
}

export class NasaGistempService {
  private static readonly NASA_CSV_URL = 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv';
  private static readonly BASELINE = '1951–1980 NASA Baseline';
  private static readonly SOURCE_NAME = 'NASA GISTEMP v4';
  private static readonly SOURCE_URL = 'https://data.giss.nasa.gov/gistemp/';
  
  private static memoryCache: {
    data: ClimateTimelineDataset;
    timestamp: number;
  } | null = null;
  
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Verified authoritative NASA GISTEMP v4 data snapshot (from NASA GISS LOTI GLB.Ts+dSST.csv).
   * Used when offline or if NASA servers are unreachable.
   */
  private static readonly VERIFIED_SNAPSHOT: ClimateTimelineDataPoint[] = [
    { year: 2015, value: 0.90, status: 'OBSERVED', source: 'NASA GISTEMP v4', methodology: 'Direct Land-Ocean Surface Temperature Observation (NASA GISS L-OTI)', baseline: '1951–1980 NASA Baseline', updatedAt: '2026-01-14T00:00:00.000Z' },
    { year: 2016, value: 1.01, status: 'OBSERVED', source: 'NASA GISTEMP v4', methodology: 'Direct Land-Ocean Surface Temperature Observation (NASA GISS L-OTI)', baseline: '1951–1980 NASA Baseline', updatedAt: '2026-01-14T00:00:00.000Z' },
    { year: 2017, value: 0.92, status: 'OBSERVED', source: 'NASA GISTEMP v4', methodology: 'Direct Land-Ocean Surface Temperature Observation (NASA GISS L-OTI)', baseline: '1951–1980 NASA Baseline', updatedAt: '2026-01-14T00:00:00.000Z' },
    { year: 2018, value: 0.85, status: 'OBSERVED', source: 'NASA GISTEMP v4', methodology: 'Direct Land-Ocean Surface Temperature Observation (NASA GISS L-OTI)', baseline: '1951–1980 NASA Baseline', updatedAt: '2026-01-14T00:00:00.000Z' },
    { year: 2019, value: 0.98, status: 'OBSERVED', source: 'NASA GISTEMP v4', methodology: 'Direct Land-Ocean Surface Temperature Observation (NASA GISS L-OTI)', baseline: '1951–1980 NASA Baseline', updatedAt: '2026-01-14T00:00:00.000Z' },
    { year: 2020, value: 1.01, status: 'OBSERVED', source: 'NASA GISTEMP v4', methodology: 'Direct Land-Ocean Surface Temperature Observation (NASA GISS L-OTI)', baseline: '1951–1980 NASA Baseline', updatedAt: '2026-01-14T00:00:00.000Z' },
    { year: 2021, value: 0.85, status: 'OBSERVED', source: 'NASA GISTEMP v4', methodology: 'Direct Land-Ocean Surface Temperature Observation (NASA GISS L-OTI)', baseline: '1951–1980 NASA Baseline', updatedAt: '2026-01-14T00:00:00.000Z' },
    { year: 2022, value: 0.89, status: 'OBSERVED', source: 'NASA GISTEMP v4', methodology: 'Direct Land-Ocean Surface Temperature Observation (NASA GISS L-OTI)', baseline: '1951–1980 NASA Baseline', updatedAt: '2026-01-14T00:00:00.000Z' },
    { year: 2023, value: 1.17, status: 'OBSERVED', source: 'NASA GISTEMP v4', methodology: 'Direct Land-Ocean Surface Temperature Observation (NASA GISS L-OTI)', baseline: '1951–1980 NASA Baseline', updatedAt: '2026-01-14T00:00:00.000Z' },
    { year: 2024, value: 1.28, status: 'OBSERVED', source: 'NASA GISTEMP v4', methodology: 'Direct Land-Ocean Surface Temperature Observation (NASA GISS L-OTI)', baseline: '1951–1980 NASA Baseline', updatedAt: '2026-01-14T00:00:00.000Z' },
    { year: 2025, value: 1.19, status: 'OBSERVED', source: 'NASA GISTEMP v4', methodology: 'Direct Land-Ocean Surface Temperature Observation (NASA GISS L-OTI)', baseline: '1951–1980 NASA Baseline', updatedAt: '2026-01-14T00:00:00.000Z' },
    { 
      year: 2026, 
      value: 1.19, 
      status: 'CURRENT/YTD', 
      source: 'NASA GISTEMP v4', 
      methodology: 'Incomplete Year-to-Date Observation (Jan–Jul Monthly Mean Anomaly)',
      baseline: '1951–1980 NASA Baseline', 
      updatedAt: '2026-08-15T00:00:00.000Z',
      note: '2026: Year-to-date (Jan–Jul monthly mean); annual value not yet complete'
    },
  ];

  /**
   * Parses raw NASA GISTEMP CSV data and extracts 2015 to current year.
   */
  static parseGistempCsv(csvText: string): ClimateTimelineDataPoint[] {
    const lines = csvText.split(/\r?\n/);
    const startYear = 2015;
    const currentCalendarYear = new Date().getFullYear();
    const records: ClimateTimelineDataPoint[] = [];
    const nowIso = new Date().toISOString();

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('Year') || line.startsWith('Land-Ocean')) {
        continue;
      }

      const cols = line.split(',');
      if (cols.length < 14) continue;

      const year = parseInt(cols[0], 10);
      if (isNaN(year) || year < startYear || year > currentCalendarYear) {
        continue;
      }

      // Column 13 is 'J-D' (January to December annual mean anomaly)
      const jdVal = cols[13]?.trim();
      const isCompleteAnnual = jdVal && jdVal !== '***' && !isNaN(parseFloat(jdVal));

      if (isCompleteAnnual) {
        records.push({
          year,
          value: parseFloat(parseFloat(jdVal).toFixed(2)),
          status: 'OBSERVED',
          source: this.SOURCE_NAME,
          methodology: 'Direct Land-Ocean Surface Temperature Observation (NASA GISS L-OTI)',
          baseline: this.BASELINE,
          updatedAt: nowIso,
        });
      } else {
        // Incomplete year (e.g., 2026) - parse available monthly columns (index 1 to 12)
        const monthlyVals: number[] = [];
        for (let m = 1; m <= 12; m++) {
          const mStr = cols[m]?.trim();
          if (mStr && mStr !== '***') {
            const parsed = parseFloat(mStr);
            if (!isNaN(parsed)) {
              monthlyVals.push(parsed);
            }
          }
        }

        if (monthlyVals.length > 0) {
          const sum = monthlyVals.reduce((a, b) => a + b, 0);
          const ytdMean = parseFloat((sum / monthlyVals.length).toFixed(2));
          records.push({
            year,
            value: ytdMean,
            status: 'CURRENT/YTD',
            source: this.SOURCE_NAME,
            methodology: `Incomplete Year-to-Date Observation (${monthlyVals.length} months mean anomaly)`,
            baseline: this.BASELINE,
            updatedAt: nowIso,
            note: `${year}: Year-to-date (${monthlyVals.length} months); annual value not yet complete`,
          });
        } else {
          records.push({
            year,
            value: null,
            status: 'CURRENT/YTD',
            source: this.SOURCE_NAME,
            methodology: 'Incomplete Year-to-Date Observation',
            baseline: this.BASELINE,
            updatedAt: nowIso,
            note: `${year} annual data is not yet complete.`,
          });
        }
      }
    }

    records.sort((a, b) => a.year - b.year);
    return records;
  }

  /**
   * Fetches live NASA GISTEMP v4 dataset or retrieves from verified cache.
   */
  static async getHistoricalTimeline(): Promise<ClimateTimelineDataset> {
    // Check in-memory cache
    if (this.memoryCache && (Date.now() - this.memoryCache.timestamp < this.CACHE_TTL_MS)) {
      return this.memoryCache.data;
    }

    let points: ClimateTimelineDataPoint[] = [];

    try {
      console.log(`[NasaGistempService] Fetching current NASA GISTEMP v4 dataset from ${this.NASA_CSV_URL}...`);
      const response = await axios.get(this.NASA_CSV_URL, {
        timeout: 6000,
        headers: {
          'User-Agent': 'GeoTwin360-ClimateIntelligence/1.0',
          'Accept': 'text/csv, text/plain, */*',
        },
      });

      if (response.data && typeof response.data === 'string') {
        points = this.parseGistempCsv(response.data);
        console.log(`[NasaGistempService] Successfully parsed ${points.length} timeline points from live NASA dataset.`);
      }
    } catch (err: any) {
      console.warn(`[NasaGistempService] Live NASA GISTEMP fetch failed (${err.message}). Using authoritative verified snapshot.`);
    }

    // Ensure we have valid points covering 2015 to 2026
    if (!points || points.length === 0 || !points.some(p => p.year === 2025)) {
      points = [...this.VERIFIED_SNAPSHOT];
    }

    const dataset: ClimateTimelineDataset = {
      source: this.SOURCE_NAME,
      sourceUrl: this.SOURCE_URL,
      baseline: this.BASELINE,
      description: 'Global Land-Ocean Temperature Index (L-OTI) Surface Temperature Anomaly (°C)',
      updatedAt: new Date().toISOString(),
      disclaimer: 'Authoritative historical observations from NASA GISS GISTEMP v4. 2026 is Year-to-Date and not a completed annual observation.',
      timeline: points,
    };

    this.memoryCache = {
      data: dataset,
      timestamp: Date.now(),
    };

    return dataset;
  }
}
