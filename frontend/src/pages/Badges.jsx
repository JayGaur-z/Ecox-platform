import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import BadgeCard from '../components/BadgeCard';
import { BADGES } from '../data/badges';
import { getBadgesAPI, getMyBadgesAPI } from '../services/api';
import { getUnlockedBadges } from '../utils/localStorage';
import { useAuth } from '../context/AuthContext';

export default function Badges() {
    const { user } = useAuth();
    const [allBadges, setAllBadges] = useState(BADGES);
    const [unlockedIds, setUnlockedIds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchBadges = async () => {
            try {
                const apiBadges = await getBadgesAPI();
                const safeApiBadges = Array.isArray(apiBadges) ? apiBadges : [];
                if (safeApiBadges.length > 0 && isMounted) {
                    setAllBadges(safeApiBadges);
                }

                if (user) {
                    try {
                        const myBadges = await getMyBadgesAPI();
                        const safeMyBadges = Array.isArray(myBadges) ? myBadges : [];
                        const myIds = safeMyBadges.map((ub) => String(ub?.badge?.id || ub?.badge_id));
                        if (isMounted && myIds.length > 0) {
                            setUnlockedIds(myIds);
                            setLoading(false);
                            return;
                        }
                    } catch {
                        // fallback to local storage
                    }
                }
            } catch {
                // fallback to local badges
            }

            if (user && isMounted) {
                let ids = getUnlockedBadges(user.id);
                const safeIds = Array.isArray(ids) ? ids.map(String) : [];
                // Demo user gets Green Starter unlocked by default
                if (String(user.id) === 'demo-001' || user.email === 'demo@ecox.com') {
                    if (!safeIds.includes('b-001') && !safeIds.includes('1')) {
                        safeIds.push('b-001', '1');
                    }
                }
                setUnlockedIds(safeIds);
            }
            if (isMounted) setLoading(false);
        };

        fetchBadges();
        return () => { isMounted = false; };
    }, [user]);

    const safeBadges = Array.isArray(allBadges) ? allBadges : BADGES;
    const unlocked = safeBadges.filter((b) => unlockedIds.includes(String(b?.id)) || unlockedIds.includes(String(b?.code)));
    const locked = safeBadges.filter((b) => !unlockedIds.includes(String(b?.id)) && !unlockedIds.includes(String(b?.code)));

    return (
        <Layout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Badges</h1>
                        <p className="text-gray-400 text-sm mt-0.5">Earn badges by completing eco challenges</p>
                    </div>
                    <div className="bg-green-100 text-green-700 text-sm font-bold px-3 py-2 rounded-xl">
                        {unlocked.length}/{safeBadges.length} Unlocked
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                        <div className="text-3xl mb-3 animate-spin">🌿</div>
                        <p className="text-gray-500 text-sm">Loading badges...</p>
                    </div>
                ) : (
                    <>
                        {unlocked.length > 0 && (
                            <div>
                                <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <span className="text-yellow-500">✨</span> Unlocked Badges
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                    {(Array.isArray(unlocked) ? unlocked : []).map((badge) => (
                                        <BadgeCard key={badge?.id || badge?.code} badge={badge} unlocked />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <span>🔒</span> Locked Badges
                            </h2>
                            {locked.length === 0 ? (
                                <div className="text-center py-10 bg-green-50 rounded-2xl border border-green-200">
                                    <div className="text-4xl mb-2">🏆</div>
                                    <p className="font-bold text-green-700">You've unlocked all badges! Legendary! 🌍</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                    {(Array.isArray(locked) ? locked : []).map((badge) => (
                                        <BadgeCard key={badge?.id || badge?.code} badge={badge} unlocked={false} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {unlocked.length === 0 && (
                            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                                <div className="text-4xl mb-3">🌱</div>
                                <p className="font-bold text-gray-700 mb-2">No badges unlocked yet.</p>
                                <p className="text-gray-400 text-sm">Complete your first eco challenge to earn the Green Starter badge!</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}
