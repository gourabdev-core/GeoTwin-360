import axios from 'axios';
import { supabase } from '../config/supabase.js';
import { sanitizeErrorMessage, stripSensitiveInformation } from '../utils/errorSanitizer.js';

export interface APIErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      config.headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {
    // Graceful fallback for offline / unauthenticated states
  }
  return config;
});

const MAX_CONNECTION_RETRIES = 2;
const RETRY_DELAY_MS = 600;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const config = error.config;
    const isGet = config && (!config.method || config.method.toLowerCase() === 'get');
    const isConnError =
      !error.response ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ERR_NETWORK' ||
      (error.response?.status === 503 && error.response?.data?.error?.code === 'BACKEND_UNAVAILABLE');

    // Bounded startup retry protection: Retry GET requests up to 2 times during server startup
    if (isGet && isConnError && config) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      if (config.__retryCount <= MAX_CONNECTION_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return apiClient(config);
      }
    }

    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'Something went wrong while loading this page.';
    let details: Record<string, any> = {};

    if (error.response) {
      const responseData = error.response.data;
      const status = error.response.status;

      if (status === 503 && responseData?.error?.code === 'BACKEND_UNAVAILABLE') {
        errorCode = 'BACKEND_UNAVAILABLE';
        errorMessage = 'GeoTwin 360 backend is unreachable on port 3001. Please verify the server is running.';
      } else if (
        status === 503 &&
        (responseData?.error?.code === 'GEMINI_SERVICE_UNAVAILABLE' ||
          responseData?.error?.code === 'GEMINI_SERVER_ERROR' ||
          responseData?.error?.code === 'UNAVAILABLE' ||
          responseData?.error?.code === 'ServiceUnavailable' ||
          responseData?.error?.message?.toLowerCase().includes('serviceunavailable') ||
          responseData?.error?.message?.toLowerCase().includes('service unavailable'))
      ) {
        errorCode = 'GEMINI_SERVICE_UNAVAILABLE';
        errorMessage = 'Gemini AI reasoning service is temporarily unavailable. Core GeoTwin features remain fully operational.';
      } else if (status === 429) {
        if (
          responseData?.error?.code === 'GEMINI_DAILY_QUOTA_EXCEEDED' ||
          responseData?.error?.message?.toLowerCase().includes('daily quota') ||
          responseData?.error?.message?.toLowerCase().includes('generaterequestsperday')
        ) {
          errorCode = 'GEMINI_DAILY_QUOTA_EXCEEDED';
          errorMessage = 'AI analysis is temporarily unavailable because the Gemini daily quota has been reached. Core GeoTwin features remain available.';
        } else {
          errorCode = 'RATE_LIMIT_EXCEEDED';
          errorMessage = 'AI rate limit reached. Intelligent deterministic fallback model active.';
        }
      } else if (status === 401 || status === 403) {
        if (
          responseData?.error?.code === 'GEMINI_INVALID_KEY' ||
          responseData?.error?.code === 'GEMINI_NOT_CONFIGURED'
        ) {
          errorCode = responseData.error.code;
          errorMessage = 'Gemini API authentication failed or key is missing on the server.';
        } else if (responseData?.error?.code === 'GEMINI_PERMISSION_DENIED') {
          errorCode = 'GEMINI_PERMISSION_DENIED';
          errorMessage = 'Gemini API access denied or project billing required.';
        } else {
          errorCode = 'UNAUTHORIZED';
          errorMessage = 'Authentication required. Please sign in to continue.';
        }
      } else if (status === 404) {
        errorCode = 'NOT_FOUND';
        errorMessage = responseData?.error?.message || 'The requested resource was not found.';
      } else if (responseData && responseData.error) {
        errorCode = responseData.error.code || errorCode;
        errorMessage = sanitizeErrorMessage(responseData.error.message || errorMessage);
      } else {
        errorMessage = `Service returned status ${status}. Please try again shortly.`;
      }
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorCode = 'TIMEOUT';
      errorMessage = 'Request timed out. Please try again.';
    } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
      errorCode = 'NETWORK_ERROR';
      errorMessage = 'Network connection offline. Operating with local data.';
    } else if (error.code === 'ECONNREFUSED') {
      errorCode = 'BACKEND_UNAVAILABLE';
      errorMessage = 'Could not connect to the GeoTwin 360 backend on port 3001. Please ensure the server is running.';
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      errorCode = 'PROXY_ERROR';
      errorMessage = 'Network error communicating with the GeoTwin 360 backend proxy. Please verify frontend and backend connectivity.';
    } else if (error.request) {
      errorCode = 'NETWORK_ERROR';
      errorMessage = 'Unable to reach the server. Please check your network connection.';
    } else {
      errorMessage = sanitizeErrorMessage(error.message);
    }

    const normalizedError = {
      code: errorCode,
      message: errorMessage,
      details: stripSensitiveInformation(details),
    };

    // Log sanitized warning instead of polluting with raw error stack
    console.warn(`[API Response Handler] ${normalizedError.code}: ${normalizedError.message}`);

    return Promise.reject(normalizedError);
  }
);

