/**
 * Generate Booking.com affiliate link
 * Stay22 script on the website will automatically rewrite this link with tracking
 * @param {string} hotelName - Name of hotel
 * @param {string} bookingId - Booking.com property ID (optional)
 * @returns {string} Affiliate URL
 */
export function generateBookingLink(hotelName, bookingId) {
  if (bookingId) {
    // Direct link to property if we have the ID
    return `https://www.booking.com/hotel/${bookingId}.html`;
  }
  // Fallback: search for hotel name
  const encodedName = encodeURIComponent(hotelName);
  return `https://www.booking.com/searchresults.html?ss=${encodedName}`;
}

/**
 * Generate Expedia affiliate link
 * @param {string} hotelName - Name of hotel
 * @param {string} destination - City/destination
 * @returns {string} Affiliate URL
 */
export function generateExpediaLink(hotelName, destination) {
  const affiliateId = process.env.EXPEDIA_AFFILIATE_ID || '';
  const encodedName = encodeURIComponent(hotelName);
  const encodedDest = encodeURIComponent(destination);
  return `https://www.expedia.com/Hotel-Search?q=${encodedName}+${encodedDest}?partnerId=${affiliateId}`;
}

/**
 * Generate Agoda affiliate link
 * @param {string} hotelName - Name of hotel
 * @param {string} destination - City/destination
 * @returns {string} Affiliate URL
 */
export function generateAgodaLink(hotelName, destination) {
  const affiliateId = process.env.AGODA_AFFILIATE_ID || '';
  const encodedDest = encodeURIComponent(destination);
  return `https://www.agoda.com/search?ss=${encodedDest}&cid=${affiliateId}`;
}

/**
 * Create affiliate link object for a hotel
 * @param {Object} hotel - Hotel object from SearchAPI
 * @param {Object} dbHotel - Hotel object from our database (optional)
 * @returns {Object} Links object with affiliate URLs
 */
export function createAffiliateLinks(hotel, dbHotel = null) {
  const hotelName = hotel.name || '';
  const destination = hotel.city || '';
  const bookingId = dbHotel?.bookingId || null;
  
  return {
    booking: generateBookingLink(hotelName, bookingId),
    expedia: generateExpediaLink(hotelName, destination),
    agoda: generateAgodaLink(hotelName, destination),
    original: hotel.link // Keep original for reference
  };
}
