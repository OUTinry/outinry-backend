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
      const { destination, checkInDate, checkOutDate, adults = 2, currency = 'USD' } = req.body;

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
            affiliateLinks: createAffiliateLinks(hotel, dbHotel, checkInDate, checkOutDate)
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
   * POST /api/search/hotel/:hotelId
   * Get pricing for a specific hotel
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
        affiliateLinks: createAffiliateLinks(hotelResult, dbHotel, checkInDate, checkOutDate),
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
