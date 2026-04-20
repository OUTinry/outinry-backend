require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { limiter } = require('./middleware/rateLimiter');
const hotelsRouter = require('./routes/hotels');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ?? 3000;

// --- Security headers ---
app.use(helmet());

// --- CORS ---
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server (no origin) and listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET'],
    allowedHeaders: ['Content-Type'],
  })
);

// --- Rate limiting ---
app.use('/api', limiter);

// --- Body parsing (not needed for GET-only, but good to have) ---
app.use(express.json());

// --- Routes ---
app.use('/api/hotels', hotelsRouter);
// Single hotel detail lives under the same router as /:id
app.use('/api/hotel', hotelsRouter);

// Health check — Render/Heroku use this
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'outinry-backend' }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Outinry backend running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
});

module.exports = app;

