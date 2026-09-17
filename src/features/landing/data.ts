/**
 * GeoTwin 360 — Landing Page Content Data
 * Centralized content for the marketing/landing page.
 * All demo values shown on the landing page are illustrative
 * and clearly identified as such on the page itself.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface TrustIndicator {
  icon: string;
  label: string;
  badge?: string;
}

export interface DashboardMetric {
  value: string;
  unit?: string;
  feelsLike?: string;
  label?: string;
  level?: string;
}

export interface CityTelemetry {
  id: string;
  cityName: string;
  country: string;
  coordinates: string;
  satellitePass: string;
  activeSensors: number;
  syncLatency: string;
  metrics: {
    temperature: DashboardMetric;
    humidity: DashboardMetric;
    heatRisk: DashboardMetric;
    aqi: DashboardMetric;
  };
  resilienceScore: number;
  resilienceStatus: string;
  futureProjection: {
    value: string;
    year: string;
    label: string;
  };
  hourlyTrend: Array<{ time: string; temp: number; feelsLike: number; rainProb: number }>;
}

export interface DashboardData {
  location: string;
  coordinates: string;
  date: string;
  metrics: {
    temperature: DashboardMetric;
    humidity: DashboardMetric;
    heatRisk: DashboardMetric;
    aqi: DashboardMetric;
  };
  resilienceScore: number;
  futureProjection: {
    value: string;
    year: string;
    label: string;
  };
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
  tag?: string;
}

export interface Metric {
  icon: string;
  value: string;
  label: string;
  sublabel?: string;
}

export interface HowItWorksStep {
  number: string;
  icon: string;
  title: string;
  description: string;
  detail: string;
}

export interface ScenarioIntervention {
  id: string;
  title: string;
  category: string;
  icon: string;
  investmentCost: string;
  co2Offset: string;
  before: {
    temperature: string;
    heatRisk: string;
    aqi: string;
    floodRisk: string;
    resilience: number;
  };
  after: {
    temperature: string;
    heatRisk: string;
    aqi: string;
    floodRisk: string;
    resilience: number;
  };
  deltas: {
    temp: string;
    heatRisk: string;
    aqi: string;
    flood: string;
    resilience: string;
  };
  impactSummary: string;
}

export interface ScenarioData {
  intervention: string;
  before: {
    temperature: string;
    heatRisk: string;
    aqi: string;
    resilience: number;
  };
  after: {
    temperature: string;
    heatRisk: string;
    aqi: string;
    resilience: number;
  };
}

export interface AIAdvisorPrompt {
  id: string;
  category: string;
  question: string;
  citations: string[];
  confidence: string;
  recommendations: string[];
  projectedPayback: string;
}

export interface AIAdvisorData {
  question: string;
  recommendations: string[];
}

export interface UseCase {
  icon: string;
  title: string;
  description: string;
  badge?: string;
}

export const navLinks: NavLink[] = [
  { label: 'Platform', href: '#platform' },
  { label: 'Twin Lab', href: '#simulation-lab' },
  { label: 'Capabilities', href: '#features' },
  { label: 'Architecture', href: '#how-it-works' },
  { label: 'API', href: '#developer-api' },
];

export const trustIndicators: TrustIndicator[] = [
  { icon: 'Activity', label: 'NASA & Open-Meteo Telemetry', badge: 'REAL SENSORS' },
  { icon: 'Brain', label: 'Deterministic + AI Simulation', badge: 'HYBRID ENGINE' },
  { icon: 'ShieldCheck', label: 'PostGIS Spatial Digital Twin', badge: '100M RESOLUTION' },
  { icon: 'FileText', label: 'Institutional ESG Reports', badge: 'AUDIT READY' },
];

export const cityTelemetries: CityTelemetry[] = [
  {
    id: 'kolkata',
    cityName: 'Kolkata',
    country: 'India',
    coordinates: '22.5726°N, 88.3639°E',
    satellitePass: 'Sentinel-2A • 14m ago',
    activeSensors: 142,
    syncLatency: '42ms',
    metrics: {
      temperature: { value: '32.2', unit: '°C', feelsLike: '34.7°C' },
      humidity: { value: '58', unit: '%' },
      heatRisk: { value: 'High', level: 'high' },
      aqi: { value: '72', label: 'Moderate' },
    },
    resilienceScore: 72,
    resilienceStatus: 'Alert Required',
    futureProjection: {
      value: '+2.4°C',
      year: '2035',
      label: 'Heat Amplification',
    },
    hourlyTrend: [
      { time: '00:00', temp: 26.4, feelsLike: 27.2, rainProb: 10 },
      { time: '04:00', temp: 25.1, feelsLike: 25.8, rainProb: 15 },
      { time: '08:00', temp: 29.3, feelsLike: 31.0, rainProb: 5 },
      { time: '12:00', temp: 33.8, feelsLike: 36.5, rainProb: 20 },
      { time: '16:00', temp: 32.2, feelsLike: 34.7, rainProb: 25 },
      { time: '20:00', temp: 28.6, feelsLike: 30.1, rainProb: 10 },
    ],
  },
  {
    id: 'singapore',
    cityName: 'Singapore',
    country: 'Marina Bay',
    coordinates: '1.2838°N, 103.8591°E',
    satellitePass: 'Landsat-9 • 6m ago',
    activeSensors: 268,
    syncLatency: '28ms',
    metrics: {
      temperature: { value: '29.8', unit: '°C', feelsLike: '33.2°C' },
      humidity: { value: '78', unit: '%' },
      heatRisk: { value: 'Moderate', level: 'moderate' },
      aqi: { value: '41', label: 'Good' },
    },
    resilienceScore: 84,
    resilienceStatus: 'Optimal State',
    futureProjection: {
      value: '+1.6°C',
      year: '2035',
      label: 'Coastal Sea Rise Defended',
    },
    hourlyTrend: [
      { time: '00:00', temp: 27.2, feelsLike: 29.8, rainProb: 30 },
      { time: '04:00', temp: 26.5, feelsLike: 28.5, rainProb: 40 },
      { time: '08:00', temp: 28.4, feelsLike: 31.2, rainProb: 25 },
      { time: '12:00', temp: 31.0, feelsLike: 34.8, rainProb: 45 },
      { time: '16:00', temp: 29.8, feelsLike: 33.2, rainProb: 50 },
      { time: '20:00', temp: 28.0, feelsLike: 30.5, rainProb: 20 },
    ],
  },
  {
    id: 'rotterdam',
    cityName: 'Rotterdam',
    country: 'Netherlands',
    coordinates: '51.9244°N, 4.4777°E',
    satellitePass: 'Copernicus Sentinel-3 • 3m ago',
    activeSensors: 194,
    syncLatency: '35ms',
    metrics: {
      temperature: { value: '19.4', unit: '°C', feelsLike: '18.9°C' },
      humidity: { value: '64', unit: '%' },
      heatRisk: { value: 'Low', level: 'low' },
      aqi: { value: '34', label: 'Good' },
    },
    resilienceScore: 91,
    resilienceStatus: 'Exemplary Resilience',
    futureProjection: {
      value: '+1.2°C',
      year: '2035',
      label: 'Sponge Dike Buffer Secured',
    },
    hourlyTrend: [
      { time: '00:00', temp: 15.2, feelsLike: 14.5, rainProb: 15 },
      { time: '04:00', temp: 14.1, feelsLike: 13.2, rainProb: 20 },
      { time: '08:00', temp: 17.5, feelsLike: 17.0, rainProb: 10 },
      { time: '12:00', temp: 21.3, feelsLike: 20.8, rainProb: 15 },
      { time: '16:00', temp: 19.4, feelsLike: 18.9, rainProb: 25 },
      { time: '20:00', temp: 16.8, feelsLike: 16.2, rainProb: 10 },
    ],
  },
  {
    id: 'tokyo',
    cityName: 'Tokyo',
    country: 'Japan',
    coordinates: '35.6762°N, 139.6503°E',
    satellitePass: 'Himawari-9 • 5m ago',
    activeSensors: 318,
    syncLatency: '24ms',
    metrics: {
      temperature: { value: '24.1', unit: '°C', feelsLike: '25.0°C' },
      humidity: { value: '52', unit: '%' },
      heatRisk: { value: 'Low', level: 'low' },
      aqi: { value: '28', label: 'Good' },
    },
    resilienceScore: 88,
    resilienceStatus: 'Optimal State',
    futureProjection: {
      value: '+1.4°C',
      year: '2035',
      label: 'Seismic & Flood Tier 1',
    },
    hourlyTrend: [
      { time: '00:00', temp: 20.8, feelsLike: 21.2, rainProb: 5 },
      { time: '04:00', temp: 19.5, feelsLike: 19.8, rainProb: 10 },
      { time: '08:00', temp: 22.4, feelsLike: 23.1, rainProb: 5 },
      { time: '12:00', temp: 26.2, feelsLike: 27.5, rainProb: 10 },
      { time: '16:00', temp: 24.1, feelsLike: 25.0, rainProb: 15 },
      { time: '20:00', temp: 22.0, feelsLike: 22.8, rainProb: 5 },
    ],
  },
  {
    id: 'mumbai',
    cityName: 'Mumbai',
    country: 'India',
    coordinates: '19.0760°N, 72.8774°E',
    satellitePass: 'Sentinel-2B • 9m ago',
    activeSensors: 215,
    syncLatency: '38ms',
    metrics: {
      temperature: { value: '31.4', unit: '°C', feelsLike: '35.6°C' },
      humidity: { value: '74', unit: '%' },
      heatRisk: { value: 'High', level: 'high' },
      aqi: { value: '118', label: 'Moderate' },
    },
    resilienceScore: 68,
    resilienceStatus: 'Alert Required',
    futureProjection: {
      value: '+2.1°C',
      year: '2035',
      label: 'Monsoon Surge Buffer',
    },
    hourlyTrend: [
      { time: '00:00', temp: 27.2, feelsLike: 29.5, rainProb: 20 },
      { time: '04:00', temp: 26.0, feelsLike: 28.2, rainProb: 25 },
      { time: '08:00', temp: 29.5, feelsLike: 32.8, rainProb: 15 },
      { time: '12:00', temp: 33.2, feelsLike: 37.4, rainProb: 35 },
      { time: '16:00', temp: 31.4, feelsLike: 35.6, rainProb: 40 },
      { time: '20:00', temp: 28.8, feelsLike: 31.2, rainProb: 20 },
    ],
  },
];

export const dashboardData: DashboardData = {
  location: 'Kolkata, India',
  coordinates: '22.57°N, 88.36°E',
  date: 'Real-time Live Sync',
  metrics: {
    temperature: { value: '32.2', unit: '°C', feelsLike: '34.7°C' },
    humidity: { value: '58', unit: '%' },
    heatRisk: { value: 'High', level: 'high' },
    aqi: { value: '72', label: 'Moderate' },
  },
  resilienceScore: 72,
  futureProjection: {
    value: '+2.4°C',
    year: '2035',
    label: 'Temperature Increase',
  },
};

export const features: Feature[] = [
  {
    icon: 'Activity',
    title: 'Real-Time Climate Telemetry',
    tag: 'SATELLITE & SENSORS',
    description: 'Direct ingestion from Open-Meteo, NASA POWER, and ground sensors with automatic normalization and spatial calibration.',
  },
  {
    icon: 'Map',
    title: 'High-Resolution Risk Twin',
    tag: 'SPATIAL DIGITAL TWIN',
    description: 'Microclimate heat mapping, urban canyon flood propagation, and vegetative canopy indices calculated at 100m raster fidelity.',
  },
  {
    icon: 'Gauge',
    title: 'Deterministic Scenario Engine',
    tag: 'PHYSICS-BASED MODEL',
    description: 'Simulate urban afforestation, reflective cool roofs, and bioswale absorption with deterministic mathematical precision.',
  },
  {
    icon: 'Brain',
    title: 'Institutional AI Advisor',
    tag: 'HYBRID REASONING',
    description: 'Synthesize complex atmospheric models into prioritized capital planning recommendations with structured risk scores.',
  },
  {
    icon: 'FileText',
    title: 'Certified Climate Audit Reports',
    tag: 'ESG & AUDIT COMPLIANCE',
    description: 'Instant generation of publication-ready PDF dossiers with baseline projections, methodology appendices, and ROI matrices.',
  },
];

export const metrics: Metric[] = [
  { icon: 'Building', value: '1,450+', label: 'Digital Twins Monitored', sublabel: 'Global Urban Zones' },
  { icon: 'BarChart3', value: '18,200+', label: 'Scenarios Simulated', sublabel: 'Deterministic Engine' },
  { icon: 'CircleDot', value: '45M+', label: 'Daily Spatial Telemetries', sublabel: 'Satellite + Ground Nodes' },
  { icon: 'Users', value: '8.4M+', label: 'Citizens Protected', sublabel: 'Across 14 Municipalities' },
];

export const howItWorksSteps: HowItWorksStep[] = [
  {
    number: '01',
    icon: 'MapPin',
    title: 'Geospatial Ingestion',
    description: 'Input any coordinate, boundary polygon, or urban district.',
    detail: 'Automated retrieval of historical NASA observations, satellite multispectral bands, and live atmospheric streams.',
  },
  {
    number: '02',
    icon: 'BarChart3',
    title: 'Microclimate Calibration',
    description: 'Surface albedo, elevation topography, and vegetative density mapping.',
    detail: 'Generates a 3D digital surface twin calculating localized heat trap vectors and water flow trajectories.',
  },
  {
    number: '03',
    icon: 'Gauge',
    title: 'Scenario Physics Engine',
    description: 'Deploy real-world physical and infrastructure interventions.',
    detail: 'Models thermodynamic dissipation, evapotranspiration cooling, and hydraulic runoff reduction across multiple years.',
  },
  {
    number: '04',
    icon: 'ShieldCheck',
    title: 'Institutional Action Roadmap',
    description: 'Receive prioritized, auditable resilience investment strategies.',
    detail: 'Empowers city planners and infrastructure leaders with actionable trade-offs, grant justifications, and live dashboards.',
  },
];

export const scenarioInterventions: ScenarioIntervention[] = [
  {
    id: 'urban-trees',
    title: 'Urban Canopy Expansion',
    category: 'Bio-Infrastructure',
    icon: 'TreePine',
    investmentCost: '$1.8M CapEx',
    co2Offset: '-4,200 tons/year',
    before: {
      temperature: '32.6°C',
      heatRisk: 'High (84/100)',
      aqi: '72 (Moderate)',
      floodRisk: '62% Runoff',
      resilience: 72,
    },
    after: {
      temperature: '31.4°C',
      heatRisk: 'Moderate (52/100)',
      aqi: '58 (Good)',
      floodRisk: '46% Runoff',
      resilience: 81,
    },
    deltas: {
      temp: '-1.2°C Surface Temp',
      heatRisk: '-32 Stress Index',
      aqi: '-14 AQI Particulates',
      flood: '-16% Storm Runoff',
      resilience: '+9 Resilience Pts',
    },
    impactSummary: '15,000 native shade trees planted across 8 urban heat pockets with automated drip irrigation.',
  },
  {
    id: 'cool-roofs',
    title: 'High-Albedo Cool Roof Program',
    category: 'Thermodynamics',
    icon: 'Sun',
    investmentCost: '$950K CapEx',
    co2Offset: '-2,800 tons/year',
    before: {
      temperature: '32.6°C',
      heatRisk: 'High (84/100)',
      aqi: '72 (Moderate)',
      floodRisk: '62% Runoff',
      resilience: 72,
    },
    after: {
      temperature: '31.7°C',
      heatRisk: 'Moderate (58/100)',
      aqi: '67 (Moderate)',
      floodRisk: '62% Runoff',
      resilience: 78,
    },
    deltas: {
      temp: '-0.9°C Ambient Temp',
      heatRisk: '-26 Stress Index',
      aqi: '-5 Ozone Formation',
      flood: 'Neutral Impact',
      resilience: '+6 Resilience Pts',
    },
    impactSummary: 'Retrofit 450,000 m² of commercial and public rooftops with 0.85 solar-reflective coatings.',
  },
  {
    id: 'sponge-city',
    title: 'Bioswale & Sponge Retention Network',
    category: 'Hydrology',
    icon: 'Droplets',
    investmentCost: '$3.2M CapEx',
    co2Offset: '-1,900 tons/year',
    before: {
      temperature: '32.6°C',
      heatRisk: 'High (84/100)',
      aqi: '72 (Moderate)',
      floodRisk: '62% Runoff',
      resilience: 72,
    },
    after: {
      temperature: '32.1°C',
      heatRisk: 'Moderate (64/100)',
      aqi: '66 (Moderate)',
      floodRisk: '28% Runoff',
      resilience: 85,
    },
    deltas: {
      temp: '-0.5°C Evap Cooling',
      heatRisk: '-20 Heat Trap',
      aqi: '-6 Airborne Dust',
      flood: '-34% Peak Inundation',
      resilience: '+13 Resilience Pts',
    },
    impactSummary: 'Interconnected subterranean retention cells, bioswales, and permeable paving across arterial routes.',
  },
];

export const scenarioData: ScenarioData = {
  intervention: 'Plant 15,000 Native Canopy Trees',
  before: {
    temperature: '32.6°C',
    heatRisk: 'High',
    aqi: '72',
    resilience: 72,
  },
  after: {
    temperature: '31.4°C',
    heatRisk: 'Moderate',
    aqi: '58',
    resilience: 81,
  },
};

export const aiAdvisorPrompts: AIAdvisorPrompt[] = [
  {
    id: 'heat-mitigation',
    category: 'Urban Heat Island',
    question: 'How should high-density districts prioritize capital to suppress extreme surface temperatures?',
    citations: ['NASA ECOSTRESS Land Surface Temp', 'IPCC AR6 Urban Systems Guidelines', 'Open-Meteo Thermal Reanalysis'],
    confidence: '98.4% Confidence',
    projectedPayback: '3.4 Years (Energy & Health Savings)',
    recommendations: [
      'Prioritize micro-afforestation in street canyons with aspect ratio H/W > 1.5 where solar trapping is highest.',
      'Mandate high-albedo coatings (SRI > 78) on all flat concrete rooftops exceeding 250m².',
      'Deploy active evaporative misting corridors along high-pedestrian transit hubs during peak summer hours.',
      'Rezone industrial perimeter buffers into continuous green canopy air-filtration corridors.',
    ],
  },
  {
    id: 'flood-mitigation',
    category: 'Extreme Hydrology',
    question: 'What is the optimal intervention combination to withstand a 100-year cloudburst storm surge?',
    citations: ['Global Flood Monitoring System', 'Copernicus Elevation Topography DEM', 'Hydro-Quebec Rainfall Models'],
    confidence: '96.8% Confidence',
    projectedPayback: 'Immediate (Avoided Inundation Losses)',
    recommendations: [
      'Construct 4 decentralised subterranean detention vaults in low-lying northern catchments.',
      'Replace impervious asphalt with porous concrete on municipal parking structures and bus terminals.',
      'Enlarge natural bioswales along coastal arterial routes to redirect surge velocity.',
      'Integrate early warning telemetry triggers connected directly to automated stormwater gates.',
    ],
  },
  {
    id: 'clean-air-corridor',
    category: 'Atmospheric Dispersion',
    question: 'Which zoning strategy delivers the fastest particulate reduction along high-emission highway routes?',
    citations: ['WHO 2021 Global Air Quality Guidelines', 'Sentinel-5P TROPOMI Satellite Sensor', 'Local Dispersion CFD'],
    confidence: '97.2% Confidence',
    projectedPayback: '2.1 Years (Public Health Expenditure)',
    recommendations: [
      'Install multi-tiered vegetative barriers with dense coniferous and broadleaf foliage within 30m of highways.',
      'Establish low-emission logistics zones restricting heavy diesel freight during atmospheric inversion windows.',
      'Incorporate dust-binding asphalt sealants across major arterial industrial transit corridors.',
      'Deploy real-time automated microclimate AQI monitors with direct public transit dynamic routing.',
    ],
  },
];

export const aiAdvisorData: AIAdvisorData = {
  question: 'What should Kolkata do to reduce urban heat risk?',
  recommendations: [
    'Increase urban tree coverage by 15% in high-heat zones',
    'Expand green corridors connecting major parks',
    'Introduce cool-roof programs for residential areas',
    'Improve drainage infrastructure in flood-prone districts',
    'Prioritize heat-vulnerable zones for intervention funding',
  ],
};

export const useCases: UseCase[] = [
  { icon: 'Building', title: 'Metropolitan Governments', badge: 'MUNICIPAL', description: 'Model climate adaptation plans, justify resilience bond allocations, and de-risk urban master plans.' },
  { icon: 'Compass', title: 'Urban Planners & Architects', badge: 'MASTER PLANNING', description: 'Evaluate solar insolation, wind tunneling, and stormwater retention before pouring concrete.' },
  { icon: 'LayoutGrid', title: 'Infrastructure Operators', badge: 'ASSET DEFENSE', description: 'Stress-test power grids, transit arteries, and ports against 2035–2050 climate volatility.' },
  { icon: 'Shield', title: 'Insurance & Risk Underwriters', badge: 'ACTUARIAL', description: 'Price climate exposure with hyper-local physical risk telemetry rather than regional approximations.' },
  { icon: 'Leaf', title: 'Corporate ESG Directors', badge: 'SUSTAINABILITY', description: 'Quantify physical footprint resilience, monitor Scope 1/2 cooling overhead, and verify biodiversity goals.' },
  { icon: 'Users', title: 'Civic Resilience Advocates', badge: 'COMMUNITY', description: 'Empower vulnerable districts with transparent, verifiable climate data and targeted mitigation.' },
];
