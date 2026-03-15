import React, { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import PromptCard from '../components/PromptCard';
import MasonryGrid from '../components/MasonryGrid';
import AdBanner from '../components/AdBanner';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useInView();
  const { token } = useAuth();
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const fetchPrompts = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prompts?page=${currentPage}&limit=20`);
      const data = await res.json();
      
      if (data.prompts.length === 0) {
        setHasMore(false);
      } else {
        setPrompts(prev => {
          const newPrompts = data.prompts.filter((p: any) => !prev.some(existing => existing.id === p.id));
          return [...prev, ...newPrompts];
        });
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
      <AdBanner />

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
      
      {hasMore && !loading && (
        <div ref={ref} className="h-10" />
      )}
    </div>
  );
}
