import React, { useState, useEffect } from 'react';
import { X, Plus, Folder } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface SaveToCollectionModalProps {
  promptId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SaveToCollectionModal({ promptId, isOpen, onClose }: SaveToCollectionModalProps) {
  const [collections, setCollections] = useState<any[]>([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      fetchCollections();
    }
  }, [isOpen, user]);

  const fetchCollections = async () => {
    try {
      const q = query(collection(db, 'collections'), where('userId', '==', user?.id));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setCollections(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'collections');
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim() || !user) return;

    try {
      const newCollection = {
        userId: user.id,
        name: newCollectionName,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'collections'), newCollection);
      const createdCollection = { id: docRef.id, ...newCollection };
      
      setCollections([createdCollection, ...collections]);
      setNewCollectionName('');
      setIsCreating(false);
      toast.success('Collection created!');
      
      // Automatically save the prompt to the newly created collection
      handleSaveToCollection(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'collections');
      toast.error('Failed to create collection');
    }
  };

  const handleSaveToCollection = async (collectionId: string) => {
    if (!user) return;
    try {
      // Check if already in collection
      const q = query(collection(db, 'collection_prompts'), 
        where('collectionId', '==', collectionId),
        where('promptId', '==', promptId)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        await addDoc(collection(db, 'collection_prompts'), {
          collectionId,
          promptId,
          createdAt: new Date().toISOString()
        });
        toast.success('Saved to collection!');
      } else {
        toast.success('Already in collection!');
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'collection_prompts');
      toast.error('Failed to save to collection');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="font-semibold text-lg dark:text-white">Save to Collection</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-black dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-64 overflow-y-auto">
          {collections.length === 0 && !isCreating ? (
            <div className="text-center py-8 text-gray-500 dark:text-zinc-400">
              <Folder className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No collections yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSaveToCollection(c.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <Folder className="w-5 h-5 text-gray-400" />
                  <span className="font-medium dark:text-white flex-1">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50">
          {isCreating ? (
            <form onSubmit={handleCreateCollection} className="flex gap-2">
              <input
                type="text"
                value={newCollectionName}
                onChange={e => setNewCollectionName(e.target.value)}
                placeholder="Collection name..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newCollectionName.trim()}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Create
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Collection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
