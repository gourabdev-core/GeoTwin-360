import React, { useEffect, useState } from 'react';
import {
  Award,
  TreePine,
  Droplets,
  Home,
  Sun,
  Flame,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  MapPin,
  Layers,
  Clock,
  Gauge,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { useLocation } from '../../context/LocationContext.js';
import { solutionService } from '../../services/solutionService.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';
import {
  ResilienceSolutionsResponse,
  ResilienceSolutionCategory,
  SolutionPriority,
  ImplementationDifficulty,
  SolutionStatus,
} from '../../types/solution.js';
import { ScenarioType } from '../../types/prediction.js';

const CATEGORIES: (ResilienceSolutionCategory | 'All')[] = [
  'All',
  'Water management',
  'Flood protection',
  'Heat mitigation',
  'Agriculture',
  'Infrastructure',
  'Energy',
  'Emergency preparedness',
];

export const SolutionsPage: React.FC = () => {
  const { selectedLocation, loading: locationLoading } = useLocation();
  const [selectedYear, setSelectedYear] = useState<number>(2035);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('default');
  const [activeCategory, setActiveCategory] = useState<ResilienceSolutionCategory | 'All'>('All');

  const [data, setData] = useState<ResilienceSolutionsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const years = [2030, 2035, 2040, 2050];

  const fetchSolutions = async (withAi: boolean = false) => {
    if (!selectedLocation?.id) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await solutionService.getSolutions(
        selectedLocation.id,
        selectedYear,
        selectedScenario,
        withAi
      );
      setData(response);
    } catch (err: any) {
      console.warn('[SolutionsPage] Failed to fetch resilience solutions:', sanitizeErrorMessage(err));
      setError(sanitizeErrorMessage(err, 'Failed to load resilience recommendations. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalizeWithAi = async () => {
    if (!selectedLocation?.id) return;
    setAiLoading(true);
    setAiNotice(null);
    try {
      const response = await solutionService.personalizeSolutions(
        selectedLocation.id,
        selectedYear,
        selectedScenario
      );
      setData(response);
    } catch (err: any) {
      console.warn('[SolutionsPage] AI personalization notice:', sanitizeErrorMessage(err));
      setAiNotice('AI analysis is temporarily unavailable. Your daily AI quota has been reached. Core GeoTwin features remain available.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    setAiNotice(null);
    if (selectedLocation) {
      fetchSolutions(false);
    } else {
      setData(null);
    }
  }, [selectedLocation, selectedYear, selectedScenario]);

  const getCategoryIcon = (category: ResilienceSolutionCategory) => {
    switch (category) {
      case 'Water management':
        return <Droplets size={18} className="text-blue-400" />;
      case 'Flood protection':
        return <ShieldAlert size={18} className="text-cyan-400" />;
      case 'Heat mitigation':
        return <Flame size={18} className="text-amber-400" />;
      case 'Agriculture':
        return <TreePine size={18} className="text-emerald-400" />;
      case 'Infrastructure':
        return <Home size={18} className="text-indigo-400" />;
      case 'Energy':
        return <Sun size={18} className="text-yellow-400" />;
      case 'Emergency preparedness':
        return <Award size={18} className="text-rose-400" />;
      default:
        return <Layers size={18} className="text-spotify-green" />;
    }
  };

  const getPriorityBadge = (priority: SolutionPriority) => {
    switch (priority) {
      case 'Critical':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
            High Priority
          </span>
        );
      case 'Medium':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
            Medium Priority
          </span>
        );
      case 'Low':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
            Standard
          </span>
        );
    }
  };

  const getDifficultyBadge = (difficulty: ImplementationDifficulty) => {
    switch (difficulty) {
      case 'Low':
        return (
          <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Difficulty: Low
          </span>
        );
      case 'Moderate':
        return (
          <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Difficulty: Moderate
          </span>
        );
      case 'High':
        return (
          <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Difficulty: High
          </span>
        );
      case 'Complex':
        return (
          <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Difficulty: Complex
          </span>
        );
    }
  };

  const getStatusBadge = (status: SolutionStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        );
      case 'Planned':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Planned
          </span>
        );
      case 'Proposed':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Proposed
          </span>
        );
    }
  };

  const filteredSolutions = data
    ? activeCategory === 'All'
      ? data.solutions
      : data.solutions.filter((sol) => sol.category === activeCategory)
    : [];

  return (
    <div className="space-y-6">
      {/* Header with Title & Scenario / Year Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-dark-surface rounded-lg shadow-medium border border-border-gray/30 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
            <Award size={24} />
          </div>
          <div>
            <h2 className="text-lg font-title font-bold text-text-base">Resilience Solutions</h2>
            <p className="text-xs text-text-silver">
              Data-grounded climate adaptation initiatives tailored to local risk profiles
            </p>
          </div>
        </div>

        {selectedLocation && (
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {/* Scenario Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-silver font-bold uppercase tracking-wider hidden sm:inline">
                Scenario:
              </span>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value as ScenarioType)}
                className="bg-mid-dark text-text-base text-xs sm:text-sm px-3 py-1.5 rounded-full outline-none border border-border-gray/40 focus:border-spotify-green cursor-pointer font-sans font-semibold"
              >
                <option value="default">Baseline (SSP2-4.5)</option>
                <option value="resilience">Resilience Plan 2035 (SSP1-2.6)</option>
                <option value="accelerated">Accelerated Emissions (SSP5-8.5)</option>
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1 bg-mid-dark p-1 rounded-full border border-border-gray/40">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all duration-200 ${
                    selectedYear === year
                      ? 'bg-spotify-green text-black'
                      : 'text-text-silver hover:text-text-base'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {locationLoading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-dark-surface rounded-lg shadow-medium border border-border-gray/30">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green"></div>
          <span className="text-sm text-text-silver font-sans">Syncing location context...</span>
        </div>
      ) : !selectedLocation ? (
        <EmptyState
          title="No location selected"
          description="Search and select a city or territory in the header to view tailored resilience solutions."
          icon={<MapPin size={48} className="text-spotify-green" />}
        />
      ) : error ? (
        <div className="p-6 bg-dark-surface rounded-lg border border-red-500/30 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-400">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-base font-title font-bold text-text-base">Unable to Load Solutions</h3>
          <p className="text-xs text-text-silver max-w-md mx-auto">{error}</p>
          <Button
            onClick={() => fetchSolutions(false)}
            className="bg-spotify-green text-black text-xs font-bold px-4 py-2 rounded-full"
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* Location Context & Identified Climate Risks Banner */}
          {data && (
            <div className="bg-mid-dark border border-spotify-green/20 p-4 rounded-lg space-y-3 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-gray/20 pb-3">
                <div>
                  <span className="text-[10px] text-text-silver uppercase tracking-wider font-bold block">
                    Tailored Adaptation Portfolio
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-title font-bold text-text-base">
                      {data.location.name}
                    </span>
                    <span className="text-[11px] text-spotify-green font-mono font-bold">
                      {selectedYear}
                    </span>
                    <span className="text-[10px] text-text-silver font-mono bg-dark-surface px-2 py-0.5 rounded border border-border-gray/30">
                      {data.scenario.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePersonalizeWithAi}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-dark-surface border border-spotify-green/30 text-spotify-green hover:bg-spotify-green hover:text-black transition-all"
                  >
                    {aiLoading ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Synthesizing AI Advisory...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} />
                        <span>{data.aiExplanation ? 'Regenerate AI Advisory' : 'Personalize with AI'}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Identified Stressors Strip */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                <span className="text-text-silver font-semibold">Identified Climate Risks:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    data.risks.heat.level === 'VERY_HIGH' || data.risks.heat.level === 'HIGH'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-dark-surface text-text-silver border border-border-gray/30'
                  }`}
                >
                  Heat: {data.risks.heat.level} ({data.risks.heat.extremeDays ?? 15} ext. days)
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    data.risks.flood.level === 'VERY_HIGH' || data.risks.flood.level === 'HIGH'
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      : 'bg-dark-surface text-text-silver border border-border-gray/30'
                  }`}
                >
                  Flood: {data.risks.flood.level}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    data.risks.drought.level === 'VERY_HIGH' || data.risks.drought.level === 'HIGH'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-dark-surface text-text-silver border border-border-gray/30'
                  }`}
                >
                  Drought: {data.risks.drought.level}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-dark-surface text-text-silver border border-border-gray/30">
                  AQI: {data.risks.airQuality.aqi} ({data.risks.airQuality.level})
                </span>
                <span className="text-text-silver ml-auto text-[10px]">
                  Primary stress driver:{' '}
                  <strong className="text-text-base">{data.risks.composite.primaryDriver}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Non-blocking AI Quota / Notice Banner */}
          {aiNotice && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-bold">Notice: </span>
                {aiNotice}
              </div>
            </div>
          )}

          {/* Optional Gemini AI Personalization Narrative Card */}
          {data?.aiExplanation && (
            <Card className="p-5 bg-gradient-to-r from-mid-dark to-dark-surface border border-spotify-green/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-spotify-green font-bold text-sm">
                  <Sparkles size={16} />
                  <span>AI Strategic Resilience Synthesis</span>
                </div>
                <div className="flex items-center gap-2">
                  {data.aiExplanation.isFallback && (
                    <span className="text-[10px] text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                      Deterministic Mode
                    </span>
                  )}
                  <span className="text-[10px] text-text-silver font-mono bg-dark-surface px-2 py-0.5 rounded border border-border-gray/30">
                    {data.aiExplanation.provenance}
                  </span>
                </div>
              </div>

              {data.aiExplanation.fallbackReason && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2.5 text-[11px] text-amber-300 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold">Notice: </span>
                    {data.aiExplanation.fallbackReason}
                  </div>
                </div>
              )}

              <p className="text-xs text-text-base leading-relaxed font-sans">
                {data.aiExplanation.executiveSummary}
              </p>

              {/* Strategic Roadmap */}
              {data.aiExplanation.strategicRoadmap && data.aiExplanation.strategicRoadmap.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border-gray/20">
                  <span className="text-[10px] text-text-silver font-bold uppercase tracking-wider block">
                    Phased Implementation Sequencing
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {data.aiExplanation.strategicRoadmap.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-dark-surface border border-border-gray/30 text-[11px] text-text-silver space-y-1"
                      >
                        <span className="text-[10px] font-mono text-spotify-green font-bold block">
                          Stage {idx + 1}
                        </span>
                        <p className="leading-snug text-text-base">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Policy Recommendation */}
              {data.aiExplanation.policyRecommendation && (
                <div className="p-3 bg-dark-surface/60 rounded border border-border-gray/30 text-xs text-text-silver space-y-1">
                  <span className="text-[10px] font-bold text-spotify-green uppercase tracking-wider block">
                    Municipal Governance & Bylaw Guidance
                  </span>
                  <p className="leading-relaxed">{data.aiExplanation.policyRecommendation}</p>
                </div>
              )}
            </Card>
          )}

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const count =
                cat === 'All'
                  ? data?.solutions.length ?? 0
                  : data?.solutions.filter((s) => s.category === cat).length ?? 0;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                    activeCategory === cat
                      ? 'bg-spotify-green text-black font-bold shadow-sm'
                      : 'bg-mid-dark text-text-silver hover:text-text-base border border-border-gray/30'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      activeCategory === cat
                        ? 'bg-black/20 text-black'
                        : 'bg-dark-surface text-text-silver'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Solutions Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-5 bg-dark-surface rounded-lg border border-border-gray/30 space-y-4 animate-pulse"
                >
                  <div className="flex justify-between items-start">
                    <div className="h-4 bg-mid-dark rounded w-1/3"></div>
                    <div className="h-4 bg-mid-dark rounded w-16"></div>
                  </div>
                  <div className="h-6 bg-mid-dark rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-mid-dark rounded w-full"></div>
                    <div className="h-3 bg-mid-dark rounded w-5/6"></div>
                  </div>
                  <div className="h-8 bg-mid-dark rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : filteredSolutions.length === 0 ? (
            <div className="p-10 bg-dark-surface rounded-lg border border-border-gray/30 text-center space-y-2">
              <p className="text-sm font-semibold text-text-base">
                No solutions found for category: {activeCategory}
              </p>
              <p className="text-xs text-text-silver">
                Select &apos;All&apos; or another category to view active adaptation recommendations.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredSolutions.map((sol) => (
                <Card
                  key={sol.id}
                  className="flex flex-col justify-between p-5 bg-dark-surface border border-border-gray/40 hover:border-spotify-green/30 transition-all duration-200"
                >
                  <div className="space-y-4">
                    {/* Header: Category Icon, Name & Status/Priority Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-mid-dark rounded-lg border border-border-gray/30">
                          {getCategoryIcon(sol.category)}
                        </div>
                        <div>
                          <span className="text-[10px] text-text-silver font-bold uppercase tracking-wider block">
                            {sol.category}
                          </span>
                          <h3 className="text-sm font-title font-bold text-text-base mt-0.5 leading-snug">
                            {sol.title}
                          </h3>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {getStatusBadge(sol.status)}
                        {getPriorityBadge(sol.priority)}
                      </div>
                    </div>

                    {/* Difficulty & Relevant Risk Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {getDifficultyBadge(sol.implementationDifficulty)}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-mid-dark text-spotify-green border border-border-gray/30">
                        Risk: {sol.relevantRisk}
                      </span>
                      <span className="text-[10px] font-mono text-text-silver ml-auto flex items-center gap-1">
                        <Clock size={10} />
                        {sol.timeHorizon}
                      </span>
                    </div>

                    {/* 1. Problem Addressed */}
                    <div className="p-3 bg-mid-dark/60 rounded border border-border-gray/30 text-xs space-y-1">
                      <span className="text-[10px] font-bold text-text-silver uppercase tracking-wider block">
                        Problem Addressed
                      </span>
                      <p className="text-text-base leading-relaxed font-sans">{sol.problemAddressed}</p>
                    </div>

                    {/* 2. Recommended Action */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-text-silver uppercase tracking-wider block">
                        Recommended Action
                      </span>
                      <p className="text-xs text-text-base leading-relaxed font-sans">
                        {sol.recommendedAction}
                      </p>
                    </div>

                    {/* 3. Expected Benefit */}
                    <div className="p-2.5 bg-emerald-500/5 rounded border border-emerald-500/20 space-y-0.5">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Expected Benefit
                      </span>
                      <p className="text-xs text-emerald-300 font-sans leading-relaxed">
                        {sol.expectedBenefit}
                      </p>
                    </div>
                  </div>

                  {/* Deployment Stage & Progress */}
                  <div className="mt-5 pt-3 border-t border-border-gray/20 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-text-silver font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Gauge size={12} className="text-spotify-green" />
                        Deployment Stage
                      </span>
                      <span>{sol.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-mid-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-spotify-green rounded-full transition-all duration-500"
                        style={{ width: `${sol.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SolutionsPage;
