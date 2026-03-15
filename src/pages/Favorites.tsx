import React, { useState, useEffect } from 'react';
import PromptCard from '../components/PromptCard';
import MasonryGrid from '../components/MasonryGrid';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Favorites() {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, user, isLoading } = useAuth();

  useEffect(() => {
    if (token) {
      fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setPrompts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching favorites:', err);
        setLoading(false);
      });
    } else if (!isLoading) {
      setLoading(false);
    }
  }, [token, isLoading]);

  const toggleFavorite = async (id: number) => {
    if (!token) return;
    
    try {
      await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPrompts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (isLoading) {
    return <div className="min-h-[80vh] flex items-center justify-center dark:text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8 dark:text-white transition-colors">Saved Prompts</h1>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-zinc-500 py-12">
          You haven't saved any prompts yet.
        </div>
      ) : (
        <MasonryGrid>
          {prompts.map(prompt => (
            <PromptCard 
              key={prompt.id} 
              prompt={prompt} 
              isFavorite={true}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </MasonryGrid>
      )}
    </div>
  );
}
