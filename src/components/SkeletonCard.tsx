import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="relative group mb-4 break-inside-avoid">
      <div className="relative rounded-2xl overflow-hidden bg-gray-200 dark:bg-zinc-800 animate-pulse" style={{ height: `${Math.floor(Math.random() * (400 - 200 + 1) + 200)}px` }}>
      </div>
      <div className="mt-2 px-1 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse w-1/2"></div>
      </div>
    </div>
  );
}
