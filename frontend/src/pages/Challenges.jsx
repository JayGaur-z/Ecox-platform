import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ChallengeCard from '../components/ChallengeCard';
import { getChallengesAPI } from '../services/api';
import { getChallenges, saveChallenges, getUserSubmissions } from '../utils/localStorage';
import { INITIAL_CHALLENGES } from '../data/challenges';
import { useAuth } from '../context/AuthContext';
import { Search } from 'lucide-react';

const CATEGORIES = ['All', 'Transport', 'Energy', 'Waste', 'Food', 'Water', 'Nature'];

export default function Challenges() {
    const { user } = useAuth();
    const [challenges, setChallenges] = useState([]);
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [completedIds, setCompletedIds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchChallenges = async () => {
            try {
                const apiChallenges = await getChallengesAPI();
                const list = Array.isArray(apiChallenges) ? apiChallenges : (apiChallenges?.items || []);
                if (list.length > 0 && isMounted) {
                    setChallenges(list.filter((c) => c.active !== false));
                    setLoading(false);
                    return;
                }
            } catch {
                // Fallback to local storage if API is starting or unavailable
            }

            let stored = getChallenges();
            if (!stored || !Array.isArray(stored) || stored.length === 0) {
                saveChallenges(INITIAL_CHALLENGES);
                stored = INITIAL_CHALLENGES;
            }
            if (isMounted) {
                setChallenges(stored.filter((c) => c.active !== false));
                setLoading(false);
            }
        };

        fetchChallenges();

        const submissions = getUserSubmissions(user?.id);
        const safeSubs = Array.isArray(submissions) ? submissions : (submissions?.items || []);
        setCompletedIds(
            safeSubs
                .filter((s) => s?.status === 'verified' || s?.status === 'approved')
                .map((s) => String(s?.challengeId))
        );

        return () => { isMounted = false; };
    }, [user]);

    const safeChallenges = Array.isArray(challenges) ? challenges : [];
    const filtered = safeChallenges.filter((c) => {
        const matchCat = filter === 'All' || (c?.category || '').toLowerCase() === filter.toLowerCase();
        const matchSearch = (c?.title || '').toLowerCase().includes(search.toLowerCase()) ||
            (c?.description || '').toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">Eco Challenges</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Take real-world actions and earn Eco Points</p>
                </div>

                {/* Search + filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search challenges..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(Array.isArray(CATEGORIES) ? CATEGORIES : []).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${filter === cat
                                        ? 'bg-green-600 text-white'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                        <div className="text-3xl mb-3 animate-spin">🌿</div>
                        <p className="text-gray-500 text-sm">Loading challenges from server...</p>
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {(Array.isArray(filtered) ? filtered : []).map((challenge) => (
                            <ChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                                completed={completedIds.includes(String(challenge.id))}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                        <div className="text-5xl mb-4">🔍</div>
                        <h3 className="font-bold text-gray-700 mb-2">No challenges found</h3>
                        <p className="text-gray-400 text-sm">Try a different category or search term.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
