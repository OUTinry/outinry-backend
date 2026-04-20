import fs from 'fs';
import { parse } from 'csv-parse/sync';
import Fuse from 'fuse.js';

/**
 * Load hotel database from CSV and create searchable index
 * @param {string} filePath - Path to hotels.csv
 * @returns {Promise<Array>} Array of hotel objects with normalized data
 */
export async function loadHotelDatabase(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  // Normalize data for fast lookup
  return records.map((hotel) => ({
    name: hotel['Hotel Name']?.trim() || '',
    country: hotel['Country']?.trim() || '',
    city: hotel['City']?.trim() || '',
    rateHawkId: hotel['RateHawk Hotel ID']?.trim() || '',
    bookingId: hotel['Booking.com Property ID']?.trim() || '',
    certificationSources: hotel['LGBTQ Certification Source(s)']?.trim() || '',
    certificationLevel: hotel['Certification Level']?.trim() || '',
    dateAdded: hotel['Date Added']?.trim() || '',
    notes: hotel['Notes']?.trim() || '',
    certificationSummary: hotel['Certification Summary (AI)']?.trim() || ''
  })).filter(h => h.name); // Remove empty rows
}

/**
 * Find hotels in database by name (fuzzy matching)
 * @param {Array} database - Hotel database array
 * @param {string} hotelName - Hotel name to search for
 * @returns {Object|null} Matching hotel or null
 */
export function findHotelByName(database, hotelName) {
  if (!hotelName || !database.length) return null;

  const searchName = hotelName.toLowerCase().trim();

  // Exact match first (fastest)
  let hotel = database.find(h => h.name.toLowerCase() === searchName);
  if (hotel) return hotel;

  // Substring match
  hotel = database.find(h => h.name.toLowerCase().includes(searchName) || searchName.includes(h.name.toLowerCase()));
  if (hotel) return hotel;

  // Fuzzy match (catches name variations like "The Hotel X" vs "Hotel X")
  const fuse = new Fuse(database, {
    keys: ['name'],
    threshold: 0.4, // 0 = exact, 1 = very loose. 0.4 catches variations like "Hotel X" vs "The Hotel X"
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
  if (!city) return [];
  const searchCity = city.toLowerCase().trim();
  return database.filter(h => h.city.toLowerCase() === searchCity);
}

/**
 * Filter hotels by country (case-insensitive)
 * @param {Array} database - Hotel database array
 * @param {string} country - Country to filter by (full name or code)
 * @returns {Array} Hotels in that country
 */
export function filterHotelsByCountry(database, country) {
  if (!country) return [];
  const searchCountry = country.toLowerCase().trim();
  return database.filter(h =>
    h.country.toLowerCase() === searchCountry
  );
}
