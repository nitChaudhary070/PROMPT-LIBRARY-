import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Copy, Share2, Check, ArrowUp, FolderPlus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import SaveToCollectionModal from './SaveToCollectionModal';

import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

interface Prompt {
  id: string;
  title: string;
  prompt_text: string;
  image_url: string;
  category: string;
  tags: string;
  upvote_count?: number;
}

interface PromptCardProps {
  key?: React.Key;
  prompt: Prompt;
  isFavorite?: boolean;
  isUpvoted?: boolean;
  onToggleFavorite?: (id: string) => void;
  onToggleUpvote?: (id: string) => void;
  onRemoveFromCollection?: (id: string) => void;
}

export default function PromptCard({ prompt, isFavorite = false, isUpvoted = false, onToggleFavorite, onToggleUpvote, onRemoveFromCollection }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.prompt_text);
    setCopied(true);
    toast.success('Prompt copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);

    try {
      await updateDoc(doc(db, 'prompts', prompt.id), { copies: increment(1) });
    } catch (error) {
      console.error("Failed to increment copies", error);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: prompt.title,
        text: prompt.prompt_text,
        url: window.location.origin + '/prompt/' + prompt.id,
      }).catch(() => {
        navigator.clipboard.writeText(window.location.origin + '/prompt/' + prompt.id);
        toast.success('Link copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(window.location.origin + '/prompt/' + prompt.id);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to save prompts');
      return;
    }
    if (onToggleFavorite) {
      onToggleFavorite(prompt.id);
      if (!isFavorite) toast.success('Saved to favorites!');
    }
  };

  const handleUpvote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to upvote');
      return;
    }
    if (onToggleUpvote) {
      onToggleUpvote(prompt.id);
    }
  };

  const handleOpenCollection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to save to collections');
      return;
    }
    setIsCollectionModalOpen(true);
  };

  return (
    <>
      <div className="relative group mb-4 break-inside-avoid">
        <Link to={`/prompt/${prompt.id}`} className="block">
          <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-900 transition-colors duration-300">
            <img
              src={prompt.image_url}
              alt={prompt.title}
              className={`w-full h-auto object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
              <div className="flex justify-between items-start">
                <span className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm text-black dark:text-white text-xs font-semibold px-2.5 py-1 rounded-full transition-colors">
                  {prompt.category}
                </span>
                <div className="flex flex-col gap-2">
                  {onRemoveFromCollection ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemoveFromCollection(prompt.id);
                      }}
                      className="p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      title="Remove from Collection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleFavorite}
                        className={`p-2 rounded-full backdrop-blur-sm transition-all ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/90 dark:bg-zinc-900/90 text-black dark:text-white hover:bg-white dark:hover:bg-zinc-800'}`}
                        title="Quick Save"
                      >
                        <Heart className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={handleOpenCollection}
                        className="p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-black dark:text-white hover:bg-white dark:hover:bg-zinc-800 transition-all"
                        title="Save to Collection"
                      >
                        <FolderPlus className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-end">
                <button
                  onClick={handleUpvote}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm transition-all text-sm font-medium ${isUpvoted ? 'bg-orange-500 text-white' : 'bg-white/90 dark:bg-zinc-900/90 text-black dark:text-white hover:bg-white dark:hover:bg-zinc-800'}`}
                  title="Upvote"
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>{prompt.upvote_count || 0}</span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleShare}
                    className="p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-black dark:text-white hover:bg-white dark:hover:bg-zinc-800 transition-all"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-black dark:text-white hover:bg-white dark:hover:bg-zinc-800 transition-all flex items-center gap-1"
                    title="Copy Prompt"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600 dark:text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 px-1">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-zinc-100 line-clamp-2 leading-tight transition-colors">{prompt.title}</h3>
          </div>
        </Link>
      </div>
      <SaveToCollectionModal 
        promptId={prompt.id} 
        isOpen={isCollectionModalOpen} 
        onClose={() => setIsCollectionModalOpen(false)} 
      />
    </>
  );
}
