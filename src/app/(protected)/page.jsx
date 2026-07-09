"use client";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import ProfileCompletionBanner, { useProfileCompletion } from '@/components/ProfileCompletionBanner';

/**
 * Authenticated dashboard — protected route at `/`.
 * Shows role-specific widgets:
 *   - Rider (hybrid): Offer a Ride + Find a Ride action cards + rides they're driving + rider statistics + recent activity feed
 *   - Co-Rider (passenger): Nearby Rides feed + upcoming bookings + passenger statistics + recent activity feed
 */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useRouter();
  const pathname = usePathname();
  const isRider = user?.role === 'hybrid';
  const { isComplete, percentage } = useProfileCompletion();

  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [drivingRides, setDrivingRides] = useState([]);
  const [nearbyRides, setNearbyRides] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(!isRider);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const [stats, setStats] = useState({
    totalBookings: 0,
    completedTrips: 0,
    ridesOffered: 0,
    passengersTransported: 0,
    averageRating: 5.0,
    reliabilityScore: 100,
    recentActivity: [],
    greenCredits: 850,
    co2SavedKg: 125.5,
    monthlyGoalKg: 200,
    monthlyProgressKg: 125,
  });

  // Greeting based on time of day
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Format departure time nicely
  const fmtTime = (ride) => {
    if (!ride) return 'Time TBD';
    if (ride.journeyDate && ride.journeyTime) {
      const d = new Date(ride.journeyDate);
      if (!isNaN(d.getTime())) {
        return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${ride.journeyTime}`;
      }
    }
    if (ride.departureTime) {
      const d = new Date(ride.departureTime);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
          ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
    }
    return 'Time TBD';
  };

  // Relative time helper
  const getRelativeTime = (dateStr) => {
    const d = new Date(dateStr);
    const seconds = Math.floor((new Date() - d) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' yr' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' mo' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hr' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' min' + (interval > 1 ? 's' : '') + ' ago';
    return 'Just now';
  };

  // Load dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const res = await api.get('/users/me/stats');
        const d = res.data.data;
        setUpcomingBookings(d.upcomingBookings || []);
        setDrivingRides(d.drivingRides || []);
        setStats({
          totalBookings: d.totalBookings || 0,
          completedTrips: d.completedTrips || 0,
          ridesOffered: d.ridesOffered || 0,
          passengersTransported: d.passengersTransported || 0,
          averageRating: d.averageRating || 5.0,
          reliabilityScore: d.reliabilityScore || 100,
          recentActivity: d.recentActivity || [],
          greenCredits: d.greenCredits ?? 850,
          co2SavedKg: d.co2SavedKg ?? 125.5,
          monthlyGoalKg: d.monthlyGoalKg ?? 200,
          monthlyProgressKg: d.monthlyProgressKg ?? 125,
        });
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // Load nearby rides for passengers using home location
  useEffect(() => {
    if (isRider) return;
    const fetchNearby = async () => {
      setLoadingNearby(true);
      try {
        const lat = user?.homeLocation?.latitude;
        const lng = user?.homeLocation?.longitude;
        const params = { limit: 6, status: 'active' };
        if (lat && lng) { params.lat = lat; params.lng = lng; params.radius = 25; }
        const res = await api.get('/rides', { params });
        setNearbyRides(res.data.data.rides || []);
      } catch (err) {
        console.error('Failed to load nearby rides:', err);
      } finally {
        setLoadingNearby(false);
      }
    };
    fetchNearby();
  }, [isRider, user]);

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setResendMessage('');
    try {
      const res = await api.post('/auth/resend-verification', { email: user?.email });
      setResendMessage(res.data.data?.message || 'Verification email sent!');
    } catch (err) {
      setResendMessage(err.response?.data?.message || 'Failed to resend email.');
    } finally {
      setResendingEmail(false);
    }
  };

  const roleBadge = isRider
    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">🚗 Rider</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">🧑‍💼 Co-Rider</span>;

  // Compact stat chip for the horizontal scroll row
  const StatChip = ({ title, value, icon, colorClass }) => (
    <div className="glass-panel flex-shrink-0 w-32 snap-start p-4 border border-[var(--border-subtle)] flex flex-col gap-3">
      <div className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm ${colorClass}`}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-[var(--text-primary)] tracking-tight leading-none">{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)] mt-1.5 leading-tight">{title}</div>
      </div>
    </div>
  );

  // Activity Feed Helper
  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking_pending':
      case 'booking_received':
        return { emoji: '⏳', bg: 'bg-amber-500/10 border-amber-500/20' };
      case 'booking_accepted':
      case 'ride_completed':
        return { emoji: '✅', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      case 'booking_rejected':
        return { emoji: '❌', bg: 'bg-red-500/10 border-red-500/20' };
      case 'booking_cancelled':
      case 'ride_cancelled':
        return { emoji: '🚫', bg: 'bg-slate-700/20 border-slate-700/35' };
      case 'ride_published':
      default:
        return { emoji: '🚗', bg: 'bg-indigo-500/10 border-indigo-500/20' };
    }
  };

  // Bottom nav destinations — same hrefs as the original quick-action cards.
  // "My Rides" and "Manage Bookings" both pointed at /bookings, so they collapse
  // into a single "Bookings" tab here instead of appearing twice in the bar.
  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    isRider
      ? {
          href: '/create-ride',
          label: 'Offer',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ),
        }
      : {
          href: '/search',
          label: 'Find',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          ),
        },
    {
      href: '/bookings',
      label: 'Bookings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      href: '/green-credits',
      label: 'Green',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21C7 17.5 4 14 4 9.5A5.5 5.5 0 0112 5a5.5 5.5 0 018 4.5c0 4.5-3 8-8 11.5z" />
        </svg>
      ),
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-[calc(100dvh-73px)] relative">
      <div className="w-full pb-32">

        {/* ── Sticky compact app bar ── */}
        <div className="sticky top-0 z-30 glass-panel rounded-none border-x-0 border-t-0 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 py-3 flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user?.firstName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">Hey {user?.firstName}</p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">{getGreeting()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {roleBadge}
            {stats.averageRating && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                ⭐ {Number(stats.averageRating).toFixed(1)}
              </span>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 pt-5 space-y-6">

          {/* Profile Completion banner embedded if incomplete */}
          {!isComplete && (
            <div className="transition-all duration-300">
              <ProfileCompletionBanner compact={true} />
            </div>
          )}

          {/* Unverified Email Banner */}
          {/*
          {user && user.isEmailVerified === false && (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-amber-400 font-bold text-sm flex items-center gap-2">
                  <span>⚠️</span> Email Not Verified
                </h3>
                <p className="text-amber-200/80 text-xs mt-1">
                  You must verify your @st.com email address to create or book rides.
                </p>
                {resendMessage && (
                  <p className="text-amber-300 font-medium text-xs mt-2">{resendMessage}</p>
                )}
              </div>
              <button
                onClick={handleResendVerification}
                disabled={resendingEmail}
                className="whitespace-nowrap px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {resendingEmail ? 'Sending...' : 'Resend Email'}
              </button>
            </div>
          )}
          */}

          {/* ── Statistics: horizontal snap-scroll chip row ── */}
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2 uppercase tracking-widest">
              <span className="w-1.5 h-4 rounded bg-indigo-400 block" />
              Your Statistics
            </h2>

            {loadingStats ? (
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-32 h-24 flex-shrink-0 bg-slate-850/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar">
                {isRider ? (
                  <>
                    <StatChip title="Rides Offered" value={stats.ridesOffered} icon="🚗" colorClass="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" />
                    <StatChip title="Passengers" value={stats.passengersTransported} icon="🧑‍🤝‍🧑" colorClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" />
                    <StatChip title="Avg Rating" value={Number(stats.averageRating).toFixed(1)} icon="⭐" colorClass="bg-amber-500/10 text-amber-400 border border-amber-500/20" />
                    <StatChip title="Reliability" value={`${stats.reliabilityScore}%`} icon="📈" colorClass="bg-violet-500/10 text-violet-400 border border-violet-500/20" />
                  </>
                ) : (
                  <>
                    <StatChip title="Bookings" value={stats.totalBookings} icon="📋" colorClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" />
                    <StatChip title="Completed" value={stats.completedTrips} icon="🌍" colorClass="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" />
                    <StatChip title="Avg Rating" value={Number(stats.averageRating).toFixed(1)} icon="⭐" colorClass="bg-amber-500/10 text-amber-400 border border-amber-500/20" />
                    <StatChip title="Reliability" value={`${stats.reliabilityScore}%`} icon="📈" colorClass="bg-violet-500/10 text-violet-400 border border-violet-500/20" />
                  </>
                )}
                <StatChip title="CO2 Saved" value={`${stats.co2SavedKg}kg`} icon="🌱" colorClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" />
              </div>
            )}
          </div>

          {/* ── Main feed: single column on mobile, two columns on large screens ── */}
          <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start space-y-6 lg:space-y-0">
          <div className="lg:col-span-2 space-y-6">

          {/* ── Upcoming Activity ── */}
          <div className="glass-panel overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-widest text-xs">
                <span className="w-1.5 h-1.5 bg-[var(--primary-base)] rounded-sm animate-pulse" />
                Upcoming
              </h2>
              <Link href="/bookings" className="text-[10px] text-[var(--primary-base)] hover:text-[var(--primary-hover)] uppercase font-bold tracking-widest transition">
                View all →
              </Link>
            </div>
            <div className="p-4">
              {loadingStats ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-16 bg-slate-850/50 rounded-xl animate-pulse" />)}
                </div>
              ) : isRider ? (
                drivingRides.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <span className="text-3xl block mb-2">🚗</span>
                    <p className="text-sm">No upcoming rides scheduled.</p>
                    <Link href="/create-ride" className="mt-3 inline-block text-emerald-400 text-sm font-semibold hover:text-emerald-300 transition">
                      Create your first ride →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {drivingRides.slice(0, 3).map(ride => (
                      <Link
                        key={ride._id}
                        href={`/ride-details?id=${ride._id}`}
                        className="flex items-center justify-between p-3.5 bg-[var(--primary-base)]/10 rounded-xl border border-[var(--primary-base)]/20 hover:border-[var(--primary-base)]/40 transition group"
                      >
                        <div className="flex-1 min-w-0 pr-3 overflow-hidden">
                          <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary-base)] transition truncate">
                            {ride.pickupLocation?.address || ride.source} → {ride.destinationLocation?.address || ride.destination}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{fmtTime(ride)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {ride.availableSeats} seats
                          </span>
                          {ride.pendingRequests > 0 && (
                            <p className="text-[11px] text-amber-400 mt-1 font-semibold whitespace-nowrap">
                              {ride.pendingRequests} pending
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              ) : (
                upcomingBookings.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <span className="text-3xl block mb-2">📅</span>
                    <p className="text-sm">No upcoming bookings.</p>
                    <Link href="/search" className="mt-3 inline-block text-emerald-400 text-sm font-semibold hover:text-emerald-300 transition">
                      Find a ride →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.slice(0, 3).map(booking => (
                      <Link
                        key={booking._id}
                        href={`/ride-details?id=${booking.ride?._id}`}
                        className="flex items-center justify-between p-3.5 bg-[var(--primary-base)]/10 rounded-xl border border-[var(--primary-base)]/20 hover:border-[var(--primary-base)]/40 transition group"
                      >
                        <div className="flex-1 min-w-0 pr-3 overflow-hidden">
                          <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary-base)] transition truncate">
                            {booking.ride?.pickupLocation?.address || booking.ride?.source} → {booking.ride?.destinationLocation?.address || booking.ride?.destination}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{fmtTime(booking.ride)}</p>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 whitespace-nowrap ${
                          booking.bookingStatus === 'confirmed'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-950 text-amber-400 border-amber-500/20'
                        }`}>
                          {booking.bookingStatus}
                        </span>
                      </Link>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          {/* ── Nearby Rides Feed (Only for Co-Riders) ── */}
          {!isRider && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-widest">
                  <span className="w-1.5 h-4 rounded bg-emerald-400 block" />
                  {user?.homeLocation?.latitude ? 'Near You' : 'Available Rides'}
                </h2>
                <Link href="/search" className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold transition uppercase tracking-widest">
                  Filters →
                </Link>
              </div>

              {loadingNearby ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-slate-850/50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : nearbyRides.length === 0 ? (
                <div className="glass-panel py-12 text-center text-[var(--text-muted)]">
                  <span className="text-3xl block mb-2 opacity-50">📡</span>
                  <p className="text-sm font-bold uppercase tracking-wider">No active rides nearby.</p>
                  <p className="text-xs mt-1 px-6">Check back later or set your home location in Profile settings.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nearbyRides.map(ride => (
                    <Link
                      key={ride._id}
                      href={`/ride-details?id=${ride._id}`}
                      className="group glass-panel p-4 block active:scale-[0.98] transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-sm font-bold text-slate-100 truncate group-hover:text-emerald-400 transition">
                            {ride.pickupLocation?.address || ride.source}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <span>↓</span> {ride.destinationLocation?.address || ride.destination}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                          ₹{ride.pricePerSeat}/seat
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{fmtTime(ride)}</span>
                        <span className={`font-semibold ${ride.availableSeats <= 1 ? 'text-red-400' : 'text-slate-400'}`}>
                          {ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''} left
                        </span>
                      </div>

                      {ride.driver && (
                        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                            {ride.driver.firstName?.[0]}
                          </div>
                          <span className="text-xs text-slate-400">{ride.driver.firstName} {ride.driver.lastName}</span>
                          {ride.driver.averageRating && (
                            <span className="ml-auto text-xs text-amber-400 font-semibold">⭐ {ride.driver.averageRating.toFixed(1)}</span>
                          )}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          </div>

          <div className="lg:col-span-1 space-y-6">

          {/* ── Eco Impact Visualizer ── */}
          <div className="glass-panel p-5 relative overflow-hidden border border-emerald-500/15 bg-gradient-to-br from-emerald-950/20 to-transparent">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h2 className="font-bold text-[var(--text-primary)] uppercase tracking-widest text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Monthly Eco Goal
              </h2>
              <Link href="/green-credits" className="text-[10px] text-emerald-400 hover:text-emerald-300 uppercase font-bold tracking-widest transition">
                View →
              </Link>
            </div>

            {loadingStats ? (
              <div className="h-4 bg-slate-850/50 rounded-full animate-pulse" />
            ) : (
              <div className="relative z-10">
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-bold text-emerald-400 tracking-tight">
                    {stats.monthlyProgressKg}<span className="text-sm text-[var(--text-secondary)] font-medium"> / {stats.monthlyGoalKg} kg</span>
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 ease-out animate-pulse"
                    style={{ width: `${Math.min(100, (stats.monthlyProgressKg / (stats.monthlyGoalKg || 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-3">
                  Awesome! Your carpooling has saved the equivalent of planting 6 trees this month 🌳.
                </p>
              </div>
            )}
          </div>

          {/* ── Recent Activity Timeline Feed ── */}
          <div className="glass-panel p-5 relative overflow-hidden">
            <h2 className="font-bold text-[var(--text-primary)] mb-5 uppercase tracking-widest text-xs flex items-center gap-2">
              <span className="text-base">⚡</span> Telemetry Log
            </h2>

            {loadingStats ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-850 animate-pulse" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-slate-850 rounded animate-pulse w-3/4" />
                      <div className="h-2 bg-slate-850 rounded animate-pulse w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                No recent activities recorded.
              </div>
            ) : (
              <div className="relative border-l-2 border-[var(--border-subtle)] ml-4 pl-6 space-y-6 mt-3">
                {stats.recentActivity.map((activity, idx) => {
                  const iconConfig = getActivityIcon(activity.type);
                  return (
                    <div key={idx} className="relative group">
                      <div className={`absolute -left-[37px] top-0 w-7 h-7 rounded-full shadow-lg border-4 border-[var(--bg-surface)] flex items-center justify-center text-xs ${iconConfig.bg} z-10 transition-transform duration-300 group-hover:scale-110`}>
                        {iconConfig.emoji}
                      </div>

                      <div className="bg-[var(--bg-surface)]/50 p-3.5 rounded-2xl border border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-surface)]">
                        <p className="text-sm font-semibold text-[var(--text-primary)] transition">
                          {activity.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {getRelativeTime(activity.time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          </div>
          </div>

        </div>
      </div>

      {/* ── Floating bottom tab bar ── */}
      <nav
        className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40 rounded-3xl border border-white/10 bg-[var(--bg-surface)]/50 backdrop-blur-2xl shadow-2xl shadow-black/40"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch justify-between px-2 py-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-colors ${
                  active ? 'text-emerald-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                  active ? 'bg-emerald-500/15' : ''
                }`}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;