import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Star,
  ExternalLink,
  StickyNote,
  AlertCircle,
  Loader2,
  Navigation,
  RotateCcw
} from 'lucide-react';
import { Restaurant, SavedList, DEFAULT_FALLBACK_LOCATION } from '../types';
import {
  validateUsLocation,
  scoreRestaurantMatch
} from '../data/usRestaurantsCatalog';
import { RestaurantThumb } from './RestaurantThumb';

interface SearchViewProps {
  restaurantsMap: Record<string, Restaurant>;
  lists: SavedList[];
  defaultLocation: string;
  isLocatingUser: boolean;
  userGeminiApiKey: string;
  onRequestUserLocation: () => void;
  onOpenSaveModal: (restaurant: Restaurant) => void;
  onRegisterDiscoveredRestaurants: (newRestaurants: Restaurant[]) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  restaurantsMap,
  lists,
  defaultLocation,
  isLocatingUser,
  userGeminiApiKey,
  onRequestUserLocation,
  onOpenSaveModal,
  onRegisterDiscoveredRestaurants
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationInput, setLocationInput] = useState(
    defaultLocation || DEFAULT_FALLBACK_LOCATION
  );
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [liveSearchIds, setLiveSearchIds] = useState<string[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceTimerRef = useRef<number | null>(null);
  const latestRequestIdRef = useRef<number>(0);

  // Sync location input whenever defaultLocation changes (e.g. from Geolocation or Settings)
  useEffect(() => {
    if (defaultLocation) {
      setLocationInput(defaultLocation);
    }
  }, [defaultLocation]);

  const allRestaurants = useMemo(() => Object.values(restaurantsMap), [restaurantsMap]);

  // Match local restaurants when the user has typed a search query
  const localFuzzyMatches = useMemo(() => {
    const trimmedQ = searchQuery.trim();
    if (!trimmedQ) return [];

    const loc = locationInput.trim().toLowerCase();
    const isAllUs =
      !loc ||
      loc === 'all united states' ||
      loc === 'united states' ||
      loc === 'usa' ||
      loc === 'us';

    const isNycMetro =
      loc.includes('new york') || loc === 'nyc' || loc.includes('brooklyn');

    const scored: Array<{ restaurant: Restaurant; score: number }> = [];

    for (const r of allRestaurants) {
      const matchesLoc =
        isAllUs ||
        (isNycMetro && r.state.toLowerCase() === 'ny') ||
        `${r.city}, ${r.state}`.toLowerCase().includes(loc) ||
        r.city.toLowerCase().includes(loc) ||
        (r.neighborhood && r.neighborhood.toLowerCase().includes(loc)) ||
        r.state.toLowerCase() === loc ||
        r.zipCode.includes(loc);

      if (!matchesLoc) continue;

      const matchScore = scoreRestaurantMatch(r, trimmedQ);
      if (matchScore > 0) {
        scored.push({ restaurant: r, score: matchScore });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score || b.restaurant.yelpRating - a.restaurant.yelpRating)
      .map((item) => item.restaurant);
  }, [allRestaurants, searchQuery, locationInput]);

  // Displayed results (only shown when user has entered a search query, ranked with exact matches #1)
  const displayedRestaurants = useMemo(() => {
    const trimmedQ = searchQuery.trim();
    if (!trimmedQ) {
      return [];
    }

    const candidatesMap = new Map<string, { restaurant: Restaurant; liveOrderIndex: number }>();

    if (liveSearchIds && liveSearchIds.length > 0) {
      liveSearchIds.forEach((id, index) => {
        const r = restaurantsMap[id];
        if (r) {
          candidatesMap.set(r.id, { restaurant: r, liveOrderIndex: index });
        }
      });
    }

    localFuzzyMatches.forEach((r, index) => {
      if (!candidatesMap.has(r.id)) {
        candidatesMap.set(r.id, { restaurant: r, liveOrderIndex: 100 + index });
      }
    });

    const candidates = Array.from(candidatesMap.values());
    return candidates
      .sort((a, b) => {
        const scoreA = scoreRestaurantMatch(a.restaurant, trimmedQ);
        const scoreB = scoreRestaurantMatch(b.restaurant, trimmedQ);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        if (a.liveOrderIndex !== b.liveOrderIndex) {
          return a.liveOrderIndex - b.liveOrderIndex;
        }
        return b.restaurant.yelpRating - a.restaurant.yelpRating;
      })
      .map((entry) => entry.restaurant);
  }, [searchQuery, localFuzzyMatches, liveSearchIds, restaurantsMap]);

  const executeLiveSearch = async (queryToRun: string, locationToRun: string) => {
    const trimmedQ = queryToRun.trim();
    if (!trimmedQ) {
      setLiveSearchIds(null);
      setHasSearched(false);
      return;
    }

    const locValidation = validateUsLocation(locationToRun);
    if (!locValidation.valid) {
      setLocationError(locValidation.reason || 'Search is restricted to the United States.');
      return;
    }

    const queryCheck = validateUsLocation(trimmedQ);
    if (!queryCheck.valid) {
      setLocationError(queryCheck.reason || 'Search is restricted to the United States.');
      return;
    }

    const requestId = ++latestRequestIdRef.current;
    setHasSearched(true);
    setIsSearchingLive(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (userGeminiApiKey && userGeminiApiKey.trim()) {
        headers['x-user-gemini-key'] = userGeminiApiKey.trim();
      }

      const response = await fetch('/api/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: trimmedQ,
          location: locationToRun.trim() || DEFAULT_FALLBACK_LOCATION
        })
      });

      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        setLocationError(data.error || 'Could not complete U.S. restaurant search.');
        setIsSearchingLive(false);
        return;
      }

      if (Array.isArray(data.results) && data.results.length > 0) {
        onRegisterDiscoveredRestaurants(data.results);
        setLiveSearchIds(data.results.map((r: Restaurant) => r.id));
      }
    } catch {
      // Keep local fuzzy matches displayed cleanly
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsSearchingLive(false);
      }
    }
  };

  // Automatically trigger live U.S. lookup when typing a restaurant name
  useEffect(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    const trimmedQ = searchQuery.trim();
    if (!trimmedQ) {
      setLiveSearchIds(null);
      setHasSearched(false);
      return;
    }

    if (trimmedQ.length >= 2) {
      debounceTimerRef.current = window.setTimeout(() => {
        executeLiveSearch(trimmedQ, locationInput);
      }, 700);
    }

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, locationInput]);

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocationError(null);
    await executeLiveSearch(searchQuery, locationInput);
  };

  const handleClearSearch = () => {
    latestRequestIdRef.current++;
    setSearchQuery('');
    setLocationError(null);
    setLiveSearchIds(null);
    setHasSearched(false);
    setIsSearchingLive(false);
  };

  const getSavedListsForRestaurant = (restaurantId: string): SavedList[] => {
    return lists.filter((list) => list.items.some((item) => item.restaurantId === restaurantId));
  };

  const isQueryActive = searchQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Clean Search Box Section */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 md:p-8 shadow-2xs">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
          Find Restaurants
        </h1>

        <form onSubmit={handleSearchSubmit} className="mt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Find: Restaurant Name or Cuisine */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (liveSearchIds) setLiveSearchIds(null);
                }}
                placeholder="Search restaurant name or cuisine (e.g., Esse Taco, Peter Luger's, Katz's)..."
                aria-label="Search restaurant name or cuisine"
                className="w-full rounded-lg border border-zinc-300 bg-[#FAF9F6] py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#D32323] focus:bg-white focus:outline-none"
              />
            </div>

            {/* Near: U.S. City, State, or ZIP Code + Near Me button */}
            <div className="relative w-full lg:w-80">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D32323]" />
              <input
                type="text"
                value={locationInput}
                onChange={(e) => {
                  setLocationInput(e.target.value);
                  setLocationError(null);
                  if (liveSearchIds) setLiveSearchIds(null);
                }}
                placeholder="U.S. City, State or ZIP"
                aria-label="United States city, state, or ZIP code"
                className="w-full rounded-lg border border-zinc-300 bg-[#FAF9F6] py-3 pl-10 pr-24 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#D32323] focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={onRequestUserLocation}
                disabled={isLocatingUser}
                title="Use my current location"
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md bg-white border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:border-[#D32323] hover:text-[#D32323] transition-colors whitespace-nowrap shrink-0"
              >
                {isLocatingUser ? (
                  <Loader2 className="h-3 w-3 animate-spin text-[#D32323]" />
                ) : (
                  <Navigation className="h-3 w-3 text-[#D32323]" />
                )}
                <span>{isLocatingUser ? 'Locating' : 'Near Me'}</span>
              </button>
            </div>

            {/* Submit Search */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSearchingLive || !searchQuery.trim()}
                className="inline-flex flex-1 lg:flex-initial items-center justify-center gap-2 rounded-lg bg-[#D32323] px-6 py-3 text-sm font-semibold text-white hover:bg-[#b81d1d] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                {isSearchingLive ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search
                  </>
                )}
              </button>

              {isQueryActive && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-300 bg-white px-3.5 py-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors whitespace-nowrap shrink-0"
                  title="Clear search"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Validation Error for Non-US Searches */}
        {locationError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div>
              <span className="font-semibold">U.S.-Only Restaurant Search: </span>
              <span>{locationError}</span>
            </div>
          </div>
        )}
      </section>

      {/* Search Results Section (1 Skinny Line Per Result Stacked) */}
      {isQueryActive && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="text-sm font-bold text-zinc-900">
              Results for &ldquo;{searchQuery.trim()}&rdquo;
            </h2>
            <div className="text-xs font-mono text-zinc-500 tabular-nums">
              {isSearchingLive
                ? 'Searching...'
                : `${displayedRestaurants.length} result${
                    displayedRestaurants.length === 1 ? '' : 's'
                  }`}
            </div>
          </div>

          {displayedRestaurants.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
              {isSearchingLive || !hasSearched ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-[#D32323]" />
                  <p className="text-sm font-semibold text-zinc-900">
                    Searching U.S. restaurants for &ldquo;{searchQuery}&rdquo;...
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-base font-semibold text-zinc-900">
                    No U.S. restaurants found for &ldquo;{searchQuery}&rdquo; in {locationInput}
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500">
                    Try checking the spelling or searching across all 50 U.S. states.
                  </p>
                  {locationInput.toLowerCase() !== 'all united states' && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setLocationInput('All United States');
                          executeLiveSearch(searchQuery, 'All United States');
                        }}
                        className="rounded-lg bg-[#D32323] px-4 py-2 text-xs font-semibold text-white hover:bg-[#b81d1d] transition-colors"
                      >
                        Search &ldquo;{searchQuery}&rdquo; Across All U.S. States
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
              {displayedRestaurants.map((restaurant) => {
                const savedInLists = getSavedListsForRestaurant(restaurant.id);
                const isSaved = savedInLists.length > 0;

                return (
                  <div
                    key={restaurant.id}
                    className="flex items-center justify-between gap-3.5 px-4 py-3 hover:bg-[#FAF9F6] transition-colors"
                  >
                    {/* Left: Small Preview Picture + Stacked Name / Type & Price / Address */}
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                      <RestaurantThumb restaurant={restaurant} />

                      <div className="min-w-0 flex-1">
                        {/* Line 1: Restaurant Name + Yelp Rating */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <a
                            href={restaurant.yelpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-sm sm:text-base font-bold text-zinc-900 hover:text-[#D32323] transition-colors"
                          >
                            {restaurant.name}
                          </a>

                          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#D32323] tabular-nums shrink-0">
                            ★ {restaurant.yelpRating.toFixed(1)}
                            <span className="font-normal text-zinc-400">
                              ({restaurant.reviewCount.toLocaleString()})
                            </span>
                          </span>

                          {restaurant.userRating > 0 && (
                            <span className="font-mono text-xs font-semibold text-amber-700 tabular-nums shrink-0">
                              · My ★ {restaurant.userRating}/5
                            </span>
                          )}

                          {isSaved && (
                            <span className="text-xs text-zinc-500 truncate hidden md:inline">
                              · In:{' '}
                              <strong className="font-medium text-zinc-800">
                                {savedInLists.map((l) => l.name).join(', ')}
                              </strong>
                            </span>
                          )}
                        </div>

                        {/* Line 2 (Underneath Name): Type of Restaurant & How Expensive */}
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-700 truncate">
                          <span className="truncate font-medium">{restaurant.cuisineType}</span>
                          <span className="text-zinc-300 shrink-0" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-mono font-semibold text-zinc-900 shrink-0">
                            {restaurant.price}
                          </span>
                        </div>

                        {/* Line 3 (Underneath Type & Price): Street Address */}
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 truncate">
                          <span className="truncate">
                            {restaurant.address ? `${restaurant.address}, ` : ''}
                            {restaurant.city}, {restaurant.state}
                            {restaurant.zipCode ? ` ${restaurant.zipCode}` : ''}
                            {restaurant.neighborhood ? ` · ${restaurant.neighborhood}` : ''}
                          </span>

                          {restaurant.notes && (
                            <span
                              title={`Note: ${restaurant.notes}`}
                              className="inline-flex items-center gap-1 text-zinc-600 truncate max-w-[200px] hidden lg:inline-flex"
                            >
                              <StickyNote className="h-3 w-3 shrink-0 text-zinc-400" />
                              <span className="truncate">{restaurant.notes}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Direct Yelp Link + Quick-Add Star Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={restaurant.yelpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#D32323] hover:bg-[#D32323]/5 hover:underline whitespace-nowrap shrink-0"
                        title="Open Yelp page"
                      >
                        <span>Yelp</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>

                      <button
                        type="button"
                        onClick={() => onOpenSaveModal(restaurant)}
                        aria-label={`Save ${restaurant.name} to lists`}
                        title="Star to save or manage lists & note"
                        className={`group inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                          isSaved
                            ? 'border-[#D32323] bg-[#D32323]/10 text-[#D32323]'
                            : 'border-zinc-200 bg-[#FAF9F6] text-zinc-700 hover:border-[#D32323] hover:text-[#D32323]'
                        }`}
                      >
                        <Star
                          className={`h-3.5 w-3.5 transition-transform group-hover:scale-110 ${
                            isSaved
                              ? 'fill-[#D32323] text-[#D32323]'
                              : 'text-zinc-400 group-hover:text-[#D32323]'
                          }`}
                        />
                        <span>{isSaved ? `Saved (${savedInLists.length})` : 'Save'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
