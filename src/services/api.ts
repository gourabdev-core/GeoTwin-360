import axios from 'axios';

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

apiClient.interceptors.response.use(
  (response) => response,
  (error: any) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'Something went wrong while loading this page.';
    let details = {};

    if (error.response) {
      const responseData = error.response.data;
      if (responseData && responseData.error) {
        errorCode = responseData.error.code || errorCode;
        errorMessage = responseData.error.message || errorMessage;
        details = responseData.error.details || details;
      } else {
        errorMessage = `Server returned status code ${error.response.status}`;
      }
    } else if (error.request) {
      errorCode = 'NETWORK_ERROR';
      errorMessage = 'Could not connect to the climate service. Please check your internet connection.';
    } else {
      errorMessage = error.message;
    }

    const normalizedError = {
      code: errorCode,
      message: errorMessage,
      details,
    };

    console.error(`[API Error] Code: ${normalizedError.code}, Message: ${normalizedError.message}`, normalizedError.details);

    return Promise.reject(normalizedError);
  }
);
