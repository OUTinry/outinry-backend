const axios = require('axios');
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
