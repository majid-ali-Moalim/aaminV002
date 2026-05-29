'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, Search, Activity, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function TrackPatientPage() {
  const router = useRouter();
  const [searchMethod, setSearchMethod] = useState<'CODE' | 'PHONE'>('CODE');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter a tracking code or phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // In a real app, we might do a pre-flight check here or just navigate
      // Navigating directly lets the dynamic route handle the fetching and WebSocket
      router.push(`/track/${encodeURIComponent(query.trim())}`);
    } catch (err) {
      setError('Failed to initiate tracking. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900 leading-tight">EADS Tracking</h1>
              <p className="text-xs text-slate-500 font-medium">Public Patient Tracker</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Track an Ambulance</h2>
            <p className="text-slate-600">Enter your Case Tracking Code or Patient Phone Number to view real-time updates.</p>
          </div>

          {/* Search Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <button
                type="button"
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  searchMethod === 'CODE' 
                    ? 'text-red-600 border-b-2 border-red-600 bg-white' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => { setSearchMethod('CODE'); setQuery(''); setError(''); }}
              >
                Tracking Code
              </button>
              <button
                type="button"
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  searchMethod === 'PHONE' 
                    ? 'text-red-600 border-b-2 border-red-600 bg-white' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => { setSearchMethod('PHONE'); setQuery(''); setError(''); }}
              >
                Phone Number
              </button>
            </div>

            {/* Form */}
            <div className="p-6 sm:p-8">
              <form onSubmit={handleSearch} className="space-y-6">
                
                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="searchQuery" className="block text-sm font-medium text-slate-700 mb-2">
                    {searchMethod === 'CODE' ? 'Tracking Code (e.g., CASE-2026-0001)' : 'Patient Phone Number'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      {searchMethod === 'CODE' ? (
                        <Search className="h-5 w-5 text-slate-400" />
                      ) : (
                        <Phone className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <input
                      type="text"
                      id="searchQuery"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all outline-none"
                      placeholder={searchMethod === 'CODE' ? 'CASE-XXXX-XXXX' : '+252 XXXXXXX'}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching...
                    </>
                  ) : (
                    'Track Patient'
                  )}
                </button>
              </form>
            </div>
            
            {/* Footer hint */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Secure access. Only operational tracking details are shared.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
