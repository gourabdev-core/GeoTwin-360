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
}

export interface DashboardMetric {
  value: string;
  unit?: string;
  feelsLike?: string;
  label?: string;
  level?: string;
}

export interface DashboardData {
  location: string;
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
}

export interface Metric {
  icon: string;
  value: string;
  label: string;
}

export interface HowItWorksStep {
  number: string;
  icon: string;
  title: string;
  description: string;
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

export interface AIAdvisorData {
  question: string;
  recommendations: string[];
}

export interface UseCase {
  icon: string;
  title: string;
  description: string;
}

export const navLinks: NavLink[] = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Use Cases', href: '#use-cases' },
  { label: 'About Us', href: '#about' },
];

export const trustIndicators: TrustIndicator[] = [
  { icon: 'Activity', label: 'Real Climate Data' },
  { icon: 'Sparkles', label: 'AI Insights' },
  { icon: 'Gauge', label: 'Scenario Simulation' },
  { icon: 'FileText', label: 'Actionable Reports' },
];

export const dashboardData: DashboardData = {
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

export const features: Feature[] = [
  {
    icon: 'Activity',
    title: 'Real-time Climate Intelligence',
    description: 'Live weather, historical data, and future projections from trusted global sources.',
  },
  {
    icon: 'Map',
    title: 'Risk Assessment & Mapping',
    description: 'Heat, flood, water stress, air quality, and other climate risks visualized on interactive maps.',
  },
  {
    icon: 'Gauge',
    title: 'Scenario Simulation',
    description: 'Test interventions like tree planting, cool roofs, EV adoption, drainage improvements, and more.',
  },
  {
    icon: 'Brain',
    title: 'AI Advisor',
    description: 'Get intelligent recommendations powered by AI to support climate decision-making.',
  },
  {
    icon: 'FileText',
    title: 'Reports & Insights',
    description: 'Generate actionable reports with scores, insights, projections, and recommendations.',
  },
];

export const metrics: Metric[] = [
  { icon: 'Building', value: '1,200+', label: 'Cities Analyzed' },
  { icon: 'BarChart3', value: '3,500+', label: 'Scenarios Simulated' },
  { icon: 'CircleDot', value: '10M+', label: 'Data Points Processed' },
  { icon: 'Users', value: '2.5M+', label: 'Communities Impacted' },
];

export const howItWorksSteps: HowItWorksStep[] = [
  {
    number: '01',
    icon: 'MapPin',
    title: 'Select Location',
    description: 'Choose any city or area to analyze climate data.',
  },
  {
    number: '02',
    icon: 'BarChart3',
    title: 'Analyze & Visualize',
    description: 'We collect real data and surface risks and trends.',
  },
  {
    number: '03',
    icon: 'Gauge',
    title: 'Simulate & Plan',
    description: 'Test actions and see future impact instantly.',
  },
  {
    number: '04',
    icon: 'ShieldCheck',
    title: 'Act & Build Resilience',
    description: 'Make informed decisions for a sustainable future.',
  },
];

export const scenarioData: ScenarioData = {
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
  { icon: 'Building', title: 'Smart Cities', description: 'Build climate-responsive urban infrastructure with real-time data and digital twins.' },
  { icon: 'Compass', title: 'Urban Planning', description: 'Plan sustainable neighborhoods with climate risk visibility and scenario testing.' },
  { icon: 'LayoutGrid', title: 'Infrastructure', description: 'Assess climate vulnerability for roads, bridges, and utilities to build resilience.' },
  { icon: 'Shield', title: 'Climate Policy', description: 'Inform policy decisions with AI-driven climate projections and impact analysis.' },
  { icon: 'Leaf', title: 'Sustainability Teams', description: 'Track ESG goals and climate KPIs with automated scoring and reporting.' },
  { icon: 'Users', title: 'Communities', description: 'Empower local communities with transparent climate data and adaptation plans.' },
];
