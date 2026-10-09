import { Crown } from 'lucide-react';

const rankColors = ['text-yellow-500', 'text-gray-400', 'text-orange-500'];
const rankBg = ['bg-yellow-50 border-yellow-200', 'bg-gray-50 border-gray-200', 'bg-orange-50 border-orange-200'];

export default function LeaderboardTable({ entries, currentUserId }) {
    const safeEntries = Array.isArray(entries) ? entries : (entries?.items || []);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rank</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Eco Points</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">CO₂ Reduced</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Challenges</th>
                        </tr>
                    </thead>
                    <tbody>
                        {safeEntries.map((entry, idx) => {
                            const isMe = String(entry?.id) === String(currentUserId);
                            const name = entry?.name || entry?.username || 'Eco Champion';
                            const points = Number(entry?.ecoPoints ?? entry?.eco_points ?? 0);
                            const co2 = Number(entry?.co2Reduced ?? entry?.co2_saved_kg ?? 0);
                            const challenges = Number(entry?.challengesCompleted ?? entry?.challenges_completed ?? 0);
                            const rank = entry?.rank || (idx + 1);

                            return (
                                <tr
                                    key={entry?.id || idx}
                                    className={`border-b border-gray-50 transition-colors ${isMe ? 'bg-green-50' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <td className="px-4 py-3">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${idx < 3
                                                ? `${rankBg[idx]} border ${rankColors[idx]}`
                                                : 'text-gray-400'
                                            }`}>
                                            {idx < 3 ? <Crown size={14} className={rankColors[idx]} /> : rank}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white ${isMe ? 'bg-green-600' : 'bg-gray-300'
                                                }`}>
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className={`font-semibold text-sm ${isMe ? 'text-green-700' : 'text-gray-800'}`}>
                                                    {name} {isMe && <span className="text-xs text-green-500 font-normal">(You)</span>}
                                                </p>
                                                <p className="text-gray-400 text-xs">{entry?.college || 'TCET Mumbai'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="font-bold text-green-600">{points.toLocaleString()}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-500 text-sm hidden md:table-cell">{co2} kg</td>
                                    <td className="px-4 py-3 text-right text-gray-500 text-sm hidden sm:table-cell">{challenges}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {safeEntries.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">No leaderboard entries available yet.</div>
            )}
        </div>
    );
}
