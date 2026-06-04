import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../hooks/useAuth.js';

const RideDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingSeats, setBookingSeats] = useState(1);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        const response = await api.get(`/rides/${id}`);
        setRide(response.data.data.ride);
      } catch (err) {
        setError('Failed to load ride details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRideDetails();
  }, [id]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    
    setIsBooking(true);
    setBookingError('');
    setBookingSuccess(false);

    try {
      await api.post('/bookings', {
        ride: id,
        seatsBooked: Number(bookingSeats),
      });
      setBookingSuccess(true);
      // Refresh ride details to update seats
      const updatedResponse = await api.get(`/rides/${id}`);
      setRide(updatedResponse.data.data.ride);
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Failed to book seats.');
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading ride details...
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        {error || 'Ride not found.'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Ride details panel */}
        <div className="md:col-span-2 glass-panel p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded-full capitalize">
                {ride.status}
              </span>
              <h3 className="text-2xl font-bold text-slate-100 mt-3">
                {ride.source} to {ride.destination}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-emerald-400">${ride.pricePerSeat}</p>
              <p className="text-xs text-slate-400 mt-1">per seat</p>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-800 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-medium">Departure Time</span>
              <span className="col-span-2 text-slate-200">{new Date(ride.departureTime).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-medium">Remaining Seats</span>
              <span className="col-span-2 text-slate-200">{ride.availableSeats} seats left</span>
            </div>
          </div>

          {/* Vehicle info */}
          {ride.vehicle && (
            <div className="pt-6 border-t border-slate-800 space-y-3">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Vehicle Details</h4>
              <div className="grid sm:grid-cols-2 gap-4 text-sm bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
                <div>
                  <p className="text-xs text-slate-400">Make & Model</p>
                  <p className="text-slate-200 font-medium mt-0.5">{ride.vehicle.make} {ride.vehicle.model}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">License Plate</p>
                  <p className="text-slate-200 font-medium mt-0.5">{ride.vehicle.registrationNumber}</p>
                </div>
              </div>
            </div>
          )}

          {/* Driver info */}
          {ride.driver && (
            <div className="pt-6 border-t border-slate-800 space-y-3">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Your Driver</h4>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center text-lg font-bold text-indigo-400">
                  {ride.driver.firstName[0]}
                  {ride.driver.lastName[0]}
                </div>
                <div>
                  <p className="text-slate-200 font-semibold">{ride.driver.firstName} {ride.driver.lastName}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-400 font-bold">
                    <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {ride.driver.averageRating?.toFixed(1) || '5.0'} / 5.0 Rating
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Booking sidebar form */}
        <div className="glass-panel p-6 rounded-2xl shadow-xl h-fit">
          <h4 className="text-lg font-bold text-slate-100 mb-4">Book this Ride</h4>
          
          {bookingSuccess ? (
            <div className="bg-green-950/40 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm space-y-2">
              <p className="font-bold">Booking Confirmed!</p>
              <p className="text-xs text-green-300">Your seats have been reserved. Details are available on your profile.</p>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-4">
              {bookingError && (
                <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">
                  {bookingError}
                </div>
              )}

              <div>
                <label htmlFor="bookingSeats" className="block text-xs text-slate-400 mb-1">
                  Seats to Reserve
                </label>
                <input
                  id="bookingSeats"
                  name="bookingSeats"
                  type="number"
                  min="1"
                  max={Math.min(8, ride.availableSeats)}
                  value={bookingSeats}
                  onChange={(e) => setBookingSeats(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>

              <div className="flex justify-between items-center text-sm pt-2">
                <span className="text-slate-400">Total Price</span>
                <span className="text-slate-100 font-extrabold text-lg">
                  ${(ride.pricePerSeat * bookingSeats).toFixed(2)}
                </span>
              </div>

              <button
                type="submit"
                disabled={isBooking || ride.availableSeats <= 0 || ride.status !== 'pending'}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition duration-150 disabled:opacity-50"
              >
                {isBooking ? 'Processing...' : ride.availableSeats <= 0 ? 'Fully Booked' : 'Confirm Booking'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RideDetails;
