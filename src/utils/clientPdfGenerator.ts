import { jsPDF } from 'jspdf';

export interface ClientReportData {
  locationName: string;
  country: string;
  latitude: number;
  longitude: number;
  targetYear: number;
  reportDate: string;
  currentTemperature?: number | null;
  currentHumidity?: number | null;
  currentWindSpeed?: number | null;
  currentDescription?: string | null;
  currentAqi?: number | null;
  projectedTemperature?: number | null;
  projectedPrecipitation?: number | null;
  heatRiskLevel?: string | null;
  floodRiskLevel?: string | null;
  sustainabilityScoreBefore?: number | null;
  sustainabilityScoreAfter?: number | null;
  sustainabilityScoreImprovement?: number | null;
  interventions?: string[];
}

export function generateClientPdfBlob(data: ClientReportData): Blob {
  const doc = new jsPDF();
  const primaryColor = [29, 185, 84]; // #1DB954
  const darkTextColor = [26, 26, 26];
  const lightTextColor = [85, 85, 85];
  const lightBgColor = [249, 249, 249];

  // Header Box
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.rect(14, 14, 182, 30, 'F');
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(14, 14, 4, 30, 'F');

  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('GEOTWIN 360 CLIMATE INTELLIGENCE', 22, 25);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('Climate Risk and Intervention Scenario Analysis Report', 22, 32);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`TARGET YEAR: ${data.targetYear}`, 22, 39);

  // Metadata right align
  doc.setFontSize(8);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(`Location: ${data.locationName}, ${data.country}`, 190, 24, { align: 'right' });
  doc.text(`Lat/Lng: ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`, 190, 30, { align: 'right' });
  doc.text(`Generated: ${data.reportDate}`, 190, 36, { align: 'right' });

  let y = 55;

  // Section 1: Climate Profile
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('1. CLIMATE PROFILE', 14, y);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, 196, y + 2);
  y += 10;

  // Current Climate & Projections
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');
  doc.text('Current Observed Climate', 14, y);
  doc.text(`Future Projections (${data.targetYear})`, 110, y);
  y += 6;

  doc.setFont('Helvetica', 'normal');
  const tempStr = data.currentTemperature !== null && data.currentTemperature !== undefined ? `${data.currentTemperature} °C` : 'Unavailable';
  const humStr = data.currentHumidity !== null && data.currentHumidity !== undefined ? `${data.currentHumidity}%` : 'Unavailable';
  const windStr = data.currentWindSpeed !== null && data.currentWindSpeed !== undefined ? `${data.currentWindSpeed} m/s` : 'Unavailable';
  const aqiStr = data.currentAqi !== null && data.currentAqi !== undefined ? `${data.currentAqi}` : 'Unavailable';

  doc.text(`Temperature: ${tempStr}`, 14, y);
  const projTempStr = data.projectedTemperature !== null && data.projectedTemperature !== undefined ? `${data.projectedTemperature} °C` : 'Unavailable';
  doc.text(`Projected Temp: ${projTempStr}`, 110, y);
  y += 5;

  doc.text(`Humidity: ${humStr}`, 14, y);
  const projPrecipStr = data.projectedPrecipitation !== null && data.projectedPrecipitation !== undefined ? `${data.projectedPrecipitation} mm` : 'Unavailable';
  doc.text(`Projected Precip: ${projPrecipStr}`, 110, y);
  y += 5;

  doc.text(`Wind Speed: ${windStr}`, 14, y);
  doc.text(`Methodology: Linear trend extrapolation`, 110, y);
  y += 5;

  doc.text(`Air Quality Index: ${aqiStr}`, 14, y);
  y += 12;

  // Section 2: Risks
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. BASELINE CLIMATE RISKS', 14, y);
  doc.line(14, y + 2, 196, y + 2);
  y += 10;

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Extreme Heat Risk Level: ${data.heatRiskLevel || 'Unavailable'}`, 14, y);
  y += 5;
  doc.text(`Flood Risk Level: ${data.floodRiskLevel || 'Unavailable'}`, 14, y);
  y += 12;

  // Section 3: Scenario Simulation
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. SCENARIO SIMULATION & RESILIENCE SCORE', 14, y);
  doc.line(14, y + 2, 196, y + 2);
  y += 10;

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  if (data.sustainabilityScoreBefore !== null && data.sustainabilityScoreBefore !== undefined) {
    doc.text(`Baseline Resilience Score: ${data.sustainabilityScoreBefore} / 100`, 14, y);
    y += 5;
    doc.text(`Post-Intervention Resilience Score: ${data.sustainabilityScoreAfter ?? data.sustainabilityScoreBefore} / 100`, 14, y);
    y += 5;
    const imp = data.sustainabilityScoreImprovement ?? 0;
    doc.text(`Net Improvement: ${imp >= 0 ? '+' : ''}${imp} Resilience Score Change`, 14, y);
    y += 12;
  } else {
    doc.text('No intervention scenario simulated for this report.', 14, y);
    y += 12;
  }

  // Section 4: Advisor Recommendations
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. CLIMATE ACTION RECOMMENDATIONS', 14, y);
  doc.line(14, y + 2, 196, y + 2);
  y += 10;

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');
  doc.text('1. Urban Heat Canopy Expansion (High Priority)', 14, y);
  y += 5;
  doc.setFont('Helvetica', 'normal');
  doc.text(`Expand green cover and reflective roofs in ${data.locationName} to mitigate heat stress.`, 14, y);
  y += 8;

  doc.setFont('Helvetica', 'bold');
  doc.text('2. Rainwater Harvesting & Sustainable Drainage (Medium Priority)', 14, y);
  y += 5;
  doc.setFont('Helvetica', 'normal');
  doc.text(`Enhance surface runoff retention and aquifer recharge infrastructure for ${data.targetYear}.`, 14, y);
  y += 15;

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('GeoTwin 360 Climate Intelligence Platform • Page 1 of 1', 14, 280);

  return doc.output('blob');
}
