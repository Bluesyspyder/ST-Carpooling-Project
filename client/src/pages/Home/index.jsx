import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import PincodeDirectionsMap from './PincodeDirectionsMap.jsx';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Hero Section */}
      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12 flex-grow flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
          Eco-Friendly Commuting
        </span>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
          Carpool App
        </h1>
        
        <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mb-10">
          Connect with drivers and passengers heading your way. Share rides, split travel expenses, reduce emissions, and meet amazing people.
        </p>

        <section className="w-full mb-10 text-left">
          <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-slate-800/50">
            <PincodeDirectionsMap />
          </div>
        </section>

        {/* Action cards */}
        <div className="grid md:grid-cols-2 gap-6 w-full">
          <Link to="/search" className="glass-card p-8 rounded-2xl text-left hover:scale-[1.01]">
            <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Find a Ride</h3>
            <p className="text-slate-400 text-sm">
              Search for active drivers going to your destination and request a booking instantly.
            </p>
          </Link>

          <Link to="/create-ride" className="glass-card p-8 rounded-2xl text-left hover:scale-[1.01]">
            <div className="w-12 h-12 bg-indigo-500/15 border border-indigo-500/20 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Offer a Ride</h3>
            <p className="text-slate-400 text-sm">
              Register your vehicle, define your source, destination, departure time, and list empty seats.
            </p>
          </Link>
        </div>

        {!user && (
          <div className="mt-12 flex gap-4">
            <Link to="/login" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition duration-200 shadow-lg shadow-emerald-500/10">
              Get Started
            </Link>
            <Link to="/register" className="px-6 py-3 border border-slate-700 hover:bg-slate-900 text-slate-300 font-medium rounded-xl transition duration-200">
              Sign Up
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
