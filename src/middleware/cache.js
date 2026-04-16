const NodeCache = require('node-cache');

const TTL = parseInt(process.env.CACHE_TTL ?? '3600', 10); // seconds

const cache = new NodeCache({ stdTTL: TTL, checkperiod: 120 });

/**
 * Returns a cache key string from an Express request.
 * Sorted query params so key is stable regardless of param order.
 */
function buildKey(req) {
  const sorted = Object.keys(req.query)
    .sort()
    .map((k) => `${k}=${req.query[k]}`)
    .join('&');
  return `${req.path}?${sorted}`;
}

/**
 * Express middleware: serve from cache if available, otherwise continue
 * and store the response.
 */
function cacheMiddleware(req, res, next) {
  const key = buildKey(req);
  const cached = cache.get(key);

  if (cached !== undefined) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  // Wrap res.json to intercept and store the response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200) {
      cache.set(key, body);
    }
    res.setHeader('X-Cache', 'MISS');
    return originalJson(body);
  };

  next();
}

module.exports = { cacheMiddleware };
