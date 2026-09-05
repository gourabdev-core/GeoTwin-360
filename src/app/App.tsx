import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ui/ErrorBoundary.js';
import { Layout } from './Layout.js';
import { LocationProvider } from '../context/LocationContext.js';
import { WeatherProvider } from '../context/WeatherContext.js';
import { AuthProvider } from '../context/AuthContext.js';
import { PreferencesProvider } from '../context/PreferencesContext.js';

import { DashboardPage } from '../features/dashboard/DashboardPage.js';
import { MapPage } from '../features/map/MapPage.js';
import { PredictionsPage } from '../features/predictions/PredictionsPage.js';
import { SimulatorPage } from '../features/simulation/SimulatorPage.js';
import { SolutionsPage } from '../features/solutions/SolutionsPage.js';
import { ReportsPage } from '../features/reports/ReportsPage.js';
import { SettingsPage } from '../features/settings/SettingsPage.js';

export const App: React.FC = () => {
  return (
    <ErrorBoundary title="GeoTwin 360 Shell Recovery">
      <Router>
        <AuthProvider>
          <PreferencesProvider>
            <LocationProvider>
              <WeatherProvider>
                <Layout>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <ErrorBoundary title="Dashboard Unavailable">
                          <DashboardPage />
                        </ErrorBoundary>
                      }
                    />
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
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </WeatherProvider>
            </LocationProvider>
          </PreferencesProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};
export default App;
