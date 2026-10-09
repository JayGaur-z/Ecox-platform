// Carbon calculator logic
// FUTURE: Replace with AI-powered backend calculation API

import { emissionFactors } from '../data/emissionFactors';

/**
 * Calculate monthly carbon footprint from user inputs
 * @param {Object} inputs
 * @returns {Object} result with total and breakdown
 */
export const calculateFootprint = (inputs) => {
    const {
        carKmPerWeek = 0,
        bikeKmPerWeek = 0,
        busKmPerWeek = 0,
        trainKmPerWeek = 0,
        electricityUnitsPerMonth = 0,
        foodType = 'mixed',
        wasteKgPerWeek = 0,
    } = inputs;

    // Transport (weekly → monthly × 4.33)
    const transportKg =
        (Number(carKmPerWeek) * emissionFactors.transport.car +
            Number(bikeKmPerWeek) * emissionFactors.transport.bike +
            Number(busKmPerWeek) * emissionFactors.transport.bus +
            Number(trainKmPerWeek) * emissionFactors.transport.train) *
        4.33;

    // Electricity (monthly units × factor)
    const electricityKg =
        Number(electricityUnitsPerMonth) * emissionFactors.electricity;

    // Food (monthly flat based on diet)
    const foodKg = emissionFactors.food[foodType] || emissionFactors.food.mixed;

    // Waste (weekly → monthly)
    const wasteKg = Number(wasteKgPerWeek) * emissionFactors.waste * 4.33;

    const total = transportKg + electricityKg + foodKg + wasteKg;

    const breakdown = [
        { name: 'Transport', value: parseFloat(transportKg.toFixed(1)), color: '#16a34a' },
        { name: 'Electricity', value: parseFloat(electricityKg.toFixed(1)), color: '#22c55e' },
        { name: 'Food', value: parseFloat(foodKg.toFixed(1)), color: '#4ade80' },
        { name: 'Waste', value: parseFloat(wasteKg.toFixed(1)), color: '#86efac' },
    ];

    const biggestSource = breakdown.reduce((a, b) => (a.value > b.value ? a : b));

    // Reduction suggestions based on biggest source
    const suggestions = generateSuggestions(breakdown, biggestSource.name);

    return {
        total: parseFloat(total.toFixed(1)),
        breakdown,
        biggestSource: biggestSource.name,
        suggestions,
    };
};

const generateSuggestions = (breakdown, biggestSource) => {
    const sugg = [];

    if (breakdown.find((b) => b.name === 'Transport')?.value > 20) {
        sugg.push({
            category: 'Transport',
            emoji: '🚍',
            title: 'Use Public Transport',
            potentialReduction: 8.4,
            action: 'Replace 2 car trips per week with bus or train.',
            challengeId: 'ch-001',
        });
        sugg.push({
            category: 'Transport',
            emoji: '🚲',
            title: 'Cycle to Campus',
            potentialReduction: 5.2,
            action: 'Ride your bicycle to college at least 3 times per week.',
            challengeId: 'ch-006',
        });
    }

    if (breakdown.find((b) => b.name === 'Electricity')?.value > 30) {
        sugg.push({
            category: 'Energy',
            emoji: '💡',
            title: 'Reduce Electricity Usage',
            potentialReduction: 5.2,
            action: 'Switch off unused lights and appliances. Unplug chargers.',
            challengeId: 'ch-004',
        });
    }

    if (breakdown.find((b) => b.name === 'Food')?.value >= 100) {
        sugg.push({
            category: 'Food',
            emoji: '🥗',
            title: 'Try Meatless Monday',
            potentialReduction: 3.5,
            action: 'Go vegetarian at least one day per week.',
            challengeId: 'ch-005',
        });
    }

    if (breakdown.find((b) => b.name === 'Waste')?.value > 5) {
        sugg.push({
            category: 'Waste',
            emoji: '♻️',
            title: 'Sort Your Waste',
            potentialReduction: 2.1,
            action: 'Separate recyclables and non-recyclables daily.',
            challengeId: 'ch-003',
        });
    }

    // Always show plant a tree
    sugg.push({
        category: 'Nature',
        emoji: '🌳',
        title: 'Plant a Tree',
        potentialReduction: 5.0,
        action: 'A single tree can absorb 21 kg CO₂ per year.',
        challengeId: 'ch-002',
    });

    return sugg;
};
