import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Copy, Share2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Prompt {
  id: number;
  title: string;
  prompt_text: string;
  image_url: string;
  category: string;
  tags: string;
}

interface PromptCardProps {
  prompt: Prompt;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
}

export default function PromptCard({ prompt, isFavorite = false, onToggleFavorite }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.prompt_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: prompt.title,
        text: prompt.prompt_text,
        url: window.location.origin + '/prompt/' + prompt.id,
      });
    } else {
      navigator.clipboard.writeText(window.location.origin + '/prompt/' + prompt.id);
      alert('Link copied to clipboard!');
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert('Please login to save prompts');
      return;
    }
    if (onToggleFavorite) {
      onToggleFavorite(prompt.id);
    }
  };

  return (
    <div className="relative group mb-4 break-inside-avoid">
      <Link to={`/prompt/${prompt.id}`} className="block">
        <div className="relative rounded-2xl overflow-hidden bg-gray-100">
          <img
            src={prompt.image_url}
            alt={prompt.title}
            className={`w-full h-auto object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
            <div className="flex justify-between items-start">
              <span className="bg-white/90 backdrop-blur-sm text-black text-xs font-semibold px-2.5 py-1 rounded-full">
                {prompt.category}
              </span>
              <button
                onClick={handleFavorite}
                className={`p-2 rounded-full backdrop-blur-sm transition-all ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/90 text-black hover:bg-white'}`}
              >
                <Heart className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={handleShare}
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-black hover:bg-white transition-all"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-black hover:bg-white transition-all flex items-center gap-1"
                title="Copy Prompt"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-2 px-1">
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">{prompt.title}</h3>
        </div>
      </Link>
    </div>
  );
}
