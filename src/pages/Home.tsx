import React, { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { Flame, Clock } from 'lucide-react';
import PromptCard from '../components/PromptCard';
import MasonryGrid from '../components/MasonryGrid';
import AdBanner from '../components/AdBanner';
import SkeletonCard from '../components/SkeletonCard';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where, addDoc, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export default function Home() {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [pageLimit, setPageLimit] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'latest' | 'trending'>('latest');
  const { ref, inView } = useInView();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [upvotes, setUpvotes] = useState<Set<string>>(new Set());
  const [favoriteDocs, setFavoriteDocs] = useState<Record<string, string>>({});
  const [upvoteDocs, setUpvoteDocs] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    const promptsRef = collection(db, 'prompts');
    let q;
    
    if (sort === 'trending') {
      q = query(promptsRef, orderBy('upvote_count', 'desc'), orderBy('createdAt', 'desc'), limit(pageLimit));
    } else {
      q = query(promptsRef, orderBy('createdAt', 'desc'), limit(pageLimit));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newPrompts = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setPrompts(newPrompts);
      setHasMore(querySnapshot.docs.length === pageLimit);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching prompts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sort, pageLimit]);

  useEffect(() => {
    if (inView && !loading && hasMore) {
      setPageLimit(prev => prev + 20);
    }
  }, [inView, loading, hasMore]);

  useEffect(() => {
    if (user) {
      const fetchUserInteractions = async () => {
        try {
          // Fetch favorites
          const favQ = query(collection(db, 'favorites'), where('userId', '==', user.id));
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
          const upvQ = query(collection(db, 'upvotes'), where('userId', '==', user.id));
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
    } catch (error) {
      handleFirestoreError(error, isUpvoted ? OperationType.DELETE : OperationType.CREATE, 'upvotes');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AdBanner />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Discover Prompts</h1>
        <div className="flex bg-gray-100 dark:bg-zinc-900 p-1 rounded-full">
          <button
            onClick={() => setSort('latest')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${sort === 'latest' ? 'bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white' : 'text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'}`}
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Latest</span>
          </button>
          <button
            onClick={() => setSort('trending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${sort === 'trending' ? 'bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white' : 'text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'}`}
          >
            <Flame className="w-4 h-4" />
            <span className="hidden sm:inline">Trending</span>
          </button>
        </div>
      </div>

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
        {loading && Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={`skeleton-${i}`} />
        ))}
      </MasonryGrid>
      
      {hasMore && !loading && (
        <div ref={ref} className="h-10" />
      )}
    </div>
  );
}
