/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  List,
  Settings as SettingsIcon,
  CheckCircle2,
  Share2,
  X
} from 'lucide-react';
import {
  Restaurant,
  SavedList,
  AppSettings,
  WillGoBackMarker,
  SharedListPayload,
  DEFAULT_WANT_TO_GO_ID,
  DEFAULT_BEEN_HERE_ID,
  DEFAULT_FALLBACK_LOCATION
} from './types';
import {
  INITIAL_US_RESTAURANTS,
  INITIAL_SAVED_LISTS
} from './data/usRestaurantsCatalog';
import { SearchView } from './components/SearchView';
import { ListsView } from './components/ListsView';
import { SettingsView } from './components/SettingsView';
import { SaveToListModal } from './components/SaveToListModal';
import { CsvExportModal } from './components/CsvExportModal';
import { decodeListShareToken } from './utils/csvExport';

type ActiveTab = 'search' | 'lists' | 'settings';

const STORAGE_KEYS = {
  RESTAURANTS: 'yurfat_restaurants_v1',
  LISTS: 'yurfat_lists_v1',
  SETTINGS: 'yurfat_settings_v1',
  PRIVATE_USER_API_KEY: 'yurfat_private_gemini_api_key_v1'
};

function buildInitialRestaurantsMap(): Record<string, Restaurant> {
  const map: Record<string, Restaurant> = {};
  for (const r of INITIAL_US_RESTAURANTS) {
    map[r.id] = { ...r };
  }
  return map;
}

export default function App() {
  // Navigation Tab State: Home Screen is Search Screen (Requirement 1)
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');

  // Normalized Restaurant Store
  const [restaurantsMap, setRestaurantsMap] = useState<Record<string, Restaurant>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESTAURANTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...buildInitialRestaurantsMap(), ...parsed };
        }
      }
    } catch {
      // Fallback to initial
    }
    return buildInitialRestaurantsMap();
  });

  // Saved Lists Store (Starts with "Want to Go" and "Been Here" default lists)
  const [lists, setLists] = useState<SavedList[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LISTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const hasWantToGo = parsed.some((l: SavedList) => l.id === DEFAULT_WANT_TO_GO_ID);
          const hasBeenHere = parsed.some((l: SavedList) => l.id === DEFAULT_BEEN_HERE_ID);
          if (hasWantToGo && hasBeenHere) {
            return parsed;
          }
        }
      }
    } catch {
      // Fallback to initial
    }
    return INITIAL_SAVED_LISTS;
  });

  // User Preferences / Settings Store (Default location falls back to New York, NY)
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          defaultLocation:
            parsed.defaultLocation && parsed.defaultLocation !== 'All United States'
              ? parsed.defaultLocation
              : DEFAULT_FALLBACK_LOCATION,
          userManuallySetLocation: Boolean(parsed.userManuallySetLocation),
          defaultSortBy: parsed.defaultSortBy || 'dateAdded',
          includeEmptyWillGoBackInCsv: parsed.includeEmptyWillGoBackInCsv ?? true
        };
      }
    } catch {
      // Fallback
    }
    return {
      defaultLocation: DEFAULT_FALLBACK_LOCATION,
      userManuallySetLocation: false,
      defaultSortBy: 'dateAdded',
      includeEmptyWillGoBackInCsv: true
    };
  });

  // Private, browser-localized Google Gemini API Key (never shared or exported)
  const [userGeminiApiKey, setUserGeminiApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.PRIVATE_USER_API_KEY) || '';
    } catch {
      return '';
    }
  });

  const [isLocatingUser, setIsLocatingUser] = useState(false);

  // Opened list ID inside the My Lists tab (null = show All Lists screen; string = show Single List Detail screen)
  const [openedListId, setOpenedListId] = useState<string | null>(null);

  // Modal states
  const [modalRestaurant, setModalRestaurant] = useState<Restaurant | null>(null);
  const [csvModalList, setCsvModalList] = useState<SavedList | null>(null);

  // Incoming URL shared list banner state (`?share=...`)
  const [incomingSharedPayload, setIncomingSharedPayload] =
    useState<SharedListPayload | null>(null);

  // Toast feedback banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Prompt the user for browser geolocation and set default location if allowed, or fallback to New York City ("New York, NY")
  const requestUserGeolocation = useCallback(
    (isManualTrigger = false) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setSettings((prev) => ({
          ...prev,
          defaultLocation: prev.userManuallySetLocation
            ? prev.defaultLocation
            : DEFAULT_FALLBACK_LOCATION
        }));
        if (isManualTrigger) {
          showToast('Location unavailable; defaulted to New York, NY');
        }
        return;
      }

      setIsLocatingUser(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `/api/reverse-geocode?lat=${encodeURIComponent(
                String(latitude)
              )}&lon=${encodeURIComponent(String(longitude))}`
            );
            if (res.ok) {
              const data = await res.json();
              const detectedLocation =
                data?.isUs && data?.location ? String(data.location) : DEFAULT_FALLBACK_LOCATION;
              setSettings((prev) => ({
                ...prev,
                defaultLocation: detectedLocation,
                userManuallySetLocation: isManualTrigger ? true : prev.userManuallySetLocation
              }));
              if (data?.isUs) {
                showToast(`Location set to ${detectedLocation}`);
              } else if (isManualTrigger) {
                showToast('Outside U.S. — defaulted to New York, NY');
              }
            } else {
              setSettings((prev) => ({
                ...prev,
                defaultLocation: prev.userManuallySetLocation
                  ? prev.defaultLocation
                  : DEFAULT_FALLBACK_LOCATION
              }));
            }
          } catch {
            setSettings((prev) => ({
              ...prev,
              defaultLocation: prev.userManuallySetLocation
                ? prev.defaultLocation
                : DEFAULT_FALLBACK_LOCATION
            }));
          } finally {
            setIsLocatingUser(false);
          }
        },
        () => {
          setIsLocatingUser(false);
          setSettings((prev) => ({
            ...prev,
            defaultLocation: prev.userManuallySetLocation
              ? prev.defaultLocation
              : DEFAULT_FALLBACK_LOCATION
          }));
          if (isManualTrigger) {
            showToast('Location access declined — defaulted to New York, NY');
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000
        }
      );
    },
    [showToast]
  );

  useEffect(() => {
    if (!settings.userManuallySetLocation) {
      requestUserGeolocation(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESTAURANTS, JSON.stringify(restaurantsMap));
    } catch {
      // Ignore quota errors
    }
  }, [restaurantsMap]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(lists));
    } catch {
      // Ignore quota errors
    }
  }, [lists]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore quota errors
    }
  }, [settings]);

  const handleUpdateUserGeminiApiKey = (newKey: string) => {
    const trimmed = newKey.trim();
    setUserGeminiApiKey(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem(STORAGE_KEYS.PRIVATE_USER_API_KEY, trimmed);
      } else {
        localStorage.removeItem(STORAGE_KEYS.PRIVATE_USER_API_KEY);
      }
    } catch {
      // Ignore storage error
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    if (shareParam) {
      const decoded = decodeListShareToken(shareParam);
      if (decoded) {
        setIncomingSharedPayload(decoded);
      }
    }
  }, []);

  const handleRegisterDiscoveredRestaurants = (discovered: Restaurant[]) => {
    setRestaurantsMap((prev) => {
      const next = { ...prev };
      for (const r of discovered) {
        if (next[r.id]) {
          next[r.id] = {
            ...r,
            userRating: next[r.id].userRating,
            notes: next[r.id].notes,
            willGoBack: next[r.id].willGoBack
          };
        } else {
          next[r.id] = r;
        }
      }
      return next;
    });
  };

  const handleCreateList = (name: string, description: string): SavedList => {
    const now = new Date().toISOString();
    const id = `list-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newList: SavedList = {
      id,
      name,
      description,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      items: []
    };
    setLists((prev) => [...prev, newList]);
    showToast(`Created list "${name}"`);
    return newList;
  };

  const handleUpdateList = (listId: string, name: string, description: string) => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          name: l.isDefault ? l.name : name,
          description,
          updatedAt: new Date().toISOString()
        };
      })
    );
    showToast('Updated list details');
  };

  const handleMassDeleteLists = (listIdsToDelete: string[]) => {
    const safeToDelete = listIdsToDelete.filter(
      (id) => id !== DEFAULT_WANT_TO_GO_ID && id !== DEFAULT_BEEN_HERE_ID
    );
    if (safeToDelete.length === 0) return;

    setLists((prev) => prev.filter((l) => !safeToDelete.includes(l.id)));
    if (openedListId && safeToDelete.includes(openedListId)) {
      setOpenedListId(null);
    }
    showToast(
      `Deleted ${safeToDelete.length} custom list${safeToDelete.length === 1 ? '' : 's'}`
    );
  };

  const handleSaveRestaurantModal = ({
    restaurant,
    selectedListIds,
    userRating,
    notes,
    willGoBack
  }: {
    restaurant: Restaurant;
    selectedListIds: string[];
    userRating: number;
    notes: string;
    willGoBack: WillGoBackMarker;
  }) => {
    let validatedListIds = [...selectedListIds];
    if (
      validatedListIds.includes(DEFAULT_WANT_TO_GO_ID) &&
      validatedListIds.includes(DEFAULT_BEEN_HERE_ID)
    ) {
      validatedListIds = validatedListIds.filter((id) => id !== DEFAULT_WANT_TO_GO_ID);
    }

    setRestaurantsMap((prev) => ({
      ...prev,
      [restaurant.id]: {
        ...(prev[restaurant.id] || restaurant),
        userRating,
        notes,
        willGoBack
      }
    }));

    const now = new Date().toISOString();
    setLists((prevLists) =>
      prevLists.map((list) => {
        const shouldContain = validatedListIds.includes(list.id);
        const alreadyContains = list.items.some((item) => item.restaurantId === restaurant.id);

        if (shouldContain && !alreadyContains) {
          return {
            ...list,
            updatedAt: now,
            items: [{ restaurantId: restaurant.id, addedAt: now }, ...list.items]
          };
        }

        if (!shouldContain && alreadyContains) {
          return {
            ...list,
            updatedAt: now,
            items: list.items.filter((item) => item.restaurantId !== restaurant.id)
          };
        }

        return list;
      })
    );

    showToast(`Saved "${restaurant.name}" (${validatedListIds.length} list${validatedListIds.length === 1 ? '' : 's'})`);
  };

  const handleUpdateRestaurantDetails = (
    restaurantId: string,
    updates: Partial<Pick<Restaurant, 'userRating' | 'notes' | 'willGoBack'>>
  ) => {
    setRestaurantsMap((prev) => {
      const existing = prev[restaurantId];
      if (!existing) return prev;
      return {
        ...prev,
        [restaurantId]: {
          ...existing,
          ...updates
        }
      };
    });
  };

  const handleBatchRemoveRestaurantsFromList = (
    listId: string,
    restaurantIdsToRemove: string[]
  ) => {
    const removeSet = new Set(restaurantIdsToRemove);
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          updatedAt: new Date().toISOString(),
          items: l.items.filter((item) => !removeSet.has(item.restaurantId))
        };
      })
    );
    showToast(
      `Removed ${restaurantIdsToRemove.length} restaurant${
        restaurantIdsToRemove.length === 1 ? '' : 's'
      } from list`
    );
  };

  const handleImportSharedPayload = (payload: SharedListPayload) => {
    setRestaurantsMap((prev) => {
      const next = { ...prev };
      for (const entry of payload.restaurants) {
        const r = entry.restaurant;
        if (!next[r.id]) {
          next[r.id] = r;
        } else {
          next[r.id] = {
            ...next[r.id],
            notes: next[r.id].notes || r.notes,
            userRating: next[r.id].userRating || r.userRating,
            willGoBack: next[r.id].willGoBack || r.willGoBack
          };
        }
      }
      return next;
    });

    const now = new Date().toISOString();
    const newListId = `shared-${Date.now()}`;
    const importedName = `${payload.listName} (Shared)`;
    const newList: SavedList = {
      id: newListId,
      name: importedName,
      description: payload.listDescription || 'Imported shared restaurant list.',
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      items: payload.restaurants.map((entry) => ({
        restaurantId: entry.restaurant.id,
        addedAt: entry.addedAt || now
      }))
    };

    setLists((prev) => [...prev, newList]);
    setOpenedListId(newListId);
    setActiveTab('lists');
    setIncomingSharedPayload(null);

    if (window.location.search.includes('share=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    showToast(`Imported shared list "${importedName}"`);
  };

  const handleImportSharedLinkOrToken = (
    token: string
  ): { success: boolean; message: string } => {
    const decoded = decodeListShareToken(token);
    if (!decoded) {
      return {
        success: false,
        message: 'Invalid share link or token. Please check the URL and try again.'
      };
    }
    handleImportSharedPayload(decoded);
    return {
      success: true,
      message: `Successfully imported "${decoded.listName}" (${decoded.restaurants.length} restaurants)!`
    };
  };

  const handleImportFullBackupJson = (
    jsonString: string
  ): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.lists) || !parsed.restaurantsMap) {
        return {
          success: false,
          message: 'Invalid backup file format.'
        };
      }
      setRestaurantsMap({ ...buildInitialRestaurantsMap(), ...parsed.restaurantsMap });
      setLists(parsed.lists);
      if (parsed.settings) {
        setSettings(parsed.settings);
      }
      showToast('Restored full YURFAT backup!');
      return {
        success: true,
        message: 'Successfully restored lists and restaurants from backup.'
      };
    } catch {
      return {
        success: false,
        message: 'Could not parse JSON backup file.'
      };
    }
  };

  const handleResetToDemoData = () => {
    setRestaurantsMap(buildInitialRestaurantsMap());
    setLists(INITIAL_SAVED_LISTS);
    setOpenedListId(null);
    showToast('Reset to starter U.S. restaurants and default lists');
  };

  const handleClearAllUserData = () => {
    const clearedMap: Record<string, Restaurant> = {};
    for (const r of INITIAL_US_RESTAURANTS) {
      clearedMap[r.id] = {
        ...r,
        userRating: 0,
        notes: '',
        willGoBack: ''
      };
    }
    const now = new Date().toISOString();
    const emptyDefaults: SavedList[] = [
      {
        id: DEFAULT_WANT_TO_GO_ID,
        name: 'Want to Go',
        description: 'Restaurants on my radar to visit next (mutually exclusive with "Been Here").',
        isDefault: true,
        createdAt: now,
        updatedAt: now,
        items: []
      },
      {
        id: DEFAULT_BEEN_HERE_ID,
        name: 'Been Here',
        description: 'Spots I have already visited with my rating and Y/N Will Go Back log.',
        isDefault: true,
        createdAt: now,
        updatedAt: now,
        items: []
      }
    ];
    setRestaurantsMap(clearedMap);
    setLists(emptyDefaults);
    setOpenedListId(null);
    showToast('Cleared all saved lists, ratings, and notes');
  };

  const totalSavedEntries = lists.reduce((acc, l) => acc + l.items.length, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-zinc-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          {/* Brand wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className="font-display text-xl font-extrabold tracking-tight text-[#D32323] whitespace-nowrap shrink-0"
          >
            YURFAT
          </button>

          {/* Navigation tabs */}
          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600">
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`inline-flex items-center gap-1.5 py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'search'
                  ? 'text-zinc-950 font-bold underline decoration-[#D32323] decoration-2 underline-offset-8'
                  : 'hover:text-zinc-900'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('lists');
                setOpenedListId(null);
              }}
              className={`inline-flex items-center gap-1.5 py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'lists'
                  ? 'text-zinc-950 font-bold underline decoration-[#D32323] decoration-2 underline-offset-8'
                  : 'hover:text-zinc-900'
              }`}
            >
              <List className="h-4 w-4" />
              <span>My Lists ({lists.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-1.5 py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'settings'
                  ? 'text-zinc-950 font-bold underline decoration-[#D32323] decoration-2 underline-offset-8'
                  : 'hover:text-zinc-900'
              }`}
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Incoming Shared List Banner */}
      {incomingSharedPayload && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-[#D32323]" />
              <span>
                Someone shared the restaurant list{' '}
                <strong>&ldquo;{incomingSharedPayload.listName}&rdquo;</strong> (
                {incomingSharedPayload.restaurants.length} spots) with you!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleImportSharedPayload(incomingSharedPayload)}
                className="rounded-md bg-[#D32323] px-3 py-1.5 font-semibold text-white hover:bg-[#b81d1d]"
              >
                Import into My Lists
              </button>
              <button
                type="button"
                onClick={() => setIncomingSharedPayload(null)}
                className="rounded-md p-1 text-amber-700 hover:bg-amber-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {activeTab === 'search' && (
          <SearchView
            restaurantsMap={restaurantsMap}
            lists={lists}
            defaultLocation={settings.defaultLocation}
            isLocatingUser={isLocatingUser}
            userGeminiApiKey={userGeminiApiKey}
            onRequestUserLocation={() => requestUserGeolocation(true)}
            onOpenSaveModal={(restaurant) => setModalRestaurant(restaurant)}
            onRegisterDiscoveredRestaurants={handleRegisterDiscoveredRestaurants}
          />
        )}

        {activeTab === 'lists' && (
          <ListsView
            lists={lists}
            restaurantsMap={restaurantsMap}
            openedListId={openedListId}
            defaultSortBy={settings.defaultSortBy}
            onOpenList={(id) => setOpenedListId(id)}
            onCreateList={handleCreateList}
            onUpdateList={handleUpdateList}
            onMassDeleteLists={handleMassDeleteLists}
            onBatchRemoveRestaurantsFromList={handleBatchRemoveRestaurantsFromList}
            onUpdateRestaurantDetails={handleUpdateRestaurantDetails}
            onOpenSaveModal={(restaurant) => setModalRestaurant(restaurant)}
            onOpenCsvModal={(list) => setCsvModalList(list)}
            onNavigateToSearch={() => setActiveTab('search')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            lists={lists}
            restaurantsMap={restaurantsMap}
            userGeminiApiKey={userGeminiApiKey}
            isLocatingUser={isLocatingUser}
            onUpdateSettings={(newSettings) =>
              setSettings((prev) => ({ ...prev, ...newSettings }))
            }
            onUpdateUserGeminiApiKey={handleUpdateUserGeminiApiKey}
            onRequestUserLocation={() => requestUserGeolocation(true)}
            onImportSharedLinkOrToken={handleImportSharedLinkOrToken}
            onImportFullBackupJson={handleImportFullBackupJson}
            onResetToDemoData={handleResetToDemoData}
            onClearAllUserData={handleClearAllUserData}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-zinc-200 bg-white py-5 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <div>
            <strong className="font-display font-bold text-zinc-800">YURFAT</strong>
          </div>
          <div className="font-mono tabular-nums">
            Default: {settings.defaultLocation} · {lists.length} Lists · {totalSavedEntries} Saved Entries
          </div>
        </div>
      </footer>

      {/* Quick-Save Star Modal */}
      <SaveToListModal
        restaurant={modalRestaurant}
        lists={lists}
        onClose={() => setModalRestaurant(null)}
        onSave={handleSaveRestaurantModal}
        onCreateListOnTheFly={handleCreateList}
      />

      {/* CSV Preview, Download & Share Modal */}
      <CsvExportModal
        list={csvModalList}
        restaurantsMap={restaurantsMap}
        onClose={() => setCsvModalList(null)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
