import axios from 'axios';
import NodeCache from 'node-cache';

// Cache exchange rates for 24 hours (86,400 seconds)
const rateCache = new NodeCache({ stdTTL: 86400 });

// Country code to currency mapping
const countryToCurrency = {
  'GB': 'GBP', 'US': 'USD', 'AU': 'AUD', 'CA': 'CAD', 'ZA': 'ZAR',
  'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'GR': 'EUR', 
  'BE': 'EUR', 'IT': 'EUR', 'PT': 'EUR', 'IE': 'EUR', 'AT': 'EUR',
  'MX': 'MXN', 'BR': 'BRL', 'AR': 'ARS',
  'TH': 'THB', 'JP': 'JPY', 'CN': 'CNY', 'SG': 'SGD', 'HK': 'HKD',
  'NZ': 'NZD', 'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK',
};

/**
 * Get user's currency based on IP geolocation
 */
async function getUserCurrency(clientIp) {
  try {
    const response = await axios.get(`http://ip-api.com/json/${clientIp}`, {
      timeout: 3000
    });

    if (response.data.status === 'success' && response.data.countryCode) {
      const currency = countryToCurrency[response.data.countryCode];
      if (currency) {
        console.log(`✓ Detected ${response.data.country} → Currency: ${currency}`);
        return currency;
      }
    }
  } catch (error) {
    console.warn(`⚠ Geolocation failed for IP ${clientIp}:`, error.message);
  }

  const defaultCurrency = process.env.DEFAULT_CURRENCY || 'USD';
  console.log(`ℹ Using default currency: ${defaultCurrency}`);
  return defaultCurrency;
}

/**
 * Fetch exchange rates from ECB (European Central Bank)
 * Free, no API key, no rate limits
 */
async function getExchangeRates(baseCurrency = 'EUR') {
  const cacheKey = `rates_${baseCurrency}`;
  
  // Check cache first
  const cached = rateCache.get(cacheKey);
  if (cached) {
    console.log(`✓ Using cached rates for ${baseCurrency} (24h cache)`);
    return cached;
  }

  try {
    // ECB API — free, no auth needed
    const response = await axios.get('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', {
      timeout: 5000
    });

    // Parse XML response
    const rates = {};
    const match = response.data.match(/rate key='([A-Z]{3})' value='([0-9.]+)'/g);
    
    if (match) {
      match.forEach(m => {
        const [, currency, rate] = m.match(/key='([A-Z]{3})'.*value='([0-9.]+)'/);
        rates[currency] = parseFloat(rate);
      });
    }

    // Add EUR as base (rate = 1)
    rates['EUR'] = 1;
    
    // Add USD if not present in ECB data
    if (!rates['USD']) {
      rates['USD'] = 1.1; // Approximate EUR/USD rate
      console.log(`ℹ Added USD with approximate rate: 1.1`);
    }

    // If requesting non-EUR base, convert rates
    let finalRates = rates;
    if (baseCurrency !== 'EUR' && rates[baseCurrency]) {
      const baseRate = rates[baseCurrency];
      finalRates = {};
      Object.keys(rates).forEach(currency => {
        finalRates[currency] = rates[currency] / baseRate;
      });
      finalRates[baseCurrency] = 1;
    }

    rateCache.set(cacheKey, finalRates);
    console.log(`✓ Fetched fresh rates from ECB (base: ${baseCurrency})`);
    return finalRates;
  } catch (error) {
    console.error('ECB rate fetch failed:', error.message);
    // Fallback: return identity rates (no conversion)
    console.log(`⚠ Returning identity rates (no conversion) due to fetch failure`);
    return { [baseCurrency]: 1 };
  }
}

/**
 * Convert price from one currency to another
 */
async function convertPrice(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency || !amount) {
    return amount;
  }

  try {
    // Always get rates with EUR as base (that's what ECB provides)
    const rates = await getExchangeRates('EUR');
    
    // If fromCurrency is USD, we need to convert it to EUR first
    let amountInEUR = amount;
    if (fromCurrency !== 'EUR') {
      // We need the rate for fromCurrency relative to EUR
      // But ECB only gives us EUR as base, so we need to invert
      if (!rates[fromCurrency]) {
        console.warn(`⚠ Currency ${fromCurrency} not found in ECB rates`);
        return amount;
      }
      amountInEUR = amount / rates[fromCurrency];
    }

    // Now convert from EUR to target currency
    const toRate = rates[toCurrency];
    if (!toRate) {
      console.warn(`⚠ Currency ${toCurrency} not found in ECB rates`);
      return amount;
    }

    const converted = amountInEUR * toRate;
    return Math.round(converted * 100) / 100;
  } catch (error) {
    console.error('Conversion error:', error.message);
    return amount;
  }
}

export {
  getUserCurrency,
  getExchangeRates,
  convertPrice
};
