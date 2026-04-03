import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export default function Categories() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'prompts'));
        const cats = new Set<string>();
        snap.forEach(doc => {
          const cat = doc.data().category;
          if (cat) cats.add(cat);
        });
        setCategories(Array.from(cats).sort());
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'prompts');
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8 dark:text-white transition-colors">Categories</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((category, index) => (
          <Link 
            key={index} 
            to={`/search?category=${encodeURIComponent(category)}`}
            className="group relative h-48 rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-900 flex items-center justify-center shadow-sm hover:shadow-md transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/20 dark:from-black/80 dark:to-black/40 group-hover:scale-105 transition-transform duration-500"></div>
            <h2 className="relative z-10 text-white text-xl font-bold text-center px-4">
              {category}
            </h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
