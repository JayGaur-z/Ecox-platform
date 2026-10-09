import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import CarbonChart from '../components/CarbonChart';
import { calculateFootprint } from '../utils/carbonCalculator';
import { calculateCarbonAPI } from '../services/api';
import { saveCalcResult } from '../utils/localStorage';
import { Loader, Info, ArrowRight } from 'lucide-react';
import { DISCLAIMER } from '../data/emissionFactors';
import toast from 'react-hot-toast';

const inputFields = [
    {
        group: '🚗 Transportation', fields: [
            { name: 'carKmPerWeek', label: 'Car (km/week)', min: 0 },
            { name: 'bikeKmPerWeek', label: 'Motorbike (km/week)', min: 0 },
            { name: 'busKmPerWeek', label: 'Bus (km/week)', min: 0 },
            { name: 'trainKmPerWeek', label: 'Train (km/week)', min: 0 },
        ]
    },
    {
        group: '⚡ Electricity', fields: [
            { name: 'electricityUnitsPerMonth', label: 'Electricity (kWh/month)', min: 0 },
        ]
    },
    {
        group: '♻️ Waste', fields: [
            { name: 'wasteKgPerWeek', label: 'Household waste (kg/week)', min: 0 },
        ]
    },
];

export default function CarbonCalculator() {
    const navigate = useNavigate();
    const [inputs, setInputs] = useState({
        carKmPerWeek: '', bikeKmPerWeek: '', busKmPerWeek: '', trainKmPerWeek: '',
        electricityUnitsPerMonth: '', foodType: 'mixed', wasteKgPerWeek: '',
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (value < 0) return;
        setInputs({ ...inputs, [name]: value });
        setErrors({ ...errors, [name]: '' });
    };

    const validate = () => {
        const e = {};
        Object.entries(inputs).forEach(([k, v]) => {
            if (k !== 'foodType' && v !== '' && Number(v) < 0) e[k] = 'Cannot be negative';
        });
        return e;
    };

    const handleCalculate = async () => {
        const e = validate();
        if (Object.keys(e).length > 0) { setErrors(e); return; }
        setLoading(true);
        try {
            // Calculate and save via FastAPI backend
            const r = await calculateCarbonAPI(inputs);
            // Derive biggest source for summary banner
            const breakdown = r?.breakdown || {};
            const keys = Object.keys(breakdown);
            const biggestSource = keys.length > 0
                ? keys.reduce((a, b) => (breakdown[a] > breakdown[b] ? a : b), 'transport')
                : 'transport';
            r.biggestSource = biggestSource.charAt(0).toUpperCase() + biggestSource.slice(1);
            r.dietType = inputs.foodType;

            setResult(r);
            saveCalcResult(r);
            setLoading(false);
            toast.success('Carbon footprint calculated and recorded! 🌍');
        } catch {
            // Fallback to local calculation
            const r = calculateFootprint(inputs);
            r.dietType = inputs.foodType;
            setResult(r);
            saveCalcResult(r);
            setLoading(false);
            toast.success('Carbon footprint calculated! 🌍');
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">Carbon Calculator</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Estimate your monthly carbon footprint</p>
                </div>

                {/* Disclaimer */}
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-700 text-xs">{DISCLAIMER}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Input form */}
                    <div className="space-y-5">
                        {(Array.isArray(inputFields) ? inputFields : []).map(({ group, fields }) => (
                            <div key={group} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-700 mb-4">{group}</h3>
                                <div className="space-y-3">
                                    {(Array.isArray(fields) ? fields : []).map(({ name, label, min }) => (
                                        <div key={name}>
                                            <label className="text-sm text-gray-500 mb-1 block">{label}</label>
                                            <input
                                                type="number"
                                                name={name}
                                                value={inputs[name]}
                                                onChange={handleChange}
                                                min={min}
                                                placeholder="0"
                                                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors[name] ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                                    }`}
                                            />
                                            {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Diet Selector */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-700 mb-4">🥗 Diet Type</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'vegan', label: '🌱 Vegan', sub: 'Plant-based only' },
                                    { value: 'vegetarian', label: '🧀 Vegetarian', sub: 'No meat, has dairy' },
                                    { value: 'mixed', label: '🍗 Mixed', sub: 'Average meat & veg' },
                                    { value: 'meat_heavy', label: '🥩 Heavy Meat', sub: 'Meat daily' },
                                ].map(({ value, label, sub }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setInputs({ ...inputs, foodType: value })}
                                        className={`p-3 rounded-xl border text-left transition-all ${inputs.foodType === value
                                                ? 'border-green-600 bg-green-50 text-green-800'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="font-medium text-sm">{label}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleCalculate}
                            disabled={loading}
                            className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 disabled:opacity-70"
                        >
                            {loading && <Loader size={18} className="spinner" />}
                            {loading ? 'Calculating emissions...' : 'Calculate My Footprint 🌍'}
                        </button>
                    </div>

                    {/* Results panel */}
                    <div className="space-y-5">
                        {result ? (
                            <>
                                <div className="bg-green-600 text-white rounded-2xl p-6 shadow-sm">
                                    <p className="text-green-100 text-sm">Estimated Monthly Footprint</p>
                                    <div className="text-4xl font-extrabold my-2">
                                        {(result.totalMonthly ?? result.total ?? 0)?.toLocaleString()} <span className="text-xl font-normal text-green-200">kg CO₂e</span>
                                    </div>
                                    <p className="text-green-100 text-xs">
                                        ~{(result.totalAnnual ?? (result.totalMonthly ? result.totalMonthly * 12 : 0))?.toLocaleString()} kg CO₂e per year
                                    </p>
                                </div>

                                <CarbonChart data={result.breakdown} />

                                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                                    <p className="text-sm font-bold text-orange-700 mb-1">Biggest Source: {result.biggestSource || 'Transportation'}</p>
                                    <p className="text-orange-600 text-xs">Focus your reduction efforts here for maximum impact.</p>
                                </div>

                                <button
                                    onClick={() => navigate('/planner')}
                                    className="w-full bg-white border-2 border-green-600 text-green-700 font-bold py-3 rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    Create My Reduction Plan <ArrowRight size={16} />
                                </button>
                            </>
                        ) : (
                            <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center">
                                <div className="text-5xl mb-4">🌍</div>
                                <h3 className="font-bold text-gray-700 mb-2">Calculate Your Footprint</h3>
                                <p className="text-gray-400 text-sm">Fill in the form on the left and click Calculate to see your estimated monthly carbon footprint broken down by category.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Emission factor reference */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Info size={16} className="text-blue-500" /> Emission Factors Used</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {[
                            { label: 'Car', value: '0.171 kg/km' },
                            { label: 'Motorbike', value: '0.103 kg/km' },
                            { label: 'Bus', value: '0.089 kg/km' },
                            { label: 'Train', value: '0.035 kg/km' },
                            { label: 'Electricity', value: '0.420 kg/kWh' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                                <p className="text-xs text-gray-400">{label}</p>
                                <p className="text-sm font-semibold text-gray-700">{value}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-gray-400 text-xs mt-3">* Verified scientific factors based on DEFRA / EPA greenhouse gas conversion rates.</p>
                </div>
            </div>
        </Layout>
    );
}
