// @ts-nocheck
import Booking from '@/modules/bookings/booking.model';
import User from '@/modules/users/user.model';

const CREDIT_MULTIPLIER = { petrol: 1, diesel: 0.9, ev: 2 };
const EMISSION_FACTOR = { petrol: 0.19, diesel: 0.17, ev: 0.05 }; // kg CO2 per km per car

const BADGE_TIERS = [
  { threshold: 1000, name: 'Eco Legend' },
  { threshold: 600, name: 'Climate Hero' },
  { threshold: 300, name: 'Green Champion' },
  { threshold: 100, name: 'Eco Rider' },
  { threshold: 0, name: 'Beginner' },
];

export function calculateGreenImpact(distanceKm, vehicleType, passengerCount) {
  const occupancyBonus = passengerCount >= 4 ? 1.5 : passengerCount === 3 ? 1.2 : 1;
  const credits = Math.round((distanceKm * (CREDIT_MULTIPLIER[vehicleType] ?? 1) * occupancyBonus) / 5);
  const co2Saved = (EMISSION_FACTOR[vehicleType] ?? 0.19) * distanceKm * Math.max(passengerCount - 1, 0);
  return { credits, co2Saved };
}

export function badgeForCredits(credits) {
  return BADGE_TIERS.find((tier) => credits >= tier.threshold).name;
}

export function nextBadgeInfo(credits) {
  const currentIndex = BADGE_TIERS.findIndex((tier) => credits >= tier.threshold);
  const next = BADGE_TIERS[currentIndex - 1] || null;
  return {
    nextBadge: next ? next.name : null,
    creditsToNextBadge: next ? next.threshold - credits : 0,
  };
}

export async function awardGreenCredits(ride) {
  if (ride.greenCreditsAwarded || !ride.routeDistance) return;

  const confirmedBookings = await Booking.find({ ride: ride._id, bookingStatus: 'confirmed' });
  const passengerSeats = confirmedBookings.reduce((sum, b) => sum + (b.seatsBooked || 1), 0);
  const passengerCount = passengerSeats + 1; // include driver

  const vehicleType = ride.driverVehicle?.vehicleType;
  const { credits, co2Saved } = calculateGreenImpact(ride.routeDistance, vehicleType, passengerCount);

  const recipientIds = [ride.driver.toString(), ...confirmedBookings.map((b) => b.passenger.toString())];

  for (const recipientId of recipientIds) {
    const updated = await User.findByIdAndUpdate(
      recipientId,
      { $inc: { greenCredits: credits, totalCO2Saved: co2Saved, sharedRides: 1 } },
      { new: true }
    );
    if (updated) {
      updated.greenBadge = badgeForCredits(updated.greenCredits);
      await updated.save();
    }
  }

  ride.greenCreditsAwarded = true;
  await ride.save();
}
