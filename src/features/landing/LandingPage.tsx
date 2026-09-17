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
  Cpu,
  Droplets,
  Eye,
  FileText,
  Gauge,
  Globe,
  Layers,
  LayoutGrid,
  Leaf,
  LogOut,
  Map,
  MapPin,
  Menu,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Thermometer,
  TreePine,
  TrendingUp,
  Users,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { AuthModal } from '../../components/AuthModal.js';
import {
  navLinks,
  trustIndicators,
  cityTelemetries,
  features,
  metrics,
  howItWorksSteps,
  scenarioInterventions,
  aiAdvisorPrompts,
  useCases,
  CityTelemetry,
} from './data.js';
import { TiltCard3D } from './TiltCard3D.js';
import { DigitalTwinGlobe3D } from './DigitalTwinGlobe3D.js';
import { CommandPalette } from './CommandPalette.js';
import { TimeTravelScrubber } from './TimeTravelScrubber.js';
import { SplitComparisonSlider } from './SplitComparisonSlider.js';
import { DeveloperTerminal } from './DeveloperTerminal.js';
import { InstitutionalMarquee } from './InstitutionalMarquee.js';
import './landing.css';


/* ──────────────────────────────────────────
   Icon Resolver
   Maps icon name strings to Lucide components.
   Zero emojis anywhere per AGENTS.md rules.
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
  Cpu,
  Droplets,
  Eye,
  FileText,
  Gauge,
  Globe,
  Layers,
  LayoutGrid,
  Leaf,
  LogOut,
  Map,
  MapPin,
  Menu,
  Radio,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Thermometer,
  TreePine,
  TrendingUp,
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

const Icon: React.FC<IconProps> = ({ name, size = 20, className = '' }) => {
  const LucideIcon = iconMap[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} className={className} aria-hidden="true" />;
};

/* ──────────────────────────────────────────
   Navbar
   ────────────────────────────────────────── */

interface NavbarProps {
  onOpenCommandPalette?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onOpenCommandPalette }) => {
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [activeNav, setActiveNav] = useState<string>('Platform');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 25);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, label: string) => {
    setActiveNav(label);
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
          ? 'bg-[#02070c]/90 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.7)] border-b border-white/10'
          : 'bg-transparent border-b border-white/5 backdrop-blur-[3px]'
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="lp-container flex items-center justify-between h-16 lg:h-20">
        {/* Brand Logo */}
        <a
          href="#home"
          className="flex items-center gap-3 shrink-0 group"
          aria-label="GeoTwin 360 Home"
          onClick={(e) => handleAnchorClick(e, '#home', 'Home')}
        >
          <div className="w-10 h-10 rounded-full p-0.5 border border-[#1ed760]/40 bg-[#061019] flex items-center justify-center shadow-[0_0_16px_rgba(30,215,96,0.35)] group-hover:border-[#1ed760] transition-colors relative">
            <img
              src="/apple-touch-icon.png"
              alt="GeoTwin 360"
              className="w-full h-full rounded-full object-cover"
            />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#1ed760] rounded-full border-2 border-[#02070c] lp-beacon" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight text-white group-hover:text-[#1ed760] transition-colors">
              GeoTwin <span className="text-[#1ed760]">360</span>
            </span>
            <span className="text-[9px] font-bold tracking-[0.24em] text-[#94a3b8] uppercase mt-1">
              CLIMATE DIGITAL TWIN
            </span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = activeNav === link.label;
            return (
              <a
                key={link.href}
                href={link.href}
                className={`relative text-xs font-semibold py-1 tracking-wide transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[#1ed760] ${
                  isActive ? 'text-white' : 'text-[#94a3b8] hover:text-white'
                }`}
                onClick={(e) => handleAnchorClick(e, link.href, link.label)}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-[#1ed760] rounded-full shadow-[0_0_10px_#1ed760]" />
                )}
              </a>
            );
          })}
        </div>

        {/* Action Controls & Auth */}
        <div className="flex items-center gap-3">
          {/* Quick Command Launcher Pill */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:border-[#1ed760]/40 text-[#94a3b8] hover:text-white transition-all text-xs font-mono group cursor-pointer"
              title="Open Command Palette (Cmd+K / Ctrl+K)"
            >
              <Search size={12} className="text-[#1ed760]" />
              <span className="text-[11px] font-sans">Command</span>
              <kbd className="px-1 py-0.5 rounded bg-white/10 text-[9px] font-semibold text-[#cbd5e1] group-hover:bg-[#1ed760] group-hover:text-black transition-colors">
                ⌘K
              </kbd>
            </button>
          )}

          {user ? (
            <div className="hidden sm:flex items-center gap-2.5 pl-1">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 flex items-center justify-center bg-[#0d1c29] text-white shadow-sm">
                {profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                  <img
                    src={profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture}
                    alt={profile?.full_name || 'User'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Users size={13} />
                )}
              </div>
              <span className="text-xs text-[#94a3b8] font-medium hidden md:inline-block max-w-[100px] truncate">
                {profile?.full_name || user.email?.split('@')[0]}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="p-1 text-[#94a3b8] hover:text-red-400 transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 md:gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signin');
                  setIsAuthModalOpen(true);
                }}
                className="text-xs font-semibold text-[#94a3b8] hover:text-white px-2.5 py-1.5 transition-colors cursor-pointer"
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signup');
                  setIsAuthModalOpen(true);
                }}
                className="text-xs font-semibold text-white/90 hover:text-white px-3 py-1.5 rounded-full bg-white/5 border border-white/15 hover:border-[#1ed760]/50 hover:bg-white/10 transition-all cursor-pointer shrink-0"
              >
                SIGN UP
              </button>
            </div>
          )}

          <Link
            to="/dashboard"
            className="text-xs font-bold text-black bg-[#1ed760] hover:bg-[#16b84f] px-3.5 py-2 rounded-full transition-all duration-200 cursor-pointer shadow-[0_0_14px_rgba(30,215,96,0.35)] hover:shadow-[0_0_20px_rgba(30,215,96,0.5)] tracking-wide shrink-0"
          >
            LAUNCH APP
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-1.5 text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {menuOpen && (
        <div className="lg:hidden bg-[#061019]/98 backdrop-blur-2xl border-t border-white/10 shadow-2xl">
          <div className="lp-container py-5 flex flex-col gap-3.5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-[#94a3b8] hover:text-white py-1.5 transition-colors"
                onClick={(e) => handleAnchorClick(e, link.href, link.label)}
              >
                {link.label}
              </a>
            ))}

            {user ? (
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 flex items-center justify-center bg-[#0d1c29] text-white">
                    {profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                      <img
                        src={profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users size={14} />
                    )}
                  </div>
                  <span className="text-xs text-white truncate max-w-[180px]">
                    {profile?.full_name || user.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-xs text-red-400 font-semibold hover:underline cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-white/10 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    setAuthModalMode('signin');
                    setIsAuthModalOpen(true);
                  }}
                  className="flex-1 text-xs py-2.5 bg-white/10 text-white rounded-full text-center font-bold"
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    setAuthModalMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="flex-1 text-xs py-2.5 bg-[#1ed760] text-black rounded-full text-center font-bold shadow-[0_0_16px_rgba(30,215,96,0.3)]"
                >
                  SIGN UP
                </button>
              </div>
            )}

            <Link
              to="/dashboard"
              className="lp-btn-primary text-xs px-5 py-3 w-full text-center mt-2 justify-center"
              onClick={closeMenu}
            >
              EXPLORE DASHBOARD <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authModalMode}
      />
    </nav>
  );
};

/* ──────────────────────────────────────────
   Cinematic Radar Mini Map Component
   ────────────────────────────────────────── */

interface MiniRadarMapProps {
  cityId: string;
}

const MiniRadarMap: React.FC<MiniRadarMapProps> = ({ cityId }) => {
  return (
    <div
      className="w-full h-full relative overflow-hidden rounded-lg bg-[#040b10] border border-white/10"
      aria-label="Cinematic climate risk radar map"
    >
      {/* Tech Grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(0, 242, 254, 0.12) 1px, transparent 1px), linear-gradient(rgba(0, 242, 254, 0.12) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Rotating Radar Sweep */}
      <div className="lp-radar-sweep" />

      {/* Concentric Range Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-16 h-16 rounded-full border border-cyan-500/20" />
        <div className="w-28 h-28 rounded-full border border-cyan-500/15" />
      </div>

      {/* Dynamic Heat & Hazard Blobs based on city */}
      {cityId === 'kolkata' && (
        <>
          <div
            className="absolute rounded-full opacity-85 blur-[7px]"
            style={{
              width: 85,
              height: 55,
              left: '38%',
              top: '18%',
              background:
                'radial-gradient(circle, rgba(244,63,94,0.95) 0%, rgba(245,158,11,0.85) 45%, rgba(30,215,96,0.5) 80%, transparent 100%)',
            }}
          />
          <div
            className="absolute rounded-full opacity-70 blur-[9px]"
            style={{
              width: 65,
              height: 45,
              left: '15%',
              top: '30%',
              background: 'radial-gradient(circle, rgba(245,158,11,0.8) 0%, rgba(30,215,96,0.6) 70%, transparent 100%)',
            }}
          />
        </>
      )}

      {cityId === 'singapore' && (
        <>
          <div
            className="absolute rounded-full opacity-75 blur-[7px]"
            style={{
              width: 90,
              height: 50,
              left: '30%',
              top: '25%',
              background: 'radial-gradient(circle, rgba(0,242,254,0.85) 0%, rgba(30,215,96,0.7) 60%, transparent 100%)',
            }}
          />
          <div
            className="absolute rounded-full opacity-70 blur-[8px]"
            style={{
              width: 60,
              height: 40,
              left: '55%',
              top: '35%',
              background: 'radial-gradient(circle, rgba(245,158,11,0.7) 0%, transparent 80%)',
            }}
          />
        </>
      )}

      {cityId === 'rotterdam' && (
        <>
          <div
            className="absolute rounded-full opacity-80 blur-[8px]"
            style={{
              width: 80,
              height: 50,
              left: '35%',
              top: '25%',
              background: 'radial-gradient(circle, rgba(30,215,96,0.85) 0%, rgba(0,242,254,0.6) 65%, transparent 100%)',
            }}
          />
        </>
      )}

      {/* Telemetry Reticle Crosshairs */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-400/20" />
      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-400/20" />

      {/* Legend */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between text-[8.5px] text-[#94a3b8] bg-[#02070c]/90 px-2 py-0.5 rounded border border-white/10 backdrop-blur-md">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760]" />
          Low
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
          Mod
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" />
          High
        </span>
        <span className="font-mono text-[#00f2fe] text-[8px]">RADAR 100M</span>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────
   Hero Section with Interactive GeoTwin Console
   ────────────────────────────────────────── */

interface HeroSectionProps {
  onOpenCommandPalette?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onOpenCommandPalette }) => {
  const [selectedCityId, setSelectedCityId] = useState<string>('kolkata');
  const [showcaseMode, setShowcaseMode] = useState<'globe' | 'telemetry'>('globe');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const activeCity: CityTelemetry =
    cityTelemetries.find((c) => c.id === selectedCityId) || cityTelemetries[0];

  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - activeCity.resilienceScore / 100);

  return (
    <section id="home" className="relative min-h-[calc(100vh-70px)] flex flex-col justify-between overflow-hidden pt-16 lg:pt-20 pb-2 lp-3d-perspective">
      {/* Cinematic Layered Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src="/hero-bg.jpg"
          alt="GeoTwin 360 Digital Twin City Environment"
          className="w-full h-full object-cover object-center brightness-[0.75] contrast-[1.15]"
          width={1920}
          height={1080}
          fetchPriority="high"
        />

        {/* Scanlines layer for digital twin HUD atmosphere */}
        <div className="absolute inset-0 lp-scanlines opacity-40" />

        {/* Vignette Gradients */}
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#02070c]/95 via-[#02070c]/60 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-full lg:w-3/5 bg-gradient-to-r from-[#02070c]/98 via-[#02070c]/80 md:via-[#02070c]/50 to-transparent" />

        {/* Radial Aurora Glow behind Console */}
        <div
          className="absolute right-[-5%] top-1/4 w-[750px] h-[750px] rounded-full opacity-30 blur-[130px] pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(0, 242, 254, 0.35) 0%, rgba(30, 215, 96, 0.22) 40%, transparent 75%)',
          }}
        />

        {/* Bottom smooth fade to midnight page base */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#02070c] via-[#02070c]/80 to-transparent" />
      </div>

      <div className="lp-container relative z-10 py-3 lg:py-5 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center w-full">
          {/* Left Column: Headline & Value Proposition */}
          <div className="lg:col-span-6 lp-animate-fade-in-up">
            {/* Telemetry Eyebrow Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1ed760]/10 border border-[#1ed760]/30 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] lp-beacon" />
                <span className="text-[10.5px] font-extrabold tracking-wider text-[#1ed760] uppercase">
                  AI CLIMATE DIGITAL TWIN
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10.5px] font-mono text-[#94a3b8]">
                <Radio size={11} className="text-[#00f2fe]" />
                <span>100M RESOLUTION</span>
              </div>
              {onOpenCommandPalette && (
                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/25 text-[10.5px] font-mono text-cyan-300 hover:bg-cyan-400/20 transition-colors cursor-pointer"
                >
                  <Search size={11} className="text-cyan-400" />
                  <span>Press ⌘K to simulate</span>
                </button>
              )}
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] xl:text-[46px] font-extrabold leading-[1.12] tracking-tight mb-3 text-white">
              Understand Climate.
              <br />
              Simulate Impact.
              <br />
              <span className="lp-gradient-shimmer drop-shadow-[0_0_24px_rgba(30,215,96,0.35)]">
                Build a Resilient Future.
              </span>
            </h1>

            {/* Sub-Copy */}
            <p className="text-sm sm:text-base text-[#94a3b8] max-w-lg mb-5 leading-relaxed font-normal">
              GeoTwin 360 delivers institutional-grade climate intelligence for cities and
              communities. Real-time satellite telemetry, deterministic physics simulations,
              and AI-driven capital prioritization in an interactive 3D digital twin.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <Link
                to="/dashboard"
                className="lp-btn-primary text-xs sm:text-sm px-6 py-3 shadow-[0_0_24px_rgba(30,215,96,0.4)]"
              >
                EXPLORE LIVE DASHBOARD <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <a
                href="#platform"
                className="lp-btn-secondary text-xs sm:text-sm px-5 py-3"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#platform')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                PLATFORM OVERVIEW <ChevronRight size={15} aria-hidden="true" />
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 pt-3.5 border-t border-white/10">
              {trustIndicators.map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-[#94a3b8]">
                  <span className="text-[#1ed760] shrink-0 p-1 rounded-md bg-[#1ed760]/10">
                    <Icon name={t.icon} size={14} />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white/95 truncate">{t.label}</span>
                    {t.badge && (
                      <span className="text-[8.5px] font-mono text-[#00f2fe] tracking-wider uppercase">
                        {t.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: 3D Tilt Digital Twin Showcase */}
          <div className="lg:col-span-6 lp-animate-slide-in-right relative" style={{ animationDelay: '0.2s' }}>
            {/* Ambient Aura */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#00f2fe]/20 via-[#1ed760]/15 to-[#00f2fe]/10 blur-xl opacity-80 pointer-events-none" />

            <TiltCard3D maxTilt={5} glareOpacity={0.12} className="w-full">
              <div className="relative rounded-2xl bg-[#061019]/92 backdrop-blur-2xl border border-[#00f2fe]/35 shadow-[0_0_50px_rgba(0,242,254,0.15),0_20px_50px_rgba(0,0,0,0.85)] p-4 sm:p-5 overflow-hidden lp-preserve-3d">
                {/* Top Viewport Navigation Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
                  {/* Live Badge */}
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1ed760] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1ed760]" />
                    </span>
                    <span className="text-[11px] font-extrabold tracking-wider text-white uppercase">
                      GEOTWIN 360 <span className="text-[#1ed760]">•</span> SPATIAL CORE
                    </span>
                  </div>

                  {/* Mode Switcher: 3D GLOBE vs SENSOR HUD */}
                  <div className="flex items-center bg-[#02070c] p-0.5 rounded-full border border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowcaseMode('globe')}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                        showcaseMode === 'globe'
                          ? 'bg-[#1ed760] text-black shadow-[0_0_10px_rgba(30,215,96,0.4)]'
                          : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      <Globe size={12} />
                      <span>3D TWIN GLOBE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowcaseMode('telemetry')}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                        showcaseMode === 'telemetry'
                          ? 'bg-[#00f2fe] text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                          : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      <Activity size={12} />
                      <span>SENSOR HUD</span>
                    </button>
                  </div>
                </div>

                {/* VIEW 1: Interactive 3D Digital Twin Globe */}
                {showcaseMode === 'globe' && (
                  <div className="pt-2.5 space-y-2.5">
                    <DigitalTwinGlobe3D
                      onSelectCity={(cityName) => setSelectedCityId(cityName.toLowerCase())}
                      selectedCityName={activeCity.cityName}
                    />

                    {/* Quick 3D Telemetry Strip */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="bg-[#0b1b26]/80 rounded-lg p-2 border border-white/5">
                        <span className="text-[9.5px] font-mono text-[#94a3b8] uppercase">Selected City</span>
                        <div className="text-xs font-bold text-white mt-0.5">{activeCity.cityName}</div>
                      </div>
                      <div className="bg-[#0b1b26]/80 rounded-lg p-2 border border-white/5">
                        <span className="text-[9.5px] font-mono text-[#94a3b8] uppercase">Surface Temp</span>
                        <div className="text-xs font-bold text-[#1ed760] mt-0.5 tabular-data">
                          {activeCity.metrics.temperature.value}°C
                        </div>
                      </div>
                      <div className="bg-[#0b1b26]/80 rounded-lg p-2 border border-white/5">
                        <span className="text-[9.5px] font-mono text-[#94a3b8] uppercase">Resilience Index</span>
                        <div className="text-xs font-bold text-[#00f2fe] mt-0.5 tabular-data">
                          {activeCity.resilienceScore}/100
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 2: Multi-City Telemetry Console & 24h Trend */}
                {showcaseMode === 'telemetry' && (
                  <div className="pt-2 space-y-2">
                    {/* Combined Location Strip & City Selector */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-[#00f2fe] shrink-0" />
                        <span className="text-xs font-bold text-white">
                          {activeCity.cityName}, {activeCity.country}
                        </span>
                        <span className="font-mono text-[9.5px] text-[#00f2fe] bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">
                          {activeCity.coordinates}
                        </span>
                      </div>

                      <div className="flex items-center bg-[#02070c] p-0.5 rounded-full border border-white/10 overflow-x-auto no-scrollbar max-w-full">
                        {cityTelemetries.map((city) => (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() => setSelectedCityId(city.id)}
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all cursor-pointer shrink-0 ${
                              selectedCityId === city.id
                                ? 'bg-[#1ed760] text-black shadow-[0_0_10px_rgba(30,215,96,0.4)]'
                                : 'text-[#94a3b8] hover:text-white'
                            }`}
                          >
                            {city.cityName}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4 Microclimate Telemetry Blocks */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2 border-b border-white/10">
                      <div className="bg-[#0b1b26]/75 rounded-lg p-2 border border-white/5">
                        <div className="flex items-center gap-1 text-[10px] text-[#94a3b8] mb-0.5">
                          <Thermometer size={12} className="text-[#f43f5e]" />
                          <span>Surface Temp</span>
                        </div>
                        <div className="text-base font-extrabold text-white tabular-data">
                          {activeCity.metrics.temperature.value}°C
                        </div>
                        <div className="text-[9px] text-[#64748b] truncate">
                          Feels {activeCity.metrics.temperature.feelsLike}
                        </div>
                      </div>

                      <div className="bg-[#0b1b26]/75 rounded-lg p-2 border border-white/5">
                        <div className="flex items-center gap-1 text-[10px] text-[#94a3b8] mb-0.5">
                          <Droplets size={12} className="text-[#00f2fe]" />
                          <span>Humidity</span>
                        </div>
                        <div className="text-base font-extrabold text-white tabular-data">
                          {activeCity.metrics.humidity.value}%
                        </div>
                        <div className="text-[9px] text-[#64748b] truncate">
                          Normal Dewpoint
                        </div>
                      </div>

                      <div className="bg-[#0b1b26]/75 rounded-lg p-2 border border-white/5">
                        <div className="flex items-center gap-1 text-[10px] text-[#94a3b8] mb-0.5">
                          <Sun size={12} className="text-[#f59e0b]" />
                          <span>Heat Risk</span>
                        </div>
                        <div
                          className={`text-base font-extrabold tabular-data ${
                            activeCity.metrics.heatRisk.level === 'high'
                              ? 'text-[#f43f5e]'
                              : activeCity.metrics.heatRisk.level === 'moderate'
                              ? 'text-[#f59e0b]'
                              : 'text-[#1ed760]'
                          }`}
                        >
                          {activeCity.metrics.heatRisk.value}
                        </div>
                        <div className="text-[9px] text-[#64748b] truncate">
                          Stress Index
                        </div>
                      </div>

                      <div className="bg-[#0b1b26]/75 rounded-lg p-2 border border-white/5">
                        <div className="flex items-center gap-1 text-[10px] text-[#94a3b8] mb-0.5">
                          <Wind size={12} className="text-[#14b8a6]" />
                          <span>Air Quality</span>
                        </div>
                        <div className="text-base font-extrabold text-[#14b8a6] tabular-data">
                          {activeCity.metrics.aqi.value}
                        </div>
                        <div className="text-[9px] text-[#64748b] truncate">
                          {activeCity.metrics.aqi.label}
                        </div>
                      </div>
                    </div>

                    {/* Interactive 24h Temperature Wave */}
                    <div className="pb-2 border-b border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                          <Activity size={13} className="text-[#00f2fe]" />
                          <span>24-Hour Thermodynamic Wave</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hoveredPointIndex !== null && (
                            <span className="text-[9.5px] font-mono text-[#00f2fe] bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                              {activeCity.hourlyTrend[hoveredPointIndex].time}: {activeCity.hourlyTrend[hoveredPointIndex].temp}°C
                            </span>
                          )}
                          <span className="text-[9px] font-semibold text-[#1ed760] bg-[#1ed760]/10 border border-[#1ed760]/20 px-2 py-0.5 rounded-full">
                            Dynamic Vector
                          </span>
                        </div>
                      </div>

                      <div className="relative h-14 w-full flex items-center">
                        <div className="flex flex-col justify-between h-full text-[8.5px] text-[#64748b] pr-2 shrink-0 font-mono select-none">
                          <span>36°</span>
                          <span>28°</span>
                          <span>20°</span>
                        </div>

                        <div className="relative flex-1 h-full">
                          <svg
                            className="w-full h-full overflow-visible"
                            viewBox="0 0 500 90"
                            preserveAspectRatio="none"
                          >
                            <defs>
                              <linearGradient id="heroChartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.4" />
                                <stop offset="60%" stopColor="#1ed760" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="#1ed760" stopOpacity="0" />
                              </linearGradient>
                            </defs>

                            <path
                              d={`M 0,${85 - (activeCity.hourlyTrend[0].temp - 15) * 3} 
                                 C 80,${85 - (activeCity.hourlyTrend[1].temp - 15) * 3} 140,${85 - (activeCity.hourlyTrend[2].temp - 15) * 3} 220,${85 - (activeCity.hourlyTrend[2].temp - 15) * 3}
                                 S 340,${85 - (activeCity.hourlyTrend[3].temp - 15) * 3} 420,${85 - (activeCity.hourlyTrend[4].temp - 15) * 3}
                                 L 500,${85 - (activeCity.hourlyTrend[5].temp - 15) * 3} 
                                 L 500,90 L 0,90 Z`}
                              fill="url(#heroChartGradient)"
                            />

                            <path
                              d={`M 0,${85 - (activeCity.hourlyTrend[0].temp - 15) * 3} 
                                 C 80,${85 - (activeCity.hourlyTrend[1].temp - 15) * 3} 140,${85 - (activeCity.hourlyTrend[2].temp - 15) * 3} 220,${85 - (activeCity.hourlyTrend[2].temp - 15) * 3}
                                 S 340,${85 - (activeCity.hourlyTrend[3].temp - 15) * 3} 420,${85 - (activeCity.hourlyTrend[4].temp - 15) * 3}
                                 L 500,${85 - (activeCity.hourlyTrend[5].temp - 15) * 3}`}
                              fill="none"
                              stroke="#00f2fe"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />

                            {activeCity.hourlyTrend.map((point, idx) => {
                              const cx = (idx / (activeCity.hourlyTrend.length - 1)) * 500;
                              const cy = 85 - (point.temp - 15) * 3;
                              const isHovered = hoveredPointIndex === idx;
                              return (
                                <g
                                  key={point.time}
                                  onMouseEnter={() => setHoveredPointIndex(idx)}
                                  onMouseLeave={() => setHoveredPointIndex(null)}
                                  className="cursor-pointer"
                                >
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={isHovered ? 5 : 3.5}
                                    fill={isHovered ? '#1ed760' : '#00f2fe'}
                                    stroke="#061019"
                                    strokeWidth="2"
                                    className="transition-all duration-200"
                                  />
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      </div>

                      <div className="flex justify-between pl-6 text-[9px] text-[#64748b] mt-0.5 font-mono select-none">
                        {activeCity.hourlyTrend.map((p) => (
                          <span key={p.time}>{p.time}</span>
                        ))}
                      </div>
                    </div>

                    {/* Lower HUD Row: Mini Radar Map + Resilience Score Gauge + Projections */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="bg-[#0b1b26]/75 rounded-lg p-2 border border-white/5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[10px] font-bold text-white mb-1">
                          <span>Risk Radar</span>
                          <Radio size={10} className="text-[#00f2fe]" />
                        </div>
                        <div className="relative h-14 rounded overflow-hidden">
                          <MiniRadarMap cityId={activeCity.id} />
                        </div>
                      </div>

                      <div className="bg-[#0b1b26]/75 rounded-lg p-2 border border-white/5 flex flex-col items-center justify-center text-center">
                        <div className="text-[10px] font-bold text-white mb-1">Resilience</div>
                        <div className="relative w-10 h-10">
                          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
                            <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="none" />
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              stroke="#1ed760"
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray={circumference}
                              strokeDashoffset={dashOffset}
                              strokeLinecap="round"
                              className="drop-shadow-[0_0_8px_rgba(30,215,96,0.7)] transition-all duration-700"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xs font-extrabold text-white leading-none tabular-data">
                              {activeCity.resilienceScore}
                            </span>
                            <span className="text-[7px] text-[#94a3b8] leading-none">/100</span>
                          </div>
                        </div>
                        <div className="text-[9px] text-[#1ed760] font-semibold mt-1 truncate">
                          {activeCity.resilienceStatus}
                        </div>
                      </div>

                      <div className="bg-[#0b1b26]/75 rounded-lg p-2 border border-white/5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[10px] font-bold text-white">
                          <span>{activeCity.futureProjection.year} Outlook</span>
                          <TrendingUp size={11} className="text-[#f59e0b]" />
                        </div>
                        <div className="my-auto py-0.5">
                          <div className="text-base font-extrabold text-[#f59e0b] drop-shadow-[0_0_10px_rgba(245,158,11,0.3)] tabular-data">
                            {activeCity.futureProjection.value}
                          </div>
                          <div className="text-[8.5px] text-[#94a3b8] mt-0.5 leading-snug truncate">
                            {activeCity.futureProjection.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TiltCard3D>
          </div>
        </div>
      </div>

      {/* 3D Isometric CAD Perspective Grid Floor */}
      <div className="lp-3d-grid-floor">
        <div className="lp-3d-grid-plane" />
      </div>

      {/* Subtle Scroll Indicator */}
      <div className="relative z-20 flex flex-col items-center justify-center py-1">
        <a
          href="#platform"
          className="flex flex-col items-center group cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            document.querySelector('#platform')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <div className="w-4 h-6 rounded-full border border-[#94a3b8]/40 flex items-start justify-center p-0.5 group-hover:border-[#1ed760] transition-colors">
            <div className="w-1 h-1.5 rounded-full bg-[#1ed760] animate-bounce" />
          </div>
          <span className="text-[8.5px] font-bold tracking-[2px] text-[#94a3b8] uppercase mt-1 group-hover:text-white transition-colors">
            SCROLL TO EXPLORE
          </span>
        </a>
      </div>
    </section>
  );
};

/* ──────────────────────────────────────────
   Interactive Digital Twin Simulation Lab
   Decadal Time-Travel Scrubber + Split Comparison
   ────────────────────────────────────────── */

const InteractiveLabSection: React.FC = () => {
  return (
    <section id="simulation-lab" className="relative py-20 lg:py-28 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#02070c] via-[#040e17] to-[#02070c] pointer-events-none" />
      <div
        className="absolute top-1/4 right-0 w-[650px] h-[450px] opacity-20 blur-[140px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse, rgba(0, 242, 254, 0.35) 0%, rgba(30, 215, 96, 0.15) 50%, transparent 75%)',
        }}
      />
      <div
        className="absolute bottom-10 left-0 w-[550px] h-[400px] opacity-15 blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(30, 215, 96, 0.3) 0%, transparent 70%)',
        }}
      />

      <div className="lp-container relative z-10 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto lp-reveal">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00f2fe]/10 border border-[#00f2fe]/30 mb-4">
            <Sliders size={13} className="text-[#00f2fe]" />
            <span className="text-[11px] font-extrabold tracking-widest text-[#00f2fe] uppercase">
              INTERACTIVE DIGITAL TWIN LAB
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold tracking-tight text-white mb-4">
            Simulate Decades in Seconds.
            <br />
            <span className="lp-gradient-shimmer">Stress-Test Every Capital Defense.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
            Drag through projected decadal climate futures, simulate thermodynamic cooling interventions, and compare unmitigated vulnerability with engineered resilience.
          </p>
        </div>

        {/* 1. Time Travel Scrubber Module */}
        <div className="lp-reveal">
          <TimeTravelScrubber />
        </div>

        {/* 2. Before / After Split Slider Module */}
        <div className="lp-reveal">
          <SplitComparisonSlider />
        </div>
      </div>
    </section>
  );
};

/* ──────────────────────────────────────────
   Developer & API Section
   ────────────────────────────────────────── */

const DeveloperSection: React.FC = () => {
  return (
    <section id="developer-api" className="relative py-20 lg:py-24 overflow-hidden border-t border-white/5">
      <div className="lp-container relative z-10">
        <DeveloperTerminal />
      </div>
    </section>
  );
};

/* ──────────────────────────────────────────
   Our Platform Section ("One Digital Twin")
   Interactive Spotlight Cards
   ────────────────────────────────────────── */

const PlatformSection: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <section id="platform" className="relative py-20 lg:py-28 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#02070c] via-[#040e17] to-[#02070c] pointer-events-none" />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[360px] opacity-25 blur-[140px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse, rgba(30, 215, 96, 0.28) 0%, rgba(0, 242, 254, 0.16) 50%, transparent 75%)',
        }}
      />

      <div className="lp-container relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 lp-reveal">
          <span className="lp-eyebrow">
            <Cpu size={14} /> OUR CORE PLATFORM
          </span>
          <h2 className="lp-section-heading text-3xl sm:text-4xl lg:text-[46px] mb-4">
            One Digital Twin.
            <br />
            <span className="lp-gradient-shimmer">A Clearer View of Climate Risk.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
            Institutional infrastructure engineered for data-backed certainty, deterministic scenario modeling, and auditable resilience planning.
          </p>
        </div>

        {/* 3 Spotlight Platform Cards with 3D Tilt */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 lp-3d-perspective"
          onMouseMove={handleMouseMove}
          style={
            {
              '--mouse-x': `${mousePos.x}px`,
              '--mouse-y': `${mousePos.y}px`,
            } as React.CSSProperties
          }
        >
          {/* Card 1: Climate Intelligence */}
          <TiltCard3D maxTilt={8} glareOpacity={0.2} className="h-full">
            <div className="group relative h-full rounded-2xl overflow-hidden border border-white/10 bg-[#061019]/80 backdrop-blur-2xl hover:border-[#1ed760]/50 transition-all duration-500 shadow-2xl lp-reveal lp-preserve-3d">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                  src="/card-climate-intel.jpg"
                  alt="Climate Intelligence digital twin map"
                  className="w-full h-full object-cover object-center opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#061019] via-[#061019]/80 to-transparent" />
              </div>

              <div className="relative z-10 p-7 flex flex-col justify-between min-h-[320px] lp-translate-z-20">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-[#1ed760]/15 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760] shadow-[0_0_15px_rgba(30,215,96,0.2)]">
                      <Globe size={24} />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00f2fe] bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-500/30">
                      SPATIAL VECTOR ENGINE
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Climate Intelligence</h3>
                  <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                    Continuous multi-satellite ingestion from Sentinel and Landsat. Detect urban heat pockets, flood corridors, and atmospheric inversions at 100m raster fidelity.
                  </p>
                </div>

                <div className="pt-6 flex items-center justify-between border-t border-white/10">
                  <Link
                    to="/dashboard"
                    className="text-xs font-bold text-white group-hover:text-[#1ed760] flex items-center gap-1.5 transition-colors uppercase tracking-wider"
                  >
                    Explore Digital Twin <ArrowRight size={14} />
                  </Link>
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white group-hover:bg-[#1ed760] group-hover:text-black transition-all">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          </TiltCard3D>

          {/* Card 2: Scenario Simulator */}
          <TiltCard3D maxTilt={8} glareOpacity={0.2} className="h-full">
            <div
              className="group relative h-full rounded-2xl overflow-hidden border border-white/10 bg-[#061019]/80 backdrop-blur-2xl hover:border-[#00f2fe]/50 transition-all duration-500 shadow-2xl lp-reveal lp-preserve-3d"
              style={{ transitionDelay: '0.1s' }}
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                  src="/card-scenario-sim.jpg"
                  alt="Deterministic Scenario Simulator"
                  className="w-full h-full object-cover object-center opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#061019] via-[#061019]/80 to-transparent" />
              </div>

              <div className="relative z-10 p-7 flex flex-col justify-between min-h-[320px] lp-translate-z-20">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-[#00f2fe]/15 border border-[#00f2fe]/30 flex items-center justify-center text-[#00f2fe] shadow-[0_0_15px_rgba(0,242,254,0.2)]">
                      <BarChart3 size={24} />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1ed760] bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      DETERMINISTIC V2.4
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Scenario Simulator</h3>
                  <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                    Model thermodynamic cooling of urban canopies, cool roof retrofits, and retention bioswales. Verify delta outcomes before committing municipal capital.
                  </p>
                </div>

                <div className="pt-6 flex items-center justify-between border-t border-white/10">
                  <Link
                    to="/simulations"
                    className="text-xs font-bold text-white group-hover:text-[#00f2fe] flex items-center gap-1.5 transition-colors uppercase tracking-wider"
                  >
                    Launch Simulator <ArrowRight size={14} />
                  </Link>
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white group-hover:bg-[#00f2fe] group-hover:text-black transition-all">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          </TiltCard3D>

          {/* Card 3: Resilience Planning */}
          <TiltCard3D maxTilt={8} glareOpacity={0.2} className="h-full">
            <div
              className="group relative h-full rounded-2xl overflow-hidden border border-white/10 bg-[#061019]/80 backdrop-blur-2xl hover:border-[#14b8a6]/50 transition-all duration-500 shadow-2xl lp-reveal lp-preserve-3d"
              style={{ transitionDelay: '0.2s' }}
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                  src="/card-resilience.jpg"
                  alt="Institutional Resilience Planning"
                  className="w-full h-full object-cover object-center opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#061019] via-[#061019]/80 to-transparent" />
              </div>

              <div className="relative z-10 p-7 flex flex-col justify-between min-h-[320px] lp-translate-z-20">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-[#14b8a6]/15 border border-[#14b8a6]/30 flex items-center justify-center text-[#14b8a6] shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                      <ShieldCheck size={24} />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#14b8a6] bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-500/30">
                      AI SYNTHESIS LAYER
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Resilience Planning</h3>
                  <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                    Synthesize multi-layer hazards into prioritized engineering recommendations, investment payback schedules, and certified ESG audit reports.
                  </p>
                </div>

                <div className="pt-6 flex items-center justify-between border-t border-white/10">
                  <Link
                    to="/solutions"
                    className="text-xs font-bold text-white group-hover:text-[#14b8a6] flex items-center gap-1.5 transition-colors uppercase tracking-wider"
                  >
                    View Solutions <ArrowRight size={14} />
                  </Link>
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white group-hover:bg-[#14b8a6] group-hover:text-black transition-all">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          </TiltCard3D>
        </div>
      </div>
    </section>
  );
};

/* ──────────────────────────────────────────
   Features Section
   ────────────────────────────────────────── */

const FeaturesSection: React.FC = () => (
  <section id="features" className="py-20 lg:py-28 bg-transparent relative">
    <div className="lp-container">
      <div className="text-center mb-16 lp-reveal">
        <span className="lp-eyebrow">
          <Layers size={14} /> INSTITUTIONAL CAPABILITIES
        </span>
        <h2 className="lp-section-heading text-2xl sm:text-3xl lg:text-4xl mb-3">
          Everything required to build
          <br className="hidden sm:block" /> verifiable climate resilience
        </h2>
        <p className="text-xs sm:text-sm text-[#94a3b8] max-w-lg mx-auto">
          Built for municipal governments, global engineering consultancies, and infrastructure risk underwriters.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="lp-card flex flex-col justify-between lp-reveal"
            style={{ transitionDelay: `${i * 0.08}s` }}
          >
            <div>
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/20 text-[#1ed760] mb-4">
                <Icon name={f.icon} size={22} />
              </div>
              {f.tag && (
                <div className="text-[9px] font-mono text-[#00f2fe] uppercase tracking-wider mb-2">
                  {f.tag}
                </div>
              )}
              <h3 className="text-sm font-bold text-white mb-2 leading-snug">{f.title}</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">{f.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ──────────────────────────────────────────
   Global Telemetry Metrics Grid
   ────────────────────────────────────────── */

const MetricsSection: React.FC = () => (
  <section className="py-16 bg-[#061019]/70 border-y border-white/5 relative overflow-hidden">
    <div className="lp-container">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={`lp-reveal flex flex-col items-center text-center ${
              i < metrics.length - 1 ? 'lg:border-r lg:border-white/10' : ''
            }`}
            style={{ transitionDelay: `${i * 0.12}s` }}
          >
            <div className="text-[#1ed760] mb-3 p-2 rounded-full bg-[#1ed760]/10">
              <Icon name={m.icon} size={24} />
            </div>
            <div className="text-3xl lg:text-4xl font-extrabold text-white mb-1 tabular-data tracking-tight">
              {m.value}
            </div>
            <div className="text-xs font-bold text-white/90">{m.label}</div>
            {m.sublabel && (
              <div className="text-[10px] font-mono text-[#94a3b8] mt-0.5">{m.sublabel}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ──────────────────────────────────────────
   How It Works / Architecture Pipeline
   ────────────────────────────────────────── */

const HowItWorksSection: React.FC = () => (
  <section id="how-it-works" className="py-20 lg:py-28 bg-transparent">
    <div className="lp-container">
      <div className="text-center mb-16 lp-reveal">
        <span className="lp-eyebrow">
          <Activity size={14} /> METHODOLOGY PIPELINE
        </span>
        <h2 className="lp-section-heading text-2xl sm:text-3xl lg:text-4xl mb-3">
          From Raw Satellite Feeds to Municipal Action
        </h2>
        <p className="text-xs sm:text-sm text-[#94a3b8] max-w-lg mx-auto">
          A transparent, reproducible 4-stage pipeline that removes guesswork from resilience engineering.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {/* Horizontal Connecting Guide Line */}
        <div
          className="hidden lg:block absolute top-14 left-[12%] right-[12%] h-[1.5px] bg-gradient-to-r from-[#1ed760]/10 via-[#00f2fe]/40 to-[#1ed760]/10"
          aria-hidden="true"
        />

        {howItWorksSteps.map((s, i) => (
          <div
            key={s.number}
            className="lp-card lp-reveal flex flex-col items-center text-center relative"
            style={{ transitionDelay: `${i * 0.12}s` }}
          >
            <div className="relative z-10 w-16 h-16 rounded-full bg-[#061019] border-2 border-[#1ed760]/40 flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110 shadow-[0_0_18px_rgba(30,215,96,0.2)]">
              <span className="text-[#1ed760]">
                <Icon name={s.icon} size={24} />
              </span>
            </div>
            <div className="text-[10px] font-mono font-bold text-[#00f2fe] uppercase tracking-widest mb-1">
              STAGE {s.number}
            </div>
            <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed mb-3">{s.description}</p>
            <div className="mt-auto pt-3 border-t border-white/5 text-[10.5px] text-[#64748b] leading-normal font-mono text-left w-full">
              {s.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ──────────────────────────────────────────
   Interactive Scenario Sandbox Component
   ────────────────────────────────────────── */

const ScenarioSimulationSection: React.FC = () => {
  const [selectedInterventionIndex, setSelectedInterventionIndex] = useState<number>(0);
  const activeIntervention = scenarioInterventions[selectedInterventionIndex];

  return (
    <section id="simulation" className="py-20 lg:py-28 bg-[#061019]/50 border-y border-white/5 relative">
      <div className="lp-container">
        <div className="text-center mb-12 lp-reveal">
          <span className="lp-eyebrow">
            <Sliders size={14} /> INTERACTIVE SCENARIO ENGINE
          </span>
          <h2 className="lp-section-heading text-2xl sm:text-3xl lg:text-4xl mb-3">
            Simulate Interventions. Quantify Returns.
          </h2>
          <p className="text-xs sm:text-sm text-[#94a3b8] max-w-xl mx-auto">
            Test real capital interventions against localized microclimates and verify immediate projected impacts before engineering kickoff.
          </p>
        </div>

        {/* Intervention Selection Tabs */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-10 lp-reveal">
          {scenarioInterventions.map((item, index) => {
            const isSelected = selectedInterventionIndex === index;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedInterventionIndex(index)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1ed760] text-black shadow-[0_0_18px_rgba(30,215,96,0.35)]'
                    : 'bg-[#061019] text-[#94a3b8] border border-white/10 hover:text-white hover:border-white/25'
                }`}
              >
                <Icon name={item.icon} size={15} />
                <span>{item.title}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-black/20 text-black' : 'bg-white/5 text-[#00f2fe]'
                }`}>
                  {item.category}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Before vs. After Simulation Dashboard with 3D Tilt */}
        <div className="max-w-4xl mx-auto lp-reveal lp-3d-perspective">
          <TiltCard3D maxTilt={5} glareOpacity={0.12} className="w-full">
            <div className="rounded-2xl bg-[#07131e]/90 border border-[#1ed760]/25 shadow-[0_20px_50px_rgba(0,0,0,0.75)] p-6 lg:p-8 backdrop-blur-2xl lp-preserve-3d">
              {/* Header Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <div className="text-xs font-mono text-[#00f2fe] uppercase tracking-wider mb-1">
                  PROPOSED MUNICIPAL INTERVENTION
                </div>
                <h3 className="text-xl font-bold text-white">{activeIntervention.title}</h3>
                <p className="text-xs text-[#94a3b8] mt-1 max-w-md">
                  {activeIntervention.impactSummary}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-[#94a3b8]">Capital Expenditure</div>
                  <div className="text-sm font-bold text-white font-mono">
                    {activeIntervention.investmentCost}
                  </div>
                </div>
                <div className="w-[1px] h-8 bg-white/10" />
                <div className="text-right">
                  <div className="text-xs text-[#94a3b8]">Carbon Sequestration</div>
                  <div className="text-sm font-bold text-[#1ed760] font-mono">
                    {activeIntervention.co2Offset}
                  </div>
                </div>
              </div>
            </div>

            {/* Side-by-Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              {/* Baseline State */}
              <div className="rounded-xl bg-[#040b10] border border-white/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                    BASELINE (STATUS QUO)
                  </span>
                  <span className="text-[10px] font-mono text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-500/20">
                    UNMITIGATED
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-[#94a3b8] flex items-center gap-1.5">
                      <Thermometer size={14} className="text-red-400" /> Surface Temp
                    </span>
                    <span className="font-bold text-white">{activeIntervention.before.temperature}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-[#94a3b8] flex items-center gap-1.5">
                      <Sun size={14} className="text-amber-400" /> Heat Stress Index
                    </span>
                    <span className="font-bold text-amber-400">{activeIntervention.before.heatRisk}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-[#94a3b8] flex items-center gap-1.5">
                      <Wind size={14} className="text-teal-400" /> Air Quality
                    </span>
                    <span className="font-bold text-white">{activeIntervention.before.aqi}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-[#94a3b8] flex items-center gap-1.5">
                      <Droplets size={14} className="text-cyan-400" /> Stormwater Runoff
                    </span>
                    <span className="font-bold text-white">{activeIntervention.before.floodRisk}</span>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#94a3b8]">Resilience Score</span>
                      <span className="font-bold text-white">{activeIntervention.before.resilience}/100</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${activeIntervention.before.resilience}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulated Intervention State */}
              <div className="rounded-xl bg-[#040b10] border border-[#1ed760]/35 p-5 shadow-[0_0_20px_rgba(30,215,96,0.1)]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-[#1ed760] uppercase tracking-wider flex items-center gap-1">
                    AFTER INTERVENTION <Sparkles size={13} />
                  </span>
                  <span className="text-[10px] font-mono text-[#1ed760] bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
                    SIMULATED
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-[#94a3b8] flex items-center gap-1.5">
                      <Thermometer size={14} className="text-[#1ed760]" /> Surface Temp
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1ed760]">{activeIntervention.after.temperature}</span>
                      <span className="text-[10px] font-mono text-[#1ed760] bg-[#1ed760]/10 px-1.5 py-0.5 rounded">
                        {activeIntervention.deltas.temp}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-[#94a3b8] flex items-center gap-1.5">
                      <Sun size={14} className="text-[#1ed760]" /> Heat Stress Index
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{activeIntervention.after.heatRisk}</span>
                      <span className="text-[10px] font-mono text-[#1ed760] bg-[#1ed760]/10 px-1.5 py-0.5 rounded">
                        {activeIntervention.deltas.heatRisk}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-[#94a3b8] flex items-center gap-1.5">
                      <Wind size={14} className="text-[#1ed760]" /> Air Quality
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{activeIntervention.after.aqi}</span>
                      <span className="text-[10px] font-mono text-[#1ed760] bg-[#1ed760]/10 px-1.5 py-0.5 rounded">
                        {activeIntervention.deltas.aqi}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-[#94a3b8] flex items-center gap-1.5">
                      <Droplets size={14} className="text-[#00f2fe]" /> Stormwater Runoff
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{activeIntervention.after.floodRisk}</span>
                      <span className="text-[10px] font-mono text-[#00f2fe] bg-cyan-950/60 px-1.5 py-0.5 rounded">
                        {activeIntervention.deltas.flood}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#94a3b8]">Resilience Score</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#1ed760]">{activeIntervention.after.resilience}/100</span>
                        <span className="text-[10px] font-mono text-[#1ed760] bg-[#1ed760]/10 px-1 rounded">
                          {activeIntervention.deltas.resilience}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1ed760] rounded-full transition-all duration-700"
                        style={{ width: `${activeIntervention.after.resilience}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulator Action Button */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/10">
              <span className="text-xs text-[#94a3b8]">
                Customizable parameters for tree species, albedo SRI, soil permeability, and budget.
              </span>
              <Link
                to="/simulations"
                className="lp-btn-primary text-xs px-6 py-3 shadow-[0_0_20px_rgba(30,215,96,0.3)]"
              >
                OPEN FULL SIMULATOR <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </TiltCard3D>
      </div>
    </div>
  </section>
  );
};

/* ──────────────────────────────────────────
   Interactive AI Advisor Console Section
   ────────────────────────────────────────── */

const AIAdvisorSection: React.FC = () => {
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number>(0);
  const activePrompt = aiAdvisorPrompts[selectedPromptIndex];

  return (
    <section id="ai-advisor" className="py-20 lg:py-28 bg-transparent">
      <div className="lp-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Context & Prompt Selector Chips */}
          <div className="lg:col-span-5 lp-reveal">
            <span className="lp-eyebrow">
              <Brain size={14} /> INSTITUTIONAL REASONING ENGINE
            </span>
            <h2 className="lp-section-heading text-2xl sm:text-3xl lg:text-4xl mb-4">
              Turn Climate Data Into Defensible Capital Decisions.
            </h2>
            <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed mb-6">
              The AI Climate Advisor synthesizes localized satellite telemetry with peer-reviewed IPCC and NASA methodologies to deliver prioritized resilience roadmaps.
            </p>

            <div className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              SELECT INSTITUTIONAL INQUIRY:
            </div>

            {/* Prompt Selector Buttons */}
            <div className="space-y-2.5">
              {aiAdvisorPrompts.map((p, idx) => {
                const isSelected = selectedPromptIndex === idx;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPromptIndex(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0b1b26] border-[#1ed760]/50 shadow-[0_0_16px_rgba(30,215,96,0.15)]'
                        : 'bg-[#061019]/60 border-white/5 hover:border-white/20 text-[#94a3b8]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase mb-1">
                      <span className={isSelected ? 'text-[#1ed760] font-bold' : 'text-[#64748b]'}>
                        {p.category}
                      </span>
                      <span className="text-[#00f2fe]">{p.confidence}</span>
                    </div>
                    <div className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-[#94a3b8]'}`}>
                      {p.question}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: AI Reasoning Chamber Preview with 3D Tilt */}
          <div className="lg:col-span-7 lp-reveal lp-3d-perspective" style={{ transitionDelay: '0.12s' }}>
            <TiltCard3D maxTilt={6} glareOpacity={0.16} className="w-full">
              <div className="rounded-2xl bg-[#07131e]/95 border border-[#1ed760]/30 shadow-[0_16px_45px_rgba(0,0,0,0.7)] overflow-hidden backdrop-blur-2xl lp-preserve-3d">
                {/* Console Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#040b10]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#1ed760]/15 flex items-center justify-center text-[#1ed760]">
                      <Brain size={16} />
                    </div>
                    <span className="text-xs font-bold text-white tracking-wider">
                      CLIMATE REASONING CORE
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-[#00f2fe] bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                      PAYBACK: {activePrompt.projectedPayback}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-[#1ed760]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] lp-beacon" />
                      ONLINE
                    </span>
                  </div>
                </div>

                {/* Inquiry Prompt */}
                <div className="px-6 py-4 bg-[#091724]/40 border-b border-white/5">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-[#94a3b8] text-[10px] font-bold">
                      Q
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-[#94a3b8] uppercase">
                        MUNICIPAL QUERY
                      </div>
                      <div className="text-sm font-semibold text-white mt-0.5">
                        {activePrompt.question}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations Body */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
                    <Sparkles size={14} className="text-[#1ed760]" />
                    <span>Verified Interventions & Spatial Actions:</span>
                  </div>

                  <div className="space-y-2.5">
                    {activePrompt.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-[#040b10]/80 border border-white/5"
                      >
                        <div className="text-[#1ed760] mt-0.5 shrink-0">
                          <CheckCircle size={15} />
                        </div>
                        <span className="text-xs text-white/90 leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>

                  {/* Citations & Evidence Footer */}
                  <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[#64748b]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[#94a3b8]">GROUND TRUTH CITATIONS:</span>
                      {activePrompt.citations.map((c, idx) => (
                        <span key={idx} className="bg-white/5 px-2 py-0.5 rounded text-[#94a3b8]">
                          {c}
                        </span>
                      ))}
                    </div>
                    <Link
                      to="/solutions"
                      className="text-[#1ed760] hover:underline font-bold uppercase tracking-wider"
                    >
                      Open Solutions Matrix →
                    </Link>
                  </div>
                </div>
              </div>
            </TiltCard3D>
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
  <section id="use-cases" className="py-20 lg:py-28 bg-[#061019]/50 border-y border-white/5">
    <div className="lp-container">
      <div className="text-center mb-16 lp-reveal">
        <span className="lp-eyebrow">
          <Building size={14} /> ADAPTED FOR INDUSTRY
        </span>
        <h2 className="lp-section-heading text-2xl sm:text-3xl lg:text-4xl mb-3">
          Engineered for Teams Driving Physical Climate Action
        </h2>
        <p className="text-xs sm:text-sm text-[#94a3b8] max-w-lg mx-auto">
          From municipal resiliency officers to global asset managers, GeoTwin 360 delivers institutional rigor.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {useCases.map((u, i) => (
          <div
            key={u.title}
            className="lp-card flex flex-col justify-between lp-reveal"
            style={{ transitionDelay: `${i * 0.08}s` }}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/20 flex items-center justify-center text-[#1ed760]">
                  <Icon name={u.icon} size={20} />
                </div>
                {u.badge && (
                  <span className="text-[9px] font-mono text-[#00f2fe] uppercase tracking-wider bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/20">
                    {u.badge}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{u.title}</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">{u.description}</p>
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
  <section id="about" className="relative py-24 lg:py-32 overflow-hidden">
    {/* Background Glows */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#1ed760]/10 via-[#061019] to-[#02070c]" />
    <div className="absolute inset-0 bg-gradient-to-r from-[#02070c]/90 via-transparent to-[#02070c]/90" />
    <div
      className="absolute right-1/4 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[130px] pointer-events-none"
      style={{
        background: 'radial-gradient(circle, #1ed760 0%, #00f2fe 50%, transparent 80%)',
      }}
    />

    <div className="lp-container relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: CTA Content */}
        <div className="lg:col-span-7 lp-reveal">
          <span className="lp-eyebrow">
            <Leaf size={14} /> DE-RISK THE NEXT CENTURY
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold text-white leading-tight mb-5">
            Let's build a climate-resilient future together.
          </h2>
          <p className="text-sm sm:text-base text-[#94a3b8] max-w-xl mb-8 leading-relaxed">
            Deploy deterministic physics simulations, real-time spatial digital twins, and certified ESG dossiers. Zero guesswork. Absolute institutional certainty.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/dashboard" className="lp-btn-primary text-sm px-8 py-4">
              LAUNCH LIVE DIGITAL TWIN <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/reports" className="lp-btn-secondary text-sm px-7 py-4">
              VIEW SAMPLE AUDIT REPORT
            </Link>
          </div>
        </div>

        {/* Right Column: Visual Seedling Asset */}
        <div className="lg:col-span-5 lp-reveal flex justify-center lg:justify-end" style={{ transitionDelay: '0.1s' }}>
          <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.8)] max-w-sm w-full group">
            <img
              src="/plant-seedling.jpg"
              alt="Climate Resilience Seedling"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              width={400}
              height={300}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#02070c]/90 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-xs font-mono text-white/90 bg-[#02070c]/80 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10">
              <span className="text-[#1ed760] font-bold">100% AUDITABLE:</span> Physical climate resilience backed by mathematical verification.
            </div>
          </div>
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
    <footer className="bg-[#03080e] border-t border-white/10 pt-14 pb-8 relative z-10">
      <div className="lp-container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full p-0.5 border border-[#1ed760]/30 bg-[#061019] flex items-center justify-center">
                <img
                  src="/apple-touch-icon.png"
                  alt="GeoTwin 360"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="text-base font-extrabold text-white tracking-wide">
                GeoTwin <span className="text-[#1ed760]">360</span>
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] max-w-sm">
              Institutional Climate Intelligence & Digital Twin Infrastructure for a Sustainable Future.
            </p>
          </div>

          {/* Nav Links */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs font-semibold text-[#94a3b8] hover:text-white transition-colors duration-200"
                onClick={(e) => handleAnchorClick(e, link.href)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Legal & Status Bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#64748b]">
          <span>© 2026 GeoTwin 360. All rights reserved. Zero fake metrics policy.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#1ed760]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760]" />
              Institutional Telemetry Active
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              Built for planetary resilience.
            </span>
          </div>
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );

    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(setupRevealObserver, 100);
    return () => clearTimeout(timer);
  }, [setupRevealObserver]);

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
      <Navbar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
      <main id="main-content">
        <HeroSection onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
        <InstitutionalMarquee />
        <InteractiveLabSection />
        <PlatformSection />
        <FeaturesSection />
        <MetricsSection />
        <HowItWorksSection />
        <DeveloperSection />
        <ScenarioSimulationSection />
        <AIAdvisorSection />
        <UseCasesSection />
        <FinalCTASection />
      </main>
      <Footer />

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
};

export default LandingPage;
