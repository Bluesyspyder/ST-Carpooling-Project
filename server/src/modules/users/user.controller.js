import * as userService from './user.service.js';
import ApiError from '../../shared/utils/api-error.js';
import Ride from '../rides/ride.model.js';
import Booking from '../bookings/booking.model.js';

// ─── Profile ─────────────────────────────────────────────────────────────────

export const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);
    return res.status(200).json({ status: 'success', data: { user } });
  } catch (error) { next(error); }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.user.id, req.body);
    return res.status(200).json({ status: 'success', data: { user } });
  } catch (error) { next(error); }
};

export const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.fileBase64) throw new ApiError(400, 'No image file provided');
    const user = await userService.updateUser(req.user.id, { profileImage: req.fileBase64 });
    return res.status(200).json({ status: 'success', message: 'Profile image uploaded successfully', data: { user } });
  } catch (error) { next(error); }
};

// ─── Saved Addresses ─────────────────────────────────────────────────────────

export const getSavedAddresses = async (req, res, next) => {
  try {
    const savedAddresses = await userService.getSavedAddresses(req.user.id);
    res.status(200).json({ status: 'success', data: { savedAddresses } });
  } catch (error) { next(error); }
};

export const addSavedAddress = async (req, res, next) => {
  try {
    const savedAddresses = await userService.addSavedAddress(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { savedAddresses } });
  } catch (error) { next(error); }
};

export const updateSavedAddress = async (req, res, next) => {
  try {
    const savedAddresses = await userService.updateSavedAddress(req.user.id, req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { savedAddresses } });
  } catch (error) { next(error); }
};

export const deleteSavedAddress = async (req, res, next) => {
  try {
    const savedAddresses = await userService.deleteSavedAddress(req.user.id, req.params.id);
    res.status(200).json({ status: 'success', data: { savedAddresses } });
  } catch (error) { next(error); }
};

export const setDefaultSavedAddress = async (req, res, next) => {
  try {
    const savedAddresses = await userService.setDefaultSavedAddress(req.user.id, req.params.id);
    res.status(200).json({ status: 'success', data: { savedAddresses } });
  } catch (error) { next(error); }
};

// ─── Recent / Frequent ───────────────────────────────────────────────────────

export const getRecentAddresses = async (req, res, next) => {
  try {
    const recentAddresses = await userService.getRecentAddresses(req.user.id);
    res.status(200).json({ status: 'success', data: { recentAddresses } });
  } catch (error) { next(error); }
};

export const getFrequentAddresses = async (req, res, next) => {
  try {
    const frequentAddresses = await userService.getFrequentAddresses(req.user.id);
    res.status(200).json({ status: 'success', data: { frequentAddresses } });
  } catch (error) { next(error); }
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

/**
 * GET /api/users/me/stats
 * Returns dashboard data: upcoming bookings, rides being driven, pending request count, plus aggregate stats and recent activities.
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const user = await userService.getUserById(userId);
    const isRider = user?.role === 'hybrid';

    // Upcoming bookings for this user as a passenger (confirmed, departure in future)
    const upcomingBookings = await Booking.find({
      passenger: userId,
      bookingStatus: 'confirmed',
    })
      .populate({
        path: 'ride',
        match: { departureTime: { $gt: now }, status: { $ne: 'cancelled' } },
        select: 'source destination departureTime availableSeats pricePerSeat',
        populate: { path: 'driver', select: 'firstName lastName profileImage averageRating' },
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Filter out null ride matches (past or cancelled rides)
    const filteredBookings = upcomingBookings.filter((b) => b.ride !== null);

    // Rides being driven by this user (upcoming, active/pending)
    const drivingRidesRaw = await Ride.find({
      driver: userId,
      departureTime: { $gt: now },
      status: { $in: ['pending', 'active'] },
    })
      .select('source destination departureTime availableSeats pricePerSeat status')
      .sort({ departureTime: 1 })
      .limit(5)
      .lean();

    // Count pending booking requests for each driving ride
    const drivingRides = await Promise.all(
      drivingRidesRaw.map(async (ride) => {
        const pendingRequests = await Booking.countDocuments({
          ride: ride._id,
          bookingStatus: 'pending',
        });
        return { ...ride, pendingRequests };
      })
    );

    // ─── Extended Statistics ────────────────────────────────────────────────────
    
    // 1. Passenger statistics
    const passengerBookings = await Booking.find({ passenger: userId })
      .populate({
        path: 'ride',
        select: 'status'
      })
      .lean();
    
    const totalBookings = passengerBookings.length;
    const completedTrips = passengerBookings.filter(
      b => b.bookingStatus === 'confirmed' && b.ride && b.ride.status === 'completed'
    ).length;
    const cancelledByUser = passengerBookings.filter(b => b.bookingStatus === 'cancelled').length;
    const passengerReliabilityScore = Math.round((completedTrips / Math.max(completedTrips + cancelledByUser, 1)) * 100) || 100;

    // 2. Rider statistics
    const ridesOffered = await Ride.countDocuments({ driver: userId });
    const driverRidesAll = await Ride.find({ driver: userId }).select('_id status').lean();
    const driverRideIds = driverRidesAll.map(r => r._id);

    const confirmedDriverBookings = await Booking.find({
      ride: { $in: driverRideIds },
      bookingStatus: 'confirmed'
    }).lean();

    const completedRideIds = new Set(driverRidesAll.filter(r => r.status === 'completed').map(r => r._id.toString()));
    const passengersTransported = confirmedDriverBookings
      .filter(b => completedRideIds.has(b.ride.toString()))
      .reduce((sum, b) => sum + (b.seatsBooked || 1), 0);

    const completedRidesCount = driverRidesAll.filter(r => r.status === 'completed').length;
    const cancelledRidesCount = driverRidesAll.filter(r => r.status === 'cancelled').length;
    const driverReliabilityScore = Math.round((completedRidesCount / Math.max(completedRidesCount + cancelledRidesCount, 1)) * 100) || 100;

    const reliabilityScore = isRider ? driverReliabilityScore : passengerReliabilityScore;
    const averageRating = user?.averageRating || 5.0;

    // ─── Recent Activity Feed ────────────────────────────────────────────────────
    const recentBookings = await Booking.find({ passenger: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate({ path: 'ride', select: 'source destination' })
      .lean();

    const recentRides = await Ride.find({ driver: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    const recentDriverBookings = await Booking.find({ ride: { $in: driverRideIds } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('passenger', 'firstName lastName')
      .populate('ride', 'source destination')
      .lean();

    const activities = [];

    // Process bookings as passenger
    recentBookings.forEach(b => {
      let type = 'booking_pending';
      let message = `You requested a ride to ${b.ride?.destination || 'destination'}`;
      
      if (b.bookingStatus === 'confirmed') {
        type = 'booking_accepted';
        message = `Your booking for ride to ${b.ride?.destination || 'destination'} was accepted`;
      } else if (b.bookingStatus === 'rejected') {
        type = 'booking_rejected';
        message = `Your booking request for ride to ${b.ride?.destination || 'destination'} was declined`;
      } else if (b.bookingStatus === 'cancelled') {
        type = 'booking_cancelled';
        message = `You cancelled your booking for ride to ${b.ride?.destination || 'destination'}`;
      }
      
      activities.push({
        type,
        message,
        timestamp: b.updatedAt || b.createdAt,
      });
    });

    // Process rides as driver
    recentRides.forEach(r => {
      let type = 'ride_published';
      let message = `You published a new ride from ${r.source} to ${r.destination}`;
      
      if (r.status === 'completed') {
        type = 'ride_completed';
        message = `Your ride from ${r.source} to ${r.destination} was completed`;
      } else if (r.status === 'cancelled') {
        type = 'ride_cancelled';
        message = `You cancelled your ride from ${r.source} to ${r.destination}`;
      }
      
      activities.push({
        type,
        message,
        timestamp: r.updatedAt || r.createdAt,
      });
    });

    // Process bookings on driver's rides
    recentDriverBookings.forEach(db => {
      let type = 'booking_received';
      let message = `${db.passenger?.firstName || 'A passenger'} requested a seat on your ride to ${db.ride?.destination || 'destination'}`;
      
      if (db.bookingStatus === 'cancelled') {
        type = 'booking_cancelled';
        message = `${db.passenger?.firstName || 'A passenger'} cancelled booking on your ride to ${db.ride?.destination || 'destination'}`;
      } else if (db.bookingStatus === 'confirmed') {
        type = 'booking_accepted';
        message = `You accepted ${db.passenger?.firstName || 'a passenger'}'s booking request to ${db.ride?.destination || 'destination'}`;
      } else if (db.bookingStatus === 'rejected') {
        type = 'booking_rejected';
        message = `You declined ${db.passenger?.firstName || 'a passenger'}'s booking request to ${db.ride?.destination || 'destination'}`;
      }
      
      activities.push({
        type,
        message,
        timestamp: db.updatedAt || db.createdAt,
      });
    });

    const recentActivity = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);

    return res.status(200).json({
      status: 'success',
      data: {
        upcomingBookings: filteredBookings,
        drivingRides,
        totalBookings,
        completedTrips,
        ridesOffered,
        passengersTransported,
        averageRating,
        reliabilityScore,
        recentActivity
      },
    });
  } catch (error) { next(error); }
};

