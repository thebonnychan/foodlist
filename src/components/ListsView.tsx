import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Download,
  Share2,
  Star,
  ExternalLink,
  StickyNote,
  Lock,
  ArrowUpDown,
  CheckSquare,
  Square,
  ListChecks,
  FolderPlus,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import {
  Restaurant,
  SavedList,
  SortOption,
  WillGoBackMarker,
  DEFAULT_WANT_TO_GO_ID,
  DEFAULT_BEEN_HERE_ID
} from '../types';
import { generateRestaurantsCsv, downloadCsvFile } from '../utils/csvExport';
import { RestaurantThumb } from './RestaurantThumb';

interface ListsViewProps {
  lists: SavedList[];
  restaurantsMap: Record<string, Restaurant>;
  openedListId: string | null;
  defaultSortBy: SortOption;
  onOpenList: (listId: string | null) => void;
  onCreateList: (name: string, description: string) => SavedList;
  onUpdateList: (listId: string, name: string, description: string) => void;
  onMassDeleteLists: (listIds: string[]) => void;
  onBatchRemoveRestaurantsFromList: (listId: string, restaurantIds: string[]) => void;
  onUpdateRestaurantDetails: (
    restaurantId: string,
    updates: Partial<Pick<Restaurant, 'userRating' | 'notes' | 'willGoBack'>>
  ) => void;
  onOpenSaveModal: (restaurant: Restaurant) => void;
  onOpenCsvModal: (list: SavedList) => void;
  onNavigateToSearch: () => void;
}

export const ListsView: React.FC<ListsViewProps> = ({
  lists,
  restaurantsMap,
  openedListId,
  defaultSortBy,
  onOpenList,
  onCreateList,
  onUpdateList,
  onMassDeleteLists,
  onBatchRemoveRestaurantsFromList,
  onUpdateRestaurantDetails,
  onOpenSaveModal,
  onOpenCsvModal,
  onNavigateToSearch
}) => {
  // Sorting state within active list (Requirement 14: Alphabetical, Date Added, Yelp Rating)
  const [sortBy, setSortBy] = useState<SortOption>(defaultSortBy || 'dateAdded');

  // Multi-select lists for mass deletion (Requirement 13)
  const [isMultiSelectingLists, setIsMultiSelectingLists] = useState(false);
  const [selectedListIdsForDelete, setSelectedListIdsForDelete] = useState<string[]>([]);

  // Multi-select restaurants within active list for bulk removal (Requirement 12)
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);

  // Create new list modal/drawer state (Requirements 3 & 4)
  const [showCreateListForm, setShowCreateListForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [listFormError, setListFormError] = useState('');

  // Modify / Edit current list name & description state (Requirement 3)
  const [isEditingCurrentList, setIsEditingCurrentList] = useState(false);
  const [editListName, setEditListName] = useState('');
  const [editListDescription, setEditListDescription] = useState('');

  // Inline note editing state per restaurant (Requirement 15 & 16)
  const [editingNoteRestaurantId, setEditingNoteRestaurantId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');

  const activeList = useMemo(
    () => (openedListId ? lists.find((l) => l.id === openedListId) || null : null),
    [lists, openedListId]
  );

  // Clear restaurant multi-select when switching or closing active list
  useEffect(() => {
    setSelectedRestaurantIds([]);
    setIsEditingCurrentList(false);
    setEditingNoteRestaurantId(null);
  }, [activeList?.id]);

  // Populate sorted restaurants for the opened list
  const sortedListItems = useMemo(() => {
    if (!activeList) return [];
    const enriched = activeList.items
      .map((item) => {
        const restaurant = restaurantsMap[item.restaurantId];
        if (!restaurant) return null;
        return {
          restaurant,
          addedAt: item.addedAt
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return enriched.sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.restaurant.name.localeCompare(b.restaurant.name);
      }
      if (sortBy === 'yelpRating') {
        return b.restaurant.yelpRating - a.restaurant.yelpRating;
      }
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
  }, [activeList, restaurantsMap, sortBy]);

  const handleCreateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed) {
      setListFormError('Please provide a name for the list.');
      return;
    }
    if (lists.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
      setListFormError('A list with this name already exists.');
      return;
    }

    onCreateList(trimmed, newListDescription.trim());
    setNewListName('');
    setNewListDescription('');
    setListFormError('');
    setShowCreateListForm(false);
  };

  const handleStartEditList = () => {
    if (!activeList) return;
    setEditListName(activeList.name);
    setEditListDescription(activeList.description);
    setIsEditingCurrentList(true);
  };

  const handleSaveEditList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeList) return;
    const trimmedName = activeList.isDefault ? activeList.name : editListName.trim();
    if (!trimmedName) return;
    onUpdateList(activeList.id, trimmedName, editListDescription.trim());
    setIsEditingCurrentList(false);
  };

  const handleToggleSelectListForDelete = (listId: string, isDefault: boolean) => {
    if (isDefault) return;
    setSelectedListIdsForDelete((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
    );
  };

  const handleConfirmMassDeleteLists = () => {
    if (selectedListIdsForDelete.length === 0) return;
    onMassDeleteLists(selectedListIdsForDelete);
    setSelectedListIdsForDelete([]);
    setIsMultiSelectingLists(false);
  };

  const handleToggleSelectRestaurant = (restaurantId: string) => {
    setSelectedRestaurantIds((prev) =>
      prev.includes(restaurantId)
        ? prev.filter((id) => id !== restaurantId)
        : [...prev, restaurantId]
    );
  };

  const handleSelectAllRestaurantsInList = () => {
    if (selectedRestaurantIds.length === sortedListItems.length) {
      setSelectedRestaurantIds([]);
    } else {
      setSelectedRestaurantIds(sortedListItems.map((entry) => entry.restaurant.id));
    }
  };

  const handleBatchRemoveSelectedRestaurants = () => {
    if (!activeList || selectedRestaurantIds.length === 0) return;
    onBatchRemoveRestaurantsFromList(activeList.id, selectedRestaurantIds);
    setSelectedRestaurantIds([]);
  };

  const handleQuickDownloadCsv = (list: SavedList) => {
    const listRestaurants = list.items
      .map((item) => restaurantsMap[item.restaurantId])
      .filter((r): r is Restaurant => Boolean(r));
    const csv = generateRestaurantsCsv(listRestaurants);
    downloadCsvFile(csv, `yurfat-${list.name}`);
  };

  const handleStartEditNote = (restaurant: Restaurant) => {
    setEditingNoteRestaurantId(restaurant.id);
    setNoteDraft(restaurant.notes || '');
  };

  const handleSaveInlineNote = (restaurantId: string) => {
    onUpdateRestaurantDetails(restaurantId, { notes: noteDraft.trim() });
    setEditingNoteRestaurantId(null);
  };

  const handleToggleWillGoBack = (restaurant: Restaurant, targetValue: WillGoBackMarker) => {
    const nextValue: WillGoBackMarker =
      restaurant.willGoBack === targetValue ? '' : targetValue;
    onUpdateRestaurantDetails(restaurant.id, { willGoBack: nextValue });
  };

  const customListsCount = lists.filter((l) => !l.isDefault).length;
  const isBeenHereList = activeList?.id === DEFAULT_BEEN_HERE_ID;

  // ============================================================================
  // SCREEN 1: ALL LISTS DIRECTORY SCREEN (When no list is currently opened)
  // ============================================================================
  if (!activeList) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 md:p-8 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">My Lists</h1>
              <p className="mt-1 text-xs text-zinc-500 font-mono tabular-nums">
                {lists.length} list{lists.length === 1 ? '' : 's'} ({customListsCount} custom) · Click any list to view its restaurants
              </p>
            </div>

            <div className="flex items-center gap-2">
              {customListsCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMultiSelectingLists((prev) => !prev);
                    setSelectedListIdsForDelete([]);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isMultiSelectingLists
                      ? 'border-rose-300 bg-rose-50 text-rose-800'
                      : 'border-zinc-300 bg-[#FAF9F6] text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <ListChecks className="h-4 w-4" />
                  <span>{isMultiSelectingLists ? 'Cancel Selection' : 'Select Lists'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowCreateListForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#D32323] px-4 py-2 text-xs font-semibold text-white hover:bg-[#b81d1d] transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>New List</span>
              </button>
            </div>
          </div>

          {/* Create New List Drawer */}
          {showCreateListForm && (
            <form
              onSubmit={handleCreateListSubmit}
              className="mt-5 rounded-lg border border-zinc-200 bg-[#FAF9F6] p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900">Create a New List</span>
                <button
                  type="button"
                  onClick={() => setShowCreateListForm(false)}
                  className="text-zinc-400 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => {
                    setNewListName(e.target.value);
                    setListFormError('');
                  }}
                  placeholder="List Name (e.g., NYC Date Night, Best Steakhouses)"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:border-[#D32323] focus:outline-none"
                />
                <input
                  type="text"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="Optional description..."
                  className="w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:border-[#D32323] focus:outline-none"
                />
              </div>
              {listFormError && <p className="text-xs text-rose-600">{listFormError}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  Create List
                </button>
              </div>
            </form>
          )}

          {/* Mass Delete Lists Action Bar (Requirement 13) */}
          {isMultiSelectingLists && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/90 p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-rose-950">
                    {selectedListIdsForDelete.length} custom list
                    {selectedListIdsForDelete.length === 1 ? '' : 's'} selected for deletion
                  </span>
                  <p className="mt-0.5 text-[11px] text-rose-700">
                    Default lists (&ldquo;Want to Go&rdquo; and &ldquo;Been Here&rdquo;) are permanent and cannot be deleted.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={selectedListIdsForDelete.length === 0}
                  onClick={handleConfirmMassDeleteLists}
                  className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Selected Lists ({selectedListIdsForDelete.length})
                </button>
              </div>
            </div>
          )}

          {/* Stacked 1-Line-Per-List Directory */}
          <div className="mt-5 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {lists.map((list) => {
              const isCheckedForDelete = selectedListIdsForDelete.includes(list.id);

              return (
                <div
                  key={list.id}
                  onClick={() => {
                    if (isMultiSelectingLists) {
                      handleToggleSelectListForDelete(list.id, list.isDefault);
                    } else {
                      onOpenList(list.id);
                    }
                  }}
                  className={`group flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors ${
                    isCheckedForDelete
                      ? 'bg-rose-50/60'
                      : 'bg-white hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-xs">
                    {isMultiSelectingLists && (
                      <button
                        type="button"
                        disabled={list.isDefault}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectListForDelete(list.id, list.isDefault);
                        }}
                        className="shrink-0"
                        aria-label={`Select ${list.name} for deletion`}
                      >
                        {list.isDefault ? (
                          <Lock className="h-4 w-4 text-zinc-300" />
                        ) : isCheckedForDelete ? (
                          <CheckSquare className="h-4 w-4 text-rose-600" />
                        ) : (
                          <Square className="h-4 w-4 text-zinc-400" />
                        )}
                      </button>
                    )}

                    <div className="flex items-center gap-1.5 shrink-0">
                      <h2 className="truncate text-sm font-bold text-zinc-900 group-hover:text-[#D32323] transition-colors">
                        {list.name}
                      </h2>
                      {list.isDefault && (
                        <span title="Default protected list" className="shrink-0">
                          <Lock className="h-3.5 w-3.5 text-zinc-400" />
                        </span>
                      )}
                    </div>

                    <span className="text-zinc-300 shrink-0" aria-hidden="true">
                      ·
                    </span>

                    <span className="font-mono text-zinc-600 tabular-nums shrink-0">
                      {list.items.length} restaurant{list.items.length === 1 ? '' : 's'}
                    </span>

                    {list.description && (
                      <>
                        <span className="text-zinc-300 shrink-0 hidden sm:inline" aria-hidden="true">
                          ·
                        </span>
                        <span className="truncate text-zinc-500 hidden sm:inline">
                          {list.description}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs text-zinc-400 group-hover:text-zinc-900 transition-colors">
                    <span className="font-mono text-[11px] text-zinc-400 hidden md:inline">
                      Updated {new Date(list.updatedAt).toLocaleDateString('en-US')}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SCREEN 2: SINGLE LIST DETAIL SCREEN (Dedicated screen with Back button & CSV Export)
  // ============================================================================
  return (
    <div className="space-y-5">
      {/* Back Button Bar */}
      <div>
        <button
          type="button"
          onClick={() => onOpenList(null)}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:text-zinc-950 transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Lists</span>
        </button>
      </div>

      {/* Single List Card Container */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 md:p-8 shadow-2xs">
        {/* List Header, Modify Controls & Export CSV Buttons (Only inside List Detail View) */}
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {isEditingCurrentList ? (
              <form onSubmit={handleSaveEditList} className="space-y-2.5 max-w-md">
                <div className="text-xs font-semibold text-zinc-500">
                  Modify List Details
                </div>
                <input
                  type="text"
                  disabled={activeList.isDefault}
                  value={editListName}
                  onChange={(e) => setEditListName(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-bold text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                />
                <input
                  type="text"
                  value={editListDescription}
                  onChange={(e) => setEditListDescription(e.target.value)}
                  placeholder="List description..."
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    <Check className="h-3.5 w-3.5" /> Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingCurrentList(false)}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{activeList.isDefault ? 'Default Protected List' : 'Custom List'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {sortedListItems.length} restaurant{sortedListItems.length === 1 ? '' : 's'}
                  </span>
                  {activeList.id === DEFAULT_WANT_TO_GO_ID && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Excludes &ldquo;Been Here&rdquo;</span>
                    </>
                  )}
                  {activeList.id === DEFAULT_BEEN_HERE_ID && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Includes Will Go Back (Y/N) Toggle</span>
                    </>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-zinc-900">{activeList.name}</h1>
                  <button
                    type="button"
                    onClick={handleStartEditList}
                    title="Modify list name or description"
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {!activeList.isDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        onMassDeleteLists([activeList.id]);
                        onOpenList(null);
                      }}
                      title="Delete this custom list"
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {activeList.description && (
                  <p className="mt-1 text-xs text-zinc-600">{activeList.description}</p>
                )}
              </div>
            )}
          </div>

          {/* Export CSV & Share Buttons (Exclusively inside this list view) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenCsvModal(activeList)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-[#FAF9F6] px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="h-3.5 w-3.5 text-zinc-600" />
              <span>Preview & Share CSV</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDownloadCsv(activeList)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D32323] px-4 py-2 text-xs font-semibold text-white hover:bg-[#b81d1d] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Multi-Select Restaurants (Requirement 12) + Sort Controls (Requirement 14) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-[#FAF9F6] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={sortedListItems.length === 0}
              onClick={handleSelectAllRestaurantsInList}
              className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              {sortedListItems.length > 0 &&
              selectedRestaurantIds.length === sortedListItems.length ? (
                <CheckSquare className="h-4 w-4 text-[#D32323]" />
              ) : (
                <Square className="h-4 w-4 text-zinc-400" />
              )}
              <span>
                {selectedRestaurantIds.length > 0
                  ? `${selectedRestaurantIds.length} Selected`
                  : 'Select Restaurants'}
              </span>
            </button>

            {selectedRestaurantIds.length > 0 && (
              <button
                type="button"
                onClick={handleBatchRemoveSelectedRestaurants}
                className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Selected ({selectedRestaurantIds.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort by:
            </span>
            <div className="flex items-center gap-1 rounded-lg bg-zinc-200/70 p-1">
              <button
                type="button"
                onClick={() => setSortBy('alphabetical')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  sortBy === 'alphabetical'
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Alphabetical
              </button>
              <button
                type="button"
                onClick={() => setSortBy('dateAdded')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  sortBy === 'dateAdded'
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Date Added
              </button>
              <button
                type="button"
                onClick={() => setSortBy('yelpRating')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  sortBy === 'yelpRating'
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Yelp Rating
              </button>
            </div>
          </div>
        </div>

        {/* Saved Restaurants List Items */}
        {sortedListItems.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-zinc-200 p-10 text-center">
            <p className="text-sm font-semibold text-zinc-900">
              No restaurants saved in &ldquo;{activeList.name}&rdquo; yet
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Search for United States restaurants on the Search screen and click ★ Save to add them here.
            </p>
            <button
              type="button"
              onClick={onNavigateToSearch}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#D32323] px-4 py-2 text-xs font-semibold text-white hover:bg-[#b81d1d] transition-colors"
            >
              Find Restaurants
            </button>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-zinc-200">
            {sortedListItems.map(({ restaurant, addedAt }) => {
              const isChecked = selectedRestaurantIds.includes(restaurant.id);
              const isEditingNote = editingNoteRestaurantId === restaurant.id;
              const otherLists = lists.filter(
                (l) =>
                  l.id !== activeList.id &&
                  l.items.some((item) => item.restaurantId === restaurant.id)
              );

              return (
                <div
                  key={restaurant.id}
                  className={`py-4 transition-colors ${
                    isChecked ? 'bg-rose-50/40 -mx-3 px-3 rounded-lg' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectRestaurant(restaurant.id)}
                      className="mt-1.5 shrink-0 text-zinc-400 hover:text-zinc-700"
                      aria-label={`Select ${restaurant.name}`}
                    >
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 text-[#D32323]" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>

                    <RestaurantThumb restaurant={restaurant} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          {/* Line 1: Restaurant Name */}
                          <h3 className="text-base font-bold text-zinc-900 truncate">
                            <a
                              href={restaurant.yelpUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-[#D32323] transition-colors"
                            >
                              {restaurant.name}
                            </a>
                          </h3>

                          {/* Line 2 (Underneath Name): Type of Restaurant & How Expensive */}
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-700">
                            <span className="font-medium">{restaurant.cuisineType}</span>
                            <span className="text-zinc-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-mono font-semibold text-zinc-900">
                              {restaurant.price}
                            </span>
                          </div>

                          {/* Line 3 (Underneath Type & Price): Street Address */}
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                            <span>
                              {restaurant.address ? `${restaurant.address}, ` : ''}
                              {restaurant.city}, {restaurant.state}
                              {restaurant.zipCode ? ` ${restaurant.zipCode}` : ''}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-[11px]">
                              Added {new Date(addedAt).toLocaleDateString('en-US')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={restaurant.yelpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-[#FAF9F6] px-2.5 py-1 text-xs font-semibold text-[#D32323] hover:border-[#D32323] transition-colors whitespace-nowrap shrink-0"
                          >
                            <span>Yelp Page</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>

                          <button
                            type="button"
                            onClick={() => onOpenSaveModal(restaurant)}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors whitespace-nowrap shrink-0"
                            title="Manage lists, rating, or note"
                          >
                            <Star className="h-3.5 w-3.5 fill-[#D32323] text-[#D32323]" />
                            <span>Lists</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onBatchRemoveRestaurantsFromList(activeList.id, [restaurant.id])
                            }
                            title={`Remove ${restaurant.name} from ${activeList.name}`}
                            className="rounded-md p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Ratings & "Been Here" Will Go Back Toggle Row */}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-1 font-mono tabular-nums">
                          <span className="text-zinc-500">Yelp Rating:</span>
                          <span className="font-bold text-[#D32323]">
                            ★ {restaurant.yelpRating.toFixed(1)}
                          </span>
                          <span className="text-zinc-400">
                            ({restaurant.reviewCount.toLocaleString()})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500">My Rating:</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((starVal) => {
                              const active = starVal <= restaurant.userRating;
                              return (
                                <button
                                  key={starVal}
                                  type="button"
                                  onClick={() =>
                                    onUpdateRestaurantDetails(restaurant.id, {
                                      userRating:
                                        restaurant.userRating === starVal ? 0 : starVal
                                    })
                                  }
                                  className="p-0.5 transition-transform hover:scale-110"
                                  title={`Rate ${starVal} out of 5 stars`}
                                >
                                  <Star
                                    className={`h-3.5 w-3.5 ${
                                      active
                                        ? 'fill-amber-500 text-amber-500'
                                        : 'text-zinc-300 hover:text-amber-400'
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                          <span className="font-mono text-[11px] text-zinc-600 tabular-nums">
                            {restaurant.userRating > 0
                              ? `${restaurant.userRating}/5`
                              : 'Unrated'}
                          </span>
                        </div>

                        {(isBeenHereList || restaurant.willGoBack !== '') && (
                          <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-[#FAF9F6] px-2.5 py-1">
                            <span className="text-xs font-semibold text-zinc-700">
                              Will Go Back?
                            </span>
                            <div className="flex items-center gap-1 font-mono">
                              <button
                                type="button"
                                onClick={() => handleToggleWillGoBack(restaurant, 'Y')}
                                className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                                  restaurant.willGoBack === 'Y'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white text-zinc-600 border border-zinc-300 hover:bg-zinc-100'
                                }`}
                                title="Yes, will go back (Y)"
                              >
                                Y
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleWillGoBack(restaurant, 'N')}
                                className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                                  restaurant.willGoBack === 'N'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-white text-zinc-600 border border-zinc-300 hover:bg-zinc-100'
                                }`}
                                title="No, will not go back (N)"
                              >
                                N
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quickly Viewable & Editable Shared Restaurant Note */}
                      <div className="mt-3">
                        {isEditingNote ? (
                          <div className="rounded-lg border border-zinc-300 bg-[#FAF9F6] p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs text-zinc-600">
                              <span className="font-semibold text-zinc-900">
                                Edit Note for {restaurant.name} (Synced across all lists)
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              placeholder="Write a note about dishes, service, or tips..."
                              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-[#D32323] focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingNoteRestaurantId(null)}
                                className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveInlineNote(restaurant.id)}
                                className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-800"
                              >
                                Save Note
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200/80 bg-[#FAF9F6] px-3 py-2 text-xs">
                            <div className="flex items-start gap-2 min-w-0">
                              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                              {restaurant.notes ? (
                                <p className="text-zinc-800 leading-relaxed">
                                  <span className="font-semibold text-zinc-900">Note: </span>
                                  {restaurant.notes}
                                </p>
                              ) : (
                                <p className="text-zinc-400 italic">
                                  No note added yet. Click &ldquo;+ Add Note&rdquo; to log dishes or thoughts.
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStartEditNote(restaurant)}
                              className="font-semibold text-[#D32323] hover:underline whitespace-nowrap shrink-0"
                            >
                              {restaurant.notes ? 'Edit Note' : '+ Add Note'}
                            </button>
                          </div>
                        )}
                      </div>

                      {otherLists.length > 0 && (
                        <div className="mt-2 text-[11px] text-zinc-500">
                          Also saved in:{' '}
                          <span className="font-medium text-zinc-700">
                            {otherLists.map((l) => l.name).join(' · ')}
                          </span>{' '}
                          (notes & ratings stay synced)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
