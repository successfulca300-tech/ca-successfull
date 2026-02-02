import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import testSeriesRoutes from './routes/testSeriesRoutes.js';
import testSeriesPaperRoutes from './routes/testSeriesPaperRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Minimal routes wiring - tests will control mongoose connection using mongodb-memory-server
// Do not auto-connect to production DB during tests

app.use('/api/auth', authRoutes);
app.use('/api/testseries', testSeriesRoutes);
app.use('/api/testseries', testSeriesPaperRoutes);
app.use('/api/enrollments', enrollmentRoutes);

export default app;
