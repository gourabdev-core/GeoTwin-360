import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  TrendingUp,
  Sliders,
  Award,
  FileText,
  Settings,
  X,
  PanelLeftClose,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const routerLocation = useLocation();

  const handleNavClick = () => {
    // Auto-close sidebar on smaller screens when navigating
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose();
    }
  };

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
    },
    {
      to: '/map',
      label: 'Map Explorer',
      icon: <Map size={18} />,
    },
    {
      to: '/predictions',
      label: 'Climate Predictions',
      icon: <TrendingUp size={18} />,
    },
    {
      to: '/simulations',
      label: 'Scenario Simulator',
      icon: <Sliders size={18} />,
    },
    {
      to: '/solutions',
      label: 'Resilience Solutions',
      icon: <Award size={18} />,
    },
    {
      to: '/reports',
      label: 'Saved Reports',
      icon: <FileText size={18} />,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: <Settings size={18} />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 bg-[#091614]/95 backdrop-blur-xl border-white/[0.07] flex flex-col z-50 transform lg:static lg:z-auto flex-shrink-0 transition-all duration-300 ease-in-out ${
          isOpen
            ? 'w-64 translate-x-0 opacity-100 border-r'
            : 'w-64 -translate-x-full opacity-0 pointer-events-none lg:w-0 lg:translate-x-0 lg:border-r-0 lg:overflow-hidden'
        }`}
        aria-label="Sidebar Navigation"
      >
        <div className="w-64 min-w-[16rem] h-full flex flex-col">
          {/* Brand / Logo + Close Button */}
          <div className="h-20 flex items-center justify-between px-5 border-b border-white/[0.07]">
            <NavLink
              to="/dashboard"
              className="flex items-center space-x-3 min-w-0 group"
              title="GeoTwin 360 Dashboard"
            >
              <div className="relative">
                <img
                  src="/apple-touch-icon.png"
                  alt="GeoTwin 360 Logo"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10 group-hover:ring-[#32f26b]/50 transition-all duration-200"
                />
                <span className="absolute inset-0 rounded-full blur-[6px] bg-[#32f26b]/15 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="min-w-0">
                <span className="text-base font-title font-bold text-[#f5fff8] tracking-tight block truncate group-hover:text-[#32f26b] transition-colors">
                  GeoTwin 360
                </span>
                <span className="text-[10px] text-[#8ea39a] block uppercase tracking-widest font-semibold truncate">
                  Climate Digital Twin
                </span>
              </div>
            </NavLink>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8ea39a] hover:text-[#f5fff8] hover:bg-white/[0.06] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#32f26b]"
              aria-label="Close sidebar"
              title="Close sidebar"
              id="close-sidebar-btn"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation list */}
          <nav className="flex-grow py-5 px-3 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={{
                  pathname: item.to,
                  search: routerLocation.search,
                }}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 font-medium select-none ${
                    isActive
                      ? 'bg-[#0d1b18] text-[#32f26b] border border-[#32f26b]/20 shadow-[0_2px_12px_rgba(50,242,107,0.1)] font-semibold'
                      : 'text-[#8ea39a] hover:bg-white/[0.04] hover:text-[#f5fff8]'
                  }`
                }
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom Close Sidebar action */}
          <div className="p-3 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={onClose}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#8ea39a] hover:text-[#f5fff8] hover:bg-white/[0.04] transition-colors cursor-pointer border border-white/[0.07] hover:border-white/15 focus:outline-none focus:ring-1 focus:ring-[#32f26b]"
              aria-label="Close sidebar"
              id="close-sidebar-bottom-btn"
            >
              <PanelLeftClose size={15} />
              <span>Close Sidebar</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
