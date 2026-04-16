const axios = require('axios');
const CryptoJS = require('crypto-js');
const { getLgbtqStatus } = require('./lgbtq');

const BASE_URL = 'http://engine.hotellook.com/api/v2';
const SEARCH_START_URL = `${BASE_URL}/search/start.json`;
const SEARCH_RESULT_URL = `${BASE_URL}/search/result.json`;

function getToken() {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) throw new Error('TRAVELPAYOUTS_TOKEN is not set');
  return token;
}

function getMarker() {
  return process.env.TRAVELPAYOUTS_MARKER || '';
}

/**
 * Generate MD5 signature for TravelPayouts API.
 * Signature is MD5 hash of concatenated parameters in specific order + token
 */
function generateSignature(params, token) {
  // Order matters: iata, checkIn, checkOut, adultsCount, customerIP, marker, currency, lang, token
  const parts = [
    params.iata || '',
    params.checkIn || '',
    params.checkOut || '',
    params.adultsCount || '',
    params.customerIP || '',
    params.marker || '',
    params.currency || '',
    params.lang || '',
    token
  ];
  
  const concatenated = parts.join('');
  return CryptoJS.MD5(concatenated).toString();
}

/**
 * Builds the affiliate booking URL for a hotel.
 */
function buildBookingUrl({ hotelId, checkIn, checkOut, adults, destination }) {
  const token = getToken();
  const marker = getMarker();
  
  const params = new URLSearchParams({
    token,
    hotelId,
    checkIn,
    checkOut,
    adults: String(adults),
    destination,
  });
  
  if (marker) params.set('marker', marker);
  
  return `https://search.hotellook.com/?${params.toString()}`;
}

/**
 * Normalises a raw Hotellook hotel object into the Outinry schema.
 */
function normaliseHotel(raw, { checkIn, checkOut, adults, destination }) {
  const hotelId = raw.id ?? raw.hotelId;
  const cityName = raw.location?.name ?? destination;
  const { lgbtq_friendly, lgbtq_confidence } = getLgbtqStatus(hotelId, cityName);

  const priceBlock = raw.priceFrom ?? raw.price ?? {};
  const price = typeof priceBlock === 'number' ? priceBlock : (priceBlock.USD ?? priceBlock.EUR ?? null);

  const stars = raw.stars != null ? Number(raw.stars) : null;

  return {
    id: String(hotelId),
    name: raw.name ?? raw.hotelName ?? 'Unknown',
    destination: cityName,
    price_per_night: price ? Math.round(price) : null,
    currency: 'USD',
    rating: raw.rating ? parseFloat(raw.rating) : null,
    total_reviews: raw.reviewCount ?? raw.reviewsCount ?? 0,
    stars,
    property_type: raw.propertyType ?? raw.type ?? 'hotel',
    image_url: raw.photoUrl ?? raw.photo ?? null,
    booking_url: buildBookingUrl({ hotelId, checkIn, checkOut, adults, destination }),
    lgbtq_friendly,
    lgbtq_confidence,
  };
}

/**
 * Search hotels via the two-step Hotellook API.
 * Step 1: Initiate search, get search_id
 * Step 2: Fetch results using search_id
 */
async function searchHotels({ destination, checkIn, checkOut, adults = 2, limit = 25, currency = 'USD', customerIP = '127.0.0.1' }) {
  const token = getToken();
  const marker = getMarker();

  // Convert destination to IATA code or cityId
  // For now, assume it's already IATA (3-letter code) or cityId (numeric)
  const iata = /^[A-Z]{3}$/.test(destination) ? destination : null;
  const cityId = !iata && /^\d+$/.test(destination) ? destination : null;

  if (!iata && !cityId) {
    throw new Error(`Invalid destination format. Use IATA code (e.g., LIS) or cityId (numeric).`);
  }

  // Step 1: Initiate search
  const startParams = {
    checkIn,
    checkOut,
    adultsCount: String(adults),
    customerIP,
    marker,
    currency,
    lang: 'en',
  };

  if (iata) startParams.iata = iata;
  if (cityId) startParams.cityId = cityId;

  startParams.signature = generateSignature(startParams, token);

  console.log('[searchHotels] Starting search with params:', startParams);

  let searchId;
  try {
    const startResponse = await axios.get(SEARCH_START_URL, {
      params: startParams,
      timeout: 10_000,
    });

    searchId = startResponse.data?.search_id;
    if (!searchId) {
      throw new Error(`No search_id returned from TravelPayouts. Response: ${JSON.stringify(startResponse.data)}`);
    }
    console.log('[searchHotels] Got search_id:', searchId);
  } catch (err) {
    console.error('[searchHotels] Error starting search:', err.message);
    throw err;
  }

  // Step 2: Fetch results
  const resultParams = {
    search_id: searchId,
    limit,
  };

  console.log('[searchHotels] Fetching results with search_id:', searchId);

  try {
    const resultResponse = await axios.get(SEARCH_RESULT_URL, {
      params: resultParams,
      timeout: 10_000,
    });

    const hotels = Array.isArray(resultResponse.data) ? resultResponse.data : (resultResponse.data?.hotels ?? []);

    console.log(`[searchHotels] Got ${hotels.length} hotels`);

    return hotels.map((h) => normaliseHotel(h, { checkIn, checkOut, adults, destination }));
  } catch (err) {
    console.error('[searchHotels] Error fetching results:', err.message);
    throw err;
  }
}

/**
 * Fetch a single hotel by ID (simplified for now).
 */
async function getHotelById({ id, checkIn, checkOut, adults = 2, currency = 'USD' }) {
  // TravelPayouts doesn't have a direct "get by ID" endpoint,
  // so this is a placeholder. In a real implementation, you'd search and filter.
  throw new Error('getHotelById not yet implemented for TravelPayouts');
}

module.exports = { searchHotels, getHotelById };
