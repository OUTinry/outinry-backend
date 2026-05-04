/**
 * Remove specified search parameters from a URL
 */
function removeSearchParams(url, paramsToRemove) {
  if (!url) return url;
  try {
    const urlObj = new URL(url);
    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

/**
 * Generate Booking.com affiliate link
 * @param {string} hotelName - Name of hotel
 * @param {string} bookingId - Booking.com property ID (optional)
 * @param {string} checkinDate - Check-in date (ISO string: YYYY-MM-DD or Date object)
 * @param {string} checkoutDate - Check-out date (ISO string: YYYY-MM-DD or Date object)
 * @returns {string} Affiliate URL
 */
export function generateBookingLink(hotelName, bookingId, checkinDate, checkoutDate) {
  if (!hotelName) hotelName = 'hotel';
  
  let url = '';

  if (bookingId) {
    // Direct link to property if we have the ID
    url = `https://www.booking.com/hotel/${bookingId}.html`;
  } else {
    // Fallback: search for hotel name (THIS IS THE FIX - uses ss= parameter)
    const encodedName = encodeURIComponent(hotelName);
    url = `https://www.booking.com/searchresults.html?ss=${encodedName}&aid=1607597`;
  }

  // Add dates if provided
  if (checkinDate && checkoutDate) {
    const checkin = parseDate(checkinDate);
    const checkout = parseDate(checkoutDate);

    if (checkin && checkout) {
      const params = new URLSearchParams();
      params.append('checkin_month', checkin.month);
      params.append('checkin_monthday', checkin.day);
      params.append('checkout_month', checkout.month);
      params.append('checkout_monthday', checkout.day);

      // Add to URL with proper separator
      url += url.includes('?') ? '&' : '?';
      url += params.toString();
    }
  }

  return url;
}

/**
 * Generate Expedia affiliate link
 * @param {string} hotelName - Name of hotel
 * @param {string} destination - City/destination
 * @param {string} checkinDate - Check-in date (ISO string: YYYY-MM-DD or Date object)
 * @param {string} checkoutDate - Check-out date (ISO string: YYYY-MM-DD or Date object)
 * @returns {string} Affiliate URL
 */
export function generateExpediaLink(hotelName, destination, checkinDate, checkoutDate) {
  if (!hotelName) hotelName = 'hotel';
  if (!destination) destination = 'location';
  
  const affiliateId = process.env.EXPEDIA_AFFILIATE_ID || '11011427181';
  const encodedName = encodeURIComponent(hotelName);

  // THIS IS THE FIX - Use q= for hotel search, NO conflicting parameters
  let url = `https://www.expedia.com/Hotel-Search?q=${encodedName}&partnerId=${affiliateId}`;

  // Add ONLY the necessary dates (Expedia format: MM/DD/YYYY)
  if (checkinDate && checkoutDate) {
    const checkin = parseDate(checkinDate);
    const checkout = parseDate(checkoutDate);

    if (checkin && checkout) {
      const checkinStr = `${String(checkin.month).padStart(2, '0')}/${String(checkin.day).padStart(2, '0')}/${checkin.year}`;
      const checkoutStr = `${String(checkout.month).padStart(2, '0')}/${String(checkout.day).padStart(2, '0')}/${checkout.year}`;

      // Use startDate/endDate (correct Expedia parameters)
      url += `&startDate=${encodeURIComponent(checkinStr)}&endDate=${encodeURIComponent(checkoutStr)}`;
    }
  }

  return url;
}

/**
 * Generate Agoda affiliate link
 * @param {string} hotelName - Name of hotel
 * @param {string} destination - City/destination
 * @param {string} checkinDate - Check-in date (ISO string: YYYY-MM-DD or Date object)
 * @param {string} checkoutDate - Check-out date (ISO string: YYYY-MM-DD or Date object)
 * @returns {string} Affiliate URL
 */
export function generateAgodaLink(hotelName, destination, checkinDate, checkoutDate) {
  // THIS IS THE FIX - Use hotel name if available, not just destination
  const searchTerm = hotelName && hotelName.trim() ? hotelName : (destination || 'location');
  
  const affiliateId = process.env.AGODA_AFFILIATE_ID || '1959641';
  const encodedSearch = encodeURIComponent(searchTerm);

  let url = `https://www.agoda.com/search?ss=${encodedSearch}&cid=${affiliateId}`;

  // Add dates if provided (Agoda format: YYYY-MM-DD)
  if (checkinDate && checkoutDate) {
    const checkin = parseDate(checkinDate);
    const checkout = parseDate(checkoutDate);

    if (checkin && checkout) {
      const checkinStr = `${checkin.year}-${String(checkin.month).padStart(2, '0')}-${String(checkin.day).padStart(2, '0')}`;
      const checkoutStr = `${checkout.year}-${String(checkout.month).padStart(2, '0')}-${String(checkout.day).padStart(2, '0')}`;

      url += `&checkin=${checkinStr}&checkout=${checkoutStr}`;
    }
  }

  return url;
}

/**
 * Create affiliate link object for a hotel
 * @param {Object} hotel - Hotel object from SearchAPI
 * @param {Object} dbHotel - Hotel object from our database (optional)
 * @param {string} checkinDate - Check-in date (ISO string: YYYY-MM-DD or Date object)
 * @param {string} checkoutDate - Check-out date (ISO string: YYYY-MM-DD or Date object)
 * @returns {Object} Links object with affiliate URLs
 */
export function createAffiliateLinks(hotel, dbHotel = null, checkinDate = null, checkoutDate = null) {
  // Handle both string and object inputs for hotel parameter
  let hotelName = '';
  let destination = '';
  
  if (typeof hotel === 'string') {
    hotelName = hotel;
    destination = (dbHotel?.city || dbHotel?.name || '').trim();
  } else if (typeof hotel === 'object' && hotel !== null) {
    hotelName = (hotel.name || '').trim();
    destination = (hotel.city || '').trim();
  }
  
  // Fallbacks for empty values
  if (!hotelName) hotelName = 'hotel';
  if (!destination) destination = 'location';
  
  const bookingId = dbHotel?.bookingId || dbHotel?.booking_com_property_id || null;

  // Generate links with hotel-specific parameters (THE FIX)
  let bookingUrl = generateBookingLink(hotelName, bookingId, checkinDate, checkoutDate);
  let expediaUrl = generateExpediaLink(hotelName, destination, checkinDate, checkoutDate);
  let agodaUrl = generateAgodaLink(hotelName, destination, checkinDate, checkoutDate);

  // Strip stale parameters that may have been added by SearchAPI or other sources
  // (This is extra safety - our new functions shouldn't have these anyway)
  const expediaStaleParams = ['regionId', 'sort', 'theme', 'userIntent', 'semdtl', 'categorySearch', 'useRewards', 'button_referral_source', 'destination'];
  expediaUrl = removeSearchParams(expediaUrl, expediaStaleParams);

  return {
    booking: bookingUrl,
    expedia: expediaUrl,
    agoda: agodaUrl,
    original: hotel?.link || null
  };
}

/**
 * Parse date string or Date object into { year, month, day }
 * @param {string|Date} date - ISO string (YYYY-MM-DD) or Date object
 * @returns {Object|null} { year, month, day } or null if invalid
 */
function parseDate(date) {
  if (!date) return null;

  let year, month, day;

  if (typeof date === 'string') {
    // Assume ISO format: YYYY-MM-DD
    const parts = date.split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
  } else if (date instanceof Date) {
    year = date.getFullYear();
    month = date.getMonth() + 1; // getMonth() returns 0-11
    day = date.getDate();
  }

  if (year && month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    return { year, month, day };
  }

  return null;
}
