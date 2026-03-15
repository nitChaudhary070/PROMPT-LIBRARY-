import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, Copy, Share2, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PromptCard from '../components/PromptCard';
import MasonryGrid from '../components/MasonryGrid';
import AdBanner from '../components/AdBanner';

export default function PromptDetail() {
  const { id } = useParams<{ id: string }>();
  const [prompt, setPrompt] = useState<any>(null);
  const [similarPrompts, setSimilarPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const { user, token } = useAuth();

  useEffect(() => {
    const fetchPromptData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/prompts/${id}`);
        if (!res.ok) throw new Error('Prompt not found');
        const data = await res.json();
        setPrompt(data);

        // Track view
        fetch(`/api/prompts/${id}/view`, { method: 'POST' }).catch(console.error);

        // Fetch similar prompts
        const similarRes = await fetch(`/api/prompts/${id}/similar`);
        const similarData = await similarRes.json();
        setSimilarPrompts(similarData);

        // Check favorite status
        if (token) {
          const favRes = await fetch(`/api/favorites/check/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const favData = await favRes.json();
          setIsFavorite(favData.isFavorite);
        }
      } catch (error) {
        console.error('Error fetching prompt:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromptData();
  }, [id, token]);

  const handleCopy = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt.prompt_text);
    setCopied(true);
    
    // Track copy
    fetch(`/api/prompts/${id}/copy`, { method: 'POST' }).catch(console.error);
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!prompt) return;
    if (navigator.share) {
      navigator.share({
        title: prompt.title,
        text: prompt.prompt_text,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleFavorite = async () => {
    if (!user || !token) {
      alert('Please login to save prompts');
      return;
    }
    
    const method = isFavorite ? 'DELETE' : 'POST';
    
    try {
      await fetch(`/api/favorites/${id}`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Prompt not found</h2>
        <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button 
        onClick={() => window.history.back()} 
        className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row mb-12 transition-colors duration-300">
        {/* Image Section */}
        <div className="md:w-1/2 bg-gray-100 dark:bg-zinc-800 flex items-center justify-center p-4 transition-colors">
          <img 
            src={prompt.image_url} 
            alt={prompt.title} 
            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-md"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Details Section */}
        <div className="md:w-1/2 p-8 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight transition-colors">{prompt.title}</h1>
            <div className="flex gap-2">
              <button 
                onClick={handleShare}
                className="p-3 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                title="Share"
              >
                <Share2 className="w-5 h-5 dark:text-white" />
              </button>
              <button 
                onClick={handleFavorite}
                className={`p-3 rounded-full transition-colors ${isFavorite ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white'}`}
                title="Save"
              >
                <Heart className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          <div className="mb-6">
            <span className="inline-block bg-black dark:bg-white text-white dark:text-black text-sm font-semibold px-3 py-1 rounded-full mb-4 transition-colors">
              {prompt.category}
            </span>
          </div>

          <div className="flex-grow">
            <h3 className="text-lg font-semibold mb-2 dark:text-white">Prompt</h3>
            <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-gray-100 dark:border-zinc-700 relative group transition-colors">
              <p className="text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                {prompt.prompt_text}
              </p>
              <button 
                onClick={handleCopy}
                className="absolute top-4 right-4 p-2 bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-gray-600 dark:text-zinc-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AdBanner />

      {similarPrompts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6 dark:text-white">More like this</h2>
          <MasonryGrid>
            {similarPrompts.map(p => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </MasonryGrid>
        </div>
      )}
    </div>
  );
}
