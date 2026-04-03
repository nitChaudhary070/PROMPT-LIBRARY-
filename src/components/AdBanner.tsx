import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export default function AdBanner() {
  const [showAds, setShowAds] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'show_ads'),
      (docSnap) => {
        if (docSnap.exists()) {
          setShowAds(docSnap.data().value === '1');
        } else {
          setShowAds(true); // Default to true if not set
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/show_ads');
        setShowAds(true); // Default to true on error
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading || !showAds) return null;

  return (
    <div className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 border-dashed rounded-xl p-4 my-8 flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 min-h-[120px] transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800/80">
      <span className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-400 dark:text-zinc-500">Advertisement</span>
      <p className="text-sm text-center max-w-md">
        Place your Google AdSense or other ad network script here.
        <br/>
        <span className="text-xs opacity-70 mt-1 block">(This is a placeholder component)</span>
      </p>
    </div>
  );
}
