import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import api from '../../services/api.js';

const Profile = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [vehicleImageUpload, setVehicleImageUpload] = useState({});
  const profileInputRef = useRef(null);

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

  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      alert('Profile image must be less than 5MB');
      return;
    }

    setIsUploadingProfile(true);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await api.post('/users/profile/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update user context with new image
      const updatedUser = response.data.data.user;
      setUser(updatedUser);
    } catch (error) {
      alert('Failed to upload profile photo. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleVehiclePhotoChange = async (vehicleId, file) => {
    if (!file) return;

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      alert('Vehicle image must be less than 5MB');
      return;
    }

    setVehicleImageUpload((prev) => ({ ...prev, [vehicleId]: true }));
    try {
      const formData = new FormData();
      formData.append('vehicleImage', file);

      const response = await api.post(`/vehicles/${vehicleId}/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update vehicle in local state
      setVehicles((prev) =>
        prev.map((v) => (v._id === vehicleId ? response.data.data.vehicle : v))
      );
    } catch (error) {
      alert('Failed to upload vehicle photo. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setVehicleImageUpload((prev) => ({ ...prev, [vehicleId]: false }));
    }
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex items-center justify-center text-slate-400">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-[1400px] mx-auto">
        <h2 className="text-3xl font-extrabold text-slate-100 mb-8">
          User Profile
        </h2>

        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-10 space-y-6">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center pb-6 border-b border-slate-800">
            <div className="relative group">
              <div className="w-32 h-32 bg-emerald-500/10 border-4 border-emerald-500/30 rounded-full flex items-center justify-center text-5xl font-bold text-emerald-400 overflow-hidden">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <>
                    {user.firstName ? user.firstName[0] : ''}
                    {user.lastName ? user.lastName[0] : ''}
                  </>
                )}
              </div>
              <button
                onClick={() => profileInputRef.current?.click()}
                disabled={isUploadingProfile}
                className="absolute bottom-0 right-0 p-2 bg-emerald-500/90 hover:bg-emerald-600 rounded-full transition disabled:opacity-50"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoChange}
                className="hidden"
              />
            </div>

            <div className="text-center mt-4">
              <h3 className="text-2xl font-bold text-slate-100">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-emerald-400 font-semibold text-sm capitalize mt-1">
                {user.role === 'driver' ? 'Car Owner' : 'Passenger'} Account
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 text-sm">
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
                  <div key={vehicle._id} className="border border-slate-800/80 p-5 rounded-2xl bg-slate-900/20">
                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
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
                      <div className="space-y-1">
                        <p className="text-slate-400 font-medium">Seats</p>
                        <p className="text-slate-200 text-base font-semibold">{vehicle.seatCount || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Vehicle Photo */}
                    <div className="border-t border-slate-800/50 pt-4">
                      <p className="text-slate-400 font-medium text-sm mb-3">Vehicle Photo</p>
                      <div className="relative group">
                        {vehicle.vehicleImage ? (
                          <img
                            src={vehicle.vehicleImage}
                            alt={vehicle.vehicleName}
                            className="w-full h-48 object-cover rounded-lg border-2 border-emerald-500/20"
                          />
                        ) : (
                          <div className="w-full h-48 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center">
                            <svg className="w-12 h-12 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-slate-400 text-sm">No vehicle photo</p>
                          </div>
                        )}
                        <label className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleVehiclePhotoChange(vehicle._id, e.target.files[0])
                            }
                            disabled={vehicleImageUpload[vehicle._id]}
                            className="hidden"
                          />
                          <span className="text-white font-semibold text-sm">
                            {vehicleImageUpload[vehicle._id] ? 'Uploading...' : 'Change Photo'}
                          </span>
                        </label>
                      </div>
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
