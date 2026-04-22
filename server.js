import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadHotelDatabase } from './helpers/hotelDatabase.js';
import searchRoutes from './routes/search.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render/Heroku
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(express.json());
app.use('/api', limiter);

// CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server (no origin header)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check exact match
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Check regex patterns (for Webflow preview/staging domains)
    if (
      /\.lovableproject\.com$/.test(origin) ||
      /\.lovable\.app$/.test(origin) ||
      /\.webflow\.io$/.test(origin)
    ) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// Initialize on startup
async function initialize() {
  try {
    console.log('Loading hotel database...');
    const dbPath = join(__dirname, process.env.HOTEL_DB_PATH || '../Hotel Database/hotels.csv');
    const hotelDatabase = await loadHotelDatabase(dbPath);
    console.log(`✅ Loaded ${hotelDatabase.length} verified LGBTQ+ hotels`);

    // Routes (set up AFTER database is loaded)
    app.use('/api/search', searchRoutes(hotelDatabase));

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'outinry-backend',
        hotelsLoaded: hotelDatabase.length,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler (AFTER routes, so routes are matched first)
    app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    app.use((err, req, res, next) => {
      console.error('Error:', err.message);
      res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    });

    return hotelDatabase;
  } catch (error) {
    console.error('❌ Failed to load hotel database:', error.message);
    process.exit(1);
  }
}

// Start server
initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 outinry backend running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});
