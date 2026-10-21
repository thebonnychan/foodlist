import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  Star,
  ExternalLink,
  StickyNote,
  AlertCircle,
  Loader2,
  Plus,
  Compass,
  RotateCcw
} from 'lucide-react';
import { Restaurant, SavedList } from '../types';
import { POPULAR_US_CITIES, validateUsLocation } from '../data/usRestaurantsCatalog';

interface SearchViewProps {
  restaurantsMap: Record<string, Restaurant>;
  lists: SavedList[];
  defaultLocation: string;
  onOpenSaveModal: (restaurant: Restaurant) => void;
  onRegisterDiscoveredRestaurants: (newRestaurants: Restaurant[]) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  restaurantsMap,
  lists,
  defaultLocation,
  onOpenSaveModal,
  onRegisterDiscoveredRestaurants
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationInput, setLocationInput] = useState(defaultLocation || 'All United States');
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [liveStatusMessage, setLiveStatusMessage] = useState<string | null>(null);
  const [liveSearchIds, setLiveSearchIds] = useState<string[] | null>(null);

  // Manual custom restaurant quick-add form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCuisine, setCustomCuisine] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [customState, setCustomState] = useState('');
  const [customYelpUrl, setCustomYelpUrl] = useState('');
  const [customYelpRating, setCustomYelpRating] = useState('4.5');

  const allRestaurants = useMemo(() => Object.values(restaurantsMap), [restaurantsMap]);

  // Filter local U.S. catalog for instant results
  const filteredRestaurants = useMemo(() => {
    if (liveSearchIds && liveSearchIds.length > 0) {
      const liveMatches = liveSearchIds
        .map((id) => restaurantsMap[id])
        .filter((r): r is Restaurant => Boolean(r));
      if (liveMatches.length > 0) {
        return liveMatches;
      }
    }

    const q = searchQuery.trim().toLowerCase();
    const loc = locationInput.trim().toLowerCase();
    const isAllUs =
      !loc || loc === 'all united states' || loc === 'united states' || loc === 'usa' || loc === 'us';

    return allRestaurants.filter((r) => {
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.cuisineType.toLowerCase().includes(q) ||
        (r.neighborhood && r.neighborhood.toLowerCase().includes(q)) ||
        (r.highlights && r.highlights.some((h) => h.toLowerCase().includes(q)));

      const matchesLoc =
        isAllUs ||
        `${r.city}, ${r.state}`.toLowerCase().includes(loc) ||
        r.city.toLowerCase().includes(loc) ||
        r.state.toLowerCase() === loc ||
        r.zipCode.includes(loc);

      return matchesQuery && matchesLoc;
    });
  }, [allRestaurants, restaurantsMap, searchQuery, locationInput, liveSearchIds]);

  const handleLiveYelpSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocationError(null);
    setLiveStatusMessage(null);

    const locValidation = validateUsLocation(locationInput);
    if (!locValidation.valid) {
      setLocationError(locValidation.reason || 'Search is restricted to the United States.');
      return;
    }

    const queryCheck = validateUsLocation(searchQuery);
    if (!queryCheck.valid) {
      setLocationError(queryCheck.reason || 'Search is restricted to the United States.');
      return;
    }

    if (!searchQuery.trim() && (locationInput === 'All United States' || !locationInput.trim())) {
      setLiveSearchIds(null);
      return;
    }

    setIsSearchingLive(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim() || 'top rated restaurants',
          location: locationInput.trim() || 'United States'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setLocationError(data.error || 'Could not complete U.S. restaurant search.');
        setIsSearchingLive(false);
        return;
      }

      if (Array.isArray(data.results) && data.results.length > 0) {
        onRegisterDiscoveredRestaurants(data.results);
        setLiveSearchIds(data.results.map((r: Restaurant) => r.id));
        setLiveStatusMessage(
          `Found ${data.results.length} closely matched U.S. restaurants on Yelp for "${
            searchQuery.trim() || 'popular spots'
          }" in ${locationInput || 'the United States'}.`
        );
      } else {
        setLiveSearchIds(null);
        setLiveStatusMessage(
          'Showing closest matches from our U.S. restaurant directory.'
        );
      }
    } catch {
      setLiveSearchIds(null);
      setLiveStatusMessage('Showing matches from our U.S. restaurant directory.');
    } finally {
      setIsSearchingLive(false);
    }
  };

  const handleSelectQuickCity = (city: string) => {
    setLocationInput(city);
    setLocationError(null);
    setLiveSearchIds(null);
    setLiveStatusMessage(null);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setLocationInput('All United States');
    setLocationError(null);
    setLiveSearchIds(null);
    setLiveStatusMessage(null);
  };

  const handleAddCustomRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customCity.trim() || !customState.trim()) return;

    const locCheck = validateUsLocation(`${customCity}, ${customState}`);
    if (!locCheck.valid) {
      setLocationError(locCheck.reason || 'Only U.S. restaurants are supported.');
      return;
    }

    const id = `${customName}-${customCity}-${customState}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const parsedRating = Math.min(5, Math.max(1, parseFloat(customYelpRating) || 4.5));
    const cleanUrl =
      customYelpUrl.trim() && customYelpUrl.trim().startsWith('http')
        ? customYelpUrl.trim()
        : `https://www.yelp.com/search?find_desc=${encodeURIComponent(
            customName.trim()
          )}&find_loc=${encodeURIComponent(`${customCity.trim()}, ${customState.trim()}`)}`;

    const newRest: Restaurant = {
      id,
      name: customName.trim(),
      cuisineType: customCuisine.trim() || 'American Restaurant',
      yelpUrl: cleanUrl,
      yelpRating: parsedRating,
      reviewCount: 120,
      price: '$$',
      address: `${customCity.trim()}`,
      city: customCity.trim(),
      state: customState.trim().toUpperCase().slice(0, 2),
      zipCode: '',
      highlights: [],
      userRating: 0,
      notes: '',
      willGoBack: ''
    };

    onRegisterDiscoveredRestaurants([newRest]);
    setShowCustomForm(false);
    setCustomName('');
    setCustomCuisine('');
    setCustomCity('');
    setCustomState('');
    setCustomYelpUrl('');
    onOpenSaveModal(newRest);
  };

  const getSavedListsForRestaurant = (restaurantId: string): SavedList[] => {
    return lists.filter((list) => list.items.some((item) => item.restaurantId === restaurantId));
  };

  return (
    <div className="space-y-8">
      {/* Hero Search Section */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 md:p-8 shadow-2xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-500">
              United States Restaurant Discovery & Yelp Logger
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
              Find & Star U.S. Restaurants on Yelp
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-zinc-600">
              Search any restaurant across all 50 U.S. states. Click the star on any result to save it to{' '}
              <span className="font-semibold text-zinc-800">&ldquo;Want to Go&rdquo;</span>,{' '}
              <span className="font-semibold text-zinc-800">&ldquo;Been Here&rdquo;</span>, or your own custom lists with notes and CSV export.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCustomForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-[#FAF9F6] px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors whitespace-nowrap shrink-0 self-start md:self-auto"
          >
            <Plus className="h-3.5 w-3.5 text-[#D32323]" />
            {showCustomForm ? 'Close Manual Entry' : 'Add Custom U.S. Spot'}
          </button>
        </div>

        {/* Manual Entry Drawer */}
        {showCustomForm && (
          <form
            onSubmit={handleAddCustomRestaurant}
            className="mt-5 rounded-lg border border-zinc-200 bg-[#FAF9F6] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900">
                Quick-Add Any U.S. Restaurant by Name & Yelp URL
              </span>
              <span className="text-xs text-zinc-500">U.S. Locations Only</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Restaurant Name *"
                className="lg:col-span-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-[#D32323] focus:outline-none"
              />
              <input
                type="text"
                value={customCuisine}
                onChange={(e) => setCustomCuisine(e.target.value)}
                placeholder="Type (e.g., Tacos, Sushi)"
                className="lg:col-span-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-[#D32323] focus:outline-none"
              />
              <input
                type="text"
                required
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                placeholder="U.S. City *"
                className="lg:col-span-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-[#D32323] focus:outline-none"
              />
              <input
                type="text"
                required
                maxLength={2}
                value={customState}
                onChange={(e) => setCustomState(e.target.value)}
                placeholder="State (e.g. NY) *"
                className="lg:col-span-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs uppercase text-zinc-900 focus:border-[#D32323] focus:outline-none"
              />
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={customYelpRating}
                onChange={(e) => setCustomYelpRating(e.target.value)}
                placeholder="Yelp Rating (4.5)"
                className="lg:col-span-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-mono text-zinc-900 focus:border-[#D32323] focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="url"
                value={customYelpUrl}
                onChange={(e) => setCustomYelpUrl(e.target.value)}
                placeholder="Optional direct Yelp URL (https://www.yelp.com/biz/...)"
                className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-[#D32323] focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Star className="h-3.5 w-3.5" />
                Add & Save to List
              </button>
            </div>
          </form>
        )}

        {/* Main Search Bar (Yelp-style Dual Input: Find + US Near) */}
        <form onSubmit={handleLiveYelpSearch} className="mt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Find: Restaurant Name, Cuisine, Dish */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (liveSearchIds) setLiveSearchIds(null);
                }}
                placeholder="Search restaurant name, cuisine, or dish (e.g., Katz's, BBQ, Ramen, Oysters)..."
                aria-label="Search restaurant name or cuisine"
                className="w-full rounded-lg border border-zinc-300 bg-[#FAF9F6] py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#D32323] focus:bg-white focus:outline-none"
              />
            </div>

            {/* Near: U.S. City, State, or ZIP Code */}
            <div className="relative w-full lg:w-72">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D32323]" />
              <input
                type="text"
                value={locationInput}
                onChange={(e) => {
                  setLocationInput(e.target.value);
                  setLocationError(null);
                  if (liveSearchIds) setLiveSearchIds(null);
                }}
                placeholder="U.S. City, State or ZIP (e.g., Austin, TX)"
                aria-label="United States city, state, or ZIP code"
                className="w-full rounded-lg border border-zinc-300 bg-[#FAF9F6] py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#D32323] focus:bg-white focus:outline-none"
              />
            </div>

            {/* Submit Live Yelp Search */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSearchingLive}
                className="inline-flex flex-1 lg:flex-initial items-center justify-center gap-2 rounded-lg bg-[#D32323] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b81d1d] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                {isSearchingLive ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching Yelp US...
                  </>
                ) : (
                  <>
                    <Compass className="h-4 w-4" />
                    Search Yelp (US)
                  </>
                )}
              </button>

              {(searchQuery || locationInput !== 'All United States' || liveSearchIds) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-300 bg-white px-3.5 py-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors whitespace-nowrap shrink-0"
                  title="Reset search filters"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Quick U.S. City Filter Bar */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-zinc-400 mr-1 whitespace-nowrap shrink-0">
            U.S. Cities:
          </span>
          {POPULAR_US_CITIES.map((city) => {
            const active = locationInput.toLowerCase() === city.toLowerCase();
            return (
              <button
                key={city}
                type="button"
                onClick={() => handleSelectQuickCity(city)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'bg-[#FAF9F6] text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>

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

        {/* Live Search Grounding Status */}
        {liveStatusMessage && !locationError && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-[#FAF9F6] px-3.5 py-2 text-xs text-zinc-700">
            <span>{liveStatusMessage}</span>
            {liveSearchIds && (
              <button
                type="button"
                onClick={() => {
                  setLiveSearchIds(null);
                  setLiveStatusMessage(null);
                }}
                className="font-semibold text-[#D32323] hover:underline whitespace-nowrap shrink-0"
              >
                Show All Directory Spots
              </button>
            )}
          </div>
        )}
      </section>

      {/* Search Results Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              U.S. Restaurant Results
            </h2>
            <p className="text-xs text-zinc-500">
              Click the <strong className="text-zinc-800">★ Star</strong> on any restaurant card to add it to one or multiple lists and write a note.
            </p>
          </div>
          <div className="text-xs font-mono text-zinc-600 tabular-nums">
            Showing {filteredRestaurants.length} U.S. restaurant{filteredRestaurants.length === 1 ? '' : 's'}
          </div>
        </div>

        {filteredRestaurants.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
            <p className="text-base font-semibold text-zinc-900">
              No local directory matches for &ldquo;{searchQuery || locationInput}&rdquo;
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500">
              Click the button below to search Yelp&apos;s live United States restaurant index for{' '}
              <strong>{searchQuery || 'restaurants'}</strong> in{' '}
              <strong>{locationInput || 'the United States'}</strong>.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleLiveYelpSearch()}
                disabled={isSearchingLive}
                className="inline-flex items-center gap-2 rounded-lg bg-[#D32323] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#b81d1d] transition-colors"
              >
                {isSearchingLive ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching Live Yelp US...
                  </>
                ) : (
                  <>
                    <Compass className="h-4 w-4" />
                    Search Live Yelp US Index
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClearSearch}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                View All U.S. Spots
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredRestaurants.map((restaurant) => {
              const savedInLists = getSavedListsForRestaurant(restaurant.id);
              const isSaved = savedInLists.length > 0;

              return (
                <article
                  key={restaurant.id}
                  className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300"
                >
                  <div>
                    {/* Top Row: Title + Quick-Add Star Button */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <span>{restaurant.cuisineType}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{restaurant.price}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {restaurant.city}, {restaurant.state}
                          </span>
                        </div>

                        <h3 className="mt-1 text-lg font-bold text-zinc-900">
                          <a
                            href={restaurant.yelpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#D32323] transition-colors"
                          >
                            {restaurant.name}
                          </a>
                        </h3>
                      </div>

                      {/* Requirement 9: Star on each search result to quickly add to 1 or more lists */}
                      <button
                        type="button"
                        onClick={() => onOpenSaveModal(restaurant)}
                        aria-label={`Save ${restaurant.name} to lists`}
                        title="Star to save or manage lists & note"
                        className={`group flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                          isSaved
                            ? 'border-[#D32323] bg-[#D32323]/10 text-[#D32323]'
                            : 'border-zinc-200 bg-[#FAF9F6] text-zinc-700 hover:border-[#D32323] hover:text-[#D32323]'
                        }`}
                      >
                        <Star
                          className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                            isSaved
                              ? 'fill-[#D32323] text-[#D32323]'
                              : 'text-zinc-400 group-hover:text-[#D32323]'
                          }`}
                        />
                        <span>{isSaved ? `Saved (${savedInLists.length})` : 'Save'}</span>
                      </button>
                    </div>

                    {/* Yelp Rating Row + Address */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-y-1 text-xs text-zinc-600">
                      <div className="flex items-center gap-1.5 font-mono tabular-nums">
                        <span className="inline-flex items-center gap-1 font-bold text-[#D32323]">
                          ★ {restaurant.yelpRating.toFixed(1)}
                        </span>
                        <span className="text-zinc-500">
                          ({restaurant.reviewCount.toLocaleString()} Yelp reviews)
                        </span>
                      </div>

                      {restaurant.userRating > 0 && (
                        <>
                          <span className="mx-2 text-zinc-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-mono font-semibold text-amber-700 tabular-nums">
                            My Rating: ★ {restaurant.userRating}/5
                          </span>
                        </>
                      )}

                      {restaurant.willGoBack && (
                        <>
                          <span className="mx-2 text-zinc-300" aria-hidden="true">
                            ·
                          </span>
                          <span
                            className={`font-mono font-semibold ${
                              restaurant.willGoBack === 'Y' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            Will Go Back: {restaurant.willGoBack}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Street Address & Neighborhood */}
                    <div className="mt-1.5 text-xs text-zinc-500">
                      {restaurant.neighborhood ? `${restaurant.neighborhood} · ` : ''}
                      {restaurant.address}, {restaurant.city}, {restaurant.state}{' '}
                      {restaurant.zipCode}
                    </div>

                    {/* Popular Yelp Dish Highlights */}
                    {restaurant.highlights && restaurant.highlights.length > 0 && (
                      <div className="mt-2.5 text-xs text-zinc-600">
                        <span className="font-medium text-zinc-800">Yelp Highlights: </span>
                        <span>{restaurant.highlights.join(' · ')}</span>
                      </div>
                    )}

                    {/* Synced Note Preview if present */}
                    {restaurant.notes && (
                      <div className="mt-3 rounded-lg border border-zinc-200 bg-[#FAF9F6] px-3 py-2 text-xs text-zinc-700">
                        <div className="flex items-start gap-1.5">
                          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                          <div>
                            <span className="font-semibold text-zinc-900">My Note: </span>
                            <span>{restaurant.notes}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Saved Lists Summary + Direct Yelp Page Link */}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-xs">
                    <div className="min-w-0 truncate text-zinc-500">
                      {isSaved ? (
                        <span>
                          In:{' '}
                          <strong className="font-medium text-zinc-800">
                            {savedInLists.map((l) => l.name).join(' · ')}
                          </strong>
                        </span>
                      ) : (
                        <span>Not in any list yet</span>
                      )}
                    </div>

                    <a
                      href={restaurant.yelpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#D32323] hover:underline whitespace-nowrap shrink-0"
                    >
                      <span>View on Yelp</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
