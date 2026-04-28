import express from 'express';
import axios from 'axios';
import { findHotelByName, filterHotelsByCity } from '../helpers/hotelDatabase.js';
import { createAffiliateLinks } from '../helpers/affiliateLinks.js';

export default function searchRoutes(hotelDatabase) {
  const router = express.Router();

  /**
   * POST /api/search
   * Search for verified LGBTQ+ hotels with live pricing
   */
  router.post('/', async (req, res) => {
    try {
      const { destination, checkInDate, checkOutDate, adults = 2, currency: req.query.currency || 'USD', } = req.body;

      if (!destination) {
        return res.status(400).json({ error: 'destination is required' });
      }
      if (!checkInDate || !checkOutDate) {
        return res.status(400).json({ error: 'checkInDate and checkOutDate are required' });
      }

      console.log(`🔍 Searching for hotels in ${destination}...`);

      const verifiedHotels = filterHotelsByCity(hotelDatabase, destination);

      if (verifiedHotels.length === 0) {
        return res.json({
          destination,
          results: [],
          verifiedHotelsInCity: 0,
          message: `We don't yet have verified LGBTQ+ hotels listed in ${destination}`
        });
      }

      const searchApiUrl = 'https://www.searchapi.io/api/v1/search';
      const searchParams = {
        engine: 'google_hotels',
        q: `hotels in ${destination}`,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        adults,
        currency,
        api_key: process.env.SEARCHAPI_KEY
      };

      const apiResponse = await axios.get(searchApiUrl, { params: searchParams });

      if (!apiResponse.data.properties || apiResponse.data.properties.length === 0) {
        return res.json({
          destination,
          results: [],
          message: 'No hotels found in SearchAPI results'
        });
      }

      const filteredResults = apiResponse.data.properties
        .filter(hotel => findHotelByName(hotelDatabase, hotel.name) !== null)
        .map(hotel => {
          const dbHotel = findHotelByName(hotelDatabase, hotel.name);

          return {
            name: hotel.name,
            description: hotel.description,
            city: hotel.city,
            country: hotel.country,
            pricePerNight: hotel.price_per_night,
            totalPrice: hotel.total_price,
            rating: hotel.rating,
            reviews: hotel.reviews,
            images: hotel.images,
            lgbtqCertification: {
              sources: dbHotel?.certificationSources,
              level: dbHotel?.certificationLevel,
              summary: dbHotel?.certificationSummary
            },

            // Affiliate links with check-in/checkout dates
            // Use dbHotel.name (verified) instead of SearchAPI result to ensure correct hotel name in affiliate links
            affiliateLinks: createAffiliateLinks({ ...hotel, name: dbHotel.name }, dbHotel, checkInDate, checkOutDate)
          };
        });

      res.json({
        destination,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        resultsCount: filteredResults.length,
        results: filteredResults,
        verifiedHotelsInCity: verifiedHotels.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Search error:', error.message);
      res.status(500).json({
        error: error.message || 'Failed to search hotels'
      });
    }
  });

  /**
   * GET /api/search/hotel/:hotelName
   * Get pricing for a specific hotel with dates (modal endpoint)
   * Query params: checkIn (YYYY-MM-DD), checkOut (YYYY-MM-DD), adults (default 2)
   */
  router.get('/hotel/:hotelName', async (req, res) => {
    try {
      const { hotelName } = req.params;
      const { checkIn, checkOut, adults = 2 } = req.query;

      // Convert slug to proper name (bourbon-sao-paulo-express-hotel → Bourbon Sao Paulo Express Hotel)
      const properName = hotelName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      console.log(`🏨 Searching for hotel: ${properName}`);
      console.log(`📅 Dates: ${checkIn} to ${checkOut}, ${adults} guests`);

      // Validate inputs
      if (!checkIn || !checkOut) {
        return res.status(400).json({ error: 'checkIn and checkOut dates are required' });
      }

      // Find hotel in database
      const dbHotel = findHotelByName(hotelDatabase, properName);
      if (!dbHotel) {
        return res.status(404).json({
          error: `Hotel "${properName}" not found in verified LGBTQ+ database`,
          attempted: properName
        });
      }

      console.log(`✅ Found hotel in database: ${dbHotel.name}`);

      // Call SearchAPI for live pricing for this specific hotel
      const searchApiUrl = 'https://www.searchapi.io/api/v1/search';
      const searchParams = {
        engine: 'google_hotels',
        q: `${dbHotel.name}`,
        check_in_date: checkIn,
        check_out_date: checkOut,
        adults,
        currency: 'USD',
        api_key: process.env.SEARCHAPI_KEY
      };

      console.log(`🔍 Calling SearchAPI for "${dbHotel.name}"...`);
      const apiResponse = await axios.get(searchApiUrl, { params: searchParams });

      if (!apiResponse.data.properties || apiResponse.data.properties.length === 0) {
        return res.json({
          hotel: dbHotel.name,
          checkIn,
          checkOut,
          message: 'No pricing data available for these dates',
          lgbtqCertification: {
            sources: dbHotel.certificationSources,
            level: dbHotel.certificationLevel,
            summary: dbHotel.certificationSummary
          }
        });
      }

      console.log(`📍 SearchAPI returned ${apiResponse.data.properties.length} results`);

      // Find our hotel in the SearchAPI results
      const searchResult = apiResponse.data.properties.find(p =>
        p.name?.toLowerCase() === dbHotel.name.toLowerCase()
      ) || apiResponse.data.properties[0]; // Fallback to first result if exact match not found

      console.log(`✨ Found hotel in SearchAPI results: ${searchResult.name}`);

      // Build response with affiliate links including dates
      const response = {
        name: dbHotel.name,
        description: searchResult.description,
        city: searchResult.city,
        country: searchResult.country,
        coordinates: searchResult.gps_coordinates,
        checkInTime: searchResult.check_in_time,
        checkOutTime: searchResult.check_out_time,
        pricePerNight: searchResult.price_per_night,
        totalPrice: searchResult.total_price,
        nearbyPlaces: searchResult.nearby_places,
        rating: searchResult.rating,
        reviews: searchResult.reviews,
        images: searchResult.images,

        // LGBTQ+ certification from our database
        lgbtqCertification: {
          sources: dbHotel.certificationSources,
          level: dbHotel.certificationLevel,
          summary: dbHotel.certificationSummary
        },

        // Affiliate links with dates included
        // Use dbHotel.name (verified) instead of SearchAPI result to ensure correct hotel name in affiliate links
        affiliateLinks: createAffiliateLinks({ ...searchResult, name: dbHotel.name }, dbHotel, checkIn, checkOut),

        // Booking info
        checkIn,
        checkOut,
        guests: parseInt(adults),
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      console.error('Hotel search error:', error.message);

      if (error.response?.status === 401) {
        return res.status(401).json({ error: 'Invalid SearchAPI key' });
      }

      res.status(500).json({
        error: error.message || 'Failed to search for hotel',
        details: error.response?.data || null
      });
    }
  });

  /**
   * POST /api/search/hotel/:hotelId
   * Get pricing for a specific hotel (legacy endpoint, kept for backwards compatibility)
   */
  router.post('/hotel/:hotelId', async (req, res) => {
    try {
      const { hotelId } = req.params;
      const { checkInDate, checkOutDate, adults = 2, currency = 'USD' } = req.body;

      if (!checkInDate || !checkOutDate) {
        return res.status(400).json({ error: 'checkInDate and checkOutDate are required' });
      }

      const dbHotel = findHotelByName(hotelDatabase, hotelId);
      if (!dbHotel) {
        return res.status(404).json({ error: `Hotel not found: ${hotelId}` });
      }

      const searchApiUrl = 'https://www.searchapi.io/api/v1/search';
      const searchParams = {
        engine: 'google_hotels',
        q: `${dbHotel.name}`,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        adults,
        currency,
        api_key: process.env.SEARCHAPI_KEY
      };

      const apiResponse = await axios.get(searchApiUrl, { params: searchParams });

      if (!apiResponse.data.properties || apiResponse.data.properties.length === 0) {
        return res.status(404).json({ error: 'No pricing found for this hotel' });
      }

      const hotelResult = apiResponse.data.properties[0];
      const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));

      res.json({
        hotelId,
        hotelName: dbHotel.name,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        nights,
        adults,
        currency,
        pricePerNight: hotelResult.price_per_night,
        totalPrice: hotelResult.total_price,
        rating: hotelResult.rating,
        reviews: hotelResult.reviews,
        description: hotelResult.description,
        images: hotelResult.images,
        lgbtqCertification: {
          sources: dbHotel.certificationSources,
          level: dbHotel.certificationLevel,
          summary: dbHotel.certificationSummary
        },
        // Use dbHotel.name (verified) instead of SearchAPI result to ensure correct hotel name in affiliate links
        affiliateLinks: createAffiliateLinks({ ...hotelResult, name: dbHotel.name }, dbHotel, checkInDate, checkOutDate),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Hotel search error:', error.message);
      res.status(500).json({
        error: error.message || 'Failed to fetch hotel pricing'
      });
    }
  });

  return router;
}
