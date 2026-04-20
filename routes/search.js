import express from 'express';
import axios from 'axios';
import { findHotelByName, filterHotelsByCity } from '../helpers/hotelDatabase.js';
import { createAffiliateLinks } from '../helpers/affiliateLinks.js';

export default function searchRoutes(hotelDatabase) {
  const router = express.Router();

  /**
   * POST /api/search
   * Search for verified LGBTQ+ hotels with live pricing
   *
   * Request body:
   * {
   *   "destination": "Lisbon",
   *   "checkInDate": "2026-05-01",
   *   "checkOutDate": "2026-05-05",
   *   "adults": 2,
   *   "currency": "USD"
   * }
   */
  router.post('/', async (req, res) => {
    try {
      const { destination, checkInDate, checkOutDate, adults = 2, currency = 'USD' } = req.body;

      // Validate input
      if (!destination) {
        return res.status(400).json({ error: 'destination is required' });
      }
      if (!checkInDate || !checkOutDate) {
        return res.status(400).json({ error: 'checkInDate and checkOutDate are required' });
      }

      console.log(`🔍 Searching for hotels in ${destination}...`);

      // Step 1: Get list of verified hotels in destination from our database
      console.log(`📊 Database has ${hotelDatabase.length} total hotels`);
      const verifiedHotels = filterHotelsByCity(hotelDatabase, destination);
      console.log(`🏨 filterHotelsByCity returned ${verifiedHotels.length} hotels for "${destination}"`);

      if (verifiedHotels.length === 0) {
        console.log(`⚠️  No verified LGBTQ+ hotels found in ${destination}`);
        return res.json({
          destination,
          results: [],
          verifiedHotelsInCity: 0,
          message: `We don't yet have verified LGBTQ+ hotels listed in ${destination}`
        });
      }

      console.log(`✅ Found ${verifiedHotels.length} verified hotels in ${destination}`);

      // Step 2: Call SearchAPI for live pricing
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

      console.log(`📍 SearchAPI returned ${apiResponse.data.properties.length} results`);

      // Step 3: Filter SearchAPI results to only include verified LGBTQ+ hotels
      const filteredResults = apiResponse.data.properties
        .filter(hotel => {
          const dbHotel = findHotelByName(hotelDatabase, hotel.name);
          return dbHotel !== null;
        })
        .map(hotel => {
          const dbHotel = findHotelByName(hotelDatabase, hotel.name);

          return {
            // SearchAPI data
            name: hotel.name,
            description: hotel.description,
            city: hotel.city,
            country: hotel.country,
            coordinates: hotel.gps_coordinates,
            checkInTime: hotel.check_in_time,
            checkOutTime: hotel.check_out_time,
            pricePerNight: hotel.price_per_night,
            totalPrice: hotel.total_price,
            nearbyPlaces: hotel.nearby_places,
            rating: hotel.rating,
            reviews: hotel.reviews,
            images: hotel.images,

            // Our database data
            lgbtqCertification: {
              sources: dbHotel?.certificationSources,
              level: dbHotel?.certificationLevel,
              summary: dbHotel?.certificationSummary
            },

            // Affiliate links
            affiliateLinks: createAffiliateLinks(hotel, dbHotel)
          };
        });

      console.log(`✨ Filtered to ${filteredResults.length} verified LGBTQ+ hotels with live pricing`);

      // Step 4: Return results
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

      if (error.response?.status === 401) {
        return res.status(401).json({ error: 'Invalid SearchAPI key' });
      }

      res.status(500).json({
        error: error.message || 'Failed to search hotels'
      });
    }
  });

  /**
   * GET /api/search/test
   * Quick test endpoint (no database filtering)
   */
  router.get('/test', async (req, res) => {
    try {
      const { destination = 'Lisbon', checkIn = '2026-05-01', checkOut = '2026-05-05' } = req.query;

      const response = await axios.get('https://www.searchapi.io/api/v1/search', {
        params: {
          engine: 'google_hotels',
          q: `hotels in ${destination}`,
          check_in_date: checkIn,
          check_out_date: checkOut,
          api_key: process.env.SEARCHAPI_KEY
        }
      });

      res.json({
        message: 'SearchAPI test (no filtering)',
        destination,
        rawResultsCount: response.data.properties?.length || 0,
        sampleResult: response.data.properties?.[0] || null
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
