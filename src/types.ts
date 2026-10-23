export type WillGoBackMarker = 'Y' | 'N' | '';

export type SortOption = 'alphabetical' | 'dateAdded' | 'yelpRating';

export interface Restaurant {
  id: string;
  name: string;
  cuisineType: string;
  yelpUrl: string;
  yelpRating: number;
  reviewCount: number;
  price: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  neighborhood?: string;
  highlights?: string[];
  imageUrl?: string;
  // User-managed fields synced globally across all lists containing this restaurant
  userRating: number; // 0 = unrated, 1-5 stars
  notes: string;
  willGoBack: WillGoBackMarker;
}

export interface SavedListItem {
  restaurantId: string;
  addedAt: string; // ISO date string
}

export interface SavedList {
  id: string;
  name: string;
  description: string;
  isDefault: boolean; // true for "Want to Go" and "Been Here"
  createdAt: string;
  updatedAt: string;
  items: SavedListItem[];
}

export interface AppSettings {
  defaultLocation: string;
  userManuallySetLocation?: boolean;
  defaultSortBy: SortOption;
  includeEmptyWillGoBackInCsv: boolean;
}

export interface SharedListPayload {
  listName: string;
  listDescription: string;
  exportedAt: string;
  restaurants: Array<{
    restaurant: Restaurant;
    addedAt: string;
  }>;
}

export const DEFAULT_WANT_TO_GO_ID = 'want-to-go';
export const DEFAULT_BEEN_HERE_ID = 'been-here';
export const DEFAULT_FALLBACK_LOCATION = 'New York, NY';
