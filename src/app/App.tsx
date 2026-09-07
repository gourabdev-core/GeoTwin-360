import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ui/ErrorBoundary.js';
import { Layout } from './Layout.js';
import { LocationProvider } from '../context/LocationContext.js';
import { WeatherProvider } from '../context/WeatherContext.js';
import { AuthProvider } from '../context/AuthContext.js';
import { PreferencesProvider } from '../context/PreferencesContext.js';

import { LandingPage } from '../features/landing/LandingPage.js';
import { DashboardPage } from '../features/dashboard/DashboardPage.js';
import { MapPage } from '../features/map/MapPage.js';
import { PredictionsPage } from '../features/predictions/PredictionsPage.js';
import { SimulatorPage } from '../features/simulation/SimulatorPage.js';
import { SolutionsPage } from '../features/solutions/SolutionsPage.js';
import { ReportsPage } from '../features/reports/ReportsPage.js';
import { SettingsPage } from '../features/settings/SettingsPage.js';

/**
 * AppRoutes rendered inside the Layout shell (sidebar + header).
 * These are the authenticated/app routes.
 */
const AppRoutes: React.FC = () => (
  <Layout>
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ErrorBoundary title="Dashboard Unavailable">
            <DashboardPage />
          </ErrorBoundary>
        }
      />
      <Route
        path="/map"
        element={
          <ErrorBoundary title="Map Explorer Unavailable">
            <MapPage />
          </ErrorBoundary>
        }
      />
      <Route
        path="/predictions"
        element={
          <ErrorBoundary title="Climate Predictions Unavailable">
            <PredictionsPage />
          </ErrorBoundary>
        }
      />
      <Route
        path="/simulations"
        element={
          <ErrorBoundary title="Scenario Simulator Unavailable">
            <SimulatorPage />
          </ErrorBoundary>
        }
      />
      <Route
        path="/simulator"
        element={
          <ErrorBoundary title="Scenario Simulator Unavailable">
            <SimulatorPage />
          </ErrorBoundary>
        }
      />
      <Route
        path="/solutions"
        element={
          <ErrorBoundary title="Resilience Solutions Unavailable">
            <SolutionsPage />
          </ErrorBoundary>
        }
      />
      <Route
        path="/reports"
        element={
          <ErrorBoundary title="Saved Reports Unavailable">
            <ReportsPage />
          </ErrorBoundary>
        }
      />
      <Route
        path="/settings"
        element={
          <ErrorBoundary title="Settings Unavailable">
            <SettingsPage />
          </ErrorBoundary>
        }
      />
      {/* Redirect unknown app routes to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Layout>
);

export const App: React.FC = () => {
  return (
    <ErrorBoundary title="GeoTwin 360 Shell Recovery">
      <Router>
        <AuthProvider>
          <PreferencesProvider>
            <LocationProvider>
              <WeatherProvider>
                <Routes>
                  {/* Landing page: rendered without Layout (no sidebar/header) */}
                  <Route
                    path="/"
                    element={
                      <ErrorBoundary title="Landing Page Unavailable">
                        <LandingPage />
                      </ErrorBoundary>
                    }
                  />
                  {/* All app routes: rendered inside Layout */}
                  <Route path="/*" element={<AppRoutes />} />
                </Routes>
              </WeatherProvider>
            </LocationProvider>
          </PreferencesProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};
export default App;

