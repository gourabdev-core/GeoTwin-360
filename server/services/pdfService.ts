import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface PDFReportData {
  locationName: string;
  country: string;
  latitude: number;
  longitude: number;
  reportDate: string;
  targetYear: number;
  currentClimate: {
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
    description: string | null;
    aqi: number | null;
  } | null;
  projections: {
    temperature: number | null;
    precipitation: number | null;
    confidence: number | null;
  } | null;
  risks: {
    heatScore: number | null;
    heatLevel: string;
    floodScore: number | null;
    floodLevel: string;
  };
  simulation: {
    interventions: string[];
    beforeTemp: number | null;
    afterTemp: number | null;
    beforeFlood: string;
    afterFlood: string;
    beforeResilience: number;
    afterResilience: number;
    improvement: number;
  } | null;
  aiAdvisor: {
    summary: string;
    keyProblems: string[];
    recommendations: Array<{
      title: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      reason: string;
      targetRisks: string[];
      expectedImpact: string;
      nextStep: string;
    }>;
  } | null;
}

export class PDFService {
  /**
   * Generates a clean, professional, light-themed PDF report.
   */
  static generateReportPdf(data: PDFReportData, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 54, bottom: 54, left: 54, right: 54 },
          bufferPages: true,
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Define colors
        const primaryColor = '#1DB954'; // Spotify Green
        const darkTextColor = '#1A1A1A';
        const lightTextColor = '#555555';
        const greyBorderColor = '#E0E0E0';
        const lightBgColor = '#F9F9F9';
        const accentRed = '#D32F2F';

        // Helper to format values
        const formatMetric = (val: number | null | undefined, suffix = '') => {
          return val !== null && val !== undefined ? `${val}${suffix}` : 'Unavailable';
        };

        const formatString = (val: string | null | undefined) => {
          return val && val !== 'UNAVAILABLE' ? val : 'Unavailable';
        };

        // Header / Branding band
        doc.rect(54, 54, 504, 80).fill(lightBgColor);
        doc.rect(54, 54, 6, 80).fill(primaryColor);

        doc.fillColor(darkTextColor);
        doc.font('Helvetica-Bold').fontSize(16).text('GEOTWIN 360 CLIMATE INTELLIGENCE', 75, 68);
        doc.font('Helvetica').fontSize(10).fillColor(lightTextColor).text('Climate Risk and Intervention Scenario Analysis Report', 75, 88);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryColor).text(`TARGET YEAR: ${data.targetYear}`, 75, 108);

        // Metadata box on the right of the header
        doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(8);
        doc.text('REPORT DETAILS', 400, 68, { align: 'right', width: 140 });
        doc.font('Helvetica').fontSize(8).fillColor(lightTextColor);
        doc.text(`Location: ${data.locationName}, ${data.country}`, 400, 80, { align: 'right', width: 140 });
        doc.text(`Lat/Lng: ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`, 400, 92, { align: 'right', width: 140 });
        doc.text(`Generated: ${data.reportDate}`, 400, 104, { align: 'right', width: 140 });

        let currentY = 155;

        // SECTION 1: Baseline Climate Context vs Projections
        doc.font('Helvetica-Bold').fontSize(12).fillColor(darkTextColor).text('1. CLIMATE PROFILE', 54, currentY);
        doc.strokeColor(primaryColor).lineWidth(1.5).moveTo(54, currentY + 16).lineTo(558, currentY + 16).stroke();
        currentY += 28;

        // Column 1: Current Weather Context (Observed)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(darkTextColor).text('Current Climate (Observed)', 54, currentY);
        doc.rect(54, currentY + 16, 240, 95).fill(lightBgColor);

        doc.fillColor(darkTextColor).font('Helvetica').fontSize(9);
        let itemY = currentY + 26;
        if (data.currentClimate) {
          doc.text(`Avg Temperature: ${formatMetric(data.currentClimate.temperature, ' °C')}`, 66, itemY);
          itemY += 16;
          doc.text(`Humidity: ${formatMetric(data.currentClimate.humidity, '%')}`, 66, itemY);
          itemY += 16;
          doc.text(`Wind Speed: ${formatMetric(data.currentClimate.windSpeed, ' m/s')}`, 66, itemY);
          itemY += 16;
          doc.text(`Air Quality Index (AQI): ${formatMetric(data.currentClimate.aqi)}`, 66, itemY);
          itemY += 16;
          doc.text(`Conditions: ${formatString(data.currentClimate.description)}`, 66, itemY);
        } else {
          doc.text('Current climate data is unavailable.', 66, itemY + 30);
        }

        // Column 2: Climate Projections
        doc.font('Helvetica-Bold').fontSize(10).fillColor(darkTextColor).text(`Future Projections (${data.targetYear})`, 318, currentY);
        doc.rect(318, currentY + 16, 240, 95).fill(lightBgColor);

        doc.fillColor(darkTextColor).font('Helvetica').fontSize(9);
        itemY = currentY + 26;
        if (data.projections) {
          doc.text(`Projected Temp: ${formatMetric(data.projections.temperature, ' °C')}`, 330, itemY);
          itemY += 16;
          doc.text(`Projected Precipitation: ${formatMetric(data.projections.precipitation, ' mm')}`, 330, itemY);
          itemY += 16;
          doc.text(`Confidence (R-squared): ${data.projections.confidence !== null ? (data.projections.confidence * 100).toFixed(1) + '%' : 'Unavailable'}`, 330, itemY);
          itemY += 16;
          doc.text('Methodology: Linear trend extrapolation', 330, itemY);
        } else {
          doc.text('Future projection data is unavailable.', 330, itemY + 30);
        }

        currentY += 130;

        // SECTION 2: Climate Risk Assessment
        doc.font('Helvetica-Bold').fontSize(12).fillColor(darkTextColor).text('2. BASELINE CLIMATE RISK ASSESSMENT', 54, currentY);
        doc.strokeColor(primaryColor).lineWidth(1.5).moveTo(54, currentY + 16).lineTo(558, currentY + 16).stroke();
        currentY += 28;

        // Table headers
        doc.rect(54, currentY, 504, 18).fill(lightBgColor);
        doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(9);
        doc.text('Risk Category', 66, currentY + 5);
        doc.text('Risk Score', 200, currentY + 5);
        doc.text('Risk Level', 330, currentY + 5);
        doc.text('Status', 450, currentY + 5);

        doc.strokeColor(greyBorderColor).lineWidth(1).moveTo(54, currentY + 18).lineTo(558, currentY + 18).stroke();
        currentY += 18;

        // Heat Risk Row
        doc.font('Helvetica').fontSize(9);
        doc.text('Extreme Heat / Temperature', 66, currentY + 5);
        const heatScoreStr = data.risks.heatScore !== null ? `${(data.risks.heatScore * 100).toFixed(1)}%` : 'Unavailable';
        doc.text(heatScoreStr, 200, currentY + 5);
        
        let heatLvl = formatString(data.risks.heatLevel).toUpperCase();
        doc.fillColor(heatLvl === 'HIGH' || heatLvl === 'CRITICAL' ? accentRed : (heatLvl === 'MEDIUM' ? '#F59E0B' : darkTextColor));
        doc.text(heatLvl, 330, currentY + 5);
        doc.fillColor(darkTextColor);
        doc.text(heatLvl !== 'UNAVAILABLE' ? 'Active' : 'Unavailable', 450, currentY + 5);

        doc.strokeColor(greyBorderColor).lineWidth(0.5).moveTo(54, currentY + 18).lineTo(558, currentY + 18).stroke();
        currentY += 18;

        // Flood Risk Row
        doc.text('Flood Risk / Precipitation', 66, currentY + 5);
        const floodScoreStr = data.risks.floodScore !== null ? `${(data.risks.floodScore * 100).toFixed(1)}%` : 'Unavailable';
        doc.text(floodScoreStr, 200, currentY + 5);

        let floodLvl = formatString(data.risks.floodLevel).toUpperCase();
        doc.fillColor(floodLvl === 'HIGH' || floodLvl === 'CRITICAL' ? accentRed : (floodLvl === 'MEDIUM' ? '#F59E0B' : darkTextColor));
        doc.text(floodLvl, 330, currentY + 5);
        doc.fillColor(darkTextColor);
        doc.text(floodLvl !== 'UNAVAILABLE' ? 'Active' : 'Unavailable', 450, currentY + 5);

        doc.strokeColor(greyBorderColor).lineWidth(1).moveTo(54, currentY + 18).lineTo(558, currentY + 18).stroke();
        currentY += 28;

        // SECTION 3: Scenario Simulator Results
        doc.font('Helvetica-Bold').fontSize(12).fillColor(darkTextColor).text('3. CLIMATE INTERVENTION SIMULATION', 54, currentY);
        doc.strokeColor(primaryColor).lineWidth(1.5).moveTo(54, currentY + 16).lineTo(558, currentY + 16).stroke();
        currentY += 28;

        if (data.simulation && data.simulation.interventions.length > 0) {
          // List of interventions
          doc.font('Helvetica').fontSize(9).fillColor(darkTextColor);
          doc.text(`Simulated Scenario Interventions: ${data.simulation.interventions.join(', ')}`, 54, currentY);
          currentY += 20;

          // Resilience Score Changes Box
          doc.rect(54, currentY, 504, 60).fill(lightBgColor);
          doc.rect(54, currentY, 6, 60).fill(primaryColor);

          doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(9);
          doc.text('RESILIENCE SCORE ANALYSIS', 70, currentY + 10);
          
          doc.font('Helvetica').fontSize(9);
          doc.text(`Baseline Resilience Score: ${data.simulation.beforeResilience} / 100`, 70, currentY + 25);
          doc.text(`Post-Intervention Resilience Score: ${data.simulation.afterResilience} / 100`, 70, currentY + 40);

          const improvement = data.simulation.improvement;
          doc.font('Helvetica-Bold');
          doc.fillColor(improvement >= 0 ? primaryColor : accentRed);
          doc.text(`Net Impact: ${improvement >= 0 ? '+' : ''}${improvement} Resilience Score Change`, 330, currentY + 25);
          doc.fillColor(darkTextColor);

          const tempChange = data.simulation.afterTemp !== null && data.simulation.beforeTemp !== null 
            ? (data.simulation.afterTemp - data.simulation.beforeTemp).toFixed(2) 
            : null;
          if (tempChange !== null) {
            doc.font('Helvetica').fontSize(9).text(`Temperature Impact: ${Number(tempChange) <= 0 ? '' : '+'}${tempChange} °C`, 330, currentY + 40);
          } else {
            doc.font('Helvetica').fontSize(9).text('Temperature Impact: Unavailable', 330, currentY + 40);
          }

          currentY += 75;
        } else {
          doc.font('Helvetica-Bold').fontSize(9).fillColor(accentRed);
          doc.text('No active interventions were simulated for this report.', 54, currentY);
          doc.font('Helvetica').fontSize(9).fillColor(lightTextColor);
          doc.text(`Baseline Overall Resilience Score: ${data.simulation ? data.simulation.beforeResilience : 'Unavailable'} / 100`, 54, currentY + 16);
          currentY += 45;
        }

        // Add page break for Section 4 (AI Advisor Recommendations)
        doc.addPage();
        currentY = 54;

        // Header Band Page 2
        doc.rect(54, currentY, 504, 30).fill(lightBgColor);
        doc.rect(54, currentY, 6, 30).fill(primaryColor);
        doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(10).text('AI ADVISOR RECOMMENDATIONS & RISK SUMMARY', 75, currentY + 10);
        currentY += 45;

        if (data.aiAdvisor) {
          // Summary
          doc.font('Helvetica-Bold').fontSize(10).fillColor(darkTextColor).text('Executive Summary', 54, currentY);
          currentY += 16;
          doc.font('Helvetica').fontSize(9.5).fillColor(lightTextColor).text(data.aiAdvisor.summary, 54, currentY, { width: 504, lineGap: 3 });
          currentY += doc.heightOfString(data.aiAdvisor.summary, { width: 504, lineGap: 3 }) + 20;

          // Key problems
          if (data.aiAdvisor.keyProblems.length > 0) {
            doc.font('Helvetica-Bold').fontSize(10).fillColor(darkTextColor).text('Key Problems Identified', 54, currentY);
            currentY += 16;
            doc.font('Helvetica').fontSize(9).fillColor(darkTextColor);
            for (const prob of data.aiAdvisor.keyProblems) {
              doc.text(`- ${prob}`, 64, currentY, { width: 494 });
              currentY += 14;
            }
            currentY += 10;
          }

          // Recommendations
          doc.font('Helvetica-Bold').fontSize(10).fillColor(darkTextColor).text('Actionable Climate Recommendations', 54, currentY);
          currentY += 16;

          for (const rec of data.aiAdvisor.recommendations) {
            // Check page boundaries
            if (currentY + 110 > 738) {
              doc.addPage();
              currentY = 54;
              doc.rect(54, currentY, 504, 30).fill(lightBgColor);
              doc.rect(54, currentY, 6, 30).fill(primaryColor);
              doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(10).text('AI ADVISOR RECOMMENDATIONS & RISK SUMMARY (CONTINUED)', 75, currentY + 10);
              currentY += 45;
            }

            // Recommendation Card Box
            doc.rect(54, currentY, 504, 90).fill(lightBgColor);
            doc.strokeColor(greyBorderColor).lineWidth(0.5).rect(54, currentY, 504, 90).stroke();

            doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(9.5).text(rec.title, 66, currentY + 10);
            
            // Priority badge
            const badgeX = 460;
            const badgeW = 80;
            doc.rect(badgeX, currentY + 8, badgeW, 14).fill(rec.priority === 'HIGH' ? accentRed : (rec.priority === 'MEDIUM' ? '#F59E0B' : primaryColor));
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8).text(rec.priority, badgeX, currentY + 11, { align: 'center', width: badgeW });

            doc.fillColor(darkTextColor).font('Helvetica').fontSize(8.5);
            doc.text(`Reason: ${rec.reason}`, 66, currentY + 30, { width: 480 });
            doc.text(`Expected Impact: ${rec.expectedImpact}`, 66, currentY + 46, { width: 480 });
            
            doc.font('Helvetica-Bold').fillColor(primaryColor);
            doc.text(`Next Step: ${rec.nextStep}`, 66, currentY + 65, { width: 480 });

            currentY += 102;
          }
        } else {
          doc.font('Helvetica-Bold').fontSize(9).fillColor(accentRed);
          doc.text('AI Advisor recommendations are temporarily unavailable for this report.', 54, currentY);
        }

        // Apply Footers and page numbers to all pages
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc.strokeColor(greyBorderColor).lineWidth(0.5).moveTo(54, 738).lineTo(558, 738).stroke();
          
          doc.fillColor(lightTextColor).font('Helvetica').fontSize(8);
          doc.text('GeoTwin 360 • Climate Digital Twin & Resilience Advisor', 54, 746);
          doc.text(`Page ${i + 1} of ${range.count}`, 500, 746, { align: 'right' });
        }

        doc.end();
        stream.on('finish', () => {
          resolve();
        });
        stream.on('error', (err) => {
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}
