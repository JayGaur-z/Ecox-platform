import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#38bdf8', '#f59e0b'];

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-sm">
                <p className="font-semibold text-gray-700">{payload[0].name}</p>
                <p className="text-green-600 font-bold">{payload[0].value} kg CO₂</p>
            </div>
        );
    }
    return null;
};

export default function CarbonChart({ data }) {
    const chartData = useMemo(() => {
        if (Array.isArray(data)) {
            return data.map((d) => ({
                name: d?.name || 'Category',
                value: Number(d?.value) || 0,
            }));
        }
        if (data && typeof data === 'object') {
            return Object.entries(data).map(([key, val]) => ({
                name: key.charAt(0).toUpperCase() + key.slice(1),
                value: Number(val) || 0,
            }));
        }
        return [
            { name: 'Transport', value: 52.0 },
            { name: 'Electricity', value: 35.0 },
            { name: 'Food', value: 28.0 },
            { name: 'Waste', value: 13.4 },
        ];
    }, [data]);

    const total = chartData.reduce((s, d) => s + (Number(d?.value) || 0), 0);

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-1">Carbon Breakdown</h3>
            <p className="text-gray-400 text-xs mb-4">by category (kg CO₂e / month)</p>
            <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                        >
                            {(Array.isArray(chartData) ? chartData : []).map((entry, index) => (
                                <Cell key={entry.name || index} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            formatter={(value) => <span className="text-gray-600 text-xs">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: -10 }}>
                    <span className="text-xl font-bold text-gray-800">{total.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">kg CO₂e</span>
                </div>
            </div>
        </div>
    );
}
