/**
 * cityNormalizer.js
 * Normalizes city names to handle autocomplete suggestions from Google Places.
 */

const CITY_ALIASES = {
  'greater london': 'london',
  'city of london': 'london',
  'greater manchester': 'manchester',
  'greater glasgow': 'glasgow',
  'greater edinburgh': 'edinburgh',
  'greater birmingham': 'birmingham',
  'greater bristol': 'bristol',
  'greater cardiff': 'cardiff',
  'greater belfast': 'belfast',
  'greater liverpool': 'liverpool',
  'greater leeds': 'leeds',
  'greater nottingham': 'nottingham',
  'greater sheffield': 'sheffield',
  'city of manchester': 'manchester',
  'city of westminster': 'london',
  'new york metropolitan area': 'new york',
  'los angeles metropolitan area': 'los angeles',
  'san francisco bay area': 'san francisco',
  'greater sydney': 'sydney',
  'greater melbourne': 'melbourne',
  'greater brisbane': 'brisbane',
  'greater toronto': 'toronto',
  'greater vancouver': 'vancouver',
  'greater montreal': 'montreal',
  'île-de-france': 'paris',
  'ile-de-france': 'paris',
  'greater paris': 'paris',
  'greater athens': 'athens',
  'greater bangkok': 'bangkok',
  'greater singapore': 'singapore',
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
    { input: 'London', expected: 'london' },
    { input: 'Greater Manchester', expected: 'manchester' },
    { input: 'New York metropolitan area', expected: 'new york' },
  ];

  let allPassed = true;
  console.log('[cityNormalizer] Running validation tests...');
  
  testCases.forEach((testCase, index) => {
    const result = normalizeCityName(testCase.input);
    const passed = result === testCase.expected;

    if (!passed) {
      allPassed = false;
      console.error(`  ❌ Test ${index + 1}: "${testCase.input}" → "${result}"`);
    } else {
      console.log(`  ✓ Test ${index + 1}: "${testCase.input}" → "${result}"`);
    }
  });

  return allPassed;
}

export { normalizeCityName, normalizeCityNames, validateNormalizer, CITY_ALIASES };
