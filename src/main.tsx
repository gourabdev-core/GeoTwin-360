import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.js';
import './index.css';
import { sanitizeErrorMessage } from './utils/errorSanitizer.js';

// Global resilience handler: Ensure no unhandled promise rejections reach the browser unhandled
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const cleanMessage = sanitizeErrorMessage(event.reason);
    console.warn('[GeoTwin 360 Resilient Handler] Caught unhandled rejection:', cleanMessage);
    // Prevent unhandled rejection error from bubbling to browser console error log
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    if (event.message?.includes('ResizeObserver') || event.message?.includes('Script error')) {
      // Benign browser layout events
      event.preventDefault();
      return;
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

