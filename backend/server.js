import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import os from 'os';
import connectDB from './config/database.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import typedResourceRoutes from './routes/typedResourceRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import testSeriesRoutes from './routes/testSeriesRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import testimonialRoutes from './routes/testimonialRoutes.js';
import publishRequestRoutes from './routes/publishRequestRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRequestRoutes from './routes/orderRequestRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import testSeriesMediaRoutes from './routes/testSeriesMediaRoutes.js';
import testSeriesAnswerRoutes from './routes/testSeriesAnswerRoutes.js';

// Load env
dotenv.config();

// DB connect will be performed before starting the HTTP server

// Start server only after DB connection succeeds. This makes deployment on
// platforms like Railway more predictable (so we don't start a server that
// immediately exits due to DB errors).
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on ${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server due to DB connection error:', err.message || err);
    // Exit so the container/service manager knows the start failed
    process.exit(1);
  }
};

startServer();

const app = express();

// Simple request logger for debugging route issues in deployments
app.use((req, res, next) => {
  console.log(`--> ${req.method} ${req.originalUrl}`);
  next();
});

// Tolerate accidental double '/api/api' prefixes from misconfigured FRONTEND_URLs
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/api/')) {
    // rewrite url by removing the duplicate '/api'
    req.url = req.originalUrl.replace('/api/api/', '/api/');
    console.log('Rewrote duplicate /api in URL to:', req.url);
  }
  next();
});

/* ===============================
   CORS (FINAL – BULLETPROOF)
================================ */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://ca-successful.vercel.app",
  process.env.FRONTEND_URL, // render env
].filter(Boolean).map(o => o.replace(/\/$/, ''));

// Add Appwrite endpoint to allowed origins if configured
if (process.env.APPWRITE_ENDPOINT) {
  const appwriteUrl = new URL(process.env.APPWRITE_ENDPOINT);
  allowedOrigins.push(appwriteUrl.origin);
  // Also allow localhost appwrite for development
  allowedOrigins.push("http://appwrite");
  allowedOrigins.push("http://localhost:80");
}

app.use(cors({
  origin: function (origin, callback) {
    // allow server-to-server / postman / curl
    if (!origin) return callback(null, true);

    const originNormalized = origin.replace(/\/$/, '');

    if (allowedOrigins.includes(originNormalized)) {
      return callback(null, true);
    }

    // allow all vercel preview deployments
    if (origin && origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    console.error("❌ CORS BLOCKED ORIGIN:", origin);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

/* ===============================
   Body Parsers
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
//   File Upload Middleware
//   Conditionally skip express-fileupload for multer routes to avoid conflicts
================================ */
app.use((req, res, next) => {
  // Skip express-fileupload for test series paper upload routes (which use multer)
  if (req.originalUrl.includes('/api/testseries/') && req.originalUrl.includes('/papers') && req.method === 'POST') {
    console.log('[Middleware] Skipping express-fileupload for paper upload route');
    return next();
  }
  // Skip express-fileupload for test series answer upload routes (which use multer)
  if (req.originalUrl.includes('/api/testseries/answers/') && (req.originalUrl.includes('/upload') || req.originalUrl.includes('/evaluated')) && req.method === 'POST') {
    console.log('[Middleware] Skipping express-fileupload for answer upload route');
    return next();
  }

  // Apply express-fileupload for all other routes
  fileUpload({
    useTempFiles: true,
    tempFileDir: os.tmpdir(),
    safeFileNames: true,
    preserveExtension: true,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
  })(req, res, next);
});

/* ===============================
   Routes
================================ */
app.use('/api/auth', authRoutes);
// Also mount auth routes at /auth to be tolerant of frontend base-url mismatches
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/typed-resources', typedResourceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/testseries', testSeriesRoutes);
app.use('/api/test-series', testSeriesMediaRoutes);
app.use('/api/testseries/answers', testSeriesAnswerRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/publish-requests', publishRequestRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/order-requests', orderRequestRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/payments', paymentRoutes);

/* ===============================
   Health Check
================================ */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server running successfully',
    time: new Date().toISOString()
  });
});

/* ===============================
   404 Handler
================================ */
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

/* ===============================
   Error Handler
================================ */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/* ===============================
  Server Start
================================ */
// Started in `startServer()` above after DB connect.
