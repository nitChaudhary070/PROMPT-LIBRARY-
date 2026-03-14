import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Categories() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Categories</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((category, index) => (
          <Link 
            key={index} 
            to={`/search?category=${encodeURIComponent(category)}`}
            className="group relative h-48 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center shadow-sm hover:shadow-md transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/20 group-hover:scale-105 transition-transform duration-500"></div>
            <h2 className="relative z-10 text-white text-xl font-bold text-center px-4">
              {category}
            </h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
