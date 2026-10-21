import { Restaurant, SavedList, SharedListPayload } from '../types';

function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates an RFC-4180 CSV string with the exact 7 required columns:
 * 1. Restaurant Name
 * 2. Type of Restaurant
 * 3. Yelp Page Link
 * 4. User Rating
 * 5. Yelp Rating
 * 6. Notes
 * 7. Will Go Back
 */
export function generateRestaurantsCsv(restaurants: Restaurant[]): string {
  const headers = [
    'Restaurant Name',
    'Type of Restaurant',
    'Yelp Page Link',
    'User Rating',
    'Yelp Rating',
    'Notes',
    'Will Go Back'
  ];

  const rows = restaurants.map((r) => [
    escapeCsvCell(r.name),
    escapeCsvCell(r.cuisineType),
    escapeCsvCell(r.yelpUrl),
    escapeCsvCell(r.userRating > 0 ? `${r.userRating}/5` : 'Unrated'),
    escapeCsvCell(`${r.yelpRating.toFixed(1)}/5`),
    escapeCsvCell(r.notes || ''),
    escapeCsvCell(r.willGoBack || '')
  ]);

  return [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function downloadCsvFile(csvContent: string, filename: string): void {
  const bom = '\uFEFF'; // UTF-8 BOM for clean Excel / Google Sheets import
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  link.href = url;
  link.setAttribute('download', `${safeName || 'yurfat-list'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Encodes a list and its restaurants into a self-contained base64 URL share token
 * so users can share lists without needing an account.
 */
export function encodeListShareLink(
  list: SavedList,
  restaurantsMap: Record<string, Restaurant>
): string {
  const payload: SharedListPayload = {
    listName: list.name,
    listDescription: list.description,
    exportedAt: new Date().toISOString(),
    restaurants: list.items
      .map((item) => {
        const r = restaurantsMap[item.restaurantId];
        if (!r) return null;
        return {
          restaurant: r,
          addedAt: item.addedAt
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  };

  const jsonStr = JSON.stringify(payload);
  const encoded = btoa(encodeURIComponent(jsonStr));
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?share=${encoded}`;
}

export function decodeListShareToken(token: string): SharedListPayload | null {
  try {
    const cleanToken = token.includes('?share=')
      ? new URL(token).searchParams.get('share') || token
      : token.trim();
    const jsonStr = decodeURIComponent(atob(cleanToken));
    const parsed = JSON.parse(jsonStr) as SharedListPayload;
    if (!parsed || !parsed.listName || !Array.isArray(parsed.restaurants)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
