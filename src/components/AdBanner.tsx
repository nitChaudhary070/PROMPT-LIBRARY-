import React, { useState, useEffect } from 'react';

export default function AdBanner() {
  const [showAds, setShowAds] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setShowAds(data.show_ads === '1');
        setLoading(false);
      })
      .catch(() => {
        setShowAds(true); // Default to true on error
        setLoading(false);
      });
  }, []);

  if (loading || !showAds) return null;

  return (
    <div className="w-full bg-gray-50 border border-gray-200 border-dashed rounded-xl p-4 my-8 flex flex-col items-center justify-center text-gray-400 min-h-[120px] transition-colors hover:bg-gray-100">
      <span className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-400">Advertisement</span>
      <p className="text-sm text-center max-w-md">
        Place your Google AdSense or other ad network script here.
        <br/>
        <span className="text-xs opacity-70 mt-1 block">(This is a placeholder component)</span>
      </p>
    </div>
  );
}
