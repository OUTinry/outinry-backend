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
  console.log(`[generateBookingLink] Called with hotelName=${hotelName}, bookingId=${bookingId}, checkinDate=${checkinDate}, checkoutDate=${checkoutDate}`);
  
  if (!hotelName) hotelName = 'hotel';
  
  let url = '';

  if (bookingId) {
    // Direct link to property if we have the ID
    url = `https://www.booking.com/hotel/${bookingId}.html`;
    console.log(`[generateBookingLink] Using property ID: ${url}`);
  } else {
    // Fallback: search for hotel name (THIS IS THE FIX - uses ss= parameter)
    const encodedName = encodeURIComponent(hotelName);
    url = `https://www.booking.com/searchresults.html?ss=${encodedName}&aid=1607597`;
    console.log(`[generateBookingLink] Using hotel name search: ${url}`);
  }

  // Add dates if provided
  if (checkinDate && checkoutDate) {
    const checkin = parseDate(checkinDate);
    const checkout = parseDate(checkoutDate);
    
    console.log(`[generateBookingLink] Parsed dates: checkin=${JSON.stringify(checkin)}, checkout=${JSON.stringify(checkout)}`);

    if (checkin && checkout) {
      const params = new URLSearchParams();
      params.append('checkin_month', checkin.month);
      params.append('checkin_monthday', checkin.day);
      params.append('checkout_month', checkout.month);
      params.append('checkout_monthday', checkout.day);

      // Add to URL with proper separator
      url += url.includes('?') ? '&' : '?';
      url += params.toString();
      console.log(`[generateBookingLink] Added dates: ${url}`);
    }
  }

  console.log(`[generateBookingLink] Final URL: ${url}`);
  return url;
}

/**
 * Generate Expedia affiliate link
 */
export function generateExpediaLink(hotelName, destination, checkinDate, checkoutDate) {
  console.log(`[generateExpediaLink] Called with hotelName=${hotelName}, destination=${destination}, checkinDate=${checkinDate}, checkoutDate=${checkoutDate}`);
  
  if (!hotelName) hotelName = 'hotel';
  if (!destination) destination = 'location';
  
  const affiliateId = process.env.EXPEDIA_AFFILIATE_ID || '11011427181';
  const encodedName = encodeURIComponent(hotelName);

  // THIS IS THE FIX - Use q= for hotel search, NO conflicting parameters
  let url = `https://www.expedia.com/Hotel-Search?q=${encodedName}&partnerId=${affiliateId}`;
  console.log(`[generateExpediaLink] Base URL: ${url}`);

  // Add ONLY the necessary dates (Expedia format: MM/DD/YYYY)
  if (checkinDate && checkoutDate) {
    const checkin = parseDate(checkinDate);
    const checkout = parseDate(checkoutDate);
    
    console.log(`[generateExpediaLink] Parsed dates: checkin=${JSON.stringify(checkin)}, checkout=${JSON.stringify(checkout)}`);

    if (checkin && checkout) {
      const checkinStr = `${String(checkin.month).padStart(2, '0')}/${String(checkin.day).padStart(2, '0')}/${checkin.year}`;
      const checkoutStr = `${String(checkout.month).padStart(2, '0')}/${String(checkout.day).padStart(2, '0')}/${checkout.year}`;

      // Use startDate/endDate (correct Expedia parameters)
      url += `&startDate=${encodeURIComponent(checkinStr)}&endDate=${encodeURIComponent(checkoutStr)}`;
      console.log(`[generateExpediaLink] Added dates: ${url}`);
    }
  }

  console.log(`[generateExpediaLink] Final URL: ${url}`);
  return url;
}

/**
 * Generate Agoda affiliate link
 */
export function generateAgodaLink(hotelName, destination, checkinDate, checkoutDate) {
  console.log(`[generateAgodaLink] Called with hotelName=${hotelName}, destination=${destination}, checkinDate=${checkinDate}, checkoutDate=${checkoutDate}`);
  
  // THIS IS THE FIX - Use hotel name if available, not just destination
  const searchTerm = hotelName && hotelName.trim() ? hotelName : (destination || 'location');
  console.log(`[generateAgodaLink] Using searchTerm: ${searchTerm}`);
  
  const affiliateId = process.env.AGODA_AFFILIATE_ID || '1959641';
  console.log(`[generateAgodaLink] Using affiliate ID: ${affiliateId}`);
  
  const encodedSearch = encodeURIComponent(searchTerm);

  let url = `https://www.agoda.com/search?ss=${encodedSearch}&cid=${affiliateId}`;
  console.log(`[generateAgodaLink] Base URL: ${url}`);

  // Add dates if provided (Agoda format: YYYY-MM-DD)
  if (checkinDate && checkoutDate) {
    const checkin = parseDate(checkinDate);
    const checkout = parseDate(checkoutDate);
    
    console.log(`[generateAgodaLink] Parsed dates: checkin=${JSON.stringify(checkin)}, checkout=${JSON.stringify(checkout)}`);

    if (checkin && checkout) {
      const checkinStr = `${checkin.year}-${String(checkin.month).padStart(2, '0')}-${String(checkin.day).padStart(2, '0')}`;
      const checkoutStr = `${checkout.year}-${String(checkout.month).padStart(2, '0')}-${String(checkout.day).padStart(2, '0')}`;

      url += `&checkin=${checkinStr}&checkout=${checkoutStr}`;
      console.log(`[generateAgodaLink] Added dates: ${url}`);
    }
  }

  console.log(`[generateAgodaLink] Final URL: ${url}`);
  return url;
}

/**
 * Create affiliate link object for a hotel
 */
export function createAffiliateLinks(hotel, dbHotel = null, checkinDate = null, checkoutDate = null) {
  console.log(`\n[createAffiliateLinks] ===== STARTING AFFILIATE LINK GENERATION =====`);
  console.log(`[createAffiliateLinks] hotel type: ${typeof hotel}, hotel: ${JSON.stringify(hotel).substring(0, 100)}`);
  console.log(`[createAffiliateLinks] dbHotel type: ${typeof dbHotel}, dbHotel: ${dbHotel ? dbHotel.name : 'null'}`);
  console.log(`[createAffiliateLinks] checkinDate: ${checkinDate} (type: ${typeof checkinDate})`);
  console.log(`[createAffiliateLinks] checkoutDate: ${checkoutDate} (type: ${typeof checkoutDate})`);
  
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
  
  console.log(`[createAffiliateLinks] Extracted hotelName: "${hotelName}"`);
  console.log(`[createAffiliateLinks] Extracted destination: "${destination}"`);
  
  // Fallbacks for empty values
  if (!hotelName) hotelName = 'hotel';
  if (!destination) destination = 'location';
  
  const bookingId = dbHotel?.bookingId || dbHotel?.booking_com_property_id || null;
  console.log(`[createAffiliateLinks] Booking ID: ${bookingId}`);

  // Generate links with hotel-specific parameters (THE FIX)
  console.log(`\n[createAffiliateLinks] Calling generateBookingLink...`);
  let bookingUrl = generateBookingLink(hotelName, bookingId, checkinDate, checkoutDate);
  
  console.log(`\n[createAffiliateLinks] Calling generateExpediaLink...`);
  let expediaUrl = generateExpediaLink(hotelName, destination, checkinDate, checkoutDate);
  
  console.log(`\n[createAffiliateLinks] Calling generateAgodaLink...`);
  let agodaUrl = generateAgodaLink(hotelName, destination, checkinDate, checkoutDate);

  // Strip stale parameters that may have been added by SearchAPI or other sources
  const expediaStaleParams = ['regionId', 'sort', 'theme', 'userIntent', 'semdtl', 'categorySearch', 'useRewards', 'button_referral_source', 'destination'];
  console.log(`\n[createAffiliateLinks] Removing stale Expedia params: ${expediaStaleParams.join(', ')}`);
  expediaUrl = removeSearchParams(expediaUrl, expediaStaleParams);
  console.log(`[createAffiliateLinks] After stripping stale params: ${expediaUrl}`);

  const result = {
    booking: bookingUrl,
    expedia: expediaUrl,
    agoda: agodaUrl,
    original: hotel?.link || null
  };
  
  console.log(`\n[createAffiliateLinks] ===== FINAL AFFILIATE LINKS =====`);
  console.log(`[createAffiliateLinks] booking: ${bookingUrl}`);
  console.log(`[createAffiliateLinks] expedia: ${expediaUrl}`);
  console.log(`[createAffiliateLinks] agoda: ${agodaUrl}`);
  console.log(`[createAffiliateLinks] ===== END AFFILIATE LINK GENERATION =====\n`);

  return result;
}

/**
 * Parse date string or Date object into { year, month, day }
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
