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

module.exports = { searchHotels, getHotelById };const axios = require('axios');
const { getLgbtqStatus } = require('./lgbtq');

const BASE_URL = 'https://engine.hotellook.com/api/v2';
const AFFILIATE_BASE = 'https://search.hotellook.com';

// Marker required by TravelPayouts for affiliate attribution
const MARKER = process.env.TRAVELPAYOUTS_MARKER || '';

function getToken() {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) throw new Error('TRAVELPAYOUTS_TOKEN is not set');
  return token;
}

/**
 * Builds the affiliate booking URL for a hotel.
 */
function buildBookingUrl({ hotelId, checkIn, checkOut, adults, destination }) {
  const params = new URLSearchParams({
    token: getToken(),
    hotelId,
    checkIn,
    checkOut,
    adults: String(adults),
    destination,
  });
  if (MARKER) params.set('marker', MARKER);
  return `${AFFILIATE_BASE}/?${params.toString()}`;
}

/**
 * Normalises a raw Hotellook hotel object into the Outinry schema.
 */
function normaliseHotel(raw, { checkIn, checkOut, adults, destination }) {
  const hotelId = raw.id ?? raw.hotelId;
  const cityName = raw.location?.name ?? destination;
  const { lgbtq_friendly, lgbtq_confidence } = getLgbtqStatus(hotelId, cityName);

  // Price may be nested differently depending on endpoint (cache vs search)
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
 * Search hotels via the Hotellook cache endpoint.
 * Fastest option; returns pre-cached results from the last ~48 hours.
 *
 * Docs: https://support.travelpayouts.com/hc/en-us/articles/360014625431
 */
async function searchHotels({ destination, checkIn, checkOut, adults = 2, limit = 25, currency = 'USD' }) {
  const params = {
    location: destination,
    checkIn,
    checkOut,
    adults: String(adults),
    currency,
    token: getToken(),
    limit,
    lang: 'en',
  };

  const response = await axios.get(`${BASE_URL}/cache.json`, {
    params,
    timeout: 10_000,
  });

console.log('[searchHotels] Params:', params);
  const hotels = Array.isArray(response.data) ? response.data : (response.data?.hotels ?? []);

  return hotels.map((h) => normaliseHotel(h, { checkIn, checkOut, adults, destination }));
}

/**
 * Fetch a single hotel by Hotellook ID.
 * Returns room-level details and full metadata.
 */
async function getHotelById({ id, checkIn, checkOut, adults = 2, currency = 'USD' }) {
  const params = {
    id,
    currency,
    token: getToken(),
    lang: 'en',
  };

  if (checkIn) params.checkIn = checkIn;
  if (checkOut) params.checkOut = checkOut;
  if (adults) params.adults = String(adults);

  const response = await axios.get(`${BASE_URL}/hotel.json`, {
    params,
    timeout: 10_000,
  });

  const raw = response.data;
  if (!raw || !raw.id) return null;

  const hotel = normaliseHotel(raw, {
    checkIn: checkIn ?? '',
    checkOut: checkOut ?? '',
    adults,
    destination: raw.location?.name ?? '',
  });

  // Attach extra detail fields available on this endpoint
  hotel.description = raw.shortDescription ?? raw.description ?? null;
  hotel.address = raw.address ?? null;
  hotel.amenities = raw.amenities ?? [];
  hotel.latitude = raw.location?.lat ?? null;
  hotel.longitude = raw.location?.lon ?? null;
  hotel.photos = Array.isArray(raw.photos)
    ? raw.photos.slice(0, 10).map((p) => p.url ?? p)
    : [];

  return hotel;
}

module.exports = { searchHotels, getHotelById };
