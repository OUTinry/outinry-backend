import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadHotelDatabase } from './helpers/hotelDatabase.js';
import searchRoutes from './routes/search.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS configuration for Lovable and other origins
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://outinry.lovable.app',
      /\.lovable\.app$/,
      /\.lovableproject\.com$/
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin matches allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed || process.env.CORS_ORIGIN?.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
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
        hotelsLoaded: hotelDatabase.length,
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
        error: err.message || 'Internal server error'
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
  });
});
