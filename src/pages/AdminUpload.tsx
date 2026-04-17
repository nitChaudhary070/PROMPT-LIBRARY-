import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export default function AdminUpload() {
  const { isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [category, setCategory] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const promptsRef = collection(db, 'prompts');
    const unsubscribe = onSnapshot(promptsRef, (snap) => {
      const cats = new Set<string>();
      snap.forEach(doc => {
        const cat = doc.data().category;
        if (cat) cats.add(cat);
      });
      const catArray = Array.from(cats).sort();
      setCategories(catArray);
      if (catArray.length > 0 && !category) setCategory(catArray[0]);
    }, (error) => {
      console.error('Failed to fetch categories', error);
    });

    return () => unsubscribe();
  }, [category]);

  if (isLoading) {
    return <div className="min-h-[80vh] flex items-center justify-center dark:text-white">Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isNewCategory ? newCategory.trim() : category;
    
    if (!title || !promptText || !finalCategory || (!image && !imageUrl)) {
      setMessage('Please fill all required fields');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      let finalImageUrl = imageUrl;
      
      if (image) {
        if (image.size > 10 * 1024 * 1024) {
          setMessage('Image is too large. Please use an image under 10MB or provide a URL instead.');
          setLoading(false);
          return;
        }
        
        try {
          // Upload image to Firebase Storage
          const fileExtension = image.name.split('.').pop();
          const fileName = `prompts/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
          const storageRef = ref(storage, fileName);
          
          await uploadBytes(storageRef, image);
          finalImageUrl = await getDownloadURL(storageRef);
        } catch (storageError) {
          console.error("Storage upload error:", storageError);
          // Fallback to base64 if storage fails (e.g., due to rules)
          if (image.size > 700 * 1024) {
             setMessage('Storage upload failed and image is too large for database fallback. Please use an image under 700KB or provide a URL instead.');
             setLoading(false);
             return;
          }
          const reader = new FileReader();
          finalImageUrl = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(image);
          });
        }
      }

      try {
        await addDoc(collection(db, 'prompts'), {
          title,
          prompt_text: promptText,
          category: finalCategory,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
          image_url: finalImageUrl,
          createdAt: new Date().toISOString(),
          views: 0,
          copies: 0,
          upvote_count: 0
        });
      } catch (dbError) {
        handleFirestoreError(dbError, OperationType.CREATE, 'prompts');
        throw dbError;
      }

      setMessage('Prompt uploaded successfully! Redirecting...');
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (error) {
      console.error("Upload error:", error);
      setMessage('An error occurred during upload: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center dark:text-white transition-colors">Admin Upload Panel</h1>
      
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 transition-colors">
        {message && (
          <div className={`p-4 mb-6 rounded-lg transition-colors ${message.includes('success') ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
              placeholder="e.g., Cyberpunk Cityscape"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Prompt Text</label>
            <textarea 
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all h-32"
              placeholder="Enter the full AI prompt here..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Category</label>
              {!isNewCategory ? (
                <div className="flex gap-2">
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                    required={!isNewCategory}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button 
                    type="button"
                    onClick={() => setIsNewCategory(true)}
                    className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap font-medium text-sm"
                  >
                    + New
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                    placeholder="Enter new category name"
                    required={isNewCategory}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      setIsNewCategory(false);
                      setNewCategory('');
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Tags (comma separated)</label>
              <input 
                type="text" 
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                placeholder="e.g., neon, futuristic, 8k"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Preview Image</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-zinc-700 border-dashed rounded-lg hover:border-black dark:hover:border-white transition-colors">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-zinc-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600 dark:text-zinc-400 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-zinc-800 rounded-md font-medium text-black dark:text-white hover:text-gray-700 dark:hover:text-zinc-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-black dark:focus-within:ring-white">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImage(e.target.files[0]);
                        setImageUrl('');
                      }
                    }} accept="image/*" />
                  </label>
                  <p className="pl-1">or provide URL</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
            {image && <p className="mt-2 text-sm text-green-600 dark:text-green-400">Selected file: {image.name}</p>}
            
            <div className="mt-4">
              <input 
                type="url" 
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImage(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                placeholder="Or paste image URL here..."
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-offset-zinc-950 transition-all disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Upload Prompt'}
          </button>
        </form>
      </div>
    </div>
  );
}
