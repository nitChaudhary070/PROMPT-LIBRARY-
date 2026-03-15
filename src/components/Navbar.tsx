import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Home, Grid, Heart, Upload, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Top Bar - Just Logo and Admin */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center transition-colors">
                <span className="text-white dark:text-black font-bold text-lg">P</span>
              </div>
              <span className="font-bold text-xl dark:text-white">PromptLib</span>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {isAdmin && (
                <>
                  <Link to="/admin/dashboard" className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white rounded-full text-sm font-medium transition-colors">
                    <Grid className="h-5 w-5" />
                    <span className="hidden md:inline">Dashboard</span>
                  </Link>
                  <Link to="/admin" className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors">
                    <Upload className="h-4 w-4" />
                    <span className="hidden md:inline">Upload Prompt</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 pb-safe z-50 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-max md:rounded-full md:border md:border-zinc-200 dark:md:border-zinc-800 md:shadow-2xl md:px-8 md:py-2 md:bg-white/90 dark:md:bg-zinc-900/90 md:backdrop-blur-lg transition-colors duration-300">
        <div className="flex justify-around items-center h-16 md:h-auto md:gap-8 px-2 md:px-0">
          <Link to="/" className={`p-2 flex flex-col items-center transition-colors ${isActive('/') ? 'text-black dark:text-white' : 'text-gray-500 dark:text-zinc-500 hover:text-black dark:hover:text-white'}`}>
            <Home className={`h-6 w-6 md:h-5 md:w-5 ${isActive('/') ? 'fill-black text-black dark:fill-white dark:text-white' : ''}`} />
            <span className="text-[10px] mt-1 font-medium md:text-xs">Home</span>
          </Link>
          <Link to="/categories" className={`p-2 flex flex-col items-center transition-colors ${isActive('/categories') ? 'text-black dark:text-white' : 'text-gray-500 dark:text-zinc-500 hover:text-black dark:hover:text-white'}`}>
            <Grid className={`h-6 w-6 md:h-5 md:w-5 ${isActive('/categories') ? 'fill-black text-black dark:fill-white dark:text-white' : ''}`} />
            <span className="text-[10px] mt-1 font-medium md:text-xs">Categories</span>
          </Link>
          <Link to="/search" className={`p-2 flex flex-col items-center transition-colors ${isActive('/search') ? 'text-black dark:text-white' : 'text-gray-500 dark:text-zinc-500 hover:text-black dark:hover:text-white'}`}>
            <Search className="h-6 w-6 md:h-5 md:w-5" />
            <span className="text-[10px] mt-1 font-medium md:text-xs">Search</span>
          </Link>
          {user ? (
            <>
              <Link to="/favorites" className={`p-2 flex flex-col items-center transition-colors ${isActive('/favorites') ? 'text-black dark:text-white' : 'text-gray-500 dark:text-zinc-500 hover:text-black dark:hover:text-white'}`}>
                <Heart className={`h-6 w-6 md:h-5 md:w-5 ${isActive('/favorites') ? 'fill-black text-black dark:fill-white dark:text-white' : ''}`} />
                <span className="text-[10px] mt-1 font-medium md:text-xs">Saved</span>
              </Link>
              <button onClick={logout} className="p-2 flex flex-col items-center text-gray-500 dark:text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                <LogOut className="h-6 w-6 md:h-5 md:w-5" />
                <span className="text-[10px] mt-1 font-medium md:text-xs">Logout</span>
              </button>
            </>
          ) : (
            <Link to="/login" className={`p-2 flex flex-col items-center transition-colors ${isActive('/login') ? 'text-black dark:text-white' : 'text-gray-500 dark:text-zinc-500 hover:text-black dark:hover:text-white'}`}>
              <User className={`h-6 w-6 md:h-5 md:w-5 ${isActive('/login') ? 'fill-black text-black dark:fill-white dark:text-white' : ''}`} />
              <span className="text-[10px] mt-1 font-medium md:text-xs">Login</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
