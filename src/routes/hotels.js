const express = require('express');
const { searchHotels, getHotelById } = require('../services/travelpayouts');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

/**
 * Validates a date string is YYYY-MM-DD and is not in the past.
 */
function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

/**
 * GET /api/hotels
 *
 * Query params:
 *   destination  string   required  City name or IATA code (e.g. "lisbon", "LON")
 *   checkIn      string   required  YYYY-MM-DD
 *   checkOut     string   required  YYYY-MM-DD
 *   adults       number   optional  default 2
 *   limit        number   optional  default 25, max 100
 *   minPrice     number   optional  Filter by minimum price per night (USD)
 *   maxPrice     number   optional  Filter by maximum price per night (USD)
 *   minRating    number   optional  Filter by minimum rating (0–10)
 *   sortBy       string   optional  price|rating|popularity (default: popularity)
 *   lgbtqOnly    boolean  optional  Only return lgbtq_friendly hotels
 */
router.get('/', cacheMiddleware, async (req, res) => {
  const { destination, checkIn, checkOut, adults, limit, minPrice, maxPrice, minRating, sortBy, lgbtqOnly } = req.query;

  if (!destination) return res.status(400).json({ error: '"destination" is required' });
  if (!checkIn) return res.status(400).json({ error: '"checkIn" is required (YYYY-MM-DD)' });
  if (!checkOut) return res.status(400).json({ error: '"checkOut" is required (YYYY-MM-DD)' });
  if (!isValidDate(checkIn)) return res.status(400).json({ error: 'Invalid "checkIn" date format, expected YYYY-MM-DD' });
  if (!isValidDate(checkOut)) return res.status(400).json({ error: 'Invalid "checkOut" date format, expected YYYY-MM-DD' });
  if (new Date(checkOut) <= new Date(checkIn)) return res.status(400).json({ error: '"checkOut" must be after "checkIn"' });

  const parsedAdults = parseInt(adults ?? '2', 10);
  const parsedLimit = Math.min(parseInt(limit ?? '25', 10), 100);

  try {
    let hotels = await searchHotels({
      destination,
      checkIn,
      checkOut,
      adults: parsedAdults,
      limit: parsedLimit,
    });

    // --- Filters ---
    if (minPrice) hotels = hotels.filter((h) => h.price_per_night != null && h.price_per_night >= Number(minPrice));
    if (maxPrice) hotels = hotels.filter((h) => h.price_per_night != null && h.price_per_night <= Number(maxPrice));
    if (minRating) hotels = hotels.filter((h) => h.rating != null && h.rating >= Number(minRating));
    if (lgbtqOnly === 'true') hotels = hotels.filter((h) => h.lgbtq_friendly);

    // --- Sorting ---
    if (sortBy === 'price') {
      hotels.sort((a, b) => (a.price_per_night ?? Infinity) - (b.price_per_night ?? Infinity));
    } else if (sortBy === 'rating') {
      hotels.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    // default: keep TravelPayouts popularity order

    return res.json({
      success: true,
      count: hotels.length,
      destination,
      checkIn,
      checkOut,
      adults: parsedAdults,
      hotels,
    });
  } catch (err) {
    console.error('[GET /api/hotels]', err.message);
    const status = err.response?.status ?? 500;
    return res.status(status >= 400 && status < 500 ? status : 502).json({
      error: 'Failed to fetch hotel data',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

/**
 * GET /api/hotel/:id
 *
 * Path params:
 *   id  string  required  Hotellook hotel ID
 *
 * Query params (optional, used to build booking URL):
 *   checkIn   YYYY-MM-DD
 *   checkOut  YYYY-MM-DD
 *   adults    number
 */
router.get('/:id', cacheMiddleware, async (req, res) => {
  const { id } = req.params;
  const { checkIn, checkOut, adults } = req.query;

  if (!id) return res.status(400).json({ error: 'Hotel ID is required' });

  try {
    const hotel = await getHotelById({
      id,
      checkIn,
      checkOut,
      adults: parseInt(adults ?? '2', 10),
    });

    if (!hotel) return res.status(404).json({ error: 'Hotel not found' });

    return res.json({ success: true, hotel });
  } catch (err) {
    console.error(`[GET /api/hotel/${id}]`, err.message);
    const status = err.response?.status ?? 500;
    return res.status(status >= 400 && status < 500 ? status : 502).json({
      error: 'Failed to fetch hotel details',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

module.exports = router;
