import { useNavigate } from 'react-router-dom';
import { MapPin, Camera, Clock, Zap, Leaf } from 'lucide-react';

const difficultyColor = {
    Easy: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Hard: 'bg-red-100 text-red-700',
};

const categoryColor = {
    Transport: 'bg-blue-100 text-blue-700',
    Energy: 'bg-yellow-100 text-yellow-700',
    Waste: 'bg-gray-100 text-gray-700',
    Food: 'bg-orange-100 text-orange-700',
    Water: 'bg-cyan-100 text-cyan-700',
    Nature: 'bg-green-100 text-green-700',
};

export default function ChallengeCard({ challenge, completed = false }) {
    const navigate = useNavigate();

    if (!challenge) return null;

    const verificationMethods = Array.isArray(challenge?.verificationMethod)
        ? challenge.verificationMethod
        : challenge?.verificationRequirements || challenge?.verification_requirements
            ? Object.entries(challenge.verificationRequirements || challenge.verification_requirements)
                .filter(([_, v]) => Boolean(v))
                .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
            : ['Photo', 'Timestamp'];

    const safeMethods = Array.isArray(verificationMethods) ? verificationMethods : [];
    const emoji = challenge?.emoji || '🌱';
    const category = challenge?.category || 'General';
    const difficulty = challenge?.difficulty || 'Easy';
    const points = Number(challenge?.ecoPoints ?? challenge?.points_reward ?? 100);
    const co2 = Number(challenge?.co2Reduction ?? challenge?.co2_saved_kg ?? 2.0);

    return (
        <div
            onClick={() => navigate(`/challenges/${challenge.id}`)}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover cursor-pointer relative overflow-hidden"
        >
            {completed && (
                <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    ✓ Done
                </div>
            )}

            <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">{emoji}</div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-base leading-tight">{challenge?.title || 'Eco Challenge'}</h3>
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${categoryColor[category] || 'bg-gray-100 text-gray-600'}`}>
                        {category}
                    </span>
                </div>
            </div>

            <p className="text-gray-500 text-sm mb-4 line-clamp-2">{challenge?.description || 'Take green action and earn points.'}</p>

            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
                    <Zap size={14} /> {points} pts
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Leaf size={12} /> {co2} kg CO₂
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColor[difficulty] || 'bg-gray-100 text-gray-600'}`}>
                    {difficulty}
                </span>
            </div>

            <div className="flex flex-wrap gap-1">
                {safeMethods.map((method) => (
                    <span key={method} className="text-xs bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                        {method === 'GPS' && <MapPin size={10} />}
                        {method === 'Photo' && <Camera size={10} />}
                        {method === 'Timestamp' && <Clock size={10} />}
                        {method}
                    </span>
                ))}
            </div>
        </div>
    );
}
