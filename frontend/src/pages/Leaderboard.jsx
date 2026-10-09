import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import LeaderboardTable from '../components/LeaderboardTable';
import { useAuth } from '../context/AuthContext';
import { getLeaderboardAPI } from '../services/api';
import {
    getLeaderboard, saveLeaderboard, getUserById
} from '../utils/localStorage';
import { LEADERBOARD_USERS, COLLEGE_TEAMS } from '../data/demoUsers';

const tabs = ['Individual', 'College'];

export default function Leaderboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('Individual');
    const [entries, setEntries] = useState([]);
    const [joined, setJoined] = useState(localStorage.getItem('ecox_teamJoined') === 'true');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchLeaderboard = async () => {
            try {
                const apiEntries = await getLeaderboardAPI();
                const safeApiEntries = Array.isArray(apiEntries) ? apiEntries : [];
                if (safeApiEntries.length > 0 && isMounted) {
                    setEntries(safeApiEntries);
                    setLoading(false);
                    return;
                }
            } catch {
                // Fall back to local storage
            }

            let lb = getLeaderboard();
            if (!lb || !Array.isArray(lb) || lb.length === 0) {
                lb = LEADERBOARD_USERS;
                saveLeaderboard(lb);
            }

            // Merge current user's real data
            if (user) {
                const realUser = getUserById(user.id);
                const userPoints = Number(realUser?.ecoPoints ?? user?.ecoPoints ?? 0);
                const userCo2 = Number(realUser?.co2Reduced ?? user?.co2Reduced ?? 0);
                const userChall = Number(realUser?.challengesCompleted ?? user?.challengesCompleted ?? 0);
                const userName = realUser?.name || user?.name || user?.username || 'You';

                const merged = (Array.isArray(lb) ? lb : []).map((e) =>
                    String(e.id) === String(user.id)
                        ? { ...e, ecoPoints: userPoints, co2Reduced: userCo2, challengesCompleted: userChall, name: userName }
                        : e
                );

                if (!merged.find((e) => String(e.id) === String(user.id)) && userPoints > 0) {
                    merged.push({
                        id: user.id,
                        name: userName,
                        college: user.college || 'TCET Mumbai',
                        ecoPoints: userPoints,
                        co2Reduced: userCo2,
                        challengesCompleted: userChall,
                    });
                }
                merged.sort((a, b) => (Number(b.ecoPoints) || 0) - (Number(a.ecoPoints) || 0));
                merged.forEach((e, i) => { e.rank = i + 1; });
                saveLeaderboard(merged);
                if (isMounted) setEntries(merged);
            } else {
                if (isMounted) setEntries(lb);
            }
            if (isMounted) setLoading(false);
        };

        fetchLeaderboard();
        return () => { isMounted = false; };
    }, [user]);

    const handleJoinTeam = () => {
        localStorage.setItem('ecox_teamJoined', 'true');
        setJoined(true);
    };

    const safeEntries = Array.isArray(entries) ? entries : [];
    const podiumEntries = [safeEntries[1], safeEntries[0], safeEntries[2]];

    return (
        <Layout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">Leaderboard</h1>
                    <p className="text-gray-400 text-sm mt-0.5">See where you rank among eco champions</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {(Array.isArray(tabs) ? tabs : []).map((t) => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === t ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
                                }`}
                        >
                            {t === 'Individual' ? '👤 Individual' : '🏫 College'}
                        </button>
                    ))}
                </div>

                {activeTab === 'Individual' ? (
                    <>
                        {/* Top 3 podium */}
                        {safeEntries.length >= 3 && (
                            <div className="grid grid-cols-3 gap-4">
                                {(Array.isArray(podiumEntries) ? podiumEntries : []).map((e, i) => {
                                    if (!e) return <div key={i} />;
                                    const medals = ['🥈', '🥇', '🥉'];
                                    const heights = ['h-24', 'h-32', 'h-20'];
                                    const name = e?.name || e?.username || 'Champion';
                                    const points = Number(e?.ecoPoints ?? e?.eco_points ?? 0);
                                    const isMe = String(e?.id) === String(user?.id);

                                    return (
                                        <div key={e?.id || i} className={`flex flex-col items-center ${i === 1 ? 'order-last sm:order-none' : ''}`}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white ${isMe ? 'bg-green-600' : 'bg-gray-300'}`}>
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                            <p className="text-xs font-semibold text-gray-700 mt-1 text-center truncate max-w-full">{name}</p>
                                            <p className="text-xs text-green-600 font-bold">{points.toLocaleString()} pts</p>
                                            <div className={`w-full ${heights[i]} gradient-eco rounded-t-xl mt-2 flex items-end justify-center pb-2`}>
                                                <span className="text-2xl">{medals[i]}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <LeaderboardTable entries={safeEntries} currentUserId={user?.id} />
                    </>
                ) : (
                    /* College tab */
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-1">🏆 TCET Green Challenge</h3>
                            <p className="text-gray-400 text-sm">Inter-college competition — Team standings</p>
                        </div>

                        {(Array.isArray(COLLEGE_TEAMS) ? COLLEGE_TEAMS : []).map((team, i) => (
                            <div key={team?.id || i} className={`bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-4 ${i === 0 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-300' : i === 2 ? 'bg-orange-400' : 'bg-gray-100'
                                    } text-white`}>
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800">{team?.name}</p>
                                    <p className="text-gray-400 text-xs">{team?.college} · {team?.members} members</p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs text-gray-400">CO₂ Reduced</p>
                                    <p className="font-semibold text-green-600 text-sm">{team?.co2Reduced} kg</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">Points</p>
                                    <p className="font-bold text-green-600">{(team?.points || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}

                        {!joined ? (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                                <p className="font-semibold text-gray-700 mb-2">Join the College Competition!</p>
                                <p className="text-gray-500 text-sm mb-4">Compete with other colleges and represent TCET</p>
                                <button onClick={handleJoinTeam} className="bg-green-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-green-700">
                                    Join Competition
                                </button>
                            </div>
                        ) : (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                                <p className="text-green-700 font-semibold">✓ You're participating in the college competition!</p>
                                <p className="text-gray-400 text-sm mt-1">Your challenges contribute to your college's team score.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}
