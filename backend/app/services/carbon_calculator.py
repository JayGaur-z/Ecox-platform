from typing import Dict, Tuple
from app.models.enums import ChallengeCategory

# Emission factors (kg CO2 per standard unit) based on DEFRA / EPA greenhouse gas conversion factors
EMISSION_FACTORS: Dict[Tuple[str, str], float] = {
    # Transport (per km)
    ("car_commute", "km"): 0.171,
    ("car_diesel", "km"): 0.165,
    ("car_ev", "km"): 0.045,
    ("motorcycle", "km"): 0.103,
    ("bus", "km"): 0.089,
    ("train", "km"): 0.035,
    ("subway", "km"): 0.028,
    ("flight_domestic", "km"): 0.246,
    ("flight_longhaul", "km"): 0.148,
    ("bicycle", "km"): 0.0,
    ("walking", "km"): 0.0,

    # Energy (per kWh)
    ("electricity_grid", "kwh"): 0.420,
    ("natural_gas", "kwh"): 0.202,
    ("lpg", "kwh"): 0.214,
    ("solar_solar", "kwh"): 0.0,

    # Food (per serving or kg)
    ("beef_meal", "serving"): 6.50,
    ("beef_meal", "kg"): 27.0,
    ("lamb_meal", "serving"): 5.50,
    ("pork_meal", "serving"): 2.40,
    ("poultry_meal", "serving"): 1.82,
    ("fish_meal", "serving"): 1.60,
    ("dairy_cheese", "kg"): 13.5,
    ("dairy_milk", "liter"): 1.30,
    ("vegetarian_meal", "serving"): 0.70,
    ("vegan_meal", "serving"): 0.40,

    # Waste (per kg)
    ("waste_landfill", "kg"): 0.580,
    ("waste_recycled", "kg"): 0.021,
    ("compost", "kg"): 0.010,

    # Water (per liter / cubic meter)
    ("tap_water", "liter"): 0.0003,
    ("tap_water", "m3"): 0.344,
    ("hot_water", "liter"): 0.0055,

    # Other
    ("clothing_purchase", "item"): 15.0,
    ("electronics_small", "item"): 25.0,
}

# Default factor per category when specific activity is not found
CATEGORY_DEFAULTS: Dict[ChallengeCategory, float] = {
    ChallengeCategory.TRANSPORT: 0.15,
    ChallengeCategory.ENERGY: 0.35,
    ChallengeCategory.WASTE: 0.50,
    ChallengeCategory.WATER: 0.001,
    ChallengeCategory.FOOD: 1.5,
    ChallengeCategory.OTHER: 1.0,
}


def calculate_co2(
    category: ChallengeCategory,
    activity_type: str,
    quantity: float,
    unit: str,
) -> float:
    """
    Computes estimated CO2 in kg based on activity type, unit, and quantity.
    """
    activity_key = (activity_type.strip().lower(), unit.strip().lower())
    if activity_key in EMISSION_FACTORS:
        factor = EMISSION_FACTORS[activity_key]
    else:
        # Check partial activity match with unit
        matched_factor = None
        for (act, u), f in EMISSION_FACTORS.items():
            if act in activity_type.lower() and u == unit.lower():
                matched_factor = f
                break
        if matched_factor is not None:
            factor = matched_factor
        else:
            factor = CATEGORY_DEFAULTS.get(category, 1.0)

    calculated = quantity * factor
    return round(max(calculated, 0.0), 3)
