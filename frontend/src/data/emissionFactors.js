// Approximate prototype emission factors
// FUTURE: Replace with scientific carbon databases

export const emissionFactors = {
    transport: {
        car: 0.21,    // kg CO₂ per km
        bike: 0.10,   // kg CO₂ per km (motorbike)
        bus: 0.08,    // kg CO₂ per km
        train: 0.04,  // kg CO₂ per km
    },
    electricity: 0.70, // kg CO₂ per kWh (India grid average)
    food: {
        vegetarian: 50,    // kg CO₂ per month
        mixed: 100,        // kg CO₂ per month
        nonVegetarian: 150, // kg CO₂ per month
    },
    waste: 0.57, // kg CO₂ per kg waste
};

export const DISCLAIMER = 'Approximate prototype emission factors for educational purposes only.';
