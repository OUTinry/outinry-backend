import express from 'express';
import axios from 'axios';
import { findHotelByName, filterHotelsByCity } from '../helpers/hotelDatabase.js';
import { createAffiliateLinks } from '../helpers/affiliateLinks.js';
import { getUserCurrency, convertPrice } from '../utils/currencyConverter.js';

export default function searchRoutes(hotelDatabase) {
  const router = express.Router();
  // Currency symbol map
  const currencySymbols = {
    'GBP': '£',
    'EUR': '€',
    'USD': '$',
    'AUD': 'A$',
    'CAD': 'C$',
    'JPY': '¥',
    'CNY': '¥',
    'INR': '₹',
    'BRL': 'R$',
    'MXN': '$',
    'THB': '฿',
    'ZAR': 'R',
  };

  // Helper to convert price object
  async function convertPriceObject(priceObj, userCurrency) {
    if (!priceObj || typeof priceObj !== 'object') {
      return priceObj;
    }

    const symbol = currencySymbols[userCurrency] || '$';
    const convertedValue = await convertPrice(priceObj.extracted_price, 'USD', userCurrency);
    const convertedBeforeTaxes = await convertPrice(priceObj.extracted_price_before_taxes || priceObj.extracted_price, 'USD', userCurrency);

    return {
      price: `${symbol}${Math.round(convertedValue)}`,
      extracted_price: Math.round(convertedValue),
      price_before_taxes: `${symbol}${Math.round(convertedBeforeTaxes)}`,
      extracted_price_before_taxes: Math.round(convertedBeforeTaxes),
    };
  }

  /**
   * POST /api/search
   * Search for verified LGBTQ+ hotels with live pricing
   */
  router.post('/', async (req, res) => {
    try {
      const { destination, checkInDate, checkOutDate, adults = 2, currency } = req.body;

      // Prioritize currency from request body, fallback to IP geolocation
      let userCurrency = currency;
      if (!userCurrency) {
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '0.0.0.0';
        const { getUserCurrency } = await import('../utils/currencyConverter.js');
        userCurrency = await getUserCurrency(clientIp);
      }

      if (!destination) {
        return res.status(400).json({ error: 'destination is required' });
      }
      if (!checkInDate || !checkOutDate) {
        return res.status(400).json({ error: 'checkInDate and checkOutDate are required' });
      }

      console.log(`🔍 Searching for hotels in ${destination}... [Currency: ${userCurrency}]`);

      const verifiedHotels = filterHotelsByCity(hotelDatabase, destination);

      if (verifiedHotels.length === 0) {
        return res.json({
          destination,
          results: [],
          verifiedHotelsInCity: 0,
          userCurrency,
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
        currency: 'USD', // Always request USD, we'll convert
        api_key: process.env.SEARCHAPI_KEY
      };

      const apiResponse = await axios.get(searchApiUrl, { params: searchParams });

      if (!apiResponse.data.properties || apiResponse.data.properties.length === 0) {
        return res.json({
          destination,
          results: [],
          userCurrency,
          message: 'No hotels found in SearchAPI results'
        });
      }

      const filteredResults = await Promise.all(
        apiResponse.data.properties
          .filter(hotel => findHotelByName(hotelDatabase, hotel.name) !== null)
          .map(async (hotel) => {
            const dbHotel = findHotelByName(hotelDatabase, hotel.name);

            // Convert prices from USD to user's currency
            const convertedPricePerNight = await convertPriceObject(hotel.price_per_night, userCurrency);
            const convertedTotalPrice = await convertPriceObject(hotel.total_price, userCurrency);

            return {
              name: hotel.name,
              description: hotel.description,
              city: hotel.city,
              country: hotel.country,
              pricePerNight: convertedPricePerNight,
              totalPrice: convertedTotalPrice,
              currency: userCurrency,
              rating: hotel.rating,
              reviews: hotel.reviews,
              images: hotel.images,
              lgbtqCertification: {
                sources: dbHotel?.certificationSources,
                level: dbHotel?.certificationLevel,
                summary: dbHotel?.certificationSummary
              },
              affiliateLinks: createAffiliateLinks(dbHotel.name, checkInDate, checkOutDate)
            };
          })
      );

      return res.json({
        destination,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        resultsCount: filteredResults.length,
        userCurrency,
        results: filteredResults
      });
    } catch (error) {
      console.error('Search error:', error);
      return res.status(500).json({ error: 'Search failed', details: error.message });
    }
  });

  /**
   * GET /api/search/test
   * Test SearchAPI directly (no filtering)
   */
  router.get('/test', async (req, res) => {
    try {
      const { destination, checkIn, checkOut, adults = 2 } = req.query;

      if (!destination || !checkIn || !checkOut) {
        return res.status(400).json({ error: 'destination, checkIn, checkOut are required' });
      }

      const searchApiUrl = 'https://www.searchapi.io/api/v1/search';
      const searchParams = {
        engine: 'google_hotels',
        q: `hotels in ${destination}`,
        check_in_date: checkIn,
        check_out_date: checkOut,
        adults,
        api_key: process.env.SEARCHAPI_KEY
      };

      const apiResponse = await axios.get(searchApiUrl, { params: searchParams });

      return res.json({
        destination,
        checkIn,
        checkOut,
        resultsCount: apiResponse.data.properties?.length || 0,
        results: apiResponse.data.properties || []
      });
    } catch (error) {
      console.error('Test search error:', error);
      return res.status(500).json({ error: 'Test search failed', details: error.message });
    }
  });

  /**
   * POST /api/search/hotel/:hotelName
   * Search for a specific hotel by name with live pricing (used by destination modal)
   */
  router.post('/hotel/:hotelName', async (req, res) => {
    try {
      const { hotelName } = req.params;
      const { checkInDate, checkOutDate, adults = 2, currency } = req.body;

      // Prioritize currency from request body, fallback to IP geolocation
      let userCurrency = currency;
      if (!userCurrency) {
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '0.0.0.0';
        const { getUserCurrency } = await import('../utils/currencyConverter.js');
        userCurrency = await getUserCurrency(clientIp);
      }

      // Find hotel in database by name
      const dbHotel = findHotelByName(hotelDatabase, hotelName);
      if (!dbHotel) {
        return res.status(404).json({ error: 'Hotel not found in verified database' });
      }

      const searchApiUrl = 'https://www.searchapi.io/api/v1/search';
      const searchParams = {
        engine: 'google_hotels',
        q: `${dbHotel.name} hotel in ${dbHotel.city}`,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        adults,
        currency: 'USD', // Always request USD, we'll convert
        api_key: process.env.SEARCHAPI_KEY
      };

      const apiResponse = await axios.get(searchApiUrl, { params: searchParams });
      const hotelResult = apiResponse.data.properties?.find(h => findHotelByName(hotelDatabase, h.name)?.name.toLowerCase() === dbHotel.name.toLowerCase());

      if (!hotelResult) {
        return res.status(404).json({ error: 'Hotel not found in pricing data' });
      }

      const convertedPricePerNight = await convertPriceObject(hotelResult.price_per_night, userCurrency);
      const convertedTotalPrice = await convertPriceObject(hotelResult.total_price, userCurrency);

      return res.json({
        name: hotelResult.name,
        city: hotelResult.city,
        country: hotelResult.country,
        pricePerNight: convertedPricePerNight,
        totalPrice: convertedTotalPrice,
        currency: userCurrency,
        rating: hotelResult.rating,
        images: hotelResult.images,
        affiliateLinks: createAffiliateLinks(dbHotel.name, checkInDate, checkOutDate)
      });
    } catch (error) {
      console.error('Hotel search error:', error);
      return res.status(500).json({ error: 'Hotel search failed', details: error.message });
    }
  });

  /**
   * GET /health
   * Health check
   */
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'outinry search api' });
  });

  return router;
}
