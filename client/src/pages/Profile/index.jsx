import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import api from '../../services/api.js';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (user?.role !== 'driver') return;

      try {
        const response = await api.get('/vehicles');
        setVehicles(response.data.data.vehicles);
      } catch (error) {
        console.error('Failed to load vehicles', error);
      }
    };

    fetchVehicles();
  }, [user?.role]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-extrabold text-slate-100 mb-8">
          User Profile
        </h2>

        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-800">
            <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-full flex items-center justify-center text-3xl font-bold text-emerald-400 uppercase">
              {user.firstName ? user.firstName[0] : ''}
              {user.lastName ? user.lastName[0] : ''}
            </div>
            
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-bold text-slate-100">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-emerald-400 font-semibold text-sm capitalize mt-1">
                {user.role === 'driver' ? 'Car Owner' : 'Passenger'} Account
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1">
              <p className="text-slate-400 font-medium">Email Address</p>
              <p className="text-slate-200 text-base">{user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 font-medium">Phone Number</p>
              <p className="text-slate-200 text-base">{user.phone || 'Not provided'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 font-medium">Address</p>
              <p className="text-slate-200 text-base">{user.address || 'Not provided'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 font-medium">Member Since</p>
              <p className="text-slate-200 text-base">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 font-medium">Average Rating</p>
              <div className="flex items-center gap-1.5 text-base text-amber-400 font-bold">
                <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {user.averageRating?.toFixed(1) || '5.0'} / 5.0
              </div>
            </div>
            {user.emergencyContact && (
              <div className="space-y-1">
                <p className="text-slate-400 font-medium">Emergency Contact</p>
                <p className="text-slate-200 text-base">{user.emergencyContact}</p>
              </div>
            )}
          </div>

          {user.bio && (
            <div className="pt-4 border-t border-slate-800 space-y-1">
              <p className="text-slate-400 text-sm font-medium">Bio</p>
              <p className="text-slate-300 text-sm bg-slate-900/40 p-3 rounded-lg border border-slate-800/60 italic">
                "{user.bio}"
              </p>
            </div>
          )}

          {user.role === 'driver' && (
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16v-3a4 4 0 00-4-4h-3v7m0 0l-3-3m3 3l3-3" />
                </svg>
                Vehicle Specifications
              </h4>
              
              <div className="space-y-4">
                {vehicles.length > 0 ? vehicles.map((vehicle) => (
                  <div key={vehicle._id} className="grid sm:grid-cols-2 gap-6 text-sm bg-slate-900/20 border border-slate-800/80 p-5 rounded-2xl">
                    <div className="space-y-1">
                      <p className="text-slate-400 font-medium">Vehicle Name</p>
                      <p className="text-slate-200 text-base font-semibold">{vehicle.vehicleName || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 font-medium">Plate Number</p>
                      <p className="text-slate-200 text-base font-mono uppercase tracking-wider font-semibold">{vehicle.vehiclePlateNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 font-medium">Fuel Type</p>
                      <p className="text-slate-200 text-base capitalize font-semibold">{vehicle.vehicleType || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 font-medium">Mileage</p>
                      <p className="text-slate-200 text-base font-semibold">{vehicle.mileage !== undefined ? `${vehicle.mileage} km/l` : 'N/A'}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-slate-400 bg-slate-900/20 border border-slate-800/80 p-5 rounded-2xl">
                    No vehicle details found.
                  </div>
                )}
                </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 text-red-400 rounded-lg text-sm font-bold transition duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
