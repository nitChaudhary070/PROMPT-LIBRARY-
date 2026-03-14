import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Home, Grid, Heart, Upload, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Top Bar - Just Logo and Admin */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-bold text-xl">PromptLib</span>
            </Link>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload Prompt</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-max md:rounded-full md:border md:shadow-2xl md:px-8 md:py-2 md:bg-white/90 md:backdrop-blur-lg">
        <div className="flex justify-around items-center h-16 md:h-auto md:gap-8 px-2 md:px-0">
          <Link to="/" className={`p-2 flex flex-col items-center transition-colors ${isActive('/') ? 'text-black' : 'text-gray-500 hover:text-black'}`}>
            <Home className={`h-6 w-6 md:h-5 md:w-5 ${isActive('/') ? 'fill-black text-black' : ''}`} />
            <span className="text-[10px] mt-1 font-medium md:text-xs">Home</span>
          </Link>
          <Link to="/categories" className={`p-2 flex flex-col items-center transition-colors ${isActive('/categories') ? 'text-black' : 'text-gray-500 hover:text-black'}`}>
            <Grid className={`h-6 w-6 md:h-5 md:w-5 ${isActive('/categories') ? 'fill-black text-black' : ''}`} />
            <span className="text-[10px] mt-1 font-medium md:text-xs">Categories</span>
          </Link>
          <Link to="/search" className={`p-2 flex flex-col items-center transition-colors ${isActive('/search') ? 'text-black' : 'text-gray-500 hover:text-black'}`}>
            <Search className="h-6 w-6 md:h-5 md:w-5" />
            <span className="text-[10px] mt-1 font-medium md:text-xs">Search</span>
          </Link>
          {user ? (
            <>
              <Link to="/favorites" className={`p-2 flex flex-col items-center transition-colors ${isActive('/favorites') ? 'text-black' : 'text-gray-500 hover:text-black'}`}>
                <Heart className={`h-6 w-6 md:h-5 md:w-5 ${isActive('/favorites') ? 'fill-black text-black' : ''}`} />
                <span className="text-[10px] mt-1 font-medium md:text-xs">Saved</span>
              </Link>
              <button onClick={logout} className="p-2 flex flex-col items-center text-gray-500 hover:text-black transition-colors">
                <LogOut className="h-6 w-6 md:h-5 md:w-5" />
                <span className="text-[10px] mt-1 font-medium md:text-xs">Logout</span>
              </button>
            </>
          ) : (
            <Link to="/login" className={`p-2 flex flex-col items-center transition-colors ${isActive('/login') ? 'text-black' : 'text-gray-500 hover:text-black'}`}>
              <User className={`h-6 w-6 md:h-5 md:w-5 ${isActive('/login') ? 'fill-black text-black' : ''}`} />
              <span className="text-[10px] mt-1 font-medium md:text-xs">Login</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
