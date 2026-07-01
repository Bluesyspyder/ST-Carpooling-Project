// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as rideService from '@/modules/rides/ride.service';
import Booking from '@/modules/bookings/booking.model';

export const GET = apiHandler(async (req, { params, user }) => {
  // Basic TSP Route Optimization Ported from Express
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => { const R = 6371; const dLat = ((lat2 - lat1) * Math.PI) / 180; const dLng = ((lng2 - lng1) * Math.PI) / 180; const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); };
  const routeCost = (perm: any, points: any, origin: any, dest: any) => { let cost = haversineKm(origin.lat, origin.lng, points[perm[0]].lat, points[perm[0]].lng); for (let i = 0; i < perm.length - 1; i++) { cost += haversineKm(points[perm[i]].lat, points[perm[i]].lng, points[perm[i + 1]].lat, points[perm[i + 1]].lng); } cost += haversineKm(points[perm[perm.length - 1]].lat, points[perm[perm.length - 1]].lng, dest.lat, dest.lng); return cost; };
  const permutations = (arr: any): any => { if (arr.length <= 1) return [arr]; const result = []; for (let i = 0; i < arr.length; i++) { const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]; for (const p of permutations(rest)) result.push([arr[i], ...p]); } return result; };
  const nearestNeighbor = (points: any, origin: any) => { const remaining = points.map((_: any, i: any) => i); const order = []; let current = origin; while (remaining.length > 0) { let best = null, bestDist = Infinity; for (const idx of remaining) { const d = haversineKm(current.lat, current.lng, points[idx].lat, points[idx].lng); if (d < bestDist) { bestDist = d; best = idx; } } order.push(best); current = points[best]; remaining.splice(remaining.indexOf(best), 1); } return order; };
  const ride = await rideService.getRideById(params!.id);
  if (ride.driver._id.toString() !== user.id) throw new ApiError(403, 'Only the ride driver can access route optimization.');
  const bookings = await Booking.find({ ride: ride._id, bookingStatus: 'confirmed' }).populate('passenger', 'firstName lastName profileImage phone');
  if (bookings.length === 0) return NextResponse.json({ status: 'success', data: { orderedWaypoints: [], totalDistanceKm: 0, algorithm: 'none', message: 'No confirmed passengers yet.' } }, { status: 200 });
  const pickupPoints = bookings.map((b: any, i: any) => ({ idx: i, lat: b.pickupLocation.latitude, lng: b.pickupLocation.longitude, booking: b }));
  const origin = { lat: ride.pickupLocation.latitude, lng: ride.pickupLocation.longitude };
  const dest = { lat: ride.destinationLocation?.latitude ?? ride.pickupLocation.latitude, lng: ride.destinationLocation?.longitude ?? ride.pickupLocation.longitude };
  let bestOrder: any, algorithm: any;
  if (pickupPoints.length <= 8) { algorithm = 'brute-force-tsp'; const indices = pickupPoints.map((_: any, i: any) => i); let bestCost = Infinity; for (const perm of permutations(indices)) { const cost = routeCost(perm, pickupPoints, origin, dest); if (cost < bestCost) { bestCost = cost; bestOrder = perm; } } } else { algorithm = 'nearest-neighbor-heuristic'; bestOrder = nearestNeighbor(pickupPoints, origin); }
  const orderedWaypoints = bestOrder.map((idx: any, position: any) => { const pt = pickupPoints[idx]; return { position: position + 1, lat: pt.lat, lng: pt.lng, address: pt.booking.pickupLocation.address, passenger: { id: pt.booking.passenger._id, firstName: pt.booking.passenger.firstName, lastName: pt.booking.passenger.lastName, phone: pt.booking.passenger.phone, profileImage: pt.booking.passenger.profileImage }, bookingId: pt.booking._id, seatsBooked: pt.booking.seatsBooked }; });
  let totalDistanceKm = haversineKm(origin.lat, origin.lng, pickupPoints[bestOrder[0]].lat, pickupPoints[bestOrder[0]].lng); for (let i = 0; i < bestOrder.length - 1; i++) { totalDistanceKm += haversineKm(pickupPoints[bestOrder[i]].lat, pickupPoints[bestOrder[i]].lng, pickupPoints[bestOrder[i + 1]].lat, pickupPoints[bestOrder[i + 1]].lng); } totalDistanceKm += haversineKm(pickupPoints[bestOrder[bestOrder.length - 1]].lat, pickupPoints[bestOrder[bestOrder.length - 1]].lng, dest.lat, dest.lng);
  return NextResponse.json({ status: 'success', data: { orderedWaypoints, totalDistanceKm: Math.round(totalDistanceKm * 10) / 10, passengerCount: pickupPoints.length, algorithm, origin: { lat: origin.lat, lng: origin.lng, address: ride.pickupLocation.address }, destination: { lat: dest.lat, lng: dest.lng, address: ride.destinationLocation?.address ?? ride.pickupLocation.address } } }, { status: 200 });
}, { protect: true });

