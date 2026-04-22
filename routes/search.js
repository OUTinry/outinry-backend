/**
 * Creates affiliate booking links for hotel search results
 * Generates links for Booking.com, Expedia, and Agoda with proper affiliate IDs
 */
function createAffiliateLinks(hotelResult, dbHotel) {
  // Get hotel name from SearchAPI result
  const hotelName = hotelResult.name || dbHotel?.name || 'Hotel';
  
  // Encode hotel name for URL parameters
  const encodedHotelName = encodeURIComponent(hotelName);
  
  // Booking.com affiliate link
  // Format: https://www.booking.com/searchresults.html?ss=<hotel_name>&aid=<affiliate_id>
  const bookingLink = `https://www.booking.com/searchresults.html?ss=${encodedHotelName}&aid=PENDING_ID`;
  
  // Expedia affiliate link
  // Format: https://www.expedia.com/Hotel-Search?q=<hotel_name>&partnerID=<id>
  const expediaLink = `https://www.expedia.com/Hotel-Search?q=${encodedHotelName}&partnerID=11011427181`;
  
  // Agoda affiliate link
  // Format: https://www.agoda.com/search?q=<hotel_name>&cid=<affiliate_id>
  const agodaLink = `https://www.agoda.com/search?q=${encodedHotelName}&cid=1963168`;
  
  return {
    booking: bookingLink,
    expedia: expediaLink,
    agoda: agodaLink
  };
}

export { createAffiliateLinks };
