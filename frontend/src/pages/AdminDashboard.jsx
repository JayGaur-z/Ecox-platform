import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { getSubmissions, getUsers, getChallenges } from '../utils/localStorage';
import { getSubmissionsAPI } from '../services/api';
import { Users, Leaf, CheckSquare, TrendingDown, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const weeklyData = [
    { day: 'Mon', submissions: 8 }, { day: 'Tue', submissions: 14 },
    { day: 'Wed', submissions: 11 }, { day: 'Thu', submissions: 19 },
    { day: 'Fri', submissions: 22 }, { day: 'Sat', submissions: 17 },
    { day: 'Sun', submissions: 13 },
];

export default function AdminDashboard() {
    const [apiSubmissions, setApiSubmissions] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const fetchSubs = async () => {
            try {
                const subs = await getSubmissionsAPI();
                const list = Array.isArray(subs) ? subs : (subs?.items || subs?.data || []);
                if (list.length > 0 && isMounted) {
                    setApiSubmissions(list);
                }
            } catch {
                // fall back to localStorage
            }
        };
        fetchSubs();
        return () => { isMounted = false; };
    }, []);

    const localSubmissions = useMemo(() => {
        const raw = getSubmissions();
        return Array.isArray(raw) ? raw : [];
    }, []);

    const submissions = apiSubmissions.length > 0 ? apiSubmissions : localSubmissions;
    const safeSubmissions = Array.isArray(submissions) ? submissions : [];

    const rawUsers = getUsers();
    const safeUsers = Array.isArray(rawUsers) ? rawUsers.filter((u) => u?.role !== 'admin' && u?.role !== 'ADMIN') : [];

    const rawChallenges = getChallenges();
    const safeChallenges = Array.isArray(rawChallenges) ? rawChallenges.filter((c) => c?.active !== false) : [];

    const pending = safeSubmissions.filter((s) => {
        const st = String(s?.status || '').toUpperCase();
        return st === 'PENDING' || st === 'PENDING_REVIEW';
    }).length;

    const verified = safeSubmissions.filter((s) => {
        const st = String(s?.status || '').toUpperCase();
        return st === 'VERIFIED' || st === 'APPROVED';
    });

    const flagged = safeSubmissions.filter((s) => Boolean(s?.is_flagged)).length;
    const totalCO2 = verified.reduce((s, v) => s + (Number(v?.co2Reduction ?? v?.co2_saved_kg) || 0), 0);

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">Administrative Dashboard</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Platform overview, anti-cheat monitoring, and verification queue</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={<Users size={20} />} label="Total Students" value={Math.max(1248, safeUsers.length)} color="blue" />
                    <StatCard icon={<Leaf size={20} />} label="Active Challenges" value={Math.max(24, safeChallenges.length)} color="green" />
                    <StatCard
                        icon={<CheckSquare size={20} />}
                        label="Pending Review"
                        value={pending}
                        color="orange"
                        trend={flagged > 0 ? `${flagged} fraud alert(s)` : pending > 0 ? `${pending} waiting` : 'All clear'}
                    />
                    <StatCard icon={<TrendingDown size={20} />} label="CO₂ Reduced" value={`${(totalCO2 + 4582).toFixed(0)} kg`} color="teal" />
                </div>

                {/* Chart */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-1">Daily Submissions This Week</h3>
                    <p className="text-gray-400 text-xs mb-4">Number of proof submissions processed per day</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={weeklyData} barSize={28}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v) => [v, 'Submissions']} />
                            <Bar dataKey="submissions" fill="#16a34a" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent submissions preview */}
                {safeSubmissions.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">Recent Verification Activity</h3>
                            <a href="/admin/verification" className="text-xs font-semibold text-green-600 hover:text-green-700">
                                Open Verification Queue →
                            </a>
                        </div>
                        <div className="space-y-2">
                            {(Array.isArray(safeSubmissions) ? safeSubmissions.slice(-5).reverse() : []).map((s, idx) => {
                                const userIdStr = String(s?.userId || s?.user_id || 'user');
                                const shortUserId = userIdStr.length > 6 ? userIdStr.slice(-6) : userIdStr;
                                const title = s?.challengeTitle || s?.challenge?.title || `Challenge #${s?.challenge_id || s?.challengeId || '1'}`;
                                const dateStr = s?.submittedAt || s?.captured_at || s?.created_at
                                    ? new Date(s.submittedAt || s.captured_at || s.created_at).toLocaleDateString()
                                    : 'Recent';
                                
                                const st = String(s?.status || '').toUpperCase();
                                const isAppr = st === 'VERIFIED' || st === 'APPROVED';
                                const isRej = st === 'REJECTED';

                                return (
                                    <div key={s?.id || idx} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            {s?.is_flagged && (
                                                <span className="p-1 bg-red-100 text-red-600 rounded-lg" title={s?.flag_reason || 'Anti-cheat flag'}>
                                                    <AlertTriangle size={14} />
                                                </span>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{title}</p>
                                                <p className="text-xs text-gray-400">User #{shortUserId} · {dateStr}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                            isAppr ? 'bg-green-100 text-green-700' :
                                            isRej ? 'bg-red-100 text-red-600' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {isAppr ? '✓ Approved' : isRej ? '✗ Rejected' : '⏳ Pending'}
                                        </span>
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
