import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import api from '../../services/api.js';
import ProfileCompletionBanner, { useProfileCompletion } from '../../components/ProfileCompletionBanner.jsx';

/**
 * Authenticated dashboard — protected route at `/`.
 * Shows role-specific widgets:
 *   - Rider (hybrid): Offer a Ride + Find a Ride action cards + rides they're driving + rider statistics + recent activity feed
 *   - Co-Rider (passenger): Nearby Rides feed + upcoming bookings + passenger statistics + recent activity feed
 */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isRider = user?.role === 'hybrid';
  const { isComplete, percentage } = useProfileCompletion();

  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [drivingRides, setDrivingRides] = useState([]);
  const [nearbyRides, setNearbyRides] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(!isRider);

  const [stats, setStats] = useState({
    totalBookings: 0,
    completedTrips: 0,
    ridesOffered: 0,
    passengersTransported: 0,
    averageRating: 5.0,
    reliabilityScore: 100,
    recentActivity: [],
  });

  // Greeting based on time of day
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Format departure time nicely
  const fmtTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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

  const roleBadge = isRider
    ? <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">🚗 Rider</span>
    : <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">🧑‍💼 Co-Rider</span>;

  // Custom Stat Card Component
  const StatCard = ({ title, value, icon, colorClass, glowClass }) => (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 transition-all duration-300 hover:border-slate-700/80 hover:shadow-lg group relative overflow-hidden">
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-xl ${glowClass}`} />
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-slate-400">{title}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-extrabold text-slate-100 tracking-tight">{value}</div>
    </div>
  );

  // Custom Action Card Component
  const ActionCard = ({ to, title, description, icon, theme }) => {
    const themes = {
      emerald: {
        border: 'hover:border-emerald-500/30 hover:shadow-emerald-500/5',
        iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20',
        text: 'text-emerald-400'
      },
      indigo: {
        border: 'hover:border-indigo-500/30 hover:shadow-indigo-500/5',
        iconBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20',
        text: 'text-indigo-400'
      },
      violet: {
        border: 'hover:border-violet-500/30 hover:shadow-violet-500/5',
        iconBg: 'bg-violet-500/10 border-violet-500/20 text-violet-400 group-hover:bg-violet-500/20',
        text: 'text-violet-400'
      },
      amber: {
        border: 'hover:border-amber-500/30 hover:shadow-amber-500/5',
        iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20',
        text: 'text-amber-400'
      }
    };

    const t = themes[theme] || themes.indigo;

    return (
      <Link
        to={to}
        className={`group glass-panel rounded-2xl p-6 border border-slate-800/80 ${t.border} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
      >
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 ${t.iconBg}`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-1 group-hover:text-slate-200 transition">{title}</h3>
        <p className="text-slate-400 text-xs leading-relaxed">{description}</p>
        <div className={`mt-4 flex items-center gap-1.5 ${t.text} text-xs font-semibold`}>
          Go now <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </Link>
    );
  };

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

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 relative">
      {/* Ambient glow backgrounds */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-2/3 right-1/4 w-80 h-80 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative">
        
        {/* ── SECTION 1: Welcome Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-slate-400 text-sm mb-1">{getGreeting()},</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              {user?.firstName} {user?.lastName}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {roleBadge}
            {stats.averageRating && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                ⭐ {Number(stats.averageRating).toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Profile Completion banner embedded if incomplete */}
        {!isComplete && (
          <div className="transition-all duration-300">
            <ProfileCompletionBanner compact={true} />
          </div>
        )}

        {/* ── SECTION 2: Quick Actions Grid ── */}
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded bg-emerald-400 block" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {isRider ? (
              <>
                <ActionCard
                  to="/create-ride"
                  title="Offer a Ride"
                  description="Publish a new commute route, set price per seat, and carry colleagues."
                  icon={<svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                  theme="emerald"
                />
                <ActionCard
                  to="/bookings"
                  title="My Rides"
                  description="Manage the status of active and past rides you are driving."
                  icon={<svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
                  theme="indigo"
                />
                <ActionCard
                  to="/bookings"
                  title="Manage Bookings"
                  description="Review pending passenger requests, confirmations, and reports."
                  icon={<svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                  theme="violet"
                />
                <ActionCard
                  to="/profile"
                  title="View Profile"
                  description="Update details, add home starting location, and specify vehicle."
                  icon={<svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                  theme="amber"
                />
              </>
            ) : (
              <>
                <ActionCard
                  to="/search"
                  title="Find a Ride"
                  description="Search available commutes to ST office and book seats instantly."
                  icon={<svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                  theme="emerald"
                />
                <ActionCard
                  to="/bookings"
                  title="My Bookings"
                  description="Track passenger bookings, departure details, and cancellations."
                  icon={<svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                  theme="indigo"
                />
                <ActionCard
                  to="/profile"
                  title="Personal Profile"
                  description="Manage email, saved locations, phone, bio and preferences."
                  icon={<svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                  theme="violet"
                />
              </>
            )}
          </div>
        </div>

        {/* ── SECTION 3 & SECTION 4 / SECTION 5 (Two Column Grid) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Columns (Upcoming Activities & Nearby Rides) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Upcoming Activities */}
            <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
                <h2 className="font-bold text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Upcoming Activity
                </h2>
                <Link to="/bookings" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition">
                  View all →
                </Link>
              </div>
              <div className="p-6">
                {loadingStats ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => <div key={i} className="h-16 bg-slate-850/50 rounded-xl animate-pulse" />)}
                  </div>
                ) : isRider ? (
                  // Rider list
                  drivingRides.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <span className="text-3xl block mb-2">🚗</span>
                      <p className="text-sm">No upcoming rides scheduled.</p>
                      <Link to="/create-ride" className="mt-3 inline-block text-emerald-400 text-sm font-semibold hover:text-emerald-300 transition">
                        Create your first ride →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {drivingRides.slice(0, 3).map(ride => (
                        <Link
                          key={ride._id}
                          to={`/rides/${ride._id}`}
                          className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-800/60 hover:border-slate-700 transition group"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition">
                              {ride.source} → {ride.destination}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{fmtTime(ride.departureTime)}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                              {ride.availableSeats} seats left
                            </span>
                            {ride.pendingRequests > 0 && (
                              <p className="text-xs text-amber-400 mt-1 font-semibold">
                                {ride.pendingRequests} pending request{ride.pendingRequests > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                ) : (
                  // Co-Rider list
                  upcomingBookings.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <span className="text-3xl block mb-2">📅</span>
                      <p className="text-sm">No upcoming bookings.</p>
                      <Link to="/search" className="mt-3 inline-block text-emerald-400 text-sm font-semibold hover:text-emerald-300 transition">
                        Find a ride →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingBookings.slice(0, 3).map(booking => (
                        <Link
                          key={booking._id}
                          to={`/rides/${booking.ride?._id}`}
                          className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-800/60 hover:border-slate-700 transition group"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition">
                              {booking.ride?.source} → {booking.ride?.destination}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{fmtTime(booking.ride?.departureTime)}</p>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
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

            {/* Nearby Rides Feed (Only for Co-Riders) */}
            {!isRider && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded bg-emerald-400 block" />
                    {user?.homeLocation?.latitude ? 'Rides Near You' : 'Available Rides'}
                  </h2>
                  <Link to="/search" className="text-sm text-emerald-400 hover:text-emerald-300 font-semibold transition">
                    Search with filters →
                  </Link>
                </div>

                {loadingNearby ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-36 bg-slate-850/50 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : nearbyRides.length === 0 ? (
                  <div className="glass-panel rounded-2xl border border-slate-800/80 py-16 text-center text-slate-500">
                    <span className="text-4xl block mb-3">🔍</span>
                    <p className="text-sm">No rides available right now.</p>
                    <p className="text-xs mt-1">Check back later or set your home location in Profile settings.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {nearbyRides.map(ride => (
                      <Link
                        key={ride._id}
                        to={`/rides/${ride._id}`}
                        className="group glass-panel rounded-2xl p-5 border border-slate-800/60 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-sm font-bold text-slate-100 truncate group-hover:text-emerald-400 transition">
                              {ride.source}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>↓</span> {ride.destination}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                            ₹{ride.pricePerSeat}/seat
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{fmtTime(ride.departureTime)}</span>
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

          {/* Right Column (Statistics Cards & Recent Activity Timeline) */}
          <div className="space-y-8">
            
            {/* Statistics */}
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded bg-indigo-400 block" />
                Your Statistics
              </h2>

              {loadingStats ? (
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-slate-850/50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                  {isRider ? (
                    <>
                      <StatCard
                        title="Rides Offered"
                        value={stats.ridesOffered}
                        icon="🚗"
                        colorClass="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        glowClass="bg-indigo-500"
                      />
                      <StatCard
                        title="Passengers Transported"
                        value={stats.passengersTransported}
                        icon="🧑‍🤝‍🧑"
                        colorClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        glowClass="bg-emerald-500"
                      />
                      <StatCard
                        title="Average Rating"
                        value={Number(stats.averageRating).toFixed(1)}
                        icon="⭐"
                        colorClass="bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        glowClass="bg-amber-500"
                      />
                      <StatCard
                        title="Reliability Score"
                        value={`${stats.reliabilityScore}%`}
                        icon="📈"
                        colorClass="bg-violet-500/10 text-violet-400 border border-violet-500/20"
                        glowClass="bg-violet-500"
                      />
                    </>
                  ) : (
                    <>
                      <StatCard
                        title="Total Bookings"
                        value={stats.totalBookings}
                        icon="📋"
                        colorClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        glowClass="bg-emerald-500"
                      />
                      <StatCard
                        title="Completed Trips"
                        value={stats.completedTrips}
                        icon="🌍"
                        colorClass="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        glowClass="bg-indigo-500"
                      />
                      <StatCard
                        title="Average Rating"
                        value={Number(stats.averageRating).toFixed(1)}
                        icon="⭐"
                        colorClass="bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        glowClass="bg-amber-500"
                      />
                      <StatCard
                        title="Reliability Score"
                        value={`${stats.reliabilityScore}%`}
                        icon="📈"
                        colorClass="bg-violet-500/10 text-violet-400 border border-violet-500/20"
                        glowClass="bg-violet-500"
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Recent Activity Timeline Feed */}
            <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
              <h2 className="text-lg font-bold text-slate-100 mb-5 flex items-center gap-2">
                ⏳ Recent Activity
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
                <div className="text-center py-8 text-slate-500 text-sm">
                  No recent activities recorded.
                </div>
              ) : (
                <div className="relative border-l border-slate-800/80 ml-4 pl-6 space-y-6">
                  {stats.recentActivity.map((activity, idx) => {
                    const iconConfig = getActivityIcon(activity.type);
                    return (
                      <div key={idx} className="relative group">
                        {/* Timeline node */}
                        <div className={`absolute -left-[37px] top-1.5 w-6 h-6 rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] ${iconConfig.bg}`}>
                          {iconConfig.emoji}
                        </div>
                        
                        <div>
                          <p className="text-xs font-semibold text-slate-300 group-hover:text-slate-100 transition">
                            {activity.message}
                          </p>
                          <span className="text-[10px] text-slate-500 block mt-1">
                            {getRelativeTime(activity.timestamp)}
                          </span>
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
  );
};

export default Dashboard;
