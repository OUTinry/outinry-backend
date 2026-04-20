const rateLimit = require('express-rate-limit');

// 100 requests per 15 minutes per IP — generous for a Webflow site
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

module.exports = { limiter };
