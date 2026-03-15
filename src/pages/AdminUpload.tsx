import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function AdminUpload() {
  const { isAdmin, token, isLoading } = useAuth();
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
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        setCategories(data);
        if (data.length > 0) setCategory(data[0]);
      });
  }, []);

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

    const formData = new FormData();
    formData.append('title', title);
    formData.append('prompt_text', promptText);
    formData.append('category', finalCategory);
    formData.append('tags', tags);
    
    if (image) {
      formData.append('image', image);
    } else if (imageUrl) {
      formData.append('image_url', imageUrl);
    }

    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setMessage('Prompt uploaded successfully!');
        setTitle('');
        setPromptText('');
        setTags('');
        setImage(null);
        setImageUrl('');
      } else {
        const data = await res.json();
        setMessage(data.error || 'Upload failed');
      }
    } catch (error) {
      setMessage('An error occurred during upload');
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
