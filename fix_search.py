import re

with open('routes/search.js', 'r') as f:
    content = f.read()

# Find and replace the first conversion (around line 72)
old_conversion = '''            // Convert prices from USD to user's currency
            const convertedPricePerNight = await convertPrice(hotel.price_per_night, 'USD', userCurrency);
            const convertedTotalPrice = await convertPrice(hotel.total_price, 'USD', userCurrency);'''

new_conversion = '''            // Convert prices from USD to user's currency
            const convertedPricePerNight = await convertPriceObject(hotel.price_per_night, userCurrency);
            const convertedTotalPrice = await convertPriceObject(hotel.total_price, userCurrency);'''

content = content.replace(old_conversion, new_conversion)

# Add the helper function after the router declaration
helper_function = '''
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
  }'''

insertion_point = 'const router = express.Router();'
content = content.replace(insertion_point, insertion_point + helper_function)

with open('routes/search.js', 'w') as f:
    f.write(content)

print("✓ routes/search.js updated")
