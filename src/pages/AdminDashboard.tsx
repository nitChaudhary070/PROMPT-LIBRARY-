import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Users, FileText, Eye, Copy, TrendingUp, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const { isAdmin, token, isLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [showAds, setShowAds] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin && token) {
      Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
        fetch('/api/settings').then(res => res.json())
      ])
        .then(([statsData, settingsData]) => {
          setStats(statsData);
          setShowAds(settingsData.show_ads === '1');
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch dashboard data', err);
          setLoading(false);
        });
    }
  }, [isAdmin, token]);

  const toggleAds = async () => {
    const newValue = !showAds;
    setShowAds(newValue);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ show_ads: newValue })
      });
    } catch (error) {
      console.error('Failed to update settings', error);
      setShowAds(!newValue); // Revert on failure
    }
  };

  if (isLoading || loading) {
    return <div className="min-h-[80vh] flex items-center justify-center dark:text-white">Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8 dark:text-white transition-colors">Admin Dashboard</h1>
      
      {/* Settings Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 mb-8 transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">App Settings</h2>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl transition-colors">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Show Advertisements</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Enable or disable ad banners across the application.</p>
          </div>
          <button
            onClick={toggleAds}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showAds ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAds ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 flex items-center gap-4 transition-colors">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.users || 0}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 flex items-center gap-4 transition-colors">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Total Prompts</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.prompts || 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 flex items-center gap-4 transition-colors">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Total Impressions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.views || 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 flex items-center gap-4 transition-colors">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl">
            <Copy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Total Downloads/Copies</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.copies || 0}</p>
          </div>
        </div>
      </div>

      {/* Top Prompts Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden transition-colors">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performing Prompts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-800/50 text-gray-500 dark:text-zinc-400 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Prompt Title</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium text-right">Impressions</th>
                <th className="px-6 py-4 font-medium text-right">Copies</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {stats?.topPrompts?.map((prompt: any) => (
                <tr key={prompt.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{prompt.title}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-zinc-400 text-sm">{prompt.category}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-zinc-300 text-right font-mono">{prompt.views || 0}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-zinc-300 text-right font-mono">{prompt.copies || 0}</td>
                </tr>
              ))}
              {(!stats?.topPrompts || stats.topPrompts.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-zinc-500">
                    No prompt data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
