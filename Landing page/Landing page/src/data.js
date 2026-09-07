/**
 * GeoTwin 360 — Centralized Mock Data
 * All demo content is defined here for easy updates.
 */

export const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Use Cases', href: '#use-cases' },
  { label: 'About Us', href: '#about' },
];

export const trustIndicators = [
  { icon: 'activity', label: 'Real Climate Data' },
  { icon: 'sparkles', label: 'AI Insights' },
  { icon: 'gauge', label: 'Scenario Simulation' },
  { icon: 'fileText', label: 'Actionable Reports' },
];

export const dashboardData = {
  location: 'Kolkata, India',
  date: 'May 24, 2025',
  metrics: {
    temperature: { value: '32.6', unit: '\u00B0C', feelsLike: '36.1\u00B0C' },
    humidity: { value: '68', unit: '%' },
    heatRisk: { value: 'High', level: 'high' },
    aqi: { value: '72', label: 'Moderate' },
  },
  resilienceScore: 72,
  futureProjection: {
    value: '+2.4\u00B0C',
    year: '2035',
    label: 'Temperature Increase',
  },
};

export const features = [
  {
    icon: 'activity',
    title: 'Real-time Climate Intelligence',
    description: 'Live weather, historical data, and future projections from trusted global sources.',
  },
  {
    icon: 'map',
    title: 'Risk Assessment & Mapping',
    description: 'Heat, flood, water stress, air quality, and other climate risks visualized on interactive maps.',
  },
  {
    icon: 'gauge',
    title: 'Scenario Simulation',
    description: 'Test interventions like tree planting, cool roofs, EV adoption, drainage improvements, and more.',
  },
  {
    icon: 'brain',
    title: 'AI Advisor',
    description: 'Get intelligent recommendations powered by AI to support climate decision-making.',
  },
  {
    icon: 'fileText',
    title: 'Reports & Insights',
    description: 'Generate actionable reports with scores, insights, projections, and recommendations.',
  },
];

export const metrics = [
  { icon: 'building', value: '1,200+', label: 'Cities Analyzed' },
  { icon: 'barChart', value: '3,500+', label: 'Scenarios Simulated' },
  { icon: 'circleDot', value: '10M+', label: 'Data Points Processed' },
  { icon: 'users', value: '2.5M+', label: 'Communities Impacted' },
];

export const howItWorksSteps = [
  {
    number: '01',
    icon: 'mapPin',
    title: 'Select Location',
    description: 'Choose any city or area to analyze climate data.',
  },
  {
    number: '02',
    icon: 'barChart',
    title: 'Analyze & Visualize',
    description: 'We collect real data and surface risks and trends.',
  },
  {
    number: '03',
    icon: 'gauge',
    title: 'Simulate & Plan',
    description: 'Test actions and see future impact instantly.',
  },
  {
    number: '04',
    icon: 'shieldCheck',
    title: 'Act & Build Resilience',
    description: 'Make informed decisions for a sustainable future.',
  },
];

export const scenarioData = {
  intervention: 'Plant 10,000 Trees',
  before: {
    temperature: '32.6\u00B0C',
    heatRisk: 'High',
    aqi: '72',
    resilience: 72,
  },
  after: {
    temperature: '31.8\u00B0C',
    heatRisk: 'Moderate',
    aqi: '64',
    resilience: 79,
  },
};

export const aiAdvisorData = {
  question: 'What should Kolkata do to reduce urban heat risk?',
  recommendations: [
    'Increase urban tree coverage by 15% in high-heat zones',
    'Expand green corridors connecting major parks',
    'Introduce cool-roof programs for residential areas',
    'Improve drainage infrastructure in flood-prone districts',
    'Prioritize heat-vulnerable zones for intervention funding',
  ],
};

export const useCases = [
  { icon: 'building', title: 'Smart Cities', description: 'Build climate-responsive urban infrastructure with real-time data and digital twins.' },
  { icon: 'compass', title: 'Urban Planning', description: 'Plan sustainable neighborhoods with climate risk visibility and scenario testing.' },
  { icon: 'layoutGrid', title: 'Infrastructure', description: 'Assess climate vulnerability for roads, bridges, and utilities to build resilience.' },
  { icon: 'shield', title: 'Climate Policy', description: 'Inform policy decisions with AI-driven climate projections and impact analysis.' },
  { icon: 'leaf', title: 'Sustainability Teams', description: 'Track ESG goals and climate KPIs with automated scoring and reporting.' },
  { icon: 'users', title: 'Communities', description: 'Empower local communities with transparent climate data and adaptation plans.' },
];
