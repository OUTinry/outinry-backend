import axios from 'axios';

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
 */
async function getExchangeRates(baseCurrency = 'EUR') {
  try {
    const response = await axios.get('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', {
      timeout: 5000
    });

    const rates = {};
    const match = response.data.match(/rate key='([A-Z]{3})' value='([0-9.]+)'/g);
    
    if (match) {
      match.forEach(m => {
        const [, currency, rate] = m.match(/key='([A-Z]{3})'.*value='([0-9.]+)'/);
        rates[currency] = parseFloat(rate);
      });
    }

    rates['EUR'] = 1;

    let finalRates = rates;
    if (baseCurrency !== 'EUR' && rates[baseCurrency]) {
      const baseRate = rates[baseCurrency];
      finalRates = {};
      Object.keys(rates).forEach(currency => {
        finalRates[currency] = rates[currency] / baseRate;
      });
      finalRates[baseCurrency] = 1;
    }

    console.log(`✓ Fetched fresh rates from ECB (base: ${baseCurrency})`);
    return finalRates;
  } catch (error) {
    console.error('ECB rate fetch failed:', error.message);
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
    
    // Get the rate from our currency to EUR
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];

    if (!fromRate || !toRate) {
      console.warn(`⚠ Missing rate: ${fromCurrency}=${fromRate}, ${toCurrency}=${toRate}`);
      return amount;
    }

    // Convert: amount in fromCurrency → EUR → toCurrency
    const converted = (amount / fromRate) * toRate;
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
