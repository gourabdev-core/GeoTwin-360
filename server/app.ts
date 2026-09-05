import express from 'express';
import cors from 'cors';
import apiV1 from './api/v1.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', apiV1);

app.use(errorHandler);

export default app;
