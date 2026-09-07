import './app.css';
import { icon } from './icons.js';
import {
  navLinks,
  trustIndicators,
  dashboardData,
  features,
  metrics,
  howItWorksSteps,
  scenarioData,
  aiAdvisorData,
  useCases,
} from './data.js';

/* ──────────────────────────────────────────
   Section Renderers
   ────────────────────────────────────────── */

function renderNavbar() {
  return `
  <nav id="navbar" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300" role="navigation" aria-label="Main navigation">
    <div class="container-main flex items-center justify-between h-16 lg:h-18">
      <!-- Logo -->
      <a href="#home" class="flex items-center gap-2 shrink-0" aria-label="GeoTwin 360 Home">
        <img src="/apple-touch-icon.png" alt="GeoTwin 360 Logo" class="w-9 h-9 rounded-full object-cover" />
        <span class="flex flex-col leading-tight">
          <span class="text-sm font-bold tracking-wide text-text-primary uppercase">GeoTwin 360</span>
          <span class="text-[10px] text-text-secondary hidden sm:block">Climate Intelligence for a Resilient Future</span>
        </span>
      </a>

      <!-- Desktop Nav -->
      <div class="hidden lg:flex items-center gap-8">
        ${navLinks.map(link => `
          <a href="${link.href}" class="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">${link.label}</a>
        `).join('')}
      </div>

      <!-- CTA + Mobile Toggle -->
      <div class="flex items-center gap-3">
        <a href="#" class="btn-primary hidden sm:inline-flex text-xs px-5 py-2.5">
          EXPLORE DASHBOARD ${icon('arrowRight', 14)}
        </a>
        <button id="mobile-menu-btn" class="lg:hidden p-2 text-text-secondary hover:text-text-primary transition-colors" aria-label="Toggle navigation menu" aria-expanded="false">
          ${icon('menu', 24)}
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div id="mobile-menu" class="hidden lg:hidden bg-surface/95 backdrop-blur-xl border-t border-separator">
      <div class="container-main py-4 flex flex-col gap-3">
        ${navLinks.map(link => `
          <a href="${link.href}" class="text-sm font-medium text-text-secondary hover:text-text-primary py-2 transition-colors">${link.label}</a>
        `).join('')}
        <a href="#" class="btn-primary text-xs px-5 py-2.5 w-fit mt-2">
          EXPLORE DASHBOARD ${icon('arrowRight', 14)}
        </a>
      </div>
    </div>
  </nav>`;
}

function renderHero() {
  const d = dashboardData;
  return `
  <section id="home" class="relative min-h-screen flex items-center overflow-hidden pt-16">
    <!-- Background -->
    <div class="absolute inset-0">
      <img src="/hero-bg.jpg" alt="" class="w-full h-full object-cover" width="1920" height="1080" fetchpriority="high" />
      <div class="absolute inset-0 bg-gradient-to-r from-base/95 via-base/85 to-base/60"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-base via-transparent to-transparent"></div>
    </div>

    <div class="container-main relative z-10 py-16 lg:py-24">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <!-- Left: Content -->
        <div class="animate-fade-in-up">
          <!-- Eyebrow -->
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
            <span class="w-2 h-2 rounded-full bg-accent"></span>
            <span class="text-xs font-bold tracking-widest text-accent uppercase">AI-Powered Climate Digital Twin</span>
          </div>

          <!-- Headline -->
          <h1 class="text-4xl sm:text-5xl lg:text-[56px] font-extrabold leading-[1.08] tracking-tight mb-6">
            Understand Climate.<br />
            Simulate Impact.<br />
            <span class="text-accent">Build a Resilient Future.</span>
          </h1>

          <!-- Description -->
          <p class="text-base lg:text-lg text-text-secondary max-w-xl mb-8 leading-relaxed">
            GeoTwin 360 is an AI-powered climate digital twin that helps cities and communities visualize climate risks, simulate interventions, and make data-driven decisions for a more resilient future.
          </p>

          <!-- CTAs -->
          <div class="flex flex-wrap items-center gap-4 mb-10">
            <a href="#" class="btn-primary text-sm px-7 py-3.5">
              Explore Dashboard ${icon('arrowRight', 16)}
            </a>
            <a href="#features" class="btn-secondary text-sm px-7 py-3.5">
              Learn More ${icon('chevronRight', 16)}
            </a>
          </div>

          <!-- Trust Indicators -->
          <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
            ${trustIndicators.map(t => `
              <div class="flex items-center gap-2 text-text-secondary">
                <span class="text-accent">${icon(t.icon, 16)}</span>
                <span class="text-xs font-medium">${t.label}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right: Dashboard Preview -->
        <div class="animate-slide-in-right" style="animation-delay: 0.3s;">
          <div class="bg-surface/80 backdrop-blur-sm rounded-xl border border-white/5 shadow-heavy overflow-hidden">
            <!-- Dashboard Header -->
            <div class="flex items-center justify-between px-5 py-3 border-b border-white/5">
              <div class="flex items-center gap-2">
                <img src="/apple-touch-icon.png" alt="GeoTwin 360 Logo" class="w-4 h-4 rounded-full object-cover" />
                <span class="text-sm font-bold">GeoTwin 360</span>
              </div>
              <div class="flex items-center gap-4 text-xs text-text-secondary">
                <span class="flex items-center gap-1">${icon('mapPin', 12)} ${d.location}</span>
                <span class="hidden sm:flex items-center gap-1">${icon('calendar', 12)} ${d.date}</span>
              </div>
            </div>

            <!-- Metrics Row -->
            <div class="grid grid-cols-4 gap-px bg-white/5">
              <!-- Temperature -->
              <div class="bg-surface/90 p-3 text-center">
                <div class="text-[10px] text-text-secondary mb-1">Current Temperature</div>
                <div class="flex items-baseline justify-center gap-0.5">
                  <span class="text-xl font-bold">${d.metrics.temperature.value}</span>
                  <span class="text-xs text-text-secondary">${d.metrics.temperature.unit}</span>
                </div>
                <div class="text-[10px] text-text-muted mt-1">Feels like ${d.metrics.temperature.feelsLike}</div>
              </div>
              <!-- Humidity -->
              <div class="bg-surface/90 p-3 text-center">
                <div class="text-[10px] text-text-secondary mb-1">Humidity</div>
                <div class="flex items-baseline justify-center gap-0.5">
                  <span class="text-xl font-bold">${d.metrics.humidity.value}</span>
                  <span class="text-xs text-text-secondary">${d.metrics.humidity.unit}</span>
                </div>
              </div>
              <!-- Heat Risk -->
              <div class="bg-surface/90 p-3 text-center">
                <div class="text-[10px] text-text-secondary mb-1">Heat Risk</div>
                <div class="text-xl font-bold text-negative">${d.metrics.heatRisk.value}</div>
                <div class="text-[10px] text-text-muted mt-1">Risk Level</div>
              </div>
              <!-- AQI -->
              <div class="bg-surface/90 p-3 text-center">
                <div class="text-[10px] text-text-secondary mb-1">Air Quality Index</div>
                <div class="text-xl font-bold text-info">${d.metrics.aqi.value}</div>
                <div class="text-[10px] text-text-muted mt-1">${d.metrics.aqi.label}</div>
              </div>
            </div>

            <!-- Bottom Row: Map + Resilience + Projection -->
            <div class="grid grid-cols-5 gap-px bg-white/5">
              <!-- Climate Risk Map (3 cols) -->
              <div class="col-span-3 bg-surface/90 p-4">
                <div class="text-xs font-semibold mb-2 text-text-secondary">Climate Risk Map</div>
                <div class="relative rounded-lg overflow-hidden bg-base h-32">
                  ${renderMiniMap()}
                </div>
              </div>

              <!-- Right Panel: Score + Projection (2 cols) -->
              <div class="col-span-2 flex flex-col gap-px bg-white/5">
                <!-- Resilience Score -->
                <div class="bg-surface/90 p-4 flex-1 flex flex-col items-center justify-center">
                  <div class="text-xs font-semibold mb-2 text-text-secondary">Resilience Score</div>
                  <div class="relative w-16 h-16">
                    <svg class="w-16 h-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                      <circle cx="32" cy="32" r="28" stroke="#333" stroke-width="4" fill="none" />
                      <circle cx="32" cy="32" r="28" stroke="#1ed760" stroke-width="4" fill="none"
                        stroke-dasharray="${2 * Math.PI * 28}"
                        stroke-dashoffset="${2 * Math.PI * 28 * (1 - d.resilienceScore / 100)}"
                        stroke-linecap="round" />
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <span class="text-sm font-bold">${d.resilienceScore}</span>
                      <span class="text-[8px] text-text-secondary">/100</span>
                    </div>
                  </div>
                  <div class="text-[10px] text-accent mt-1.5 font-medium">Good</div>
                </div>
                <!-- Future Projection -->
                <div class="bg-surface/90 p-4 flex-1 flex flex-col items-center justify-center">
                  <div class="text-[10px] text-text-secondary mb-1">${d.futureProjection.year} Projection</div>
                  <div class="text-xl font-bold text-warning">${d.futureProjection.value}</div>
                  <div class="text-[10px] text-text-muted mt-1">${d.futureProjection.label}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function renderMiniMap() {
  // CSS-based stylized climate risk heat map
  return `
    <div class="w-full h-full relative" aria-label="Stylized climate risk heat map">
      <!-- Grid pattern overlay -->
      <div class="absolute inset-0" style="
        background:
          linear-gradient(90deg, rgba(30,215,96,0.08) 1px, transparent 1px),
          linear-gradient(rgba(30,215,96,0.08) 1px, transparent 1px);
        background-size: 20px 20px;
      "></div>
      <!-- Heat zones -->
      <div class="absolute rounded-full opacity-60" style="width:60px;height:50px;left:15%;top:20%;background:radial-gradient(ellipse,rgba(243,114,127,0.7),transparent);"></div>
      <div class="absolute rounded-full opacity-50" style="width:80px;height:60px;left:45%;top:30%;background:radial-gradient(ellipse,rgba(255,164,43,0.6),transparent);"></div>
      <div class="absolute rounded-full opacity-40" style="width:50px;height:40px;left:70%;top:15%;background:radial-gradient(ellipse,rgba(30,215,96,0.5),transparent);"></div>
      <div class="absolute rounded-full opacity-50" style="width:70px;height:55px;left:25%;top:55%;background:radial-gradient(ellipse,rgba(255,164,43,0.5),transparent);"></div>
      <div class="absolute rounded-full opacity-60" style="width:55px;height:45px;left:60%;top:55%;background:radial-gradient(ellipse,rgba(243,114,127,0.6),transparent);"></div>
      <!-- Legend -->
      <div class="absolute bottom-2 left-2 flex items-center gap-2 text-[9px] text-text-secondary bg-base/80 px-2 py-1 rounded">
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-success"></span>Low</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-warning"></span>Med</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-negative"></span>High</span>
      </div>
    </div>
  `;
}

function renderFeatures() {
  return `
  <section id="features" class="py-20 lg:py-28 bg-base">
    <div class="container-main">
      <div class="text-center mb-16 reveal">
        <span class="eyebrow">Powerful Capabilities</span>
        <h2 class="section-heading text-2xl sm:text-3xl lg:text-4xl">
          Everything you need to build<br class="hidden sm:block" /> climate resilience
        </h2>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5">
        ${features.map((f, i) => `
          <div class="card text-center reveal reveal-delay-${i + 1}" style="transition-delay: ${i * 0.1}s;">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent mb-4">
              ${icon(f.icon, 24)}
            </div>
            <h3 class="text-sm font-bold mb-2">${f.title}</h3>
            <p class="text-xs text-text-secondary leading-relaxed">${f.description}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderMetrics() {
  return `
  <section class="py-16 bg-surface border-y border-white/5">
    <div class="container-main">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
        ${metrics.map((m, i) => `
          <div class="reveal flex flex-col items-center text-center ${i < metrics.length - 1 ? 'lg:border-r lg:border-white/10' : ''}" style="transition-delay: ${i * 0.15}s;">
            <div class="text-accent mb-3">${icon(m.icon, 28)}</div>
            <div class="text-3xl lg:text-4xl font-extrabold text-accent mb-1" style="font-variant-numeric: tabular-nums;">${m.value}</div>
            <div class="text-xs text-text-secondary font-medium">${m.label}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderHowItWorks() {
  return `
  <section id="how-it-works" class="py-20 lg:py-28 bg-base">
    <div class="container-main">
      <div class="text-center mb-16 reveal">
        <span class="eyebrow">How It Works</span>
        <h2 class="section-heading text-2xl sm:text-3xl lg:text-4xl">
          From Data to Impact in 4 Simple Steps
        </h2>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
        <!-- Connection line (desktop) -->
        <div class="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-accent/0 via-accent/30 to-accent/0" aria-hidden="true"></div>

        ${howItWorksSteps.map((s, i) => `
          <div class="reveal flex flex-col items-center text-center relative" style="transition-delay: ${i * 0.15}s;">
            <div class="relative z-10 w-20 h-20 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center mb-5 transition-transform duration-300 hover:scale-110">
              <span class="text-accent">${icon(s.icon, 28)}</span>
            </div>
            <h3 class="text-sm font-bold mb-2">${s.number}. ${s.title}</h3>
            <p class="text-xs text-text-secondary leading-relaxed max-w-[200px]">${s.description}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderScenarioSimulation() {
  const s = scenarioData;
  return `
  <section class="py-20 lg:py-28 bg-surface/50">
    <div class="container-main">
      <div class="text-center mb-12 reveal">
        <span class="eyebrow">Scenario Simulation</span>
        <h2 class="section-heading text-2xl sm:text-3xl lg:text-4xl mb-3">
          What happens if we change the future?
        </h2>
        <p class="text-sm text-text-secondary max-w-lg mx-auto">
          Simulate real-world interventions and instantly see the projected impact on climate metrics. Demo values shown for illustration.
        </p>
      </div>

      <!-- Intervention Label -->
      <div class="flex justify-center mb-8 reveal">
        <div class="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-accent/10 border border-accent/20">
          <span class="text-accent">${icon('treePine', 18)}</span>
          <span class="text-sm font-bold text-accent">${s.intervention}</span>
        </div>
      </div>

      <!-- Before / After Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <!-- Before -->
        <div class="card bg-surface border border-white/5 reveal">
          <div class="text-xs font-bold tracking-wider uppercase text-text-secondary mb-5">Current State</div>
          <div class="space-y-4">
            ${renderScenarioMetric('Temperature', s.before.temperature, '', 'thermometer')}
            ${renderScenarioMetric('Heat Risk', s.before.heatRisk, 'text-negative', 'zap')}
            ${renderScenarioMetric('Air Quality Index', s.before.aqi, '', 'wind')}
            ${renderScenarioProgress('Resilience Score', s.before.resilience)}
          </div>
        </div>

        <!-- After -->
        <div class="card bg-surface border border-accent/20 reveal reveal-delay-1">
          <div class="flex items-center gap-2 mb-5">
            <span class="text-xs font-bold tracking-wider uppercase text-accent">After Simulation</span>
            <span class="text-accent">${icon('sparkles', 14)}</span>
          </div>
          <div class="space-y-4">
            ${renderScenarioMetric('Temperature', s.after.temperature, 'text-accent', 'thermometer', '-0.8\u00B0C')}
            ${renderScenarioMetric('Heat Risk', s.after.heatRisk, 'text-warning', 'zap', 'Reduced')}
            ${renderScenarioMetric('Air Quality Index', s.after.aqi, 'text-accent', 'wind', '-8')}
            ${renderScenarioProgress('Resilience Score', s.after.resilience, '+7')}
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center mt-10 reveal">
        <a href="#" class="btn-primary text-sm px-7 py-3">
          Explore Scenario Simulator ${icon('arrowRight', 16)}
        </a>
      </div>
    </div>
  </section>`;
}

function renderScenarioMetric(label, value, colorClass = '', iconName, delta = '') {
  return `
    <div class="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div class="flex items-center gap-2">
        <span class="text-text-muted">${icon(iconName, 16)}</span>
        <span class="text-xs text-text-secondary">${label}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold ${colorClass}">${value}</span>
        ${delta ? `<span class="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">${delta}</span>` : ''}
      </div>
    </div>
  `;
}

function renderScenarioProgress(label, value, delta = '') {
  return `
    <div class="flex items-center justify-between py-2">
      <div class="flex items-center gap-2">
        <span class="text-text-muted">${icon('shield', 16)}</span>
        <span class="text-xs text-text-secondary">${label}</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div class="h-full bg-accent rounded-full transition-all duration-700" style="width: ${value}%;"></div>
        </div>
        <span class="text-sm font-bold">${value}/100</span>
        ${delta ? `<span class="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">${delta}</span>` : ''}
      </div>
    </div>
  `;
}

function renderAIAdvisor() {
  const a = aiAdvisorData;
  return `
  <section class="py-20 lg:py-28 bg-base">
    <div class="container-main">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <!-- Left: Text -->
        <div class="reveal">
          <span class="eyebrow">AI Climate Advisor</span>
          <h2 class="section-heading text-2xl sm:text-3xl lg:text-4xl mb-4">
            Turn climate data into<br class="hidden sm:block" /> actionable decisions.
          </h2>
          <p class="text-sm text-text-secondary max-w-md leading-relaxed">
            Ask questions about any region and get AI-powered recommendations for building climate resilience, backed by data and research.
          </p>
        </div>

        <!-- Right: AI Chat Preview -->
        <div class="reveal reveal-delay-1">
          <div class="bg-surface rounded-xl border border-white/5 shadow-heavy overflow-hidden">
            <!-- Chat Header -->
            <div class="flex items-center gap-2 px-5 py-3 border-b border-white/5">
              <span class="text-accent">${icon('brain', 18)}</span>
              <span class="text-sm font-bold">AI Advisor</span>
              <span class="ml-auto text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full font-medium">Active</span>
            </div>

            <!-- User Question -->
            <div class="px-5 pt-5 pb-3">
              <div class="flex gap-3">
                <div class="w-7 h-7 rounded-full bg-card flex items-center justify-center shrink-0 text-text-secondary">
                  ${icon('users', 14)}
                </div>
                <div class="bg-card rounded-lg rounded-tl-none px-4 py-3 max-w-sm">
                  <p class="text-sm text-text-primary">${a.question}</p>
                </div>
              </div>
            </div>

            <!-- AI Response -->
            <div class="px-5 pb-5">
              <div class="flex gap-3">
                <div class="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center shrink-0 text-accent">
                  ${icon('sparkles', 14)}
                </div>
                <div class="bg-accent/5 border border-accent/10 rounded-lg rounded-tl-none px-4 py-3 flex-1">
                  <p class="text-xs text-text-secondary mb-3">Based on analysis of Kolkata's climate data, here are key recommendations:</p>
                  <ul class="space-y-2">
                    ${a.recommendations.map(r => `
                      <li class="flex items-start gap-2 text-xs text-text-primary">
                        <span class="text-accent mt-0.5 shrink-0">${icon('checkCircle', 14)}</span>
                        <span>${r}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function renderUseCases() {
  return `
  <section id="use-cases" class="py-20 lg:py-28 bg-surface/50">
    <div class="container-main">
      <div class="text-center mb-12 reveal">
        <span class="eyebrow">Use Cases</span>
        <h2 class="section-heading text-2xl sm:text-3xl lg:text-4xl">
          Built for teams driving climate action
        </h2>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${useCases.map((u, i) => `
          <div class="card bg-surface flex items-start gap-4 reveal" style="transition-delay: ${i * 0.1}s;">
            <div class="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 text-accent">
              ${icon(u.icon, 20)}
            </div>
            <div>
              <h3 class="text-sm font-bold mb-1">${u.title}</h3>
              <p class="text-xs text-text-secondary leading-relaxed">${u.description}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderFinalCTA() {
  return `
  <section id="about" class="relative py-20 lg:py-28 overflow-hidden">
    <!-- Background -->
    <div class="absolute inset-0 bg-gradient-to-br from-accent/10 via-surface to-base"></div>
    <div class="absolute inset-0 bg-gradient-to-r from-base/80 to-transparent"></div>

    <div class="container-main relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <!-- Left: CTA Content -->
        <div class="reveal">
          <h2 class="text-3xl sm:text-4xl lg:text-[42px] font-extrabold leading-tight mb-4">
            Let's build a climate-resilient<br class="hidden sm:block" /> future together.
          </h2>
          <p class="text-base text-text-secondary mb-8">Data. Intelligence. Action.</p>
          <a href="#" class="btn-primary text-sm px-8 py-3.5">
            Explore Dashboard ${icon('arrowRight', 16)}
          </a>
        </div>

        <!-- Right: Plant Image -->
        <div class="reveal reveal-delay-1 flex justify-center lg:justify-end">
          <img src="/plant-seedling.jpg" alt="Growing seedling representing climate resilience and sustainability" class="rounded-2xl shadow-heavy max-w-sm w-full object-cover" width="400" height="300" loading="lazy" />
        </div>
      </div>
    </div>
  </section>`;
}

function renderFooter() {
  return `
  <footer class="bg-surface border-t border-white/5 pt-12 pb-8">
    <div class="container-main">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <!-- Brand -->
        <div class="flex flex-col items-center md:items-start text-center md:text-left">
          <div class="flex items-center gap-2 mb-2">
            <img src="/apple-touch-icon.png" alt="GeoTwin 360 Logo" class="w-8 h-8 rounded-full object-cover" />
            <span class="text-sm font-bold uppercase tracking-wide">GeoTwin 360</span>
          </div>
          <p class="text-xs text-text-secondary">Climate Intelligence for a Resilient Future</p>
        </div>

        <!-- Links -->
        <div class="flex flex-wrap justify-center gap-x-8 gap-y-3">
          ${navLinks.map(link => `
            <a href="${link.href}" class="text-xs text-text-secondary hover:text-text-primary transition-colors duration-200">${link.label}</a>
          `).join('')}
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-text-muted">
        <span>\u00A9 2026 GeoTwin 360. All rights reserved.</span>
        <span class="flex items-center gap-1">Made with <span class="text-accent flex items-center">${icon('leaf', 12)}</span> for a sustainable planet.</span>
      </div>
    </div>
  </footer>`;
}

/* ──────────────────────────────────────────
   Render Full Page
   ────────────────────────────────────────── */

function renderApp() {
  return `
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent focus:text-black focus:rounded-lg focus:text-sm focus:font-bold">Skip to main content</a>
    ${renderNavbar()}
    <main id="main-content">
      ${renderHero()}
      ${renderFeatures()}
      ${renderMetrics()}
      ${renderHowItWorks()}
      ${renderScenarioSimulation()}
      ${renderAIAdvisor()}
      ${renderUseCases()}
      ${renderFinalCTA()}
    </main>
    ${renderFooter()}
  `;
}

document.querySelector('#app').innerHTML = renderApp();

/* ──────────────────────────────────────────
   Interactive Behaviors
   ────────────────────────────────────────── */

// Sticky Navbar
const navbar = document.getElementById('navbar');
function updateNavbar() {
  if (window.scrollY > 40) {
    navbar.classList.add('bg-base/90', 'backdrop-blur-xl', 'shadow-subtle', 'border-b', 'border-white/5');
  } else {
    navbar.classList.remove('bg-base/90', 'backdrop-blur-xl', 'shadow-subtle', 'border-b', 'border-white/5');
  }
}
window.addEventListener('scroll', updateNavbar, { passive: true });
updateNavbar();

// Mobile Menu Toggle
const mobileBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
let menuOpen = false;

mobileBtn.addEventListener('click', () => {
  menuOpen = !menuOpen;
  mobileMenu.classList.toggle('hidden', !menuOpen);
  mobileBtn.setAttribute('aria-expanded', menuOpen.toString());
  mobileBtn.innerHTML = menuOpen
    ? icon('x', 24)
    : icon('menu', 24);
});

// Close mobile menu on link click
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    menuOpen = false;
    mobileMenu.classList.add('hidden');
    mobileBtn.setAttribute('aria-expanded', 'false');
    mobileBtn.innerHTML = icon('menu', 24);
  });
});

// Scroll Reveal (IntersectionObserver)
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);
revealElements.forEach(el => revealObserver.observe(el));

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
