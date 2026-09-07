import express from 'express';
import cors from 'cors';
import apiV1 from './api/v1.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;
  if (origin.startsWith('https://geo-twin-360')) return true;
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Vite server proxy, backend tests)
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'geotwin360-api',
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'geotwin360-api',
  });
});

app.use('/api/v1', apiV1);
app.use('/v1', apiV1);

app.use(errorHandler);

export default app;
