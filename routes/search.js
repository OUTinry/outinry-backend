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
      extracted_price_before_taxes: Math.round(convertedBeforeTaxes)
    };
  }

  /**
   * POST /api/search
   * Search for verified LGBTQ+ hotels with live pricing
   */
  router.post('/', async (req, res) => {
    try {
      const { destination, checkInDate, checkOutDate, adults = 2 } = req.body;

      // Get user's currency from IP geolocation
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '0.0.0.0';
      const userCurrency = await getUserCurrency(clientIp);

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
          message: 'No verified LGBTQ+ hotels found in database for this destination'
        });
      }

      const searchApiUrl = 'https://api.searchapi.io/api/v1/search';
      const searchParams = {
        q: destination,
        type: 'hotels',
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        num_adults: adults,
        currency: 'USD',
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
              affiliateLinks: createAffiliateLinks({ ...hotel, name: dbHotel.name }, dbHotel, checkInDate, checkOutDate)
            };
          })
      );

      res.json({
        destination,
        checkIn: checkInDate,
        checkOut: checkOutDate,
