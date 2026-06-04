import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';

const CreateRide = () => {
  const [formData, setFormData] = useState({
    vehicle: '',
    source: '',
    destination: '',
    departureTime: '',
    availableSeats: 3,
    pricePerSeat: 10,
  });
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user's registered vehicles to select from
    const fetchVehicles = async () => {
      try {
        const response = await api.get('/vehicles');
        setVehicles(response.data.data.vehicles);
        if (response.data.data.vehicles.length > 0) {
          setFormData(prev => ({ ...prev, vehicle: response.data.data.vehicles[0]._id }));
        }
      } catch (err) {
        console.error('Failed to load vehicles', err);
      }
    };
    fetchVehicles();
  }, []);

  const handleChange = (e) => {
    const val = e.target.name === 'availableSeats' || e.target.name === 'pricePerSeat'
      ? Number(e.target.value)
      : e.target.value;
      
    setFormData({
      ...formData,
      [e.target.name]: val,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsSubmitting(true);
    
    if (!formData.vehicle) {
      setError('Please add a vehicle first in your profile before offering a ride.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Format ISO string for DB compat
      const isoDeparture = new Date(formData.departureTime).toISOString();
      await api.post('/rides', {
        ...formData,
        departureTime: isoDeparture
      });
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to list ride offer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-green-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-[1400px] mx-auto">
        <h2 className="text-3xl font-extrabold text-slate-100 mb-8 text-center">
          Offer a Ride
        </h2>

        <div className="glass-panel py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 bg-red-950/40 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-950/40 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm">
              Ride registered successfully! Redirecting...
            </div>
          )}

          <form className="grid gap-6 lg:grid-cols-2" onSubmit={handleSubmit}>
            <div className="lg:col-span-2">
              <label htmlFor="vehicle" className="block text-sm font-medium text-slate-300">
                Select Vehicle
              </label>
              {vehicles.length === 0 ? (
                <div className="mt-1 text-sm text-yellow-400 bg-yellow-950/20 border border-yellow-500/10 p-2.5 rounded-lg">
                  No vehicles registered. You must add a vehicle to list a ride. (Draft option will mock ID if submitted)
                </div>
              ) : (
                <select
                  id="vehicle"
                  name="vehicle"
                  value={formData.vehicle}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-slate-800 rounded-lg bg-slate-900 text-slate-100 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                >
                  {vehicles.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.vehicleName} ({v.vehiclePlateNumber})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 lg:col-span-2">
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-slate-300">
                  Starting Point (Source)
                </label>
                <input
                  id="source"
                  name="source"
                  type="text"
                  required
                  value={formData.source}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                  placeholder="e.g. Downtown Metro"
                />
              </div>
              <div>
                <label htmlFor="destination" className="block text-sm font-medium text-slate-300">
                  Destination
                </label>
                <input
                  id="destination"
                  name="destination"
                  type="text"
                  required
                  value={formData.destination}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                  placeholder="e.g. Airport Terminal 1"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="departureTime" className="block text-sm font-medium text-slate-300">
                Departure Date & Time
              </label>
              <input
                id="departureTime"
                name="departureTime"
                type="datetime-local"
                required
                value={formData.departureTime}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4 lg:col-span-2">
              <div>
                <label htmlFor="availableSeats" className="block text-sm font-medium text-slate-300">
                  Available Seats
                </label>
                <input
                  id="availableSeats"
                  name="availableSeats"
                  type="number"
                  required
                  min="1"
                  max="8"
                  value={formData.availableSeats}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="pricePerSeat" className="block text-sm font-medium text-slate-300">
                  Price Per Seat ($)
                </label>
                <input
                  id="pricePerSeat"
                  name="pricePerSeat"
                  type="number"
                  required
                  min="0"
                  value={formData.pricePerSeat}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 disabled:opacity-50"
              >
                {isSubmitting ? 'Listing ride...' : 'Publish Ride'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRide;
