import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  Building,
  Calendar,
  CheckCircle,
  ChevronRight,
  CircleDot,
  Compass,
  FileText,
  Gauge,
  Leaf,
  LayoutGrid,
  Map,
  MapPin,
  Menu,
  Shield,
  ShieldCheck,
  Sparkles,
  Thermometer,
  TreePine,
  Users,
  Wind,
  X,
  Zap,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { AuthModal } from '../../components/AuthModal.js';
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
import './landing.css';

/* ──────────────────────────────────────────
   Icon Resolver
   Maps icon name strings from data.ts to
   lucide-react components.
   ────────────────────────────────────────── */

const iconMap: Record<string, React.ElementType> = {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  Building,
  Calendar,
  CheckCircle,
  ChevronRight,
  CircleDot,
  Compass,
  FileText,
  Gauge,
  Leaf,
  LayoutGrid,
  Map,
  MapPin,
  Menu,
  Shield,
  ShieldCheck,
  Sparkles,
  Thermometer,
  TreePine,
  Users,
  Wind,
  X,
  Zap,
};

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, className = '' }) => {
  const LucideIcon = iconMap[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} className={className} aria-hidden="true" />;
};

/* ──────────────────────────────────────────
   Navbar
   ────────────────────────────────────────── */

const Navbar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  const closeMenu = () => setMenuOpen(false);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeMenu();
    }
  };

  return (
    <nav
      id="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#121212]/90 backdrop-blur-xl shadow-[0_2px_6px_rgba(0,0,0,0.2)] border-b border-white/5'
          : ''
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="lp-container flex items-center justify-between h-16 lg:h-[72px]">
        {/* Logo */}
        <a
          href="#home"
          className="flex items-center gap-2 shrink-0"
          aria-label="GeoTwin 360 Home"
          onClick={(e) => handleAnchorClick(e, '#home')}
        >
          <img
            src="/apple-touch-icon.png"
            alt="GeoTwin 360 Logo"
            className="w-9 h-9 rounded-full object-cover"
          />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-wide text-white">
              GeoTwin 360
            </span>
            <span className="text-[10px] text-[#b3b3b3] hidden sm:block">
              Climate Intelligence for a Resilient Future
            </span>
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#b3b3b3] hover:text-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[#1ed760] focus-visible:outline-offset-2"
              onClick={(e) => handleAnchorClick(e, link.href)}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA + Auth + Mobile Toggle */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden sm:flex items-center gap-2.5 pr-2">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 flex items-center justify-center bg-[#282828] text-white">
                {profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                  <img
                    src={profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture}
                    alt={profile?.full_name || 'User'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Users size={14} />
                )}
              </div>
              <span className="text-xs text-[#b3b3b3] font-medium hidden md:inline-block max-w-[120px] truncate">
                {profile?.full_name || user.email?.split('@')[0]}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="p-1.5 text-[#b3b3b3] hover:text-red-400 transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signin');
                  setIsAuthModalOpen(true);
                }}
                className="text-xs font-semibold text-[#b3b3b3] hover:text-white px-3 py-1.5 rounded transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signup');
                  setIsAuthModalOpen(true);
                }}
                className="text-xs font-semibold text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-md border border-white/15 transition-colors cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          )}

          <Link
            to="/dashboard"
            className="lp-btn-primary hidden sm:inline-flex text-xs px-4 py-2"
          >
            EXPLORE DASHBOARD <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <button
            className="lg:hidden p-2 text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-[#181818]/95 backdrop-blur-xl border-t border-[#333]">
          <div className="lp-container py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#b3b3b3] hover:text-white py-2 transition-colors"
                onClick={(e) => handleAnchorClick(e, link.href)}
              >
                {link.label}
              </a>
            ))}

            {user ? (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 flex items-center justify-center bg-[#282828] text-white">
                    {profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                      <img
                        src={profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users size={12} />
                    )}
                  </div>
                  <span className="text-xs text-white truncate max-w-[180px]">
                    {profile?.full_name || user.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-xs text-red-400 hover:underline cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    setAuthModalMode('signin');
                    setIsAuthModalOpen(true);
                  }}
                  className="flex-1 text-xs py-2 bg-white/10 text-white rounded text-center font-semibold"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    setAuthModalMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="flex-1 text-xs py-2 bg-spotify-green text-black rounded text-center font-semibold"
                >
                  Sign Up
                </button>
              </div>
            )}

            <Link
              to="/dashboard"
              className="lp-btn-primary text-xs px-5 py-2.5 w-fit mt-2"
              onClick={closeMenu}
            >
              EXPLORE DASHBOARD <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      {/* Auth Modal for Landing Page */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authModalMode}
      />
    </nav>
  );
};

/* ──────────────────────────────────────────
   Mini Map (CSS-based stylized heat map)
   ────────────────────────────────────────── */

const MiniMap: React.FC = () => (
  <div className="w-full h-full relative" aria-label="Stylized climate risk heat map">
    {/* Grid pattern overlay */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(90deg, rgba(30,215,96,0.08) 1px, transparent 1px), linear-gradient(rgba(30,215,96,0.08) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    />
    {/* Heat zones */}
    <div
      className="absolute rounded-full opacity-60"
      style={{
        width: 60,
        height: 50,
        left: '15%',
        top: '20%',
        background: 'radial-gradient(ellipse, rgba(243,114,127,0.7), transparent)',
      }}
    />
    <div
      className="absolute rounded-full opacity-50"
      style={{
        width: 80,
        height: 60,
        left: '45%',
        top: '30%',
        background: 'radial-gradient(ellipse, rgba(255,164,43,0.6), transparent)',
      }}
    />
    <div
      className="absolute rounded-full opacity-40"
      style={{
        width: 50,
        height: 40,
        left: '70%',
        top: '15%',
        background: 'radial-gradient(ellipse, rgba(30,215,96,0.5), transparent)',
      }}
    />
    <div
      className="absolute rounded-full opacity-50"
      style={{
        width: 70,
        height: 55,
        left: '25%',
        top: '55%',
        background: 'radial-gradient(ellipse, rgba(255,164,43,0.5), transparent)',
      }}
    />
    <div
      className="absolute rounded-full opacity-60"
      style={{
        width: 55,
        height: 45,
        left: '60%',
        top: '55%',
        background: 'radial-gradient(ellipse, rgba(243,114,127,0.6), transparent)',
      }}
    />
    {/* Legend */}
    <div className="absolute bottom-2 left-2 flex items-center gap-2 text-[9px] text-[#b3b3b3] bg-[#121212]/80 px-2 py-1 rounded">
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-[#1ed760]" />
        Low
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-[#ffa42b]" />
        Med
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-[#f3727f]" />
        High
      </span>
    </div>
  </div>
);

/* ──────────────────────────────────────────
   Hero Section
   ────────────────────────────────────────── */

const HeroSection: React.FC = () => {
  const d = dashboardData;
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference * (1 - d.resilienceScore / 100);

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="/hero-bg.jpg"
          alt=""
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#121212]/95 via-[#121212]/85 to-[#121212]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
      </div>

      <div className="lp-container relative z-10 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Content */}
          <div className="lp-animate-fade-in-up">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1ed760]/10 border border-[#1ed760]/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#1ed760]" />
              <span className="text-xs font-bold tracking-widest text-[#1ed760] uppercase">
                AI-Powered Climate Digital Twin
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold leading-[1.08] tracking-tight mb-6">
              Understand Climate.
              <br />
              Simulate Impact.
              <br />
              <span className="text-[#1ed760]">Build a Resilient Future.</span>
            </h1>

            {/* Description */}
            <p className="text-base lg:text-lg text-[#b3b3b3] max-w-xl mb-8 leading-relaxed">
              GeoTwin 360 is an AI-powered climate digital twin that helps cities and communities
              visualize climate risks, simulate interventions, and make data-driven decisions for a
              more resilient future.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link to="/dashboard" className="lp-btn-primary text-sm px-7 py-3.5">
                Explore Dashboard <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a
                href="#features"
                className="lp-btn-secondary text-sm px-7 py-3.5"
                onClick={(e) => {
                  const target = document.querySelector('#features');
                  if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                Learn More <ChevronRight size={16} aria-hidden="true" />
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {trustIndicators.map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-[#b3b3b3]">
                  <span className="text-[#1ed760]">
                    <Icon name={t.icon} size={16} />
                  </span>
                  <span className="text-xs font-medium">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard Preview */}
          <div className="lp-animate-slide-in-right" style={{ animationDelay: '0.3s' }}>
            <div className="bg-[#181818]/80 backdrop-blur-sm rounded-xl border border-white/5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <img
                    src="/apple-touch-icon.png"
                    alt="GeoTwin 360 Logo"
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span className="text-sm font-bold">GeoTwin 360</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#b3b3b3]">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} aria-hidden="true" /> {d.location}
                  </span>
                  <span className="hidden sm:flex items-center gap-1">
                    <Calendar size={12} aria-hidden="true" /> {d.date}
                  </span>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-4 gap-px bg-white/5">
                <div className="bg-[#181818]/90 p-3 text-center">
                  <div className="text-[10px] text-[#b3b3b3] mb-1">Current Temperature</div>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xl font-bold">{d.metrics.temperature.value}</span>
                    <span className="text-xs text-[#b3b3b3]">{d.metrics.temperature.unit}</span>
                  </div>
                  <div className="text-[10px] text-[#8a8a8a] mt-1">
                    Feels like {d.metrics.temperature.feelsLike}
                  </div>
                </div>
                <div className="bg-[#181818]/90 p-3 text-center">
                  <div className="text-[10px] text-[#b3b3b3] mb-1">Humidity</div>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xl font-bold">{d.metrics.humidity.value}</span>
                    <span className="text-xs text-[#b3b3b3]">{d.metrics.humidity.unit}</span>
                  </div>
                </div>
                <div className="bg-[#181818]/90 p-3 text-center">
                  <div className="text-[10px] text-[#b3b3b3] mb-1">Heat Risk</div>
                  <div className="text-xl font-bold text-[#f3727f]">
                    {d.metrics.heatRisk.value}
                  </div>
                  <div className="text-[10px] text-[#8a8a8a] mt-1">Risk Level</div>
                </div>
                <div className="bg-[#181818]/90 p-3 text-center">
                  <div className="text-[10px] text-[#b3b3b3] mb-1">Air Quality Index</div>
                  <div className="text-xl font-bold text-[#539df5]">{d.metrics.aqi.value}</div>
                  <div className="text-[10px] text-[#8a8a8a] mt-1">{d.metrics.aqi.label}</div>
                </div>
              </div>

              {/* Bottom Row: Map + Resilience + Projection */}
              <div className="grid grid-cols-5 gap-px bg-white/5">
                {/* Climate Risk Map */}
                <div className="col-span-3 bg-[#181818]/90 p-4">
                  <div className="text-xs font-semibold mb-2 text-[#b3b3b3]">
                    Climate Risk Map
                  </div>
                  <div className="relative rounded-lg overflow-hidden bg-[#121212] h-32">
                    <MiniMap />
                  </div>
                </div>

                {/* Right Panel: Score + Projection */}
                <div className="col-span-2 flex flex-col gap-px bg-white/5">
                  {/* Resilience Score */}
                  <div className="bg-[#181818]/90 p-4 flex-1 flex flex-col items-center justify-center">
                    <div className="text-xs font-semibold mb-2 text-[#b3b3b3]">
                      Resilience Score
                    </div>
                    <div className="relative w-16 h-16">
                      <svg
                        className="w-16 h-16 -rotate-90"
                        viewBox="0 0 64 64"
                        aria-hidden="true"
                      >
                        <circle cx="32" cy="32" r="28" stroke="#333" strokeWidth="4" fill="none" />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#1ed760"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold">{d.resilienceScore}</span>
                        <span className="text-[8px] text-[#b3b3b3]">/100</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#1ed760] mt-1.5 font-medium">Good</div>
                  </div>
                  {/* Future Projection */}
                  <div className="bg-[#181818]/90 p-4 flex-1 flex flex-col items-center justify-center">
                    <div className="text-[10px] text-[#b3b3b3] mb-1">
                      {d.futureProjection.year} Projection
                    </div>
                    <div className="text-xl font-bold text-[#ffa42b]">
                      {d.futureProjection.value}
                    </div>
                    <div className="text-[10px] text-[#8a8a8a] mt-1">
                      {d.futureProjection.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ──────────────────────────────────────────
   Features Section
   ────────────────────────────────────────── */

const FeaturesSection: React.FC = () => (
  <section id="features" className="py-20 lg:py-28 bg-[#121212]">
    <div className="lp-container">
      <div className="text-center mb-16 lp-reveal">
        <span className="lp-eyebrow">Powerful Capabilities</span>
        <h2 className="lp-section-heading text-2xl sm:text-3xl lg:text-4xl">
          Everything you need to build
          <br className="hidden sm:block" /> climate resilience
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="lp-card text-center lp-reveal"
            style={{ transitionDelay: `${i * 0.1}s` }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1ed760]/10 text-[#1ed760] mb-4">
              <Icon name={f.icon} size={24} />
            </div>
            <h3 className="text-sm font-bold mb-2">{f.title}</h3>
            <p className="text-xs text-[#b3b3b3] leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ──────────────────────────────────────────
   Metrics Section
   ────────────────────────────────────────── */

const MetricsSection: React.FC = () => (
  <section className="py-16 bg-[#181818] border-y border-white/5">
    <div className="lp-container">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={`lp-reveal flex flex-col items-center text-center ${
              i < metrics.length - 1 ? 'lg:border-r lg:border-white/10' : ''
            }`}
            style={{ transitionDelay: `${i * 0.15}s` }}
          >
            <div className="text-[#1ed760] mb-3">
              <Icon name={m.icon} size={28} />
            </div>
            <div
              className="text-3xl lg:text-4xl font-extrabold text-[#1ed760] mb-1"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {m.value}
            </div>
            <div className="text-xs text-[#b3b3b3] font-medium">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ──────────────────────────────────────────
   How It Works Section
   ────────────────────────────────────────── */

const HowItWorksSection: React.FC = () => (
  <section id="how-it-works" className="py-20 lg:py-28 bg-[#121212]">
    <div className="lp-container">
      <div className="text-center mb-16 lp-reveal">
        <span className="lp-eyebrow">How It Works</span>
        <h2 className="lp-section-heading text-2xl sm:text-3xl lg:text-4xl">
          From Data to Impact in 4 Simple Steps
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
        {/* Connection line (desktop) */}
        <div
          className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#1ed760]/0 via-[#1ed760]/30 to-[#1ed760]/0"
          aria-hidden="true"
        />

        {howItWorksSteps.map((s, i) => (
          <div
            key={s.number}
            className="lp-reveal flex flex-col items-center text-center relative"
            style={{ transitionDelay: `${i * 0.15}s` }}
          >
            <div className="relative z-10 w-20 h-20 rounded-full bg-[#1ed760]/10 border-2 border-[#1ed760]/30 flex items-center justify-center mb-5 transition-transform duration-300 hover:scale-110">
              <span className="text-[#1ed760]">
                <Icon name={s.icon} size={28} />
              </span>
            </div>
            <h3 className="text-sm font-bold mb-2">
              {s.number}. {s.title}
            </h3>
            <p className="text-xs text-[#b3b3b3] leading-relaxed max-w-[200px]">
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ──────────────────────────────────────────
   Scenario Metric Helper
   ────────────────────────────────────────── */

interface ScenarioMetricProps {
  label: string;
  value: string;
  colorClass?: string;
  iconName: string;
  delta?: string;
}

const ScenarioMetric: React.FC<ScenarioMetricProps> = ({
  label,
  value,
  colorClass = '',
  iconName,
  delta,
}) => (
  <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
    <div className="flex items-center gap-2">
      <span className="text-[#8a8a8a]">
        <Icon name={iconName} size={16} />
      </span>
      <span className="text-xs text-[#b3b3b3]">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className={`text-sm font-bold ${colorClass}`}>{value}</span>
      {delta && (
        <span className="text-[10px] font-medium text-[#1ed760] bg-[#1ed760]/10 px-1.5 py-0.5 rounded">
          {delta}
        </span>
      )}
    </div>
  </div>
);

interface ScenarioProgressProps {
  label: string;
  value: number;
  delta?: string;
}

const ScenarioProgress: React.FC<ScenarioProgressProps> = ({ label, value, delta }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2">
      <span className="text-[#8a8a8a]">
        <Shield size={16} aria-hidden="true" />
      </span>
      <span className="text-xs text-[#b3b3b3]">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1ed760] rounded-full transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm font-bold">{value}/100</span>
      {delta && (
        <span className="text-[10px] font-medium text-[#1ed760] bg-[#1ed760]/10 px-1.5 py-0.5 rounded">
          {delta}
        </span>
      )}
    </div>
  </div>
);

/* ──────────────────────────────────────────
   Scenario Simulation Section
   ────────────────────────────────────────── */

const ScenarioSimulationSection: React.FC = () => {
  const s = scenarioData;
  return (
    <section className="py-20 lg:py-28 bg-[#181818]/50">
      <div className="lp-container">
        <div className="text-center mb-12 lp-reveal">
          <span className="lp-eyebrow">Scenario Simulation</span>
          <h2 className="lp-section-heading text-2xl sm:text-3xl lg:text-4xl mb-3">
            What happens if we change the future?
          </h2>
          <p className="text-sm text-[#b3b3b3] max-w-lg mx-auto">
            Simulate real-world interventions and instantly see the projected impact on climate
            metrics. Demo values shown for illustration.
          </p>
        </div>

        {/* Intervention Label */}
        <div className="flex justify-center mb-8 lp-reveal">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#1ed760]/10 border border-[#1ed760]/20">
            <span className="text-[#1ed760]">
              <TreePine size={18} aria-hidden="true" />
            </span>
            <span className="text-sm font-bold text-[#1ed760]">{s.intervention}</span>
          </div>
        </div>

        {/* Before / After Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Before */}
          <div className="lp-card bg-[#181818] border border-white/5 lp-reveal">
            <div className="text-xs font-bold tracking-wider uppercase text-[#b3b3b3] mb-5">
              Current State
            </div>
            <div className="space-y-4">
              <ScenarioMetric
                label="Temperature"
                value={s.before.temperature}
                iconName="Thermometer"
              />
              <ScenarioMetric
                label="Heat Risk"
                value={s.before.heatRisk}
                colorClass="text-[#f3727f]"
                iconName="Zap"
              />
              <ScenarioMetric
                label="Air Quality Index"
                value={s.before.aqi}
                iconName="Wind"
              />
              <ScenarioProgress label="Resilience Score" value={s.before.resilience} />
            </div>
          </div>

          {/* After */}
          <div className="lp-card bg-[#181818] border border-[#1ed760]/20 lp-reveal" style={{ transitionDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs font-bold tracking-wider uppercase text-[#1ed760]">
                After Simulation
              </span>
              <Sparkles size={14} className="text-[#1ed760]" aria-hidden="true" />
            </div>
            <div className="space-y-4">
              <ScenarioMetric
                label="Temperature"
                value={s.after.temperature}
                colorClass="text-[#1ed760]"
                iconName="Thermometer"
                delta="-0.8\u00B0C"
              />
              <ScenarioMetric
                label="Heat Risk"
                value={s.after.heatRisk}
                colorClass="text-[#ffa42b]"
                iconName="Zap"
                delta="Reduced"
              />
              <ScenarioMetric
                label="Air Quality Index"
                value={s.after.aqi}
                colorClass="text-[#1ed760]"
                iconName="Wind"
                delta="-8"
              />
              <ScenarioProgress label="Resilience Score" value={s.after.resilience} delta="+7" />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10 lp-reveal">
          <Link to="/dashboard" className="lp-btn-primary text-sm px-7 py-3">
            Explore Scenario Simulator <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};

/* ──────────────────────────────────────────
   AI Advisor Section
   ────────────────────────────────────────── */

const AIAdvisorSection: React.FC = () => {
  const a = aiAdvisorData;
  return (
    <section className="py-20 lg:py-28 bg-[#121212]">
      <div className="lp-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div className="lp-reveal">
            <span className="lp-eyebrow">AI Climate Advisor</span>
            <h2 className="lp-section-heading text-2xl sm:text-3xl lg:text-4xl mb-4">
              Turn climate data into
              <br className="hidden sm:block" /> actionable decisions.
            </h2>
            <p className="text-sm text-[#b3b3b3] max-w-md leading-relaxed">
              Ask questions about any region and get AI-powered recommendations for building climate
              resilience, backed by data and research.
            </p>
          </div>

          {/* Right: AI Chat Preview */}
          <div className="lp-reveal" style={{ transitionDelay: '0.1s' }}>
            <div className="bg-[#181818] rounded-xl border border-white/5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                <Brain size={18} className="text-[#1ed760]" aria-hidden="true" />
                <span className="text-sm font-bold">AI Advisor</span>
                <span className="ml-auto text-[10px] text-[#1ed760] bg-[#1ed760]/10 px-2 py-0.5 rounded-full font-medium">
                  Active
                </span>
              </div>

              {/* User Question */}
              <div className="px-5 pt-5 pb-3">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#252525] flex items-center justify-center shrink-0 text-[#b3b3b3]">
                    <Users size={14} aria-hidden="true" />
                  </div>
                  <div className="bg-[#252525] rounded-lg rounded-tl-none px-4 py-3 max-w-sm">
                    <p className="text-sm text-white">{a.question}</p>
                  </div>
                </div>
              </div>

              {/* AI Response */}
              <div className="px-5 pb-5">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#1ed760]/15 flex items-center justify-center shrink-0 text-[#1ed760]">
                    <Sparkles size={14} aria-hidden="true" />
                  </div>
                  <div className="bg-[#1ed760]/5 border border-[#1ed760]/10 rounded-lg rounded-tl-none px-4 py-3 flex-1">
                    <p className="text-xs text-[#b3b3b3] mb-3">
                      Based on analysis of Kolkata's climate data, here are key recommendations:
                    </p>
                    <ul className="space-y-2">
                      {a.recommendations.map((r) => (
                        <li key={r} className="flex items-start gap-2 text-xs text-white">
                          <span className="text-[#1ed760] mt-0.5 shrink-0">
                            <CheckCircle size={14} aria-hidden="true" />
                          </span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ──────────────────────────────────────────
   Use Cases Section
   ────────────────────────────────────────── */

const UseCasesSection: React.FC = () => (
  <section id="use-cases" className="py-20 lg:py-28 bg-[#181818]/50">
    <div className="lp-container">
      <div className="text-center mb-12 lp-reveal">
        <span className="lp-eyebrow">Use Cases</span>
        <h2 className="lp-section-heading text-2xl sm:text-3xl lg:text-4xl">
          Built for teams driving climate action
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {useCases.map((u, i) => (
          <div
            key={u.title}
            className="lp-card bg-[#181818] flex items-start gap-4 lp-reveal"
            style={{ transitionDelay: `${i * 0.1}s` }}
          >
            <div className="w-10 h-10 rounded-lg bg-[#1ed760]/10 flex items-center justify-center shrink-0 text-[#1ed760]">
              <Icon name={u.icon} size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold mb-1">{u.title}</h3>
              <p className="text-xs text-[#b3b3b3] leading-relaxed">{u.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ──────────────────────────────────────────
   Final CTA Section
   ────────────────────────────────────────── */

const FinalCTASection: React.FC = () => (
  <section id="about" className="relative py-20 lg:py-28 overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#1ed760]/10 via-[#181818] to-[#121212]" />
    <div className="absolute inset-0 bg-gradient-to-r from-[#121212]/80 to-transparent" />

    <div className="lp-container relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: CTA Content */}
        <div className="lp-reveal">
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold leading-tight mb-4">
            Let's build a climate-resilient
            <br className="hidden sm:block" /> future together.
          </h2>
          <p className="text-base text-[#b3b3b3] mb-8">Data. Intelligence. Action.</p>
          <Link to="/dashboard" className="lp-btn-primary text-sm px-8 py-3.5">
            Explore Dashboard <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {/* Right: Plant Image */}
        <div className="lp-reveal flex justify-center lg:justify-end" style={{ transitionDelay: '0.1s' }}>
          <img
            src="/plant-seedling.jpg"
            alt="Growing seedling representing climate resilience and sustainability"
            className="rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] max-w-sm w-full object-cover"
            width={400}
            height={300}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  </section>
);

/* ──────────────────────────────────────────
   Footer
   ────────────────────────────────────────── */

const Footer: React.FC = () => {
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="bg-[#181818] border-t border-white/5 pt-12 pb-8">
      <div className="lp-container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2 mb-2">
              <img
                src="/apple-touch-icon.png"
                alt="GeoTwin 360 Logo"
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-sm font-bold tracking-wide">GeoTwin 360</span>
            </div>
            <p className="text-xs text-[#b3b3b3]">
              Climate Intelligence for a Resilient Future
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs text-[#b3b3b3] hover:text-white transition-colors duration-200"
                onClick={(e) => handleAnchorClick(e, link.href)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#8a8a8a]">
          <span>{'\u00A9'} 2026 GeoTwin 360. All rights reserved.</span>
          <span className="flex items-center gap-1">
            Made with{' '}
            <span className="text-[#1ed760] flex items-center">
              <Leaf size={12} aria-hidden="true" />
            </span>{' '}
            for a sustainable planet.
          </span>
        </div>
      </div>
    </footer>
  );
};

/* ──────────────────────────────────────────
   Landing Page (Main Export)
   ────────────────────────────────────────── */

export const LandingPage: React.FC = () => {
  const pageRef = useRef<HTMLDivElement>(null);

  // Scroll Reveal (IntersectionObserver)
  const setupRevealObserver = useCallback(() => {
    if (!pageRef.current) return;

    const revealElements = pageRef.current.querySelectorAll('.lp-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Small delay to ensure DOM is rendered
    const timer = setTimeout(setupRevealObserver, 100);
    return () => clearTimeout(timer);
  }, [setupRevealObserver]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div ref={pageRef} className="landing-page">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#1ed760] focus:text-black focus:rounded-lg focus:text-sm focus:font-bold"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <FeaturesSection />
        <MetricsSection />
        <HowItWorksSection />
        <ScenarioSimulationSection />
        <AIAdvisorSection />
        <UseCasesSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
