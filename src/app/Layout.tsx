import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Sidebar } from '../components/Sidebar.js';
import { TopHeader } from '../components/TopHeader.js';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('geotwin_sidebar_open');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [checkingConnection, setCheckingConnection] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCheckConnection = async () => {
    setCheckingConnection(true);
    try {
      // Light ping to test real connectivity
      await fetch('/api/v1/health', { method: 'HEAD', cache: 'no-store' });
      setIsOnline(true);
    } catch {
      setIsOnline(navigator.onLine);
    } finally {
      setCheckingConnection(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('geotwin_sidebar_open', String(next));
      }
      return next;
    });
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('geotwin_sidebar_open', 'false');
    }
  };

  return (
    <div className="flex h-screen bg-atmospheric text-[#f5fff8] overflow-hidden relative">
      {/* Subtle Static Environmental Glows */}
      <div
        className="fixed top-0 right-1/4 w-[600px] h-[350px] rounded-full pointer-events-none -z-10 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(50, 242, 107, 0.035) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-0 left-1/3 w-[700px] h-[400px] rounded-full pointer-events-none -z-10 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(25, 217, 197, 0.025) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-[#1a1407]/90 backdrop-blur-md border-b border-[#ffa42b]/30 px-3 sm:px-6 py-2 sm:py-2.5 text-xs text-[#fed7aa] flex items-center justify-between z-50 gap-2">
            <div className="flex items-center space-x-2.5">
              <WifiOff size={14} className="text-[#ffa42b] shrink-0" />
              <span>
                <strong className="text-white">Offline Mode Active:</strong> Network connection interrupted. Viewing cached climate observations and digital-twin models.
              </span>
            </div>
            <button
              onClick={handleCheckConnection}
              disabled={checkingConnection}
              className="flex items-center space-x-1.5 underline hover:text-white transition-colors cursor-pointer text-xs font-semibold disabled:opacity-50"
              aria-label="Check internet connection"
            >
              <RefreshCw size={12} className={checkingConnection ? 'animate-spin' : ''} />
              <span>{checkingConnection ? 'Checking...' : 'Check connection'}</span>
            </button>
          </div>
        )}

        <TopHeader onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
export default Layout;
