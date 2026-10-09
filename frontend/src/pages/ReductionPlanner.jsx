import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getCalcResult } from '../utils/localStorage';
import { getReductionPlanAPI } from '../services/api';
import { ArrowRight, TrendingDown, Info, Sparkles, Check, Compass } from 'lucide-react';

const catColor = {
    Transport: 'border-blue-200 bg-blue-50/60',
    Energy: 'border-yellow-200 bg-yellow-50/60',
    Nature: 'border-green-200 bg-green-50/60',
    Food: 'border-emerald-200 bg-emerald-50/60',
    Waste: 'border-amber-200 bg-amber-50/60',
    General: 'border-gray-200 bg-gray-50/60',
};

// Vegetarian/Vegan compliant fallback suggestions (Strictly NO "meatless Mondays" or "eat less meat")
const getVegCompliantFallbacks = (isVeg, highestCat = 'Transport') => {
    const list = [];

    // Tailored priority based on highest emission category
    if (highestCat?.toLowerCase() === 'transport') {
        list.push({
            category: 'Transport',
            emoji: '🚍',
            title: 'Campus Transit & Carpool Priority',
            potentialReduction: 9.2,
            action: 'Switch 3 weekly commute trips to electric campus buses or shared student rides.',
            challengeId: '1',
        });
    } else if (highestCat?.toLowerCase() === 'energy') {
        list.push({
            category: 'Energy',
            emoji: '⚡',
            title: 'Dorm & Home Power Optimization',
            potentialReduction: 7.8,
            action: 'Eliminate phantom standby loads and utilize cold-wash cycles for laundry.',
            challengeId: '4',
        });
    }

    if (isVeg) {
        list.push(
            {
                category: 'Food',
                emoji: '🥬',
                title: 'Local Seasonal Procurement',
                potentialReduction: 4.0,
                action: 'Source fresh seasonal produce from local growers within 50 km to slash long-distance refrigerated freight emissions.',
                challengeId: '5',
            },
            {
                category: 'Waste',
                emoji: '🌱',
                title: 'Compost Organic Food Scraps',
                potentialReduction: 3.4,
                action: 'Compost all vegetable peels, fruit rinds, and organic food scraps to prevent anaerobic methane release in landfills.',
                challengeId: '3',
            },
            {
                category: 'Energy',
                emoji: '🍲',
                title: 'Energy-Efficient Induction Cooking',
                potentialReduction: 2.8,
                action: 'Adopt magnetic induction cooktops and thermal pressure pots over open gas burners.',
                challengeId: '4',
            },
            {
                category: 'Waste',
                emoji: '📦',
                title: 'Bulk Storage & Minimal Packaging',
                potentialReduction: 2.2,
                action: 'Procure dry legumes, grains, and kitchen staples in bulk to eliminate single-use plastic packaging and freight.',
                challengeId: '3',
            }
        );
    } else {
        list.push({
            category: 'Food',
            emoji: '🥗',
            title: 'Plant-Forward Meals & Meat Reduction',
            potentialReduction: 5.5,
            action: 'Replace 2–3 meat-heavy meals weekly with protein-dense legumes, beans, and whole grains.',
            challengeId: '5',
        });
    }

    list.push({
        category: 'Nature',
        emoji: '🌳',
        title: 'Plant a Native Tree',
        potentialReduction: 5.0,
        action: 'A single native sapling sequesters up to 21 kg CO₂ annually once matured.',
        challengeId: '2',
    });

    return list;
};

export default function ReductionPlanner() {
    const navigate = useNavigate();
    const calcResult = useMemo(() => getCalcResult(), []);
    const localDiet = calcResult?.dietType || 'mixed';
    const isVegLocal = localDiet === 'vegetarian' || localDiet === 'vegan';

    const [planData, setPlanData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchPlan = async () => {
            try {
                const plan = await getReductionPlanAPI(localDiet);
                if (isMounted && plan?.suggestions) {
                    setPlanData(plan);
                }
            } catch {
                // fall back to localized compliant logic
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchPlan();
        return () => { isMounted = false; };
    }, [localDiet]);

    const detectedDiet = planData?.diet_type || localDiet;
    const isVeg = ['vegetarian', 'vegan'].includes(detectedDiet?.toLowerCase());
    const highestCategory = planData?.highest_category || calcResult?.biggestSource || 'Transport';

    const rawSuggestions = planData?.suggestions || getVegCompliantFallbacks(isVeg, highestCategory);
    // Double safeguard: filter out ANY meatless/eat less meat recommendation if user is vegetarian or vegan
    const suggestions = (Array.isArray(rawSuggestions) ? rawSuggestions : []).filter((s) => {
        if (!isVeg) return true;
        const text = `${s?.title || ''} ${s?.action || ''}`.toLowerCase();
        return !text.includes('meatless') && !text.includes('eat less meat') && !text.includes('go vegetarian');
    });

    const total = calcResult?.total || calcResult?.totalMonthly || 128.4;
    const totalPossibleReduction = suggestions
        .reduce((s, sug) => s + (Number(sug?.potentialReduction) || 0), 0)
        .toFixed(1);

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Sparkles className="text-green-600" size={24} />
                            Dynamic Reduction Planner
                        </h1>
                        <p className="text-gray-400 text-sm mt-0.5">
                            Tailored decarbonization pathways strictly matched to your personal diet and highest emission sources
                        </p>
                    </div>

                    {/* Detected Profile Badge */}
                    <div className="flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5">
                            <Check size={14} className="text-emerald-600" />
                            Diet: {detectedDiet.charAt(0).toUpperCase() + detectedDiet.slice(1)}
                        </span>
                        <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5">
                            <Compass size={14} className="text-blue-600" />
                            Top Source: {highestCategory}
                        </span>
                    </div>
                </div>

                {/* Summary bar */}
                <div className="gradient-eco rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center gap-4 shadow-sm">
                    <div className="flex-1">
                        <p className="text-green-100 text-xs uppercase tracking-wider font-medium">Current Monthly Footprint</p>
                        <p className="text-3xl font-extrabold mt-0.5">{total} kg CO₂e</p>
                    </div>
                    <div className="flex items-center gap-2 text-green-100">
                        <TrendingDown size={22} />
                        <span className="text-sm font-medium">Total achievable reduction:</span>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md rounded-xl px-5 py-2.5 text-center border border-white/20">
                        <p className="text-2xl font-black">-{totalPossibleReduction}</p>
                        <p className="text-green-100 text-xs font-semibold">kg CO₂ / month</p>
                    </div>
                </div>

                {/* Suggestions List */}
                <div className="space-y-4">
                    {(Array.isArray(suggestions) ? suggestions : []).map((sug, i) => {
                        const category = sug?.category || 'General';
                        const challengeId = sug?.challengeId || '1';

                        return (
                            <div
                                key={i}
                                className={`rounded-2xl p-5 border transition-all hover:shadow-sm ${catColor[category] || 'border-gray-200 bg-gray-50'}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl p-2 bg-white rounded-xl shadow-xs">{sug?.emoji || '🌱'}</div>
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-base">{sug?.title || 'Eco Action'}</h3>
                                                <span className="text-xs text-gray-600 bg-white/80 px-2.5 py-0.5 rounded-full border border-gray-200/80 font-medium">
                                                    {category}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-green-700 font-extrabold text-base">−{Number(sug?.potentialReduction || 0)} kg</div>
                                                <div className="text-gray-400 text-xs">CO₂ / month</div>
                                            </div>
                                        </div>
                                        <p className="text-gray-600 text-sm mb-4 leading-relaxed">{sug?.action}</p>
                                        <button
                                            onClick={() => navigate(`/challenges/${challengeId}`)}
                                            className="flex items-center gap-2 bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors shadow-xs"
                                        >
                                            Take Challenge <ArrowRight size={13} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Explanation Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-3.5">
                    <Info size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-gray-800 mb-1">Tailored Decarbonization Intelligence</p>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            {isVeg
                                ? 'Because your profile is registered as plant-based (vegetarian/vegan), generic "Meatless Monday" advice has been replaced with localized organic procurement, food-waste composting, induction cooking, and bulk staple storage.'
                                : 'Recommendations are dynamically weighted against your highest self-reported emission sources and dietary preferences.'}
                        </p>
                    </div>
                </div>

                {!calcResult && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center">
                        <p className="text-yellow-800 font-semibold mb-1">⚠️ No baseline footprint recorded yet</p>
                        <p className="text-yellow-700 text-xs mb-4">Run the Carbon Calculator to record your energy, transport, and diet habits.</p>
                        <button onClick={() => navigate('/calculator')} className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors">
                            Calculate Baseline Footprint
                        </button>
                    </div>
                )}
            </div>
        </Layout>
    );
}
