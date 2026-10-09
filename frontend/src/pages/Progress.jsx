import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import ProgressChart from '../components/ProgressChart';
import { useAuth } from '../context/AuthContext';
import { getUserSubmissions } from '../utils/localStorage';
import { getMyStats, getMySubmissionsAPI } from '../services/api';
import { WEEKLY_PROGRESS } from '../data/demoUsers';
import { Leaf, Zap, CheckSquare, Flame, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Progress() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [backendStats, setBackendStats] = useState(null);
    const [backendSubmissions, setBackendSubmissions] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
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

        fetchData();
        return () => { isMounted = false; };
    }, [user]);

    const localSubmissions = useMemo(() => {
        const raw = getUserSubmissions(user?.id);
        return Array.isArray(raw) ? raw : (raw?.items || []);
    }, [user]);

    const submissions = backendSubmissions.length > 0 ? backendSubmissions : localSubmissions;
    const safeSubmissions = Array.isArray(submissions) ? submissions : [];

    const isAppr = (s) => {
        const st = String(s?.status || '').toUpperCase();
        return st === 'VERIFIED' || st === 'APPROVED';
    };
    const isPend = (s) => {
        const st = String(s?.status || '').toUpperCase();
        return st === 'PENDING' || st === 'PENDING_REVIEW';
    };
    const isRej = (s) => {
        const st = String(s?.status || '').toUpperCase();
        return st === 'REJECTED';
    };

    const verified = safeSubmissions.filter(isAppr);
    const pending = safeSubmissions.filter(isPend);

    const co2 = Number(backendStats?.co2_saved_kg ?? user?.co2_saved_kg ?? user?.co2Reduced ?? 0);
    const points = Number(backendStats?.eco_points ?? user?.eco_points ?? user?.ecoPoints ?? 0);
    const done = Number(
        backendStats?.completed_challenges_count ??
        backendStats?.challenges_completed ??
        user?.completed_challenges_count ??
        user?.challenges_completed ??
        user?.challengesCompleted ??
        user?.challenges_count ??
        0
    );
    const streak = Number(user?.streak || 0);

    return (
        <Layout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">My Progress</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Track your environmental impact over time</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={<Leaf size={20} />} label="CO₂ Reduced" value={`${co2.toFixed(1)} kg`} sub="total saved" color="green" />
                    <StatCard icon={<Zap size={20} />} label="Eco Points" value={points.toLocaleString()} sub="total earned" color="purple" />
                    <StatCard icon={<CheckSquare size={20} />} label="Challenges" value={done} sub="verified completed" color="teal" />
                    <StatCard icon={<Flame size={20} />} label="Current Streak" value={`${streak} days`} sub="keep it up!" color="orange" />
                </div>

                <ProgressChart data={WEEKLY_PROGRESS} />

                {/* Submissions list */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">All Submissions</h3>
                        <div className="flex gap-2">
                            <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">
                                {verified.length} Verified
                            </span>
                            {pending.length > 0 && (
                                <span className="bg-yellow-100 text-yellow-700 text-xs px-2.5 py-1 rounded-full font-medium">
                                    {pending.length} Pending Review
                                </span>
                            )}
                        </div>
                    </div>

                    {safeSubmissions.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-4xl mb-3">🌱</div>
                            <p className="font-semibold text-gray-700 mb-2">No challenges submitted yet.</p>
                            <p className="text-gray-400 text-sm mb-4">Start your eco journey today!</p>
                            <button onClick={() => navigate('/challenges')} className="bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-green-700">
                                Explore Challenges
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {(Array.isArray(safeSubmissions) ? safeSubmissions.slice().reverse() : []).map((sub, idx) => {
                                const title = sub?.challengeTitle || sub?.challenge?.title || `Challenge #${sub?.challenge_id || sub?.challengeId || '1'}`;
                                const pts = Number(sub?.ecoPoints ?? sub?.pointsAwarded ?? sub?.points_awarded ?? 0);
                                const isVerified = isAppr(sub);
                                const isRejected = isRej(sub);

                                return (
                                    <div key={sub?.id || idx} className="flex items-center gap-4 px-5 py-4">
                                        <div className="text-2xl">🌿</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-800 text-sm">{title}</p>
                                                {sub?.is_flagged && (
                                                    <span className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded font-bold border border-red-200 flex items-center gap-1">
                                                        <AlertTriangle size={10} /> Flagged
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-400 text-xs mt-0.5">
                                                {sub?.submittedAt || sub?.captured_at ? new Date(sub.submittedAt || sub.captured_at).toLocaleString() : 'Recent'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-green-600 font-bold text-sm">+{pts} pts</p>
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium inline-block mt-0.5 ${
                                                isVerified ? 'bg-green-100 text-green-700' :
                                                isRejected ? 'bg-red-100 text-red-600' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {isVerified ? '✓ Approved' : isRejected ? '✗ Rejected' : '⏳ Pending Review'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
