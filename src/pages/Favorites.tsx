import React, { useState, useEffect } from 'react';
import { Folder, Heart, Trash2, ArrowLeft } from 'lucide-react';
import PromptCard from '../components/PromptCard';
import MasonryGrid from '../components/MasonryGrid';
import SkeletonCard from '../components/SkeletonCard';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, updateDoc, increment, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export default function Favorites() {
  const [activeTab, setActiveTab] = useState<'saves' | 'collections'>('saves');
  const [prompts, setPrompts] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isLoading } = useAuth();
  const [upvotes, setUpvotes] = useState<Set<string>>(new Set());
  const [upvoteDocs, setUpvoteDocs] = useState<Record<string, string>>({});
  const [favoriteDocs, setFavoriteDocs] = useState<Record<string, string>>({});
  const [collectionPromptDocs, setCollectionPromptDocs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchData();
    } else if (!isLoading) {
      setLoading(false);
    }
  }, [user, isLoading, activeTab, selectedCollection]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeTab === 'saves' && !selectedCollection) {
        const favQ = query(collection(db, 'favorites'), where('userId', '==', user.id));
        const favSnap = await getDocs(favQ);
        
        const promptIds = favSnap.docs.map(d => d.data().promptId);
        const favDocMap: Record<string, string> = {};
        favSnap.docs.forEach(d => favDocMap[d.data().promptId] = d.id);
        setFavoriteDocs(favDocMap);

        const fetchedPrompts = [];
        for (const pid of promptIds) {
          const pDoc = await getDoc(doc(db, 'prompts', pid));
          if (pDoc.exists()) {
            fetchedPrompts.push({ id: pDoc.id, ...(pDoc.data() as any) });
          }
        }
        setPrompts(fetchedPrompts);
      } else if (activeTab === 'collections' && !selectedCollection) {
        const colQ = query(collection(db, 'collections'), where('userId', '==', user.id));
        const colSnap = await getDocs(colQ);
        
        const cols = [];
        for (const cDoc of colSnap.docs) {
          const cpQ = query(collection(db, 'collection_prompts'), where('collectionId', '==', cDoc.id));
          const cpSnap = await getDocs(cpQ);
          cols.push({ id: cDoc.id, ...(cDoc.data() as any), prompt_count: cpSnap.size });
        }
        setCollections(cols);
      } else if (selectedCollection) {
        const cpQ = query(collection(db, 'collection_prompts'), where('collectionId', '==', selectedCollection.id));
        const cpSnap = await getDocs(cpQ);
        
        const promptIds = cpSnap.docs.map(d => d.data().promptId);
        const cpDocMap: Record<string, string> = {};
        cpSnap.docs.forEach(d => cpDocMap[d.data().promptId] = d.id);
        setCollectionPromptDocs(cpDocMap);

        const fetchedPrompts = [];
        for (const pid of promptIds) {
          const pDoc = await getDoc(doc(db, 'prompts', pid));
          if (pDoc.exists()) {
            fetchedPrompts.push({ id: pDoc.id, ...(pDoc.data() as any) });
          }
        }
        setPrompts(fetchedPrompts);
      }

      // Fetch upvotes
      const upvQ = query(collection(db, 'upvotes'), where('userId', '==', user.id));
      const upvSnap = await getDocs(upvQ);
      const upvSet = new Set<string>();
      const upvDocMap: Record<string, string> = {};
      upvSnap.forEach(d => {
        upvSet.add(d.data().promptId);
        upvDocMap[d.data().promptId] = d.id;
      });
      setUpvotes(upvSet);
      setUpvoteDocs(upvDocMap);

    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'favorites/collections');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (id: string) => {
    if (!user) return;
    
    try {
      if (activeTab === 'saves' && !selectedCollection) {
        const docId = favoriteDocs[id];
        if (docId) {
          await deleteDoc(doc(db, 'favorites', docId));
          setPrompts(prev => prev.filter(p => p.id !== id));
          toast.success('Removed from favorites');
        }
      } else if (selectedCollection) {
        // Removing from collection
        const docId = collectionPromptDocs[id];
        if (docId) {
          await deleteDoc(doc(db, 'collection_prompts', docId));
          setPrompts(prev => prev.filter(p => p.id !== id));
          toast.success('Removed from collection');
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'favorites/collection_prompts');
      toast.error('Error removing prompt');
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
      toast.error('Error toggling upvote');
    }
  };

  const deleteCollection = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;

    toast('Are you sure you want to delete this collection?', {
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await deleteDoc(doc(db, 'collections', id));
            // Also delete collection_prompts
            const cpQ = query(collection(db, 'collection_prompts'), where('collectionId', '==', id));
            const cpSnap = await getDocs(cpQ);
            for (const d of cpSnap.docs) {
              await deleteDoc(doc(db, 'collection_prompts', d.id));
            }
            setCollections(prev => prev.filter(c => c.id !== id));
            toast.success('Collection deleted');
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, 'collections');
            toast.error('Failed to delete collection');
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      }
    });
  };

  if (isLoading) {
    return <div className="min-h-[80vh] flex items-center justify-center dark:text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {selectedCollection ? (
        <div className="mb-8">
          <button 
            onClick={() => setSelectedCollection(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collections
          </button>
          <h1 className="text-3xl font-bold dark:text-white flex items-center gap-3">
            <Folder className="w-8 h-8 text-gray-400" />
            {selectedCollection.name}
          </h1>
        </div>
      ) : (
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-6 dark:text-white transition-colors">Saved Prompts</h1>
          <div className="flex border-b border-gray-200 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab('saves')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'saves' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white'}`}
            >
              Quick Saves
            </button>
            <button
              onClick={() => setActiveTab('collections')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'collections' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white'}`}
            >
              Collections
            </button>
          </div>
        </div>
      )}
      
      {loading ? (
        <MasonryGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))}
        </MasonryGrid>
      ) : activeTab === 'collections' && !selectedCollection ? (
        collections.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-zinc-500 py-12">
            <Folder className="w-12 h-12 mx-auto mb-4 opacity-20" />
            You haven't created any collections yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {collections.map(collection => (
              <div 
                key={collection.id}
                onClick={() => setSelectedCollection(collection)}
                className="bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 cursor-pointer hover:border-gray-300 dark:hover:border-zinc-700 transition-all group relative"
              >
                <Folder className="w-8 h-8 text-gray-400 mb-4" />
                <h3 className="font-semibold text-lg dark:text-white mb-1">{collection.name}</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400">{collection.prompt_count} prompts</p>
                
                <button 
                  onClick={(e) => deleteCollection(e, collection.id)}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        prompts.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-zinc-500 py-12">
            <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
            No prompts found here.
          </div>
        ) : (
          <MasonryGrid>
            {prompts.map(prompt => (
              <PromptCard 
                key={prompt.id} 
                prompt={prompt} 
                isFavorite={activeTab === 'saves' && !selectedCollection}
                isUpvoted={upvotes.has(prompt.id)}
                onToggleFavorite={activeTab === 'saves' && !selectedCollection ? toggleFavorite : undefined}
                onRemoveFromCollection={selectedCollection ? toggleFavorite : undefined}
                onToggleUpvote={toggleUpvote}
              />
            ))}
          </MasonryGrid>
        )
      )}
    </div>
  );
}
