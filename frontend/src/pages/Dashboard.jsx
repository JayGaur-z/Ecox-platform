import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import CarbonChart from '../components/CarbonChart';
import { getCalcResult, getUserSubmissions } from '../utils/localStorage';
import { getMyStats, getMySubmissionsAPI } from '../services/api';
import { Leaf, Zap, BarChart2, CheckSquare, TrendingDown, ArrowRight, Clock, CheckCircle2, XCircle } from 'lucide-react';

const defaultBreakdown = [
    { name: 'Transport', value: 52.0 },
    { name: 'Electricity', value: 35.0 },
    { name: 'Food', value: 28.0 },
    { name: 'Waste', value: 13.4 },
];

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [backendStats, setBackendStats] = useState(null);
    const [backendSubmissions, setBackendSubmissions] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const fetchUserData = async () => {
            try {
                const [statsRes, subsRes] = await Promise.allSettled([
                    getMyStats(),
                    getMySubmissionsAPI(),
                ]);
                if (!isMounted) return;
                if (statsRes.status === 'fulfilled' && statsRes.value) {
                    setBackendStats(statsRes.value);
                }
                if (subsRes.status === 'fulfilled' && subsRes.value) {
                    const list = Array.isArray(subsRes.value) ? subsRes.value : (subsRes.value?.items || []);
                    setBackendSubmissions(list);
                }
            } catch {
                // Keep local state resilient
            }
        };

        fetchUserData();
        return () => { isMounted = false; };
    }, [user]);

    const calcResult = useMemo(() => getCalcResult(), []);
    const localSubmissions = useMemo(() => {
        const raw = getUserSubmissions(user?.id);
        return Array.isArray(raw) ? raw : (raw?.items || []);
    }, [user]);

    const submissions = backendSubmissions.length > 0 ? backendSubmissions : localSubmissions;
    const safeSubmissions = Array.isArray(submissions) ? submissions : [];

    const breakdown = calcResult?.breakdown || defaultBreakdown;
    const total = calcResult?.total || calcResult?.totalMonthly || 128.4;
    const biggest = calcResult?.biggestSource || 'Transportation';

    const ecoScore = user?.ecoScore || 78;
    // Dynamic stats priority: backend dynamic stats -> user object -> local fallback
    const ecoPoints = Number(
        backendStats?.eco_points ??
        user?.eco_points ??
        user?.ecoPoints ??
        0
    );
    const completedCount = Number(
        backendStats?.completed_challenges_count ??
        backendStats?.challenges_completed ??
        user?.completed_challenges_count ??
        user?.challenges_completed ??
        user?.challengesCompleted ??
        user?.challenges_count ??
        0
    );
    const co2Reduced = Number(
        backendStats?.co2_saved_kg ??
        user?.co2_saved_kg ??
        user?.co2Reduced ??
        0
    );

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Page title */}
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Your environmental impact and verified sustainability achievements</p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={<Leaf size={20} />}
                        label="Monthly Footprint"
                        value={`${total} kg`}
                        sub="CO₂ equivalent"
                        trend="12% lower than avg"
                        color="green"
                    />
                    <StatCard
                        icon={<BarChart2 size={20} />}
                        label="Eco Score"
                        value={`${ecoScore}/100`}
                        sub="improving steadily"
                        trend={`+${Math.round(ecoScore * 0.08)} pts`}
                        color="blue"
                    />
                    <StatCard
                        icon={<Zap size={20} />}
                        label="Eco Points"
                        value={ecoPoints.toLocaleString()}
                        sub="total earned"
                        color="purple"
                    />
                    <StatCard
                        icon={<CheckSquare size={20} />}
                        label="Challenges Done"
                        value={completedCount}
                        sub="verified by admin"
                        color="teal"
                    />
                </div>

                {/* Chart + Insights row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CarbonChart data={breakdown} />

                    {/* Insight card */}
                    <div className="space-y-4">
                        {/* Biggest contributor */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-100">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <TrendingDown size={16} className="text-orange-600" />
                                </div>
                                <h3 className="font-bold text-gray-800">Your Biggest Contributor</h3>
                            </div>
                            <p className="text-orange-600 font-bold text-lg mb-1">{biggest}</p>
                            <p className="text-gray-500 text-sm mb-4">
                                Targeted reduction actions are ready based on your latest activity profile.
                            </p>
                            <button
                                onClick={() => navigate('/planner')}
                                className="flex items-center gap-2 text-sm font-semibold text-green-600 hover:text-green-700"
                            >
                                View Reduction Plan <ArrowRight size={16} />
                            </button>
                        </div>

                        {/* CO2 reduced */}
                        <div className="bg-green-50 rounded-2xl p-5 border border-green-200">
                            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Total CO₂ Reduced</p>
                            <p className="text-3xl font-bold text-green-700 mb-1">{co2Reduced.toFixed(1)} kg</p>
                            <p className="text-gray-500 text-sm">equivalent to planting {Math.round(co2Reduced / 21) || 0} trees 🌳</p>
                        </div>

                        {/* Quick actions */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-3">Quick Actions</h3>
                            <div className="space-y-2">
                                {[
                                    { label: '🌍 Calculate my footprint', to: '/calculator' },
                                    { label: '🌱 Browse challenges', to: '/challenges' },
                                    { label: '📊 View my progress & proofs', to: '/progress' },
                                ].map(({ label, to }) => (
                                    <button
                                        key={to}
                                        onClick={() => navigate(to)}
                                        className="w-full text-left px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-green-50 hover:text-green-700 text-sm font-medium text-gray-600 transition-colors flex items-center justify-between"
                                    >
                                        {label}
                                        <ArrowRight size={14} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent submissions */}
                {safeSubmissions.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-gray-800">Recent Proof Submissions</h3>
                                <p className="text-xs text-gray-400">Track real-time admin review and point awards</p>
                            </div>
                            <button onClick={() => navigate('/progress')} className="text-green-600 text-sm font-medium hover:underline">View all</button>
                        </div>
                        <div className="space-y-2">
                            {(Array.isArray(safeSubmissions) ? safeSubmissions.slice(-4).reverse() : []).map((sub, idx) => {
                                const st = String(sub?.status || '').toUpperCase();
                                const isApproved = st === 'VERIFIED' || st === 'APPROVED';
                                const isRejected = st === 'REJECTED';
                                const dateStr = sub?.submittedAt || sub?.captured_at || sub?.created_at
                                    ? new Date(sub.submittedAt || sub.captured_at || sub.created_at).toLocaleDateString()
                                    : 'Recent';

                                return (
                                    <div key={sub?.id || idx} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="font-medium text-sm text-gray-800">{sub?.challengeTitle || sub?.challenge?.title || `Challenge #${sub?.challenge_id || sub?.challengeId || '1'}`}</p>
                                            <p className="text-xs text-gray-400">Submitted on {dateStr}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isApproved ? (
                                                <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> Approved
                                                </span>
                                            ) : isRejected ? (
                                                <span className="bg-red-100 text-red-600 text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
                                                    <XCircle size={12} /> Rejected
                                                </span>
                                            ) : (
                                                <span className="bg-yellow-100 text-yellow-700 text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
                                                    <Clock size={12} /> Under Review
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
}
