import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, Copy, Share2, Check, ArrowLeft, ArrowUp, FolderPlus, Trash2, Edit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PromptCard from '../components/PromptCard';
import MasonryGrid from '../components/MasonryGrid';
import AdBanner from '../components/AdBanner';
import { toast } from 'sonner';
import SaveToCollectionModal from '../components/SaveToCollectionModal';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, increment, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export default function PromptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<any>(null);
  const [similarPrompts, setSimilarPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [favoriteDocId, setFavoriteDocId] = useState<string | null>(null);
  const [upvoteDocId, setUpvoteDocId] = useState<string | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', prompt_text: '', category: '', tags: '' });
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    const fetchPromptData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const promptRef = doc(db, 'prompts', id);
        const promptSnap = await getDoc(promptRef);
        
        if (!promptSnap.exists()) {
          setPrompt(null);
          return;
        }
        
        const data = { id: promptSnap.id, ...(promptSnap.data() as any) };
        setPrompt(data);
        setEditForm({ title: data.title, prompt_text: data.prompt_text, category: data.category, tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || '') });

        // Increment views
        try {
          await updateDoc(promptRef, { views: increment(1) });
        } catch (error) {
          console.error("Failed to increment views", error);
        }

        // Fetch similar prompts (same category)
        const similarQ = query(collection(db, 'prompts'), where('category', '==', data.category), limit(10));
        const similarSnap = await getDocs(similarQ);
        const similarData = similarSnap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .filter(d => d.id !== id);
        setSimilarPrompts(similarData);

        // Check favorite and upvote status
        if (user) {
          const favQ = query(collection(db, 'favorites'), where('userId', '==', user.id), where('promptId', '==', id));
          const favSnap = await getDocs(favQ);
          if (!favSnap.empty) {
            setIsFavorite(true);
            setFavoriteDocId(favSnap.docs[0].id);
          }

          const upvQ = query(collection(db, 'upvotes'), where('userId', '==', user.id), where('promptId', '==', id));
          const upvSnap = await getDocs(upvQ);
          if (!upvSnap.empty) {
            setIsUpvoted(true);
            setUpvoteDocId(upvSnap.docs[0].id);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `prompts/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPromptData();
  }, [id, user]);

  const handleCopy = async () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt.prompt_text);
    setCopied(true);
    toast.success('Prompt copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);

    try {
      if (id) {
        await updateDoc(doc(db, 'prompts', id), { copies: increment(1) });
      }
    } catch (error) {
      console.error("Failed to increment copies", error);
    }
  };

  const handleShare = () => {
    if (!prompt) return;
    if (navigator.share) {
      navigator.share({
        title: prompt.title,
        text: prompt.prompt_text,
        url: window.location.href,
      }).catch(() => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleFavorite = async () => {
    if (!user || !id) {
      toast.error('Please login to save prompts');
      return;
    }
    
    try {
      if (isFavorite && favoriteDocId) {
        await deleteDoc(doc(db, 'favorites', favoriteDocId));
        setIsFavorite(false);
        setFavoriteDocId(null);
        toast.success('Removed from favorites');
      } else {
        const docRef = await addDoc(collection(db, 'favorites'), {
          userId: user.id,
          promptId: id,
          createdAt: new Date().toISOString()
        });
        setIsFavorite(true);
        setFavoriteDocId(docRef.id);
        toast.success('Saved to favorites!');
      }
    } catch (error) {
      handleFirestoreError(error, isFavorite ? OperationType.DELETE : OperationType.CREATE, 'favorites');
      toast.error('Error toggling favorite');
    }
  };

  const handleUpvote = async () => {
    if (!user || !id) {
      toast.error('Please login to upvote');
      return;
    }
    
    try {
      const promptRef = doc(db, 'prompts', id);
      if (isUpvoted && upvoteDocId) {
        await deleteDoc(doc(db, 'upvotes', upvoteDocId));
        await updateDoc(promptRef, { upvote_count: increment(-1) });
        setIsUpvoted(false);
        setUpvoteDocId(null);
        setPrompt((prev: any) => ({ ...prev, upvote_count: (prev.upvote_count || 0) - 1 }));
      } else {
        const docRef = await addDoc(collection(db, 'upvotes'), {
          userId: user.id,
          promptId: id,
          createdAt: new Date().toISOString()
        });
        await updateDoc(promptRef, { upvote_count: increment(1) });
        setIsUpvoted(true);
        setUpvoteDocId(docRef.id);
        setPrompt((prev: any) => ({ ...prev, upvote_count: (prev.upvote_count || 0) + 1 }));
      }
    } catch (error) {
      handleFirestoreError(error, isUpvoted ? OperationType.DELETE : OperationType.CREATE, 'upvotes');
      toast.error('Error toggling upvote');
    }
  };

  const handleOpenCollection = () => {
    if (!user) {
      toast.error('Please login to save to collections');
      return;
    }
    setIsCollectionModalOpen(true);
  };

  const handleDelete = async () => {
    if (!isAdmin || !id) return;
    toast('Are you sure you want to delete this prompt?', {
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await deleteDoc(doc(db, 'prompts', id));
            toast.success('Prompt deleted successfully');
            navigate('/');
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `prompts/${id}`);
            toast.error('Failed to delete prompt');
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => {} }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !id) return;
    
    try {
      await updateDoc(doc(db, 'prompts', id), {
        title: editForm.title,
        prompt_text: editForm.prompt_text,
        category: editForm.category,
        tags: typeof editForm.tags === 'string' ? editForm.tags.split(',').map(t => t.trim()).filter(t => t) : editForm.tags
      });
      
      setPrompt({ ...prompt, ...editForm });
      setIsEditing(false);
      toast.success('Prompt updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `prompts/${id}`);
      toast.error('Failed to update prompt');
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
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => window.history.back()} 
          className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        
        {isAdmin && (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-sm font-medium"
            >
              <Edit className="w-4 h-4" />
              {isEditing ? 'Cancel Edit' : 'Edit'}
            </button>
            <button 
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6 dark:text-white">Edit Prompt</h2>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Title</label>
              <input
                type="text"
                value={editForm.title}
                onChange={e => setEditForm({...editForm, title: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Prompt Text</label>
              <textarea
                value={editForm.prompt_text}
                onChange={e => setEditForm({...editForm, prompt_text: e.target.value})}
                rows={4}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Category</label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={e => setEditForm({...editForm, category: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={e => setEditForm({...editForm, tags: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 rounded-xl font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      ) : (
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
              <div className="flex gap-2 flex-wrap justify-end">
                <button
                  onClick={handleUpvote}
                  className={`flex items-center gap-1.5 p-3 rounded-full transition-colors font-medium ${isUpvoted ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white'}`}
                  title="Upvote"
                >
                  <ArrowUp className="w-5 h-5" />
                  <span>{prompt.upvote_count || 0}</span>
                </button>
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
                  title="Quick Save"
                >
                  <Heart className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={handleOpenCollection}
                  className="p-3 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                  title="Save to Collection"
                >
                  <FolderPlus className="w-5 h-5 dark:text-white" />
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
      )}

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

      {prompt && (
        <SaveToCollectionModal 
          promptId={prompt.id} 
          isOpen={isCollectionModalOpen} 
          onClose={() => setIsCollectionModalOpen(false)} 
        />
      )}
    </div>
  );
}
