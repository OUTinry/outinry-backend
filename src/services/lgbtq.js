/**
 * LGBTQ+ friendliness lookup service.
 *
 * Currently uses a curated in-memory set of verified property IDs.
 * Future: replace with a database table or integrate IGLTA-verified listings.
 * https://www.iglta.org
 */

// Hotellook hotel IDs known to be explicitly LGBTQ+-welcoming.
// Populate this set from your own research / IGLTA data.
const VERIFIED_LGBTQ_HOTEL_IDS = new Set([
  // Example IDs — replace with real verified ones
  // '12345', '67890'
]);

// City-level destinations with strong LGBTQ+ scenes.
// Hotels in these cities get a soft "lgbtq_friendly" tag even without
// explicit verification — clearly label this distinction in the UI.
const LGBTQ_FRIENDLY_CITIES = new Set([
  'lisbon', 'amsterdam', 'barcelona', 'berlin', 'madrid',
  'paris', 'london', 'new york', 'san francisco', 'tel aviv',
  'mykonos', 'sitges', 'toronto', 'sydney', 'melbourne',
  'puerto vallarta', 'cape town', 'rio de janeiro', 'bangkok',
  'bali', 'reykjavik', 'vienna', 'prague', 'warsaw',
  'buenos aires', 'montreal', 'chicago', 'miami', 'los angeles',
]);

/**
 * Returns lgbtq_friendly status and confidence level for a hotel.
 *
 * @param {string|number} hotelId - Hotellook hotel ID
 * @param {string} cityName - Destination city name
 * @returns {{ lgbtq_friendly: boolean, lgbtq_confidence: 'verified'|'city-level'|'unknown' }}
 */
function getLgbtqStatus(hotelId, cityName) {
  if (VERIFIED_LGBTQ_HOTEL_IDS.has(String(hotelId))) {
    return { lgbtq_friendly: true, lgbtq_confidence: 'verified' };
  }

  if (cityName && LGBTQ_FRIENDLY_CITIES.has(cityName.toLowerCase())) {
    return { lgbtq_friendly: true, lgbtq_confidence: 'city-level' };
  }

  return { lgbtq_friendly: false, lgbtq_confidence: 'unknown' };
}

module.exports = { getLgbtqStatus };
