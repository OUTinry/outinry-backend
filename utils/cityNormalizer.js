/**
 * cityNormalizer.js
 * Normalizes city names to handle autocomplete suggestions from Google Places.
 * Examples:
 *   "Greater London" → "london"
 *   "Île-de-France" → "paris"
 *   "New York metropolitan area" → "new york"
 */

const CITY_ALIASES = {
  // UK & Ireland
  'greater london': 'london',
  'city of london': 'london',
  'greater manchester': 'manchester',
  'west yorkshire': 'leeds',
  'south yorkshire': 'sheffield',
  'merseyside': 'liverpool',
  'tyne and wear': 'newcastle',
  'west midlands': 'birmingham',
  'greater glasgow': 'glasgow',
  'edinburgh city': 'edinburgh',
  'cardiff': 'cardiff',
  'belfast': 'belfast',
  'dublin city': 'dublin',

  // France
  'île-de-france': 'paris',
  'ile-de-france': 'paris',
  'provence-alpes-côte d\'azur': 'nice',
  'provence-alpes-cote d\'azur': 'nice',
  'auvergne-rhône-alpes': 'lyon',
  'auvergne-rhone-alpes': 'lyon',

  // Germany
  'berlin': 'berlin',
  'hamburg': 'hamburg',
  'north rhine-westphalia': 'cologne',
  'northrhine-westphalia': 'cologne',
  'bavaria': 'munich',

  // Spain
  'catalonia': 'barcelona',
  'madrid': 'madrid',
  'andalusia': 'seville',
  'community of madrid': 'madrid',
  'basque country': 'bilbao',

  // USA
  'new york metropolitan area': 'new york',
  'los angeles metropolitan area': 'los angeles',
  'san francisco bay area': 'san francisco',
  'san francisco metropolitan area': 'san francisco',
  'miami metropolitan area': 'miami',
  'chicago metropolitan area': 'chicago',
  'boston metropolitan area': 'boston',
  'washington d.c. metropolitan area': 'washington d.c.',
  'las vegas metropolitan area': 'las vegas',
  'new orleans metropolitan area': 'new orleans',
  'san diego metropolitan area': 'san diego',
  'denver metropolitan area': 'denver',
  'austin metropolitan area': 'austin',
  'seattle metropolitan area': 'seattle',
  'portland metropolitan area': 'portland',

  // Canada
  'toronto metropolitan area': 'toronto',
  'vancouver metropolitan area': 'vancouver',
  'montreal metropolitan area': 'montreal',

  // Australia
  'greater sydney': 'sydney',
  'greater melbourne': 'melbourne',
  'greater brisbane': 'brisbane',

  // Greece
  'attica': 'athens',
  'south aegean': 'mykonos',

  // Thailand
  'bangkok metropolitan region': 'bangkok',

  // Japan
  'tokyo metropolitan area': 'tokyo',

  // South Africa
  'western cape': 'cape town',
};

function normalizeCityName(inputCity) {
  if (!inputCity || typeof inputCity !== 'string') {
    return inputCity;
  }

  let normalized = inputCity.trim().toLowerCase();

  if (CITY_ALIASES[normalized]) {
    console.log(`[cityNormalizer] Mapped "${inputCity}" → "${CITY_ALIASES[normalized]}"`);
    return CITY_ALIASES[normalized];
  }

  const prefixes = [
    'greater ',
    'city of ',
    'metropolitan area of ',
    'metropolitan ',
    ' metropolitan area',
    ' region',
  ];

  let stripped = normalized;
  for (const prefix of prefixes) {
    if (stripped.startsWith(prefix)) {
      stripped = stripped.substring(prefix.length).trim();
      break;
    }
    if (stripped.endsWith(prefix)) {
      stripped = stripped.substring(0, stripped.length - prefix.length).trim();
      break;
    }
  }

  if (stripped !== normalized && CITY_ALIASES[stripped]) {
    console.log(`[cityNormalizer] Mapped "${inputCity}" → "${CITY_ALIASES[stripped]}" (stripped)`);
    return CITY_ALIASES[stripped];
  }

  console.log(`[cityNormalizer] No alias for "${inputCity}"; using: "${normalized}"`);
  return normalized;
}

function normalizeCityNames(cities) {
  if (!Array.isArray(cities)) {
    return cities;
  }
  return cities.map(city => normalizeCityName(city));
}

function validateNormalizer() {
  const testCases = [
    { input: 'Greater London', expected: 'london' },
    { input: 'greater london', expected: 'london' },
    { input: 'City of London', expected: 'london' },
    { input: 'London', expected: 'london' },
    { input: 'Greater Manchester', expected: 'manchester' },
    { input: 'New York metropolitan area', expected: 'new york' },
    { input: 'Greater Sydney', expected: 'sydney' },
    { input: 'Île-de-France', expected: 'paris' },
    { input: 'Barcelona', expected: 'barcelona' },
    { input: 'Amsterdam', expected: 'amsterdam' },
  ];

  let allPassed = true;
  console.log('\n[cityNormalizer] Running validation tests...');
  
  testCases.forEach((testCase, index) => {
    const result = normalizeCityName(testCase.input);
    const passed = result === testCase.expected;

    if (!passed) {
      allPassed = false;
      console.error(`  ❌ Test ${index + 1}: "${testCase.input}" → "${result}" (expected "${testCase.expected}")`);
    } else {
      console.log(`  ✓ Test ${index + 1}: "${testCase.input}" → "${result}"`);
    }
  });

  if (allPassed) {
    console.log('[cityNormalizer] ✓ All tests passed!\n');
  } else {
    console.error('[cityNormalizer] ✗ Some tests failed!\n');
  }

  return allPassed;
}

module.exports = {
  normalizeCityName,
  normalizeCityNames,
  validateNormalizer,
  CITY_ALIASES,
};
