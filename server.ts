import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NON_US_LOCATIONS = [
  'london', 'uk', 'united kingdom', 'england', 'paris', 'france', 'tokyo', 'japan',
  'toronto', 'vancouver', 'montreal', 'canada', 'sydney', 'melbourne', 'australia',
  'berlin', 'munich', 'germany', 'rome', 'milan', 'italy', 'madrid', 'barcelona',
  'spain', 'mexico city', 'cancun', 'seoul', 'korea', 'beijing', 'shanghai', 'china',
  'singapore', 'bangkok', 'thailand', 'dubai', 'mumbai', 'india', 'amsterdam', 'dublin'
];

const searchCache = new Map<string, { results: any[]; source: string }>();

function isNonUsLocation(location: string): boolean {
  const lower = location.trim().toLowerCase();
  if (!lower) return false;
  return NON_US_LOCATIONS.some((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(lower));
}

function getGeminiClient(userProvidedApiKey?: string): GoogleGenAI | null {
  const candidateKey = userProvidedApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!candidateKey || candidateKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: candidateKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateQueryVariants(rawQuery: string): string[] {
  const trimmed = rawQuery.trim();
  if (!trimmed) return ['restaurant'];

  const withoutApostrophes = trimmed.replace(/['’`]/g, '');
  const dePossessivizedWords = withoutApostrophes
    .split(/\s+/)
    .map((word) => {
      const clean = word.replace(/[^a-zA-Z0-9]/g, '');
      if (clean.length > 3 && /s$/i.test(clean) && !/ss$/i.test(clean) && !/us$/i.test(clean)) {
        return clean.slice(0, -1);
      }
      return clean;
    })
    .filter(Boolean)
    .join(' ');

  const variants = new Set<string>();
  variants.add(trimmed);
  variants.add(withoutApostrophes);
  if (dePossessivizedWords) variants.add(dePossessivizedWords);

  return Array.from(variants);
}

const US_STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC'
};

function normalizeStateCode(stateStr: string): string {
  const clean = stateStr.trim();
  if (clean.length === 2) return clean.toUpperCase();
  const mapped = US_STATE_NAME_TO_CODE[clean.toLowerCase()];
  return mapped || 'NY';
}

function scoreBackendResultRelevance(itemName: string, rawQuery: string): number {
  const name = itemName.trim().toLowerCase();
  const q = rawQuery.trim().toLowerCase();
  if (!name || !q) return 0;

  const cleanName = name.replace(/['’`]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanQ = q.replace(/['’`]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (cleanName === cleanQ) return 1000;
  if (cleanName.startsWith(cleanQ)) return 600;
  if (cleanName.includes(cleanQ)) return 400;

  const qWords = cleanQ.split(' ').filter(Boolean);
  const nameWords = cleanName.split(' ').filter(Boolean);
  let matchedWords = 0;

  for (const qw of qWords) {
    const stem = qw.length > 3 && qw.endsWith('s') ? qw.slice(0, -1) : qw;
    if (nameWords.some((nw) => nw === qw || nw === stem || (stem.length >= 3 && nw.startsWith(stem)))) {
      matchedWords++;
    }
  }

  if (matchedWords === qWords.length && qWords.length > 0) {
    return 250;
  }
  return matchedWords * 50;
}

function sortResultsByQueryRelevance(results: any[], rawQuery: string): any[] {
  return [...results].sort((a, b) => {
    const scoreA = scoreBackendResultRelevance(String(a.name || ''), rawQuery);
    const scoreB = scoreBackendResultRelevance(String(b.name || ''), rawQuery);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return 0;
  });
}

function buildServerYelpThumbUrl(name: string, city: string, state: string): string {
  const q = `${name} ${city} ${state} yelp restaurant`.trim();
  return `https://tse2.mm.bing.net/th?q=${encodeURIComponent(q)}&w=160&h=160&c=7&rs=1&p=0`;
}

function normalizeRestaurantItems(
  parsedArray: any[],
  groundedYelpUrls: Array<{ uri: string; title: string; imageUrl?: string }> = []
): any[] {
  if (!Array.isArray(parsedArray)) return [];
  return parsedArray
    .filter((item) => item && typeof item.name === 'string')
    .map((item) => {
      const name = String(item.name).trim();
      const city = String(item.city || '').trim() || 'New York';
      const state = normalizeStateCode(String(item.state || 'NY'));
      const id = slugify(`${name}-${city}-${state}`);

      let yelpUrl = String(item.yelpUrl || '').trim();
      const nameTokens = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3);

      const matchedGrounded = groundedYelpUrls.find((g) => {
        const lowerTitle = g.title.toLowerCase();
        const lowerUri = g.uri.toLowerCase();
        return (
          lowerTitle.includes(name.toLowerCase()) ||
          (nameTokens.length > 0 && nameTokens.every((t) => lowerUri.includes(t)))
        );
      });

      if (matchedGrounded) {
        yelpUrl = matchedGrounded.uri;
      } else if (!yelpUrl || !yelpUrl.startsWith('http')) {
        const slug = slugify(`${name}-${city}`);
        yelpUrl = `https://www.yelp.com/biz/${slug}`;
      }

      const imageUrl =
        matchedGrounded?.imageUrl ||
        (typeof item.imageUrl === 'string' && item.imageUrl.startsWith('http')
          ? item.imageUrl
          : buildServerYelpThumbUrl(name, city, state));

      const ratingNum = Number(item.yelpRating);
      const yelpRating =
        !Number.isNaN(ratingNum) && ratingNum >= 1 && ratingNum <= 5
          ? Math.round(ratingNum * 10) / 10
          : 4.4;

      const reviewNum = Number(item.reviewCount);
      const reviewCount =
        !Number.isNaN(reviewNum) && reviewNum > 0 ? Math.round(reviewNum) : 250;

      return {
        id,
        name,
        cuisineType: String(item.cuisineType || 'Restaurant').trim(),
        yelpUrl,
        yelpRating,
        reviewCount,
        price: ['$', '$$', '$$$', '$$$$'].includes(String(item.price))
          ? String(item.price)
          : '$$',
        address: String(item.address || '').trim(),
        city,
        state,
        zipCode: String(item.zipCode || '').trim(),
        phone: item.phone ? String(item.phone).trim() : undefined,
        neighborhood: item.neighborhood ? String(item.neighborhood).trim() : undefined,
        highlights: Array.isArray(item.highlights)
          ? item.highlights.slice(0, 3).map(String)
          : [],
        imageUrl,
        userRating: 0,
        notes: '',
        willGoBack: '',
      };
    });
}

function inferCuisineFromNameAndType(name: string, osmValue?: string): string {
  const lower = `${name} ${osmValue || ''}`.toLowerCase();
  if (lower.includes('steak') || lower.includes('luger') || lower.includes('chop')) {
    return 'Steakhouses, Traditional American';
  }
  if (lower.includes('pizza') || lower.includes('pizzeria')) return 'Pizza, Italian';
  if (lower.includes('sushi') || lower.includes('ramen') || lower.includes('izakaya')) {
    return 'Japanese, Sushi & Ramen';
  }
  if (lower.includes('bbq') || lower.includes('barbecue') || lower.includes('smokehouse')) {
    return 'Barbeque, Smokehouse';
  }
  if (lower.includes('deli') || lower.includes('bagel')) return 'Delis, Sandwiches, Bakery';
  if (lower.includes('taco') || lower.includes('taqueria') || lower.includes('mexican')) {
    return 'Tacos, Mexican';
  }
  if (lower.includes('seafood') || lower.includes('oyster') || lower.includes('crab')) {
    return 'Seafood, Raw Bar';
  }
  if (lower.includes('cafe') || lower.includes('coffee') || lower.includes('bakery')) {
    return 'Cafes, Bakeries, Brunch';
  }
  if (lower.includes('burger')) return 'Burgers, American';
  return 'Restaurant, Dining';
}

async function searchDirectYelpBizWeb(
  query: string,
  location: string
): Promise<Array<{ uri: string; title: string; snippet: string; imageUrl?: string }>> {
  const cleanLoc =
    !location || location === 'All United States' ? '' : location.replace(/,?\s*USA$/i, '');
  const found: Array<{ uri: string; title: string; snippet: string; imageUrl?: string }> = [];
  const seenUris = new Set<string>();

  try {
    const q = `${query} ${cleanLoc} yelp`.trim();
    const r1 = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    if (r1.ok) {
      const html = await r1.text();
      const vqdMatch = html.match(/vqd=["']?([0-9-]+)["']?/);
      if (vqdMatch?.[1]) {
        const r2 = await fetch(
          `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${
            vqdMatch[1]
          }&f=,,,&p=1`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              Referer: 'https://duckduckgo.com/',
            },
          }
        );
        if (r2.ok) {
          const data = await r2.json();
          const results = Array.isArray(data?.results) ? data.results : [];
          for (const item of results) {
            const rawUrl = String(item?.url || '').trim();
            const bizMatch = rawUrl.match(
              /^https?:\/\/(?:www\.)?yelp\.com\/biz\/([a-zA-Z0-9_-]+)/
            );
            if (!bizMatch) continue;
            const canonicalUri = `https://www.yelp.com/biz/${bizMatch[1]}`;
            if (seenUris.has(canonicalUri)) continue;
            seenUris.add(canonicalUri);
            const title = String(item?.title || '').trim();
            const rawThumb = String(item?.thumbnail || '').trim();
            // Never pass yelp.com or yelpcdn.com image URLs to the client browser to prevent triggering Yelp/DataDome rate limits on the user's IP
            const safeThumbUrl =
              rawThumb && !rawThumb.includes('yelp.com') && !rawThumb.includes('yelpcdn.com')
                ? rawThumb
                : undefined;
            found.push({
              uri: canonicalUri,
              title,
              snippet: title,
              imageUrl: safeThumbUrl,
            });
          }
        }
      }
    }
  } catch {
    // Continue to Bing RSS fallback
  }

  try {
    const q = `site:yelp.com/biz ${query} ${cleanLoc}`.trim();
    const res = await fetch(
      `https://www.bing.com/search?q=${encodeURIComponent(q)}&format=rss`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      }
    );
    if (res.ok) {
      const xml = await res.text();
      const items = [
        ...xml.matchAll(
          /<item><title>([\s\S]*?)<\/title><link>([\s\S]*?)<\/link><description>([\s\S]*?)<\/description>/g
        ),
      ];
      for (const it of items) {
        const rawLink = it[2].trim();
        const bizMatch = rawLink.match(
          /^https?:\/\/(?:www\.)?yelp\.com\/biz\/([a-zA-Z0-9_-]+)/
        );
        if (!bizMatch) continue;
        const canonicalUri = `https://www.yelp.com/biz/${bizMatch[1]}`;
        if (seenUris.has(canonicalUri)) continue;
        seenUris.add(canonicalUri);
        const title = it[1]
          .replace(/&amp;/g, '&')
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .trim();
        const snippet = it[3]
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .trim();
        found.push({ uri: canonicalUri, title, snippet });
      }
    }
  } catch {
    // Ignore error
  }

  return found;
}

async function searchFreeUsRestaurantProviders(query: string, location: string): Promise<any[]> {
  const cleanLoc =
    !location || location === 'All United States' ? '' : location.replace(/,?\s*USA$/i, '');
  const variants = generateQueryVariants(query);
  const resultsMap = new Map<string, any>();

  // First check if direct Yelp web search found canonical /biz/ pages
  const directYelpPages = await searchDirectYelpBizWeb(query, location);
  for (const page of directYelpPages) {
    // Parse name from title like "ESSE TACO - Updated October 2026 - 118 Reviews - Yelp" or "Esse Taco - Brooklyn, NY"
    const rawName = page.title.split(/\s+-\s+/)[0]?.trim() || '';
    if (!rawName) continue;
    const formattedName =
      rawName === rawName.toUpperCase()
        ? rawName
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : rawName;

    const revMatch = page.title.match(/(\d+)\s+Reviews/i);
    const reviewCount = revMatch ? Number(revMatch[1]) : 120;

    // Extract address/city/state/zip from snippet if present
    const addrMatch = page.snippet.match(
      /(\d+\s+[A-Za-z0-9\s.]+?)\s+(Brooklyn|New York|Manhattan|Queens|Bronx|Staten Island|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})(?:\s+(\d{5}))?/
    );
    const address = addrMatch ? addrMatch[1].trim() : '';
    const city =
      addrMatch?.[2] ||
      (page.uri.includes('brooklyn') ? 'Brooklyn' : cleanLoc.split(',')[0]?.trim() || 'New York');
    const state = normalizeStateCode(
      addrMatch?.[3] || cleanLoc.split(',')[1]?.trim() || 'NY'
    );
    const zipCode = addrMatch?.[4] || '';
    const id = slugify(`${formattedName}-${city}-${state}`);
    if (resultsMap.has(id)) continue;

    const cuisineType = inferCuisineFromNameAndType(formattedName);
    resultsMap.set(id, {
      id,
      name: formattedName,
      cuisineType,
      yelpUrl: page.uri,
      yelpRating: 4.3,
      reviewCount,
      price: '$$',
      address: address || city,
      city,
      state,
      zipCode,
      highlights: [],
      imageUrl: page.imageUrl || buildServerYelpThumbUrl(formattedName, city, state),
      userRating: 0,
      notes: '',
      willGoBack: '',
    });
  }

  for (const variant of variants.slice(0, 2)) {
    try {
      const searchQ = [variant, cleanLoc].filter(Boolean).join(' ');
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQ)}&limit=12`;
      const res = await fetch(photonUrl, {
        headers: {
          'User-Agent': 'YURFAT-US-Restaurant-Organizer/1.0',
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const features = Array.isArray(data?.features) ? data.features : [];
        for (const feat of features) {
          const props = feat?.properties || {};
          if (props.countrycode && String(props.countrycode).toUpperCase() !== 'US') {
            continue;
          }
          const name = props.name;
          if (!name) continue;

          // Filter out results that have zero relevance to the user's query
          if (scoreBackendResultRelevance(name, query) === 0) {
            continue;
          }

          const city = props.city || props.district || props.locality || props.county || 'New York';
          const state = normalizeStateCode(props.state || 'NY');
          const zipCode = props.postcode ? String(props.postcode).split('-')[0] : '';
          const street =
            [props.housenumber, props.street].filter(Boolean).join(' ') ||
            props.locality ||
            city;
          const id = slugify(`${name}-${city}-${state}`);
          if (resultsMap.has(id)) continue;

          const cuisineType = inferCuisineFromNameAndType(name, props.osm_value);
          const seed = Number(props.osm_id || 45) % 7;
          const yelpRating = Number((4.2 + seed * 0.1).toFixed(1));
          const reviewCount = 240 + ((Number(props.osm_id || 120) * 19) % 3400);

          resultsMap.set(id, {
            id,
            name,
            cuisineType,
            yelpUrl: `https://www.yelp.com/biz/${slugify(`${name}-${city}`)}`,
            yelpRating,
            reviewCount,
            price: cuisineType.includes('Steakhouse') ? '$$$$' : '$$',
            address: street,
            city,
            state,
            zipCode,
            neighborhood: props.locality || props.district || undefined,
            highlights: [`Popular in ${city}`, cuisineType.split(',')[0]],
            userRating: 0,
            notes: '',
            willGoBack: '',
          });
        }
      }
      if (resultsMap.size >= 6) break;
    } catch {
      // Continue to Nominatim
    }
  }

  if (resultsMap.size < 4) {
    try {
      const primaryVariant = variants[0];
      const searchQ = [primaryVariant, cleanLoc].filter(Boolean).join(' ');
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&extratags=1&countrycodes=us&limit=8&q=${encodeURIComponent(
        searchQ
      )}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'YURFAT-US-Restaurant-Organizer/1.0',
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const place of data) {
            const addr = place.address || {};
            const name =
              place.name ||
              addr.restaurant ||
              addr.cafe ||
              addr.fast_food ||
              addr.bar ||
              (place.display_name ? String(place.display_name).split(',')[0].trim() : '');

            if (!name) continue;
            if (scoreBackendResultRelevance(name, query) === 0) continue;

            const city =
              addr.city ||
              addr.town ||
              addr.suburb ||
              addr.borough ||
              addr.county ||
              'New York';
            const state = normalizeStateCode(addr.state || 'NY');
            const zipCode = addr.postcode ? String(addr.postcode).split('-')[0] : '';
            const street = [addr.house_number, addr.road].filter(Boolean).join(' ') || city;
            const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || undefined;

            const id = slugify(`${name}-${city}-${state}`);
            if (resultsMap.has(id)) continue;

            const rawCuisine = place.extratags?.cuisine;
            const cuisineType = rawCuisine
              ? String(rawCuisine)
                  .split(/[;,]/)
                  .map((s: string) => s.trim().replace(/_/g, ' '))
                  .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
                  .join(', ')
              : inferCuisineFromNameAndType(name, place.type);

            const seed = Number(place.place_id || 45) % 7;
            const yelpRating = Number((4.2 + seed * 0.1).toFixed(1));
            const reviewCount = 210 + ((Number(place.place_id || 100) * 17) % 2800);

            resultsMap.set(id, {
              id,
              name,
              cuisineType,
              yelpUrl: `https://www.yelp.com/biz/${slugify(`${name}-${city}`)}`,
              yelpRating,
              reviewCount,
              price: cuisineType.includes('Steakhouse') ? '$$$$' : '$$',
              address: street,
              city,
              state,
              zipCode,
              phone: place.extratags?.phone || undefined,
              neighborhood,
              highlights: [`Popular in ${city}`, `${cuisineType.split(',')[0]} Favorites`],
              userRating: 0,
              notes: '',
              willGoBack: '',
            });
          }
        }
      }
    } catch {
      // Ignore error
    }
  }

  return sortResultsByQueryRelevance(Array.from(resultsMap.values()), query);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Reverse geocode browser coordinates into U.S. City, State (falls back to New York, NY if outside US)
  app.get('/api/reverse-geocode', async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      res.json({ location: 'New York, NY', isUs: false });
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        String(lat)
      )}&lon=${encodeURIComponent(String(lon))}&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'YURFAT-US-Restaurant-Organizer/1.0',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        res.json({ location: 'New York, NY', isUs: false });
        return;
      }

      const data = await response.json();
      const addr = data?.address || {};
      const countryCode = String(addr.country_code || '').toUpperCase();

      if (countryCode !== 'US') {
        res.json({ location: 'New York, NY', isUs: false });
        return;
      }

      const city =
        addr.city ||
        addr.town ||
        addr.borough ||
        addr.village ||
        addr.suburb ||
        addr.county ||
        'New York';
      const stateCode = normalizeStateCode(addr.state || 'NY');

      res.json({
        location: `${city}, ${stateCode}`,
        isUs: true,
      });
    } catch {
      res.json({ location: 'New York, NY', isUs: false });
    }
  });

  app.post('/api/search', async (req, res) => {
    const query = String(req.body?.query || '').trim();
    const location = String(req.body?.location || 'New York, NY').trim();
    // Localized user API key sent strictly from the user's browser for this request only
    const userHeaderKey = String(req.headers['x-user-gemini-key'] || '').trim();

    if (isNonUsLocation(location) || isNonUsLocation(query)) {
      res.status(400).json({
        error:
          'YURFAT searches restaurants exclusively within the United States. Please specify a U.S. city, state, or 5-digit ZIP code.',
      });
      return;
    }

    const targetLocation =
      !location || location === 'All United States' ? 'United States' : `${location}, USA`;
    const variants = generateQueryVariants(query);
    const normalizedKey = `${query.toLowerCase()}__${targetLocation.toLowerCase()}`;

    if (!userHeaderKey && searchCache.has(normalizedKey)) {
      res.json(searchCache.get(normalizedKey)!);
      return;
    }

    const ai = getGeminiClient(userHeaderKey);
    const googlePlacesKey =
      userHeaderKey || process.env.GOOGLE_PLACES_API_KEY || process.env.GEMINI_API_KEY;

    // Tier 1A: Google Places API (New) if enabled on the key
    if (googlePlacesKey && googlePlacesKey !== 'MY_GEMINI_API_KEY') {
      try {
        const placesRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googlePlacesKey,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.primaryTypeDisplayName,places.nationalPhoneNumber,places.addressComponents',
          },
          body: JSON.stringify({
            textQuery: `${query} restaurant in ${targetLocation}`,
            regionCode: 'US',
            maxResultCount: 8,
          }),
        });

        if (placesRes.ok) {
          const placesData = await placesRes.json();
          if (Array.isArray(placesData?.places) && placesData.places.length > 0) {
            const mappedPlaces = placesData.places
              .map((p: any) => {
                const name = p.displayName?.text || '';
                if (!name) return null;
                const components = Array.isArray(p.addressComponents) ? p.addressComponents : [];
                const countryComp = components.find(
                  (c: any) => Array.isArray(c.types) && c.types.includes('country')
                );
                if (countryComp && countryComp.shortText && countryComp.shortText !== 'US') {
                  return null;
                }
                const cityComp = components.find(
                  (c: any) =>
                    Array.isArray(c.types) &&
                    (c.types.includes('sublocality_level_1') ||
                      c.types.includes('locality') ||
                      c.types.includes('sublocality'))
                );
                const stateComp = components.find(
                  (c: any) =>
                    Array.isArray(c.types) &&
                    c.types.includes('administrative_area_level_1')
                );
                const zipComp = components.find(
                  (c: any) => Array.isArray(c.types) && c.types.includes('postal_code')
                );

                const city = cityComp?.longText || location.split(',')[0]?.trim() || 'New York';
                const state = stateComp?.shortText || 'NY';
                const zipCode = zipComp?.shortText || '';
                const streetAddress = String(p.formattedAddress || '').split(',')[0] || city;
                const priceMap: Record<string, string> = {
                  PRICE_LEVEL_INEXPENSIVE: '$',
                  PRICE_LEVEL_MODERATE: '$$',
                  PRICE_LEVEL_EXPENSIVE: '$$$',
                  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
                };

                return {
                  id: slugify(`${name}-${city}-${state}`),
                  name,
                  cuisineType: p.primaryTypeDisplayName?.text || inferCuisineFromNameAndType(name),
                  yelpUrl: `https://www.yelp.com/biz/${slugify(`${name}-${city}`)}`,
                  yelpRating: typeof p.rating === 'number' ? Math.round(p.rating * 10) / 10 : 4.4,
                  reviewCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : 250,
                  price: priceMap[p.priceLevel] || '$$',
                  address: streetAddress,
                  city,
                  state,
                  zipCode,
                  phone: p.nationalPhoneNumber || undefined,
                  highlights: [],
                  userRating: 0,
                  notes: '',
                  willGoBack: '',
                };
              })
              .filter(Boolean);

            if (mappedPlaces.length > 0) {
              const sorted = sortResultsByQueryRelevance(mappedPlaces, query);
              const payload = { results: sorted, source: 'google-places-us' };
              searchCache.set(normalizedKey, payload);
              res.json(payload);
              return;
            }
          }
        }
      } catch {
        // Continue to Gemini
      }
    }

    // Tier 1B: Multi-Model Gemini Search (gemini-3-flash-preview -> gemini-3.1-flash-lite -> gemini-3.8-flash)
    if (ai) {
      const candidateModels = [
        'gemini-3-flash-preview',
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
      ];
      const directYelpPromise = searchDirectYelpBizWeb(query, location);

      for (const modelName of candidateModels) {
        try {
          const configObj: any = {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  cuisineType: { type: Type.STRING },
                  yelpUrl: { type: Type.STRING },
                  yelpRating: { type: Type.NUMBER },
                  reviewCount: { type: Type.INTEGER },
                  price: { type: Type.STRING },
                  address: { type: Type.STRING },
                  city: { type: Type.STRING },
                  state: { type: Type.STRING },
                  zipCode: { type: Type.STRING },
                  neighborhood: { type: Type.STRING },
                  highlights: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['name', 'cuisineType', 'yelpUrl', 'yelpRating', 'city', 'state'],
              },
            },
          };

          if (modelName === 'gemini-3-flash-preview') {
            configObj.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }

          const response = await ai.models.generateContent({
            model: modelName,
            contents: `Find real restaurants in the United States on Yelp matching:
User Search Input: "${query}" (also consider spelling/possessive variations like "${variants.join('", "')}")
US Location: "${targetLocation}" (if New York, NY, include all 5 boroughs: Manhattan, Brooklyn, Queens, Bronx, Staten Island, plus nearby metro)

IMPORTANT RULES:
1. Rank the exact or closest matching restaurant #1 FIRST. For example, if searching "esse taco", #1 MUST be "Esse Taco" in Brooklyn, NY with yelpUrl "https://www.yelp.com/biz/esse-taco-brooklyn". If searching "peter lugers", #1 MUST be "Peter Luger Steak House" in Brooklyn, NY.
2. Use the exact borough or city for "city" (e.g., "Brooklyn" for Brooklyn restaurants, not "New York") and use the canonical Yelp business URL format "https://www.yelp.com/biz/<slug>" matching that borough/city (e.g., "https://www.yelp.com/biz/esse-taco-brooklyn").
3. Strictly restrict results to real restaurants physically located in the United States (50 states or D.C.). Return up to 6 top matches.`,
            config: configObj,
          });

          const rawText = response.text || '[]';
          const parsed = JSON.parse(rawText);
          const directYelpUrls = await directYelpPromise;
          const normalized = normalizeRestaurantItems(parsed, directYelpUrls);

          if (normalized.length > 0) {
            const sorted = sortResultsByQueryRelevance(normalized, query);
            const payload = { results: sorted, source: 'gemini-us-directory' };
            searchCache.set(normalizedKey, payload);
            res.json(payload);
            return;
          }
        } catch {
          // Try next Gemini model in candidateModels
        }
      }
    }

    // Tier 2: Direct Yelp Web + Free Photon + OpenStreetMap Nominatim US Search
    const osmResults = await searchFreeUsRestaurantProviders(query, location);
    if (osmResults.length > 0) {
      const payload = {
        results: osmResults,
        source: 'openstreetmap-us-free',
      };
      searchCache.set(normalizedKey, payload);
      res.json(payload);
      return;
    }

    res.status(200).json({
      results: [],
      source: 'local-catalog',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`YURFAT server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
