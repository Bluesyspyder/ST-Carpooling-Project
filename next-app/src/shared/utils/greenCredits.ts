export function calculateGreenCredits(
    distance: number,
    vehicleType: string,
    passengerCount: number
){
    const multipliers = {
        petrol:1,
        diesel:0.9,
        ev:2
    };

    const multiplier =
        multipliers[vehicleType] || 1;

    const occupancyBonus =
        passengerCount >=4
            ?1.5
            : passengerCount===3
            ?1.2
            :1;

    const credits = Math.round(
        distance*
        multiplier*
        occupancyBonus/
        5
    );

    const emissionFactor = {
        petrol:0.19,
        diesel:0.17,
        ev:0.05
    };

    const savedCO2 =
        (
            emissionFactor[vehicleType]*
            distance*
            Math.max(passengerCount-1,0)
        );

    return{
        credits,
        savedCO2
    };
}