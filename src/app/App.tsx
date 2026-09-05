import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ui/ErrorBoundary.js';
import { Layout } from './Layout.js';
import { LocationProvider } from '../context/LocationContext.js';

import { DashboardPage } from '../features/dashboard/DashboardPage.js';
import { MapPage } from '../features/map/MapPage.js';
import { PredictionsPage } from '../features/predictions/PredictionsPage.js';
import { SimulatorPage } from '../features/simulation/SimulatorPage.js';
import { SolutionsPage } from '../features/solutions/SolutionsPage.js';
import { ReportsPage } from '../features/reports/ReportsPage.js';
import { SettingsPage } from '../features/settings/SettingsPage.js';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <LocationProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/predictions" element={<PredictionsPage />} />
              <Route path="/simulations" element={<SimulatorPage />} />
              <Route path="/simulator" element={<SimulatorPage />} />
              <Route path="/solutions" element={<SolutionsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </LocationProvider>
      </Router>
    </ErrorBoundary>
  );
};
export default App;
