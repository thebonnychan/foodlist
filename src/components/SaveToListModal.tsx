import React, { useState, useEffect } from 'react';
import {
  Star,
  X,
  Plus,
  Check,
  AlertTriangle,
  ExternalLink,
  StickyNote,
  Lock,
  RotateCcw
} from 'lucide-react';
import {
  Restaurant,
  SavedList,
  WillGoBackMarker,
  DEFAULT_WANT_TO_GO_ID,
  DEFAULT_BEEN_HERE_ID
} from '../types';

interface SaveToListModalProps {
  restaurant: Restaurant | null;
  lists: SavedList[];
  onClose: () => void;
  onSave: (params: {
    restaurant: Restaurant;
    selectedListIds: string[];
    userRating: number;
    notes: string;
    willGoBack: WillGoBackMarker;
  }) => void;
  onCreateListOnTheFly: (name: string, description: string) => SavedList;
}

export const SaveToListModal: React.FC<SaveToListModalProps> = ({
  restaurant,
  lists,
  onClose,
  onSave,
  onCreateListOnTheFly
}) => {
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [willGoBack, setWillGoBack] = useState<WillGoBackMarker>('');

  // Mutual exclusivity conflict state between "Want to Go" and "Been Here"
  const [conflictAttempt, setConflictAttempt] = useState<{
    currentListId: string;
    attemptedListId: string;
  } | null>(null);

  // Create new list on the fly state
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [newListError, setNewListError] = useState('');

  useEffect(() => {
    if (!restaurant) return;
    const initialIds = lists
      .filter((list) => list.items.some((item) => item.restaurantId === restaurant.id))
      .map((list) => list.id);

    setSelectedListIds(initialIds);
    setUserRating(restaurant.userRating || 0);
    setNotes(restaurant.notes || '');
    setWillGoBack(restaurant.willGoBack || '');
    setConflictAttempt(null);
    setShowNewListForm(false);
    setNewListName('');
    setNewListDesc('');
    setNewListError('');
  }, [restaurant, lists]);

  if (!restaurant) return null;

  const isBeenHereSelected = selectedListIds.includes(DEFAULT_BEEN_HERE_ID);

  const handleToggleList = (listId: string) => {
    const isCurrentlySelected = selectedListIds.includes(listId);

    if (isCurrentlySelected) {
      setSelectedListIds((prev) => prev.filter((id) => id !== listId));
      if (
        conflictAttempt &&
        (conflictAttempt.currentListId === listId || conflictAttempt.attemptedListId === listId)
      ) {
        setConflictAttempt(null);
      }
      return;
    }

    // Check mutual exclusivity rule for "Want to Go" and "Been Here"
    if (listId === DEFAULT_WANT_TO_GO_ID && selectedListIds.includes(DEFAULT_BEEN_HERE_ID)) {
      setConflictAttempt({
        currentListId: DEFAULT_BEEN_HERE_ID,
        attemptedListId: DEFAULT_WANT_TO_GO_ID
      });
      return;
    }

    if (listId === DEFAULT_BEEN_HERE_ID && selectedListIds.includes(DEFAULT_WANT_TO_GO_ID)) {
      setConflictAttempt({
        currentListId: DEFAULT_WANT_TO_GO_ID,
        attemptedListId: DEFAULT_BEEN_HERE_ID
      });
      return;
    }

    setSelectedListIds((prev) => [...prev, listId]);
  };

  const handleResolveConflict = (chosenListId: string) => {
    const otherDefaultId =
      chosenListId === DEFAULT_WANT_TO_GO_ID ? DEFAULT_BEEN_HERE_ID : DEFAULT_WANT_TO_GO_ID;

    setSelectedListIds((prev) => [
      ...prev.filter((id) => id !== otherDefaultId && id !== chosenListId),
      chosenListId
    ]);
    setConflictAttempt(null);
  };

  const handleCreateNewList = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed) {
      setNewListError('Please enter a list name.');
      return;
    }
    if (lists.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewListError('A list with that name already exists.');
      return;
    }

    const created = onCreateListOnTheFly(trimmed, newListDesc.trim());
    setSelectedListIds((prev) => [...prev, created.id]);
    setNewListName('');
    setNewListDesc('');
    setNewListError('');
    setShowNewListForm(false);
  };

  const handleConfirmSave = () => {
    onSave({
      restaurant,
      selectedListIds,
      userRating,
      notes: notes.trim(),
      willGoBack: isBeenHereSelected ? willGoBack : restaurant.willGoBack
    });
    onClose();
  };

  const defaultLists = lists.filter((l) => l.isDefault);
  const customLists = lists.filter((l) => !l.isDefault);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-modal-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 bg-[#FAF9F6] px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Save Restaurant to Lists</span>
              <span aria-hidden="true">·</span>
              <span>{restaurant.city}, {restaurant.state}</span>
            </div>
            <h2 id="save-modal-title" className="mt-0.5 text-lg font-bold text-zinc-900">
              {restaurant.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-600">
              <span>{restaurant.cuisineType}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-medium text-[#D32323] tabular-nums">
                ★ {restaurant.yelpRating.toFixed(1)} Yelp
              </span>
              <span aria-hidden="true">·</span>
              <a
                href={restaurant.yelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-zinc-700 underline decoration-zinc-300 hover:text-[#D32323]"
              >
                Yelp Page <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-700"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Default Lists ("Want to Go" & "Been Here") */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-tight text-zinc-800">
                1. Default Status Lists (Pick One at Most)
              </label>
              <span className="text-xs text-zinc-500">Mutually Exclusive</span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              A restaurant can be in &ldquo;Want to Go&rdquo; or &ldquo;Been Here&rdquo;, never both at the same time.
            </p>

            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {defaultLists.map((list) => {
                const isChecked = selectedListIds.includes(list.id);
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => handleToggleList(list.id)}
                    className={`flex items-start justify-between gap-3 rounded-lg border p-3.5 text-left transition-all ${
                      isChecked
                        ? 'border-[#D32323] bg-[#D32323]/5 text-zinc-900 shadow-2xs'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <span>{list.name}</span>
                        <Lock className="h-3 w-3 text-zinc-400" />
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">
                        {list.id === DEFAULT_WANT_TO_GO_ID
                          ? 'Bookmark to try in the future'
                          : 'Log a spot you have visited'}
                      </p>
                    </div>
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isChecked
                          ? 'border-[#D32323] bg-[#D32323] text-white'
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mutual Exclusivity Conflict Prompt */}
            {conflictAttempt && (
              <div
                role="alert"
                className="mt-3 rounded-lg border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-950"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-950">
                      Saves can&apos;t be in both &ldquo;Want to Go&rdquo; and &ldquo;Been Here&rdquo;
                    </p>
                    <p className="mt-1 text-amber-800">
                      Please choose which of the two lists you want <strong>{restaurant.name}</strong> to be in:
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolveConflict(DEFAULT_WANT_TO_GO_ID)}
                        className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 border border-amber-300 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
                      >
                        Pick &ldquo;Want to Go&rdquo;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveConflict(DEFAULT_BEEN_HERE_ID)}
                        className="rounded-md bg-[#D32323] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#b81d1d] transition-colors whitespace-nowrap shrink-0"
                      >
                        Pick &ldquo;Been Here&rdquo;
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* "Been Here" Exclusive Toggle: Will Go Back (Y / N) */}
          {isBeenHereSelected && (
            <div className="rounded-lg border border-zinc-200 bg-[#FAF9F6] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-zinc-900">
                    Will You Go Back to {restaurant.name}? (&ldquo;Been Here&rdquo; Log)
                  </span>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Mark Y or N for your &ldquo;Been Here&rdquo; list and CSV export.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWillGoBack(willGoBack === 'Y' ? '' : 'Y')}
                    className={`px-3.5 py-1.5 text-xs font-mono font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                      willGoBack === 'Y'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    Y (Will Go Back)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWillGoBack(willGoBack === 'N' ? '' : 'N')}
                    className={`px-3.5 py-1.5 text-xs font-mono font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                      willGoBack === 'N'
                        ? 'border-rose-600 bg-rose-600 text-white'
                        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    N (Won&apos;t Go Back)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Custom Lists (Multi-Select + Create on the Fly) */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-tight text-zinc-800">
                2. Custom Lists (Select Any Number of Lists)
              </label>
              <button
                type="button"
                onClick={() => setShowNewListForm((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#D32323] hover:underline whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                {showNewListForm ? 'Cancel New List' : 'Create List on the Fly'}
              </button>
            </div>

            {showNewListForm && (
              <form
                onSubmit={handleCreateNewList}
                className="mt-2.5 rounded-lg border border-zinc-200 bg-[#FAF9F6] p-3.5 space-y-2.5"
              >
                <div className="text-xs font-semibold text-zinc-800">
                  Create & Immediately Select a New List
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => {
                      setNewListName(e.target.value);
                      setNewListError('');
                    }}
                    placeholder="List Name (e.g., Date Night NYC)"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-[#D32323] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newListDesc}
                    onChange={(e) => setNewListDesc(e.target.value)}
                    placeholder="Optional description..."
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-[#D32323] focus:outline-none"
                  />
                </div>
                {newListError && <p className="text-xs text-rose-600">{newListError}</p>}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create & Select List
                  </button>
                </div>
              </form>
            )}

            {customLists.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-zinc-200 p-3 text-center text-xs text-zinc-500">
                No custom lists yet. Click &ldquo;Create List on the Fly&rdquo; above to add one!
              </p>
            ) : (
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {customLists.map((list) => {
                  const isChecked = selectedListIds.includes(list.id);
                  return (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => handleToggleList(list.id)}
                      className={`flex items-center justify-between gap-2.5 rounded-lg border px-3.5 py-2.5 text-left transition-all ${
                        isChecked
                          ? 'border-zinc-900 bg-zinc-900/5 text-zinc-900'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">{list.name}</div>
                        <div className="truncate text-[11px] text-zinc-500 font-mono tabular-nums">
                          {list.items.length} saved
                        </div>
                      </div>
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[2.5]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Personal 1-5 Star User Rating */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-tight text-zinc-800">
                3. Your Personal Rating (1 to 5 Stars)
              </label>
              {userRating > 0 && (
                <button
                  type="button"
                  onClick={() => setUserRating(0)}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
                >
                  <RotateCcw className="h-3 w-3" /> Clear rating
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const active = starValue <= userRating;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setUserRating(starValue)}
                    className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-mono tabular-nums transition-colors ${
                      active
                        ? 'border-amber-500 bg-amber-50 text-amber-800 font-semibold'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        active ? 'fill-amber-500 text-amber-500' : 'text-zinc-300'
                      }`}
                    />
                    <span>{starValue}</span>
                  </button>
                );
              })}
              <span className="ml-2 text-xs text-zinc-500 font-mono tabular-nums">
                {userRating > 0 ? `${userRating}.0 / 5.0` : 'Unrated'}
              </span>
            </div>
          </div>

          {/* Restaurant Note (Synced Across All Lists) */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="restaurant-note-input"
                className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-zinc-800"
              >
                <StickyNote className="h-3.5 w-3.5 text-zinc-500" />
                <span>4. Restaurant Note (Shared Across All Lists)</span>
              </label>
              <span className="text-[11px] text-zinc-500">Included in CSV export</span>
            </div>
            <textarea
              id="restaurant-note-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add favorite dishes, reservation tips, parking info, or who recommended it..."
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#D32323] focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              This note stays attached to <strong>{restaurant.name}</strong> and is immediately viewable in every list it belongs to.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-zinc-200 bg-[#FAF9F6] px-6 py-4">
          <div className="text-xs text-zinc-600 font-mono tabular-nums">
            Selected: <strong>{selectedListIds.length}</strong> list{selectedListIds.length === 1 ? '' : 's'}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              className="rounded-lg bg-[#D32323] px-5 py-2 text-xs font-semibold text-white hover:bg-[#b81d1d] transition-colors whitespace-nowrap shrink-0"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
