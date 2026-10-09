export default function StatCard({ icon, label, value, sub, color = 'green', trend }) {
    const colorMap = {
        green: 'from-green-500 to-green-600',
        blue: 'from-blue-500 to-blue-600',
        purple: 'from-purple-500 to-purple-600',
        orange: 'from-orange-500 to-orange-600',
        teal: 'from-teal-500 to-teal-600',
    };

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover">
            <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.green} flex items-center justify-center text-white shadow-sm`}>
                    {icon}
                </div>
                {trend && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend.startsWith('+') || trend.includes('lower') || trend.includes('more')
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-50 text-red-600'
                        }`}>
                        {trend}
                    </span>
                )}
            </div>
            <div className="text-2xl font-bold text-gray-800">{value}</div>
            <div className="text-gray-500 text-sm mt-0.5">{label}</div>
            {sub && <div className="text-gray-400 text-xs mt-1">{sub}</div>}
        </div>
    );
}
