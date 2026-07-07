// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as userService from '@/modules/users/user.service';
import Booking from '@/modules/bookings/booking.model';
import Ride from '@/modules/rides/ride.model';

export const GET = apiHandler(async (req, { params, user }) => {
  // Add custom stats logic here based on original controller
  const userId = user.id;
  const now = new Date();
  const isRider = user.role === 'hybrid';
  // Port the rest from user.controller.js manually to ensure correct population
  const upcomingBookings = await Booking.find({ passenger: userId, bookingStatus: 'confirmed' })
    .populate({ 
      path: 'ride', 
      match: { journeyDate: { $gte: new Date(new Date().setHours(0,0,0,0)) }, rideStatus: { $ne: 'CANCELLED' } }, 
      select: 'pickupLocation destinationLocation journeyDate journeyTime availableSeats pricePerSeat driver', 
      populate: { path: 'driver', select: 'firstName lastName profileImage averageRating' } 
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
    
  const filteredBookings = upcomingBookings.filter((b: any) => b.ride !== null);
  
  const drivingRidesRaw = await Ride.find({ 
    driver: userId, 
    journeyDate: { $gte: new Date(new Date().setHours(0,0,0,0)) }, 
    rideStatus: { $in: ['ACTIVE', 'FULL'] } 
  }).select('pickupLocation destinationLocation journeyDate journeyTime availableSeats pricePerSeat rideStatus').sort({ journeyDate: 1 }).limit(5).lean();
  
  const drivingRides = await Promise.all(drivingRidesRaw.map(async (ride: any) => { 
    const pendingRequests = await Booking.countDocuments({ ride: ride._id, bookingStatus: 'pending' }); 
    return { ...ride, pendingRequests }; 
  }));
  
  const passengerBookings = await Booking.find({ passenger: userId }).select('bookingStatus updatedAt creditsEarned emissionSavedKg').populate({ path: 'ride', select: 'rideStatus' }).lean();
  const totalBookings = passengerBookings.length;
  const completedTrips = passengerBookings.filter((b: any) => b.bookingStatus === 'confirmed' && b.ride && b.ride.rideStatus === 'COMPLETED').length;

  // Real cancellation metrics from User model (if present)
  const cancelledByUser = user.cancellations24h || 0;

  const ridesOffered = await Ride.countDocuments({ driver: userId });
  const driverRidesAll = await Ride.find({ driver: userId }).select('_id rideStatus driverCreditsEarned totalEmissionSavedKg updatedAt').lean();
  const driverRideIds = driverRidesAll.map(r => r._id);
  const confirmedDriverBookings = await Booking.find({ ride: { $in: driverRideIds }, bookingStatus: 'confirmed' }).select('ride seatsBooked updatedAt').lean();
  const completedRideIds = new Set(driverRidesAll.filter(r => r.rideStatus === 'COMPLETED').map(r => r._id.toString()));
  const passengersTransported = confirmedDriverBookings.filter((b: any) => completedRideIds.has(b.ride.toString())).reduce((sum: number, b: any) => sum + (b.seatsBooked || 1), 0);
  
  // Recent Activity Feed Generation
  let recentActivity: any[] = [];
  
  if (isRider) {
    // Driver Feed: Booking requests received, cancelled by passenger
    const recentIncoming = await Booking.find({ ride: { $in: driverRideIds } })
      .populate('passenger', 'firstName lastName')
      .populate('ride', 'pickupLocation destinationLocation')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();
      
    recentIncoming.forEach((b: any) => {
      let type = '';
      let title = '';
      let time = b.updatedAt;
      
      if (b.bookingStatus === 'pending') {
        type = 'booking_received';
        title = `New booking request from ${b.passenger?.firstName}`;
      } else if (b.bookingStatus === 'cancelled') {
        type = 'booking_cancelled';
        title = `${b.passenger?.firstName} cancelled their booking`;
      } else if (b.bookingStatus === 'confirmed') {
        type = 'booking_accepted';
        title = `You accepted ${b.passenger?.firstName}'s booking`;
      }
      
      if (type) {
        recentActivity.push({ id: b._id.toString(), type, title, time });
      }
    });
  } else {
    // Passenger Feed: Booking accepted, rejected, waitlisted
    const recentOutgoing = await Booking.find({ passenger: userId })
      .populate('ride', 'pickupLocation destinationLocation driver')
      .populate({ path: 'ride', populate: { path: 'driver', select: 'firstName' }})
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();
      
    recentOutgoing.forEach((b: any) => {
      let type = '';
      let title = '';
      let time = b.updatedAt;
      
      if (b.bookingStatus === 'confirmed') {
        type = 'booking_accepted';
        title = `${b.ride?.driver?.firstName} accepted your booking!`;
      } else if (b.bookingStatus === 'rejected') {
        type = 'booking_rejected';
        title = `${b.ride?.driver?.firstName} rejected your booking.`;
      } else if (b.bookingStatus === 'waitlisted') {
        type = 'booking_pending';
        title = `You are waitlisted for a ride`;
      } else if (b.bookingStatus === 'pending') {
        type = 'booking_pending';
        title = `Your booking request is pending approval`;
      }
      
      if (type) {
        recentActivity.push({ id: b._id.toString(), type, title, time });
      }
    });
  }
  
  recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  recentActivity = recentActivity.slice(0, 5);

  const averageRating = user?.averageRating || 5.0;

  // ── Green Credits / CO2 impact ──
  // Balance/lifetime totals are now persisted directly on the User document
  // (atomically incremented by rideService.updateRideStatus on completion),
  // so we read them straight off rather than re-summing ride/booking history.
  const co2SavedKg = Math.round(user.lifetimeCo2SavedKg || 0);
  const greenCredits = Math.round(user.greenCreditsBalance || 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const passengerCo2KgThisMonth = passengerBookings
    .filter((b: any) => new Date(b.updatedAt) >= startOfMonth)
    .reduce((sum: number, b: any) => sum + (b.emissionSavedKg || 0), 0);
  const driverCo2KgThisMonth = driverRidesAll
    .filter((r: any) => new Date(r.updatedAt) >= startOfMonth)
    .reduce((sum: number, r: any) => sum + (r.totalEmissionSavedKg || 0), 0);
  const monthlyGoalKg = 50;
  const monthlyProgressKg = Math.min(
    monthlyGoalKg,
    Math.round(passengerCo2KgThisMonth + driverCo2KgThisMonth)
  );

  return NextResponse.json({
    status: 'success',
    data: {
      upcomingBookings: filteredBookings,
      drivingRides,
      totalBookings,
      completedTrips,
      ridesOffered,
      passengersTransported,
      averageRating,
      recentActivity,
      greenCredits,
      co2SavedKg,
      monthlyGoalKg,
      monthlyProgressKg,
    }
  }, { status: 200 });
}, { protect: true });

