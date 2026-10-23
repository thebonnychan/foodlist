import React, { useState, useEffect } from 'react';
import { Utensils } from 'lucide-react';
import { Restaurant } from '../types';

interface RestaurantThumbProps {
  restaurant: Restaurant;
  sizeClass?: string;
}

export function buildYelpPreviewThumbUrl(restaurant: Pick<Restaurant, 'name' | 'city' | 'state'>): string {
  const q = `${restaurant.name} ${restaurant.city} ${restaurant.state} yelp restaurant`.trim();
  return `https://tse2.mm.bing.net/th?q=${encodeURIComponent(q)}&w=160&h=160&c=7&rs=1&p=0`;
}

function sanitizeClientThumbUrl(url: string | undefined, fallback: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed || trimmed.includes('yelp.com') || trimmed.includes('yelpcdn.com')) {
    return fallback;
  }
  return trimmed;
}

export const RestaurantThumb: React.FC<RestaurantThumbProps> = ({
  restaurant,
  sizeClass = 'h-14 w-14 sm:h-16 sm:w-16'
}) => {
  const dynamicFallbackUrl = buildYelpPreviewThumbUrl(restaurant);
  const initialSrc = sanitizeClientThumbUrl(restaurant.imageUrl, dynamicFallbackUrl);

  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [hasFailedAll, setHasFailedAll] = useState<boolean>(false);

  useEffect(() => {
    const nextFallback = buildYelpPreviewThumbUrl(restaurant);
    setImgSrc(sanitizeClientThumbUrl(restaurant.imageUrl, nextFallback));
    setHasFailedAll(false);
  }, [restaurant.id, restaurant.name, restaurant.city, restaurant.state, restaurant.imageUrl]);

  const handleImageError = () => {
    if (imgSrc !== dynamicFallbackUrl) {
      setImgSrc(dynamicFallbackUrl);
    } else {
      setHasFailedAll(true);
    }
  };

  return (
    <a
      href={restaurant.yelpUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${restaurant.name} on Yelp`}
      className={`relative block ${sizeClass} shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 group`}
    >
      {!hasFailedAll ? (
        <img
          src={imgSrc}
          alt={restaurant.name}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={handleImageError}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#FAF9F6] text-zinc-400">
          <Utensils className="h-5 w-5" />
        </div>
      )}
    </a>
  );
};
