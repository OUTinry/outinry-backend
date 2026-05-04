import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import searchRoutes from './routes/search.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_KEY are required in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Trust proxy for Render/Heroku
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

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

async function initialize() {
  try {
    console.log('Loading hotel database from Supabase...');
    
    const { data: hotelDatabase, error } = await supabase
      .from('hotels')
      .select('*');
    
    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    if (!hotelDatabase || hotelDatabase.length === 0) {
      throw new Error('No hotels found in Supabase database');
    }

    console.log(`✅ Loaded ${hotelDatabase.length} verified LGBTQ+ hotels from Supabase`);

    app.use('/api/search', searchRoutes(hotelDatabase));

    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'outinry-backend',
        hotelsLoaded: hotelDatabase.length,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        database: 'supabase'
      });
    });

    app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

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

initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 outinry backend running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: Supabase`);
  });
});