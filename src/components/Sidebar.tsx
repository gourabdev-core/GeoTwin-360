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
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const routerLocation = useLocation();

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
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-dark-surface border-r border-border-gray flex flex-col z-50 transform lg:static lg:translate-x-0 lg:opacity-100 lg:z-auto flex-shrink-0 transition-all duration-300 ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border-gray">
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-spotify-green animate-pulse" />
            <span className="text-base font-title font-bold text-text-base uppercase tracking-wider select-none">
              GeoTwin 360
            </span>
          </div>
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
              onClick={onClose}
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
      </aside>
    </>
  );
};
export default Sidebar;
