import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { Search as SearchIcon } from 'lucide-react';
import PromptCard from '../components/PromptCard';
import MasonryGrid from '../components/MasonryGrid';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query as firestoreQuery, getDocs, where, addDoc, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  
  const [searchInput, setSearchInput] = useState(query);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [allPrompts, setAllPrompts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useInView();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [upvotes, setUpvotes] = useState<Set<string>>(new Set());
  const [favoriteDocs, setFavoriteDocs] = useState<Record<string, string>>({});
  const [upvoteDocs, setUpvoteDocs] = useState<Record<string, string>>({});

  // Reset state when search params change
  useEffect(() => {
    setPrompts([]);
    setAllPrompts([]);
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

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      let q = firestoreQuery(collection(db, 'prompts'));
      if (category) {
        q = firestoreQuery(q, where('category', '==', category));
      }
      
      const snap = await getDocs(q);
      let fetchedPrompts = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      if (query) {
        const lowerQuery = query.toLowerCase();
        fetchedPrompts = fetchedPrompts.filter((p: any) => 
          (p.title && p.title.toLowerCase().includes(lowerQuery)) ||
          (p.description && p.description.toLowerCase().includes(lowerQuery)) ||
          (p.tags && p.tags.some((t: string) => t.toLowerCase().includes(lowerQuery)))
        );
      }

      setAllPrompts(fetchedPrompts);
      setPrompts(fetchedPrompts.slice(0, 20));
      setHasMore(fetchedPrompts.length > 20);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'prompts');
    } finally {
      setLoading(false);
    }
  }, [query, category]);

  useEffect(() => {
    if (page === 1) {
      fetchPrompts();
    }
  }, [fetchPrompts, page]);

  useEffect(() => {
    if (inView && !loading && hasMore) {
      setPage(prev => {
        const nextPage = prev + 1;
        const nextPrompts = allPrompts.slice(0, nextPage * 20);
        setPrompts(nextPrompts);
        setHasMore(allPrompts.length > nextPrompts.length);
        return nextPage;
      });
    }
  }, [inView, loading, hasMore, allPrompts]);

  useEffect(() => {
    if (user) {
      const fetchUserInteractions = async () => {
        try {
          // Fetch favorites
          const favQ = firestoreQuery(collection(db, 'favorites'), where('userId', '==', user.id));
          const favSnapshot = await getDocs(favQ);
          const favSet = new Set<string>();
          const favDocMap: Record<string, string> = {};
          favSnapshot.forEach(doc => {
            const data = doc.data();
            favSet.add(data.promptId);
            favDocMap[data.promptId] = doc.id;
          });
          setFavorites(favSet);
          setFavoriteDocs(favDocMap);

          // Fetch upvotes
          const upvQ = firestoreQuery(collection(db, 'upvotes'), where('userId', '==', user.id));
          const upvSnapshot = await getDocs(upvQ);
          const upvSet = new Set<string>();
          const upvDocMap: Record<string, string> = {};
          upvSnapshot.forEach(doc => {
            const data = doc.data();
            upvSet.add(data.promptId);
            upvDocMap[data.promptId] = doc.id;
          });
          setUpvotes(upvSet);
          setUpvoteDocs(upvDocMap);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'favorites/upvotes');
        }
      };
      fetchUserInteractions();
    } else {
      setFavorites(new Set());
      setUpvotes(new Set());
      setFavoriteDocs({});
      setUpvoteDocs({});
    }
  }, [user]);

  const toggleFavorite = async (id: string) => {
    if (!user) return;
    
    const isFav = favorites.has(id);
    
    try {
      if (isFav) {
        const docId = favoriteDocs[id];
        if (docId) {
          await deleteDoc(doc(db, 'favorites', docId));
          setFavorites(prev => {
            const newFavs = new Set(prev);
            newFavs.delete(id);
            return newFavs;
          });
          setFavoriteDocs(prev => {
            const newDocs = { ...prev };
            delete newDocs[id];
            return newDocs;
          });
        }
      } else {
        const docRef = await addDoc(collection(db, 'favorites'), {
          userId: user.id,
          promptId: id,
          createdAt: new Date().toISOString()
        });
        setFavorites(prev => new Set(prev).add(id));
        setFavoriteDocs(prev => ({ ...prev, [id]: docRef.id }));
      }
    } catch (error) {
      handleFirestoreError(error, isFav ? OperationType.DELETE : OperationType.CREATE, 'favorites');
    }
  };

  const toggleUpvote = async (id: string) => {
    if (!user) return;
    
    const isUpvoted = upvotes.has(id);
    
    try {
      const promptRef = doc(db, 'prompts', id);
      
      if (isUpvoted) {
        const docId = upvoteDocs[id];
        if (docId) {
          await deleteDoc(doc(db, 'upvotes', docId));
          await updateDoc(promptRef, { upvote_count: increment(-1) });
          
          setUpvotes(prev => {
            const newUpvotes = new Set(prev);
            newUpvotes.delete(id);
            return newUpvotes;
          });
          setUpvoteDocs(prev => {
            const newDocs = { ...prev };
            delete newDocs[id];
            return newDocs;
          });
        }
      } else {
        const docRef = await addDoc(collection(db, 'upvotes'), {
          userId: user.id,
          promptId: id,
          createdAt: new Date().toISOString()
        });
        await updateDoc(promptRef, { upvote_count: increment(1) });
        
        setUpvotes(prev => new Set(prev).add(id));
        setUpvoteDocs(prev => ({ ...prev, [id]: docRef.id }));
      }

      setPrompts(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, upvote_count: (p.upvote_count || 0) + (isUpvoted ? -1 : 1) };
        }
        return p;
      }));
      setAllPrompts(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, upvote_count: (p.upvote_count || 0) + (isUpvoted ? -1 : 1) };
        }
        return p;
      }));
    } catch (error) {
      handleFirestoreError(error, isUpvoted ? OperationType.DELETE : OperationType.CREATE, 'upvotes');
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
            isUpvoted={upvotes.has(prompt.id)}
            onToggleFavorite={toggleFavorite}
            onToggleUpvote={toggleUpvote}
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
