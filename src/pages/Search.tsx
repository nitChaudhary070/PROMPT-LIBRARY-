import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { Search as SearchIcon } from 'lucide-react';
import PromptCard from '../components/PromptCard';
import MasonryGrid from '../components/MasonryGrid';
import { useAuth } from '../context/AuthContext';

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  
  const [searchInput, setSearchInput] = useState(query);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useInView();
  const { token } = useAuth();
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  // Reset state when search params change
  useEffect(() => {
    setPrompts([]);
    setPage(1);
    setHasMore(true);
    setSearchInput(query);
  }, [query, category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    } else {
      navigate(`/search`);
    }
  };

  const fetchPrompts = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      let url = `/api/prompts?page=${currentPage}&limit=20`;
      if (query) url += `&search=${encodeURIComponent(query)}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.prompts.length === 0) {
        setHasMore(false);
      } else {
        setPrompts(prev => {
          if (currentPage === 1) return data.prompts;
          const newPrompts = data.prompts.filter((p: any) => !prev.some(existing => existing.id === p.id));
          return [...prev, ...newPrompts];
        });
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  }, [query, category]);

  useEffect(() => {
    if (page === 1) {
      fetchPrompts(1);
    }
  }, [fetchPrompts, page]);

  useEffect(() => {
    if (inView && !loading && hasMore) {
      setPage(prev => {
        const nextPage = prev + 1;
        fetchPrompts(nextPage);
        return nextPage;
      });
    }
  }, [inView, loading, hasMore, fetchPrompts]);

  useEffect(() => {
    if (token) {
      fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setFavorites(new Set(data.map((p: any) => p.id)));
      });
    }
  }, [token]);

  const toggleFavorite = async (id: number) => {
    if (!token) return;
    
    const isFav = favorites.has(id);
    const method = isFav ? 'DELETE' : 'POST';
    
    try {
      await fetch(`/api/favorites/${id}`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFavorites(prev => {
        const newFavs = new Set(prev);
        if (isFav) newFavs.delete(id);
        else newFavs.add(id);
        return newFavs;
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <form onSubmit={handleSearchSubmit} className="mb-10 max-w-2xl mx-auto relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-24 py-4 border border-gray-200 dark:border-zinc-800 rounded-2xl leading-5 bg-gray-50 dark:bg-zinc-900 placeholder-gray-500 dark:placeholder-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-lg transition-all shadow-sm dark:text-white"
          placeholder="Search prompts, tags, categories..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="absolute inset-y-2 right-2 px-6 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors">
          Search
        </button>
      </form>

      <h1 className="text-3xl font-bold mb-8 text-center sm:text-left dark:text-white transition-colors">
        {query ? `Search results for "${query}"` : category ? `Category: ${category}` : 'Discover Prompts'}
      </h1>
      
      {prompts.length === 0 && !loading && (
        <div className="text-center text-gray-500 dark:text-zinc-500 py-12">
          No prompts found. Try a different search term or category.
        </div>
      )}

      <MasonryGrid>
        {prompts.map(prompt => (
          <PromptCard 
            key={prompt.id} 
            prompt={prompt} 
            isFavorite={favorites.has(prompt.id)}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </MasonryGrid>
      
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
        </div>
      )}
      
      {hasMore && !loading && prompts.length > 0 && (
        <div ref={ref} className="h-10" />
      )}
    </div>
  );
}
