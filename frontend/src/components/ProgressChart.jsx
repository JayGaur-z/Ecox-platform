import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-sm">
                <p className="font-semibold text-gray-600">{label}</p>
                <p className="text-green-600 font-bold">{payload[0]?.value} kg CO₂</p>
            </div>
        );
    }
    return null;
};

export default function ProgressChart({ data }) {
    const safeData = Array.isArray(data) ? data : [];

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-1">Weekly CO₂ Reduction</h3>
            <p className="text-gray-400 text-xs mb-4">kg reduced per day this week</p>
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={safeData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(22,163,74,0.07)' }} />
                    <Bar dataKey="co2" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
