import { Restaurant, SavedList, DEFAULT_WANT_TO_GO_ID, DEFAULT_BEEN_HERE_ID } from '../types';

export const US_STATES_AND_TERRITORIES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC'
]);

const NON_US_KEYWORDS = [
  'london', 'uk', 'united kingdom', 'england', 'paris', 'france', 'tokyo', 'japan',
  'toronto', 'vancouver', 'montreal', 'canada', 'sydney', 'melbourne', 'australia',
  'berlin', 'munich', 'germany', 'rome', 'milan', 'italy', 'madrid', 'barcelona',
  'spain', 'mexico city', 'cancun', 'seoul', 'korea', 'beijing', 'shanghai', 'china',
  'singapore', 'bangkok', 'thailand', 'dubai', 'mumbai', 'india', 'amsterdam', 'dublin'
];

export function validateUsLocation(locationInput: string): { valid: boolean; reason?: string } {
  const trimmed = locationInput.trim().toLowerCase();
  if (!trimmed) {
    return { valid: true }; // Default to all US when empty
  }

  for (const keyword of NON_US_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(trimmed)) {
      return {
        valid: false,
        reason: `YURFAT searches restaurants exclusively within the United States. "${locationInput}" appears to be outside the U.S. Please enter a U.S. city, state (e.g., "Austin, TX"), or 5-digit U.S. ZIP code.`
      };
    }
  }

  return { valid: true };
}

export const POPULAR_US_CITIES = [
  'All United States',
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Austin, TX',
  'San Francisco, CA',
  'Seattle, WA',
  'New Orleans, LA',
  'Miami, FL',
  'Boston, MA',
  'Philadelphia, PA',
  'Portland, OR',
  'Nashville, TN',
  'Las Vegas, NV'
];

export const INITIAL_US_RESTAURANTS: Restaurant[] = [
  {
    id: 'katzs-delicatessen-new-york',
    name: "Katz's Delicatessen",
    cuisineType: 'Delis, Sandwiches, Soup',
    yelpUrl: 'https://www.yelp.com/biz/katzs-delicatessen-new-york',
    yelpRating: 4.5,
    reviewCount: 15840,
    price: '$$',
    address: '205 E Houston St',
    city: 'New York',
    state: 'NY',
    zipCode: '10002',
    phone: '(212) 254-2246',
    neighborhood: 'Lower East Side',
    highlights: ['Pastrami on Rye', 'Matzo Ball Soup', 'Corned Beef Reuben'],
    userRating: 5,
    notes: 'Hand-carved hot pastrami on rye with mustard is unbeatable. Ask for a sample at the counter!',
    willGoBack: 'Y'
  },
  {
    id: 'franklin-barbecue-austin',
    name: 'Franklin Barbecue',
    cuisineType: 'Barbeque, Smokehouse, Southern',
    yelpUrl: 'https://www.yelp.com/biz/franklin-barbecue-austin',
    yelpRating: 4.6,
    reviewCount: 6410,
    price: '$$$',
    address: '900 E 11th St',
    city: 'Austin',
    state: 'TX',
    zipCode: '78702',
    phone: '(512) 653-1187',
    neighborhood: 'East Austin',
    highlights: ['Post-Oak Smoked Brisket', 'Pork Spare Ribs', 'Jalapeño Cheddar Sausage'],
    userRating: 5,
    notes: 'Worth the morning line—the fatty brisket bark literally melts. Pre-order online if possible.',
    willGoBack: 'Y'
  },
  {
    id: 'bestia-los-angeles',
    name: 'Bestia',
    cuisineType: 'Italian, Wood-Fired Pizza, Cocktail Bars',
    yelpUrl: 'https://www.yelp.com/biz/bestia-los-angeles',
    yelpRating: 4.5,
    reviewCount: 7390,
    price: '$$$',
    address: '2121 E 7th Pl',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90021',
    phone: '(213) 514-5724',
    neighborhood: 'Arts District',
    highlights: ['Roasted Bone Marrow with Spinach Gnocchetti', 'Cavatelli alla Norcina', 'Margherita Pizza'],
    userRating: 4,
    notes: 'Book 30 days ahead. The bone marrow with gnocchetti and house-cured charcuterie are must-orders.',
    willGoBack: ''
  },
  {
    id: 'girl-and-the-goat-chicago',
    name: 'Girl & The Goat',
    cuisineType: 'New American, Small Plates, Bakery',
    yelpUrl: 'https://www.yelp.com/biz/girl-and-the-goat-chicago',
    yelpRating: 4.6,
    reviewCount: 10240,
    price: '$$$',
    address: '809 W Randolph St',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60607',
    phone: '(312) 492-6262',
    neighborhood: 'West Loop',
    highlights: ['Wood Oven Roasted Pig Face', 'Sautéed Green Beans', 'Goat Empanadas'],
    userRating: 5,
    notes: 'The sautéed green beans with fish sauce vinaigrette and cashews are legendary.',
    willGoBack: 'Y'
  },
  {
    id: 'tartine-manufactory-san-francisco',
    name: 'Tartine Manufactory',
    cuisineType: 'Bakeries, Cafes, Californian',
    yelpUrl: 'https://www.yelp.com/biz/tartine-manufactory-san-francisco',
    yelpRating: 4.3,
    reviewCount: 3890,
    price: '$$',
    address: '595 Alabama St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94110',
    phone: '(415) 757-0007',
    neighborhood: 'Mission District',
    highlights: ['Morning Bun', 'Country Sourdough Loaf', 'Croque Madame'],
    userRating: 4,
    notes: 'Grab a warm morning bun and country loaf before 10am.',
    willGoBack: ''
  },
  {
    id: 'pike-place-chowder-seattle',
    name: 'Pike Place Chowder',
    cuisineType: 'Seafood, Soup, Sandwiches',
    yelpUrl: 'https://www.yelp.com/biz/pike-place-chowder-seattle',
    yelpRating: 4.5,
    reviewCount: 9180,
    price: '$$',
    address: '1530 Post Alley',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101',
    phone: '(206) 267-2537',
    neighborhood: 'Pike Place Market',
    highlights: ['New England Clam Chowder', 'Smoked Salmon Chowder', 'Maine Lobster Roll'],
    userRating: 0,
    notes: 'Order the 4-bowl chowder sampler flight in sourdough bread bowls.',
    willGoBack: ''
  },
  {
    id: 'commanders-palace-new-orleans',
    name: "Commander's Palace",
    cuisineType: 'Creole, Cajun, Southern Fine Dining',
    yelpUrl: 'https://www.yelp.com/biz/commanders-palace-new-orleans-2',
    yelpRating: 4.5,
    reviewCount: 5620,
    price: '$$$',
    address: '1403 Washington Ave',
    city: 'New Orleans',
    state: 'LA',
    zipCode: '70130',
    phone: '(504) 899-8221',
    neighborhood: 'Garden District',
    highlights: ['Turtle Soup Au Sherry', 'Pecan Crusted Gulf Fish', 'Bread Pudding Soufflé'],
    userRating: 4,
    notes: 'Dress code enforced. 25-cent weekday lunch martinis and Creole bread pudding soufflé!',
    willGoBack: 'Y'
  },
  {
    id: 'joes-stone-crab-miami-beach',
    name: "Joe's Stone Crab",
    cuisineType: 'Seafood, Steakhouses, Traditional American',
    yelpUrl: 'https://www.yelp.com/biz/joes-stone-crab-miami-beach',
    yelpRating: 4.4,
    reviewCount: 4210,
    price: '$$$$',
    address: '11 Washington Ave',
    city: 'Miami Beach',
    state: 'FL',
    zipCode: '33139',
    phone: '(305) 673-0365',
    neighborhood: 'South Beach',
    highlights: ['Florida Stone Crab Claws', 'Key Lime Pie', 'Hash Browns & Creamed Spinach'],
    userRating: 3,
    notes: 'Key lime pie is incredible, though stone crab prices have gotten very steep.',
    willGoBack: 'N'
  },
  {
    id: 'zahav-philadelphia',
    name: 'Zahav',
    cuisineType: 'Middle Eastern, Mediterranean, Israeli',
    yelpUrl: 'https://www.yelp.com/biz/zahav-philadelphia',
    yelpRating: 4.7,
    reviewCount: 3670,
    price: '$$$$',
    address: '237 St James Pl',
    city: 'Philadelphia',
    state: 'PA',
    zipCode: '19106',
    phone: '(215) 625-8800',
    neighborhood: 'Society Hill',
    highlights: ['Hummus Tehina with Laffa Bread', 'Pomegranate Lamb Shoulder', 'Crispy Halloumi'],
    userRating: 0,
    notes: '',
    willGoBack: ''
  },
  {
    id: 'neptune-oyster-boston',
    name: 'Neptune Oyster',
    cuisineType: 'Seafood, Raw Bar, New England',
    yelpUrl: 'https://www.yelp.com/biz/neptune-oyster-boston',
    yelpRating: 4.6,
    reviewCount: 6150,
    price: '$$$',
    address: '63 Salem St',
    city: 'Boston',
    state: 'MA',
    zipCode: '02113',
    phone: '(617) 742-3474',
    neighborhood: 'North End',
    highlights: ['Hot Buttered Maine Lobster Roll', 'Island Creek Oysters', 'Clam Chowder'],
    userRating: 0,
    notes: '',
    willGoBack: ''
  },
  {
    id: 'hattie-bs-hot-chicken-nashville',
    name: "Hattie B's Hot Chicken",
    cuisineType: 'Southern, Chicken Shop, Soul Food',
    yelpUrl: 'https://www.yelp.com/biz/hattie-bs-hot-chicken-nashville-midtown-nashville',
    yelpRating: 4.5,
    reviewCount: 7850,
    price: '$$',
    address: '112 19th Ave S',
    city: 'Nashville',
    state: 'TN',
    zipCode: '37203',
    phone: '(615) 678-4794',
    neighborhood: 'Midtown',
    highlights: ['Hot Chicken Tenders (Medium/Hot)', 'Pimento Mac & Cheese', 'Peach Cobbler'],
    userRating: 0,
    notes: '',
    willGoBack: ''
  },
  {
    id: 'screen-door-portland',
    name: 'Screen Door Eastside',
    cuisineType: 'Southern, Cajun/Creole, Breakfast & Brunch',
    yelpUrl: 'https://www.yelp.com/biz/screen-door-eastside-portland',
    yelpRating: 4.5,
    reviewCount: 7420,
    price: '$$',
    address: '2337 E Burnside St',
    city: 'Portland',
    state: 'OR',
    zipCode: '97214',
    phone: '(503) 542-0880',
    neighborhood: 'Buckman',
    highlights: ['Chicken & Sweet Potato Waffles', 'Praline Bacon', 'Lowcountry Shrimp & Grits'],
    userRating: 0,
    notes: '',
    willGoBack: ''
  },
  {
    id: 'au-cheval-chicago',
    name: 'Au Cheval',
    cuisineType: 'Burgers, Diners, Gastropubs',
    yelpUrl: 'https://www.yelp.com/biz/au-cheval-chicago',
    yelpRating: 4.5,
    reviewCount: 8910,
    price: '$$',
    address: '800 W Randolph St',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60607',
    phone: '(312) 929-4580',
    neighborhood: 'West Loop',
    highlights: ['Double Cheeseburger with Thick-Cut Bacon & Egg', 'Fried Bologna Sandwich', 'Mille-Feuille'],
    userRating: 0,
    notes: '',
    willGoBack: ''
  },
  {
    id: 'le-bernardin-new-york',
    name: 'Le Bernardin',
    cuisineType: 'French, Seafood, Fine Dining',
    yelpUrl: 'https://www.yelp.com/biz/le-bernardin-new-york',
    yelpRating: 4.6,
    reviewCount: 3420,
    price: '$$$$',
    address: '155 W 51st St',
    city: 'New York',
    state: 'NY',
    zipCode: '10019',
    phone: '(212) 554-1515',
    neighborhood: 'Midtown West',
    highlights: ['Tuna Carpaccio with Foie Gras', 'Poached Halibut', 'Langoustine Tartare'],
    userRating: 0,
    notes: '',
    willGoBack: ''
  },
  {
    id: 'marufuku-ramen-san-francisco',
    name: 'Marufuku Ramen',
    cuisineType: 'Ramen, Japanese, Noodles',
    yelpUrl: 'https://www.yelp.com/biz/marufuku-ramen-san-francisco-5',
    yelpRating: 4.6,
    reviewCount: 5120,
    price: '$$',
    address: '1581 Webster St Ste 235',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94115',
    phone: '(415) 872-9786',
    neighborhood: 'Japantown',
    highlights: ['Hakata Tonkotsu DX Ramen', 'Chicken Karaage', 'Takoyaki'],
    userRating: 0,
    notes: '',
    willGoBack: ''
  },
  {
    id: 'lotus-of-siam-las-vegas',
    name: 'Lotus of Siam',
    cuisineType: 'Thai, Wine Bars, Asian Fusion',
    yelpUrl: 'https://www.yelp.com/biz/lotus-of-siam-las-vegas-10',
    yelpRating: 4.4,
    reviewCount: 5890,
    price: '$$',
    address: '620 E Flamingo Rd',
    city: 'Las Vegas',
    state: 'NV',
    zipCode: '89119',
    phone: '(702) 735-3033',
    neighborhood: 'Eastside',
    highlights: ['Garlic Prawns', 'Khao Soi with Crispy Duck', 'Nam Kao Tod'],
    userRating: 0,
    notes: '',
    willGoBack: ''
  }
];

export const INITIAL_SAVED_LISTS: SavedList[] = [
  {
    id: DEFAULT_WANT_TO_GO_ID,
    name: 'Want to Go',
    description: 'Restaurants on my radar to visit next (mutually exclusive with "Been Here").',
    isDefault: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-20T14:30:00.000Z',
    items: [
      { restaurantId: 'bestia-los-angeles', addedAt: '2026-10-18T18:20:00.000Z' },
      { restaurantId: 'tartine-manufactory-san-francisco', addedAt: '2026-10-19T09:15:00.000Z' },
      { restaurantId: 'pike-place-chowder-seattle', addedAt: '2026-10-20T14:30:00.000Z' }
    ]
  },
  {
    id: DEFAULT_BEEN_HERE_ID,
    name: 'Been Here',
    description: 'Spots I have already visited with my rating and Y/N Will Go Back log.',
    isDefault: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-20T19:00:00.000Z',
    items: [
      { restaurantId: 'katzs-delicatessen-new-york', addedAt: '2026-10-10T12:00:00.000Z' },
      { restaurantId: 'franklin-barbecue-austin', addedAt: '2026-10-12T13:30:00.000Z' },
      { restaurantId: 'girl-and-the-goat-chicago', addedAt: '2026-10-15T20:00:00.000Z' },
      { restaurantId: 'commanders-palace-new-orleans', addedAt: '2026-10-16T19:45:00.000Z' },
      { restaurantId: 'joes-stone-crab-miami-beach', addedAt: '2026-10-17T21:10:00.000Z' }
    ]
  },
  {
    id: 'weekend-foodie-roadtrip',
    name: 'Must-Try Iconic Spots',
    description: 'Custom list of legendary American dishes to share with friends.',
    isDefault: false,
    createdAt: '2026-10-05T15:00:00.000Z',
    updatedAt: '2026-10-19T11:00:00.000Z',
    items: [
      { restaurantId: 'katzs-delicatessen-new-york', addedAt: '2026-10-11T10:00:00.000Z' },
      { restaurantId: 'franklin-barbecue-austin', addedAt: '2026-10-13T11:00:00.000Z' },
      { restaurantId: 'bestia-los-angeles', addedAt: '2026-10-19T11:00:00.000Z' }
    ]
  }
];
