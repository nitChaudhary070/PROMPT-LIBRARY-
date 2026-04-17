import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { Clock, LayoutGrid } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Categories() {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [recentCategories, setRecentCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const promptsRef = collection(db, 'prompts');
    
    // Listen for all categories
    const unsubscribeAll = onSnapshot(promptsRef, (snap) => {
      const cats = new Set<string>();
      snap.forEach(doc => {
        const cat = doc.data().category;
        if (cat) cats.add(cat);
      });
      setCategories(Array.from(cats).sort());
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'prompts');
      setLoading(false);
    });

    // Listen for recent categories (based on latest prompts)
    const recentQuery = query(promptsRef, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeRecent = onSnapshot(recentQuery, (snap) => {
      const cats = new Set<string>();
      snap.forEach(doc => {
        const cat = doc.data().category;
        if (cat && cats.size < 8) cats.add(cat);
      });
      setRecentCategories(Array.from(cats));
    });

    return () => {
      unsubscribeAll();
      unsubscribeRecent();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Recent Categories Section */}
      {isAdmin && recentCategories.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold dark:text-white transition-colors">Recent Categories</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {recentCategories.map((category, index) => (
              <Link 
                key={`recent-${index}`} 
                to={`/search?category=${encodeURIComponent(category)}`}
                className="px-6 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:border-black dark:hover:border-white hover:shadow-md transition-all"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Categories Section */}
      <div className="flex items-center gap-2 mb-8">
        <LayoutGrid className="w-6 h-6 text-blue-500" />
        <h1 className="text-3xl font-bold dark:text-white transition-colors">All Categories</h1>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((category, index) => (
          <Link 
            key={index} 
            to={`/search?category=${encodeURIComponent(category)}`}
            className="group relative h-48 rounded-3xl overflow-hidden bg-gray-100 dark:bg-zinc-900 flex items-center justify-center shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/20 dark:from-black/80 dark:to-black/40 group-hover:scale-110 transition-transform duration-700"></div>
            <h2 className="relative z-10 text-white text-xl font-bold text-center px-4 group-hover:scale-110 transition-transform duration-300">
              {category}
            </h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
