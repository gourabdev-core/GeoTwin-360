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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 bg-dark-surface border-border-gray flex flex-col z-50 transform lg:static lg:z-auto flex-shrink-0 transition-all duration-300 ease-in-out ${
          isOpen
            ? 'w-64 translate-x-0 opacity-100 border-r'
            : 'w-64 -translate-x-full opacity-0 pointer-events-none lg:w-0 lg:translate-x-0 lg:border-r-0 lg:overflow-hidden'
        }`}
        aria-label="Sidebar Navigation"
      >
        <div className="w-64 min-w-[16rem] h-full flex flex-col">
          {/* Brand / Logo + Close Button */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-border-gray">
            <NavLink
              to="/dashboard"
              className="flex items-center space-x-2.5 min-w-0 group"
              title="GeoTwin 360 Dashboard"
            >
              <img
                src="/apple-touch-icon.png"
                alt="GeoTwin 360 Favicon"
                className="w-7 h-7 rounded-full object-cover flex-shrink-0 shadow-sm ring-1 ring-white/10 group-hover:ring-spotify-green/40 transition-all"
              />
              <span className="text-base font-title font-bold text-text-base tracking-wider select-none truncate group-hover:text-spotify-green transition-colors">
                GeoTwin 360
              </span>
            </NavLink>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-text-silver hover:text-text-base hover:bg-mid-dark transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-spotify-green"
              aria-label="Close sidebar"
              title="Close sidebar"
              id="close-sidebar-btn"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation list */}
          <nav className="flex-grow py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={{
                  pathname: item.to,
                  search: routerLocation.search,
                }}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-2.5 rounded-md text-sm transition-all duration-150 font-semibold select-none ${
                    isActive
                      ? 'bg-mid-dark text-spotify-green shadow-sm'
                      : 'text-text-silver hover:bg-mid-dark/50 hover:text-text-base'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom Close Sidebar action */}
          <div className="p-3 border-t border-border-gray">
            <button
              type="button"
              onClick={onClose}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-xs font-semibold text-text-silver hover:text-text-base hover:bg-mid-dark/60 transition-colors cursor-pointer border border-border-gray/40 hover:border-border-gray focus:outline-none focus:ring-1 focus:ring-spotify-green"
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
