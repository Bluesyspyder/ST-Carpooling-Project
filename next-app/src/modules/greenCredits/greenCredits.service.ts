// @ts-nocheck

import User from "../users/user.model";
import Vehicle from "../vehicles/vehicle.model";
import Booking from "../bookings/booking.model";

const getBadge = (credits) => {
  if (credits >= 1000) return "Eco Legend";
  if (credits >= 600) return "Climate Hero";
  if (credits >= 300) return "Green Champion";
  if (credits >= 100) return "Eco Rider";
  return "Beginner";
};

const calculateGreenCredits = (
  distance,
  vehicleType,
  passengerCount
) => {

  const multipliers = {
    petrol: 1,
    diesel: 0.9,
    ev: 2,
  };

  const emissionFactor = {
    petrol: 0.19,
    diesel: 0.17,
    ev: 0.05,
  };

  const occupancyBonus =
    passengerCount >= 4
      ? 1.5
      : passengerCount === 3
      ? 1.2
      : 1;

  const multiplier = multipliers[vehicleType] || 1;

  const credits = Math.round(
    (distance * multiplier * occupancyBonus) / 5
  );

  const savedCO2 =
    (
      (emissionFactor[vehicleType] || 0.19) *
      distance *
      Math.max(passengerCount - 1, 0)
    );

  return {
    credits,
    savedCO2,
  };
};

export const awardGreenCredits = async (ride) => {

  if (ride.greenCreditsAwarded) {
    return;
  }

  const vehicle = await Vehicle.findById(
    ride.driverVehicle
  );

  if (!vehicle) return;

  const bookings = await Booking.find({
    ride: ride._id,
    bookingStatus: "confirmed",
  }).populate("passenger");

  const passengerCount = bookings.length + 1;

  const distance = ride.routeDistance || 0;

  const { credits, savedCO2 } =
    calculateGreenCredits(
      distance,
      vehicle.vehicleType,
      passengerCount
    );

  // Update Driver

  const driver = await User.findById(
    ride.driver
  );

  if (driver) {

    driver.greenCredits += credits;

    driver.totalCO2Saved += savedCO2;

    driver.sharedRides += 1;

    driver.greenBadge =
      getBadge(driver.greenCredits);

    await driver.save();

  }

  // Update Passengers

  for (const booking of bookings) {

    const passenger = booking.passenger;

    if (!passenger) continue;

    passenger.greenCredits += credits;

    passenger.totalCO2Saved += savedCO2;

    passenger.sharedRides += 1;

    passenger.greenBadge =
      getBadge(passenger.greenCredits);

    await passenger.save();

  }

  ride.greenCreditsAwarded = true;

  await ride.save();

};