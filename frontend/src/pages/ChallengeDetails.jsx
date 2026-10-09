import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getChallengeByIdAPI } from '../services/api';
import { getChallenges } from '../utils/localStorage';
import { INITIAL_CHALLENGES } from '../data/challenges';
import { MapPin, Camera, Clock, Zap, Leaf, Clock3, ArrowLeft, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

const difficultyColor = {
    Easy: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Hard: 'bg-red-100 text-red-700'
};

const verifyIcons = {
    GPS: <MapPin size={14} />,
    Photo: <Camera size={14} />,
    Timestamp: <Clock size={14} />,
    QR: <QrCode size={14} />,
    'Self Report': <Zap size={14} />
};

export default function ChallengeDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [challenge, setChallenge] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchDetail = async () => {
            try {
                const apiCh = await getChallengeByIdAPI(id);
                if (apiCh && isMounted) {
                    const categoryEmojis = {
                        transport: '🚍', energy: '⚡', waste: '♻️', water: '💧', food: '🥗', other: '🌳'
                    };
                    const reqs = apiCh.verification_requirements || {};
                    const methods = Object.entries(reqs)
                        .filter(([_, v]) => Boolean(v))
                        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));

                    setChallenge({
                        id: apiCh.id,
                        title: apiCh.title,
                        description: apiCh.description,
                        longDescription: apiCh.description,
                        category: apiCh.category ? apiCh.category.charAt(0).toUpperCase() + apiCh.category.slice(1) : 'General',
                        ecoPoints: apiCh.points_reward || 100,
                        co2Reduction: apiCh.co2_saved_kg || 2.0,
                        difficulty: apiCh.difficulty ? apiCh.difficulty.charAt(0).toUpperCase() + apiCh.difficulty.slice(1) : 'Easy',
                        active: apiCh.is_active,
                        emoji: categoryEmojis[(apiCh.category || '').toLowerCase()] || '🌱',
                        verificationMethod: methods.length > 0 ? methods : ['Photo', 'Timestamp'],
                        timeRequired: '1 day',
                        steps: [
                            'Perform the eco-friendly action in your daily routine',
                            'Capture genuine photo or location proof',
                            'Submit your evidence for verification and earn Eco Points',
                        ],
                    });
                    setLoading(false);
                    return;
                }
            } catch {
                // Fall back to local store
            }

            const all = getChallenges() || INITIAL_CHALLENGES;
            const found = (Array.isArray(all) ? all : []).find((c) => String(c.id) === String(id));
            if (isMounted) {
                setChallenge(found || null);
                setLoading(false);
            }
        };

        fetchDetail();
        return () => { isMounted = false; };
    }, [id]);

    if (loading) {
        return (
            <Layout>
                <div className="max-w-3xl mx-auto text-center py-20">
                    <div className="text-3xl mb-3 animate-spin">🌿</div>
                    <p className="text-gray-400 text-sm">Loading challenge details...</p>
                </div>
            </Layout>
        );
    }

    if (!challenge) {
        return (
            <Layout>
                <div className="max-w-3xl mx-auto text-center py-20">
                    <div className="text-5xl mb-4">😕</div>
                    <h2 className="font-bold text-gray-700 mb-2">Challenge not found</h2>
                    <button onClick={() => navigate('/challenges')} className="text-green-600 hover:underline text-sm">← Back to Challenges</button>
                </div>
            </Layout>
        );
    }

    const handleStart = () => {
        toast.success('Challenge started! 🌿 Submit your proof when ready.');
        navigate(`/submit/${challenge.id}`);
    };

    const methods = Array.isArray(challenge?.verificationMethod)
        ? challenge.verificationMethod
        : ['Photo', 'Timestamp'];

    const steps = Array.isArray(challenge?.steps) && challenge.steps.length > 0
        ? challenge.steps
        : [
            'Perform the eco-friendly action in your daily routine',
            'Capture genuine photo or location proof',
            'Submit your evidence for verification and earn Eco Points',
        ];

    const difficulty = challenge?.difficulty || 'Easy';
    const ecoPoints = Number(challenge?.ecoPoints ?? challenge?.points_reward ?? 0);
    const co2Reduction = Number(challenge?.co2Reduction ?? challenge?.co2_saved_kg ?? 0);

    return (
        <Layout>
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Back */}
                <button onClick={() => navigate('/challenges')} className="flex items-center gap-2 text-gray-500 hover:text-green-600 text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Challenges
                </button>

                {/* Hero card */}
                <div className="gradient-eco rounded-2xl p-6 text-white">
                    <div className="flex items-start gap-4">
                        <div className="text-5xl">{challenge?.emoji || '🌱'}</div>
                        <div className="flex-1">
                            <div className="flex flex-wrap gap-2 mb-2">
                                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{challenge?.category || 'Eco'}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColor[difficulty] || 'bg-green-100 text-green-700'}`}>{difficulty}</span>
                            </div>
                            <h1 className="text-2xl font-bold mb-2">{challenge?.title}</h1>
                            <p className="text-green-100 text-sm">{challenge?.description}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-5">
                        <div className="bg-white/20 rounded-xl p-3 text-center">
                            <Zap size={16} className="mx-auto mb-1" />
                            <p className="font-bold text-sm">{ecoPoints}</p>
                            <p className="text-green-200 text-xs">Eco Points</p>
                        </div>
                        <div className="bg-white/20 rounded-xl p-3 text-center">
                            <Leaf size={16} className="mx-auto mb-1" />
                            <p className="font-bold text-sm">{co2Reduction} kg</p>
                            <p className="text-green-200 text-xs">CO₂ Saved</p>
                        </div>
                        <div className="bg-white/20 rounded-xl p-3 text-center">
                            <Clock3 size={16} className="mx-auto mb-1" />
                            <p className="font-bold text-sm">{challenge?.timeRequired || '1 day'}</p>
                            <p className="text-green-200 text-xs">Duration</p>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3">About this Challenge</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{challenge?.longDescription || challenge?.description}</p>
                </div>

                {/* Steps */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Steps to Complete</h3>
                    <ol className="space-y-3">
                        {(Array.isArray(steps) ? steps : []).map((step, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                    {i + 1}
                                </div>
                                <p className="text-gray-600 text-sm">{step}</p>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Verification method */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3">Verification Method</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {(Array.isArray(methods) ? methods : []).map((method) => (
                            <div key={method} className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
                                {verifyIcons[method] || <Camera size={14} />} {method}
                            </div>
                        ))}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                        <p className="font-semibold mb-1">📋 How Verification Works</p>
                        <p>GPS provides supporting location evidence. Stronger verification combines location, timestamp, QR station, transit ticket and image evidence. No single factor alone proves completion.</p>
                    </div>
                </div>

                {/* Start button */}
                <button
                    onClick={handleStart}
                    className="w-full gradient-eco text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity text-lg flex items-center justify-center gap-2"
                >
                    🌱 Start Challenge
                </button>
            </div>
        </Layout>
    );
}
