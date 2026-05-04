import Fuse from 'fuse.js';

/**
 * Find hotels in database by name (fuzzy matching)
 * @param {Array} database - Hotel database array
 * @param {string} hotelName - Hotel name to search for
 * @returns {Object|null} Matching hotel or null
 */
export function findHotelByName(database, hotelName) {
  if (!hotelName || !database || !database.length) return null;

  const searchName = String(hotelName).toLowerCase().trim();

  // Exact match first (fastest)
  let hotel = database.find(h => {
    const name = h.name || h.hotel_name || '';
    return String(name).toLowerCase() === searchName;
  });
  if (hotel) return hotel;

  // Substring match
  hotel = database.find(h => {
    const name = h.name || h.hotel_name || '';
    const nameStr = String(name).toLowerCase();
    return nameStr.includes(searchName) || searchName.includes(nameStr);
  });
  if (hotel) return hotel;

  // Fuzzy match (catches name variations like "The Hotel X" vs "Hotel X")
  const fuse = new Fuse(database, {
    keys: ['name', 'hotel_name'],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 4
  });

  const results = fuse.search(searchName);
  return results.length > 0 ? results[0].item : null;
}

/**
 * Filter hotels by city (case-insensitive)
 * @param {Array} database - Hotel database array
 * @param {string} city - City to filter by
 * @returns {Array} Hotels in that city
 */
export function filterHotelsByCity(database, city) {
  if (!city || !database || !database.length) return [];
  
  const searchCity = String(city).toLowerCase().trim();
  
  return database.filter(h => {
    const hotelCity = h.city || '';
    return String(hotelCity).toLowerCase().trim() === searchCity;
  });
}

/**
 * Filter hotels by country (case-insensitive)
 * @param {Array} database - Hotel database array
 * @param {string} country - Country to filter by (full name or code)
 * @returns {Array} Hotels in that country
 */
export function filterHotelsByCountry(database, country) {
  if (!country || !database || !database.length) return [];
  
  const searchCountry = String(country).toLowerCase().trim();
  
  return database.filter(h => {
    const hotelCountry = h.country || '';
    return String(hotelCountry).toLowerCase().trim() === searchCountry;
  });
}