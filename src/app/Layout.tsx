import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Sidebar } from '../components/Sidebar.js';
import { TopHeader } from '../components/TopHeader.js';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
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
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-near-black text-text-base overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-amber-950/80 border-b border-amber-600/30 px-6 py-2 text-xs text-amber-200 flex items-center justify-between z-50">
            <div className="flex items-center space-x-2">
              <WifiOff size={14} className="text-amber-400 shrink-0" />
              <span>
                <strong>Offline Mode Active:</strong> Network connection interrupted. Viewing cached climate observations and models.
              </span>
            </div>
            <button
              onClick={handleCheckConnection}
              disabled={checkingConnection}
              className="flex items-center space-x-1 underline hover:text-white transition-colors cursor-pointer text-xs font-semibold disabled:opacity-50"
              aria-label="Check internet connection"
            >
              <RefreshCw size={12} className={checkingConnection ? 'animate-spin' : ''} />
              <span>{checkingConnection ? 'Checking...' : 'Check connection'}</span>
            </button>
          </div>
        )}

        <TopHeader onToggleSidebar={toggleSidebar} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
export default Layout;

