import { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
    const { user, updateCurrentUser } = useAuth();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        name: user?.name || user?.username || '',
        college: user?.college || 'TCET Mumbai',
    });
    const [saving, setSaving] = useState(false);

    const handleSave = () => {
        if (!form.name || !form.college) { toast.error('Name and college are required.'); return; }
        setSaving(true);
        setTimeout(() => {
            if (updateCurrentUser) {
                updateCurrentUser({ name: form.name, college: form.college });
            }
            setSaving(false);
            setEditing(false);
            toast.success('Profile updated! ✓');
        }, 500);
    };

    const displayName = user?.name || user?.username || 'Eco User';
    const displayEmail = user?.email || 'user@ecox.com';
    const ecoPoints = Number(user?.ecoPoints ?? user?.eco_points ?? 0);
    const co2Reduced = Number(user?.co2Reduced ?? user?.co2_saved_kg ?? 0);
    const challengesCompleted = Number(user?.completed_challenges_count ?? user?.challenges_completed ?? user?.challengesCompleted ?? user?.challenges_count ?? 0);
    const ecoScore = user?.ecoScore || Math.min(100, Math.round(ecoPoints / 10) || 50);

    const stats = [
        { label: 'Eco Score', value: `${ecoScore}/100` },
        { label: 'Eco Points', value: ecoPoints.toLocaleString() },
        { label: 'Challenges', value: challengesCompleted },
        { label: 'CO₂ Reduced', value: `${co2Reduced} kg` },
    ];

    const joinedDateStr = user?.joinedDate || user?.created_at
        ? new Date(user.joinedDate || user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Active Member';

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">Profile</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Manage your account and view stats</p>
                </div>

                {/* Profile card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center text-white text-2xl font-bold">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-800 text-lg">{displayName}</h2>
                                <p className="text-gray-400 text-sm">{displayEmail}</p>
                                <p className="text-green-600 text-xs font-medium mt-0.5">
                                    {user?.role === 'admin' ? '⚙ Administrator' : '🌿 Eco Member'}
                                </p>
                            </div>
                        </div>
                        {!editing && (
                            <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 border border-gray-200 px-3 py-1.5 rounded-xl hover:border-green-300 transition-colors">
                                <Edit2 size={14} /> Edit
                            </button>
                        )}
                    </div>

                    {editing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1.5">College</label>
                                <input
                                    type="text"
                                    value={form.college}
                                    onChange={(e) => setForm({ ...form, college: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleSave} disabled={saving} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-2">
                                    <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button onClick={() => setEditing(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 flex items-center justify-center gap-2">
                                    <X size={14} /> Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {[
                                { label: 'Email', value: displayEmail },
                                { label: 'College', value: user?.college || 'TCET Mumbai' },
                                { label: 'Joined', value: joinedDateStr },
                            ].map(({ label, value }) => (
                                <div key={label} className="py-3 flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">{label}</span>
                                    <span className="text-gray-800 text-sm font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    {(Array.isArray(stats) ? stats : []).map(({ label, value }) => (
                        <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                            <p className="text-2xl font-bold text-green-600">{value}</p>
                            <p className="text-gray-400 text-sm mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Danger zone */}
                {user?.role !== 'admin' && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-3">Account Info</h3>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                            <p className="font-semibold mb-1">🔒 Verified Security</p>
                            <p>Authentication credentials and JWT sessions are secured with bcrypt encryption and PyJWT tokens on the FastAPI backend.</p>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
