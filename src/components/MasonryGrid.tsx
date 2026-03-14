import React from 'react';

interface MasonryGridProps {
  children: React.ReactNode;
}

export default function MasonryGrid({ children }: MasonryGridProps) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
      {children}
    </div>
  );
}
