import { RARITY_COLORS } from '../data/badges';
import { Lock } from 'lucide-react';

export default function BadgeCard({ badge, unlocked = false }) {
    if (!badge) return null;

    const rarity = badge?.rarity || 'Common';
    const points = badge?.points ?? badge?.criteria_value ?? 0;
    const emoji = badge?.emoji || badge?.icon_url || '🏅';

    return (
        <div className={`rounded-2xl p-4 text-center transition-all duration-200 border ${unlocked
                ? 'bg-white border-green-200 shadow-sm card-hover'
                : 'bg-gray-50 border-gray-200 opacity-60'
            }`}>
            <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${unlocked ? (RARITY_COLORS[rarity] || 'from-green-500 to-green-600') : 'from-gray-300 to-gray-400'
                } flex items-center justify-center text-2xl mb-3 ${unlocked ? 'badge-glow' : ''}`}>
                {unlocked ? emoji : <Lock size={20} className="text-gray-500" />}
            </div>
            <h4 className="font-bold text-sm text-gray-800 mb-1">{badge?.name || 'Badge'}</h4>
            <p className="text-xs text-gray-400 mb-2 line-clamp-2">{badge?.description || 'Eco achievement'}</p>
            <div className="flex items-center justify-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${unlocked
                        ? `bg-gradient-to-r ${RARITY_COLORS[rarity] || 'from-green-500 to-green-600'} text-white`
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                    {rarity}
                </span>
                {unlocked && points > 0 && (
                    <span className="text-xs text-green-600 font-semibold">+{points}pts</span>
                )}
            </div>
        </div>
    );
}
