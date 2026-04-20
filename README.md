# outinry Backend

LGBTQ+ hotel metasearch API. Combines live pricing from SearchAPI with verified LGBTQ+-friendly hotel database.

## Setup

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Create `.env` file
Copy `.env.example` and fill in your keys:
```bash
cp .env.example .env
```

**Required:**
- `SEARCHAPI_KEY` — Your SearchAPI.io key
- `BOOKING_AFFILIATE_ID` — Booking.com affiliate ID
- `EXPEDIA_AFFILIATE_ID` — Expedia affiliate ID
- `AGODA_AFFILIATE_ID` — Agoda affiliate ID

### 3. Run locally
```bash
npm run dev
```

Server starts on `http://localhost:3000`

Check health: `http://localhost:3000/health`

## API Endpoints

### `POST /api/search`

Search for verified LGBTQ+ hotels with live pricing.

**Request:**
```json
{
  "destination": "Lisbon",
  "checkInDate": "2026-05-01",
  "checkOutDate": "2026-05-05",
  "adults": 2,
  "currency": "USD"
}
```

**Response:**
```json
{
  "destination": "Lisbon",
  "checkIn": "2026-05-01",
  "checkOut": "2026-05-05",
  "resultsCount": 5,
  "results": [
    {
      "name": "Corinthia Hotel Lisbon",
      "city": "Lisbon",
      "country": "PT",
      "description": "...",
      "pricePerNight": { "price": "$150", "extracted_price": 150 },
      "totalPrice": { "price": "$600", "extracted_price": 600 },
      "lgbtqCertification": {
        "sources": "World Rainbow Hotels",
        "level": "",
        "summary": ""
      },
      "affiliateLinks": {
        "booking": "https://www.booking.com/hotel/...",
        "expedia": "https://www.expedia.com/Hotel-Search?...",
        "agoda": "https://www.agoda.com/search?..."
      }
    }
  ]
}
```

### `GET /api/search/test?destination=Lisbon&checkIn=2026-05-01&checkOut=2026-05-05`

Test SearchAPI directly (no filtering).

### `GET /health`

Health check.

## How It Works

1. **User submits search** → destination, check-in, check-out
2. **Backend fetches** from SearchAPI with live prices
3. **Backend filters** results to only verified LGBTQ+ hotels (from `hotels.csv`)
4. **Backend adds** affiliate links (Booking.com, Expedia, Agoda)
5. **Backend returns** verified results with pricing + affiliate links

## Deployment to Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repo
4. Set environment variables in Render dashboard
5. Deploy

See `render.yaml` for config (if you want to automate).

## Notes

- Hotel database loaded on startup (2,803 hotels)
- SearchAPI calls cost ~$0.01 per query
- Affiliate links track to Booking.com/Expedia/Agoda
- CORS enabled for www.outinry.com
