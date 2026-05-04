/**
 * Generate Booking.com affiliate link
 */
export function generateBookingLink(hotelName, bookingId, checkinDate, checkoutDate) {
  if (!hotelName) hotelName = 'hotel';
  
  let url = '';

  if (bookingId) {
    url = `https://www.booking.com/hotel/${bookingId}.html`;
  } else {
    const encodedName = encodeURIComponent(hotelName);
    url = `https://www.booking.com/searchresults.html?ss=${encodedName}&aid=1607597`;
  }

  if (checkinDate && checkoutDate) {
    const checkin = parseDate(checkinDate);
    const checkout = parseDate(checkoutDate);

    if (checkin && checkout) {
      const params = new URLSearchParams();
      params.append('checkin_month', checkin.month);
      params.append('checkin_monthday', checkin.day);
      params.append('checkout_month', checkout.month);
      params.append('checkout_monthday', checkout.day);

      url += url.includes('?') ? '&' : '?';
      url += params.toString();
    }
  }

  return url;
}

/**
 * Generate Expedia affiliate link
 * IMPORTANT: We build our own URL and ignore SearchAPI's pre-built URLs
 */
export function generateExpediaLink(hotelName, destination, checkinDate, checkoutDate) {
  if (!hotelName) hotelName = 'hotel';
  
  const affiliateId = '11011427181';
  const encodedName = encodeURIComponent(hotelName);

  // Build clean URL from scratch - NEVER use SearchAPI's URL
  let url = `https://www.expedia.com/Hotel-Search?q=${encodedName}&partnerId=${affiliateId}`;

  if (checkinDate && checkoutDate) {
    const checkin = parseDate(checkinDate);
    const checkout = parseDate(checkoutDate);

    if (checkin && checkout) {
      const checkinStr = `${String(checkin.month).padStart(2, '0')}/${String(checkin.day).padStart(2, '0')}/${checkin.year}`;
      const checkoutStr = `${String(checkout.month).padStart(2, '0')}/${String(checkout.day).padStart(2, '0')}/${checkout.year}`;

      url += `&startDate=${encodeURIComponent(checkinStr)}&endDate=${encodeURIComponent(checkoutStr)}`;
    }
  }

  return url;
}

/**
 * Generate Agoda affiliate link
 * IMPORTANT: We build our own URL and ignore SearchAPI's pre-built URLs
 */
export function generateAgodaLink(hotelName, destination, checkinDate, checkoutDate) {
  // Use hotel name if available, not just destination
  const searchTerm = hotelName && hotelName.trim() ? hotelName : (destination || 'location');
  
  // CRITICAL: Use the CORRECT affiliate ID, never SearchAPI's old ID
  const affiliateId = '1959641';
  
  const encodedSearch = encodeURIComponent(searchTerm);

  // Build clean URL from scratch - NEVER use SearchAPI's URL
  let url = `https://www.agoda.com/search?ss=${encodedSearch}&cid=${affiliateId}`;

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
 * CRITICAL: This function ALWAYS generates its own URLs and NEVER uses SearchAPI's pre-built URLs
 */
export function createAffiliateLinks(hotel, dbHotel = null, checkinDate = null, checkoutDate = null) {
  let hotelName = '';
  let destination = '';
  
  if (typeof hotel === 'string') {
    hotelName = hotel;
    destination = (dbHotel?.city || dbHotel?.name || '').trim();
  } else if (typeof hotel === 'object' && hotel !== null) {
    hotelName = (hotel.name || '').trim();
    destination = (hotel.city || '').trim();
  }
  
  if (!hotelName) hotelName = 'hotel';
  if (!destination) destination = 'location';
  
  const bookingId = dbHotel?.bookingId || dbHotel?.booking_com_property_id || null;

  // ALWAYS generate our own URLs - NEVER use SearchAPI's URLs
  const bookingUrl = generateBookingLink(hotelName, bookingId, checkinDate, checkoutDate);
  const expediaUrl = generateExpediaLink(hotelName, destination, checkinDate, checkoutDate);
  const agodaUrl = generateAgodaLink(hotelName, destination, checkinDate, checkoutDate);

  return {
    booking: bookingUrl,
    expedia: expediaUrl,
    agoda: agodaUrl,
    original: hotel?.link || null
  };
}

/**
 * Parse date string or Date object into { year, month, day }
 */
function parseDate(date) {
  if (!date) return null;

  let year, month, day;

  if (typeof date === 'string') {
    const parts = date.split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
  } else if (date instanceof Date) {
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  }

  if (year && month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    return { year, month, day };
  }

  return null;
}
