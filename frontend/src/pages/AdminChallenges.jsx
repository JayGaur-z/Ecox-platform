import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getChallenges, saveChallenges, generateId } from '../utils/localStorage';
import { getChallengesAPI, createChallengeAPI } from '../services/api';
import { INITIAL_CHALLENGES } from '../data/challenges';
import { Plus, Edit2, Trash2, X, Save, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['Transport', 'Energy', 'Waste', 'Food', 'Water', 'Nature'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const VERIFY_METHODS = ['Photo', 'GPS', 'Timestamp', 'QR', 'Self Report'];

const emptyForm = {
    title: '', emoji: '🌱', category: 'Transport', description: '', longDescription: '',
    ecoPoints: 100, co2Reduction: 2.0, difficulty: 'Easy',
    verificationMethod: ['Photo', 'Timestamp'], active: true,
    steps: ['Complete the action', 'Submit your proof', 'Earn Eco Points'],
    timeRequired: '1 day',
};

export default function AdminChallenges() {
    const [challenges, setChallenges] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editId, setEditId] = useState(null);

    const loadChallenges = async () => {
        try {
            const apiCh = await getChallengesAPI();
            const list = Array.isArray(apiCh) ? apiCh : (apiCh?.items || []);
            if (list.length > 0) {
                setChallenges(list);
                return;
            }
        } catch {
            // fallback to local storage
        }

        let stored = getChallenges();
        if (!stored || !Array.isArray(stored) || stored.length === 0) {
            stored = INITIAL_CHALLENGES;
            saveChallenges(stored);
        }
        setChallenges(stored);
    };

    useEffect(() => {
        loadChallenges();
    }, []);

    const safeChallenges = Array.isArray(challenges) ? challenges : [];

    const save = async () => {
        if (!form.title || !form.description) { toast.error('Title and description are required.'); return; }

        // Attempt creation on backend if new
        if (!editId) {
            try {
                await createChallengeAPI({
                    title: form.title,
                    description: form.description,
                    category: form.category.toLowerCase(),
                    points_reward: Number(form.ecoPoints),
                    co2_saved_kg: Number(form.co2Reduction),
                    difficulty: form.difficulty.toLowerCase(),
                    verification_requirements: {
                        photo: form.verificationMethod?.includes('Photo') || false,
                        gps: form.verificationMethod?.includes('GPS') || false,
                        qr: form.verificationMethod?.includes('QR') || false,
                        timestamp: form.verificationMethod?.includes('Timestamp') || false,
                    },
                    is_active: form.active,
                });
            } catch {
                // Keep local state resilient
            }
        }

        let updated;
        if (editId) {
            updated = safeChallenges.map((c) => String(c.id) === String(editId) ? { ...c, ...form } : c);
            toast.success('Challenge updated ✓');
        } else {
            const newC = { ...form, id: generateId(), createdAt: new Date().toISOString() };
            updated = [...safeChallenges, newC];
            toast.success('Challenge created ✓');
        }
        saveChallenges(updated);
        setChallenges(updated);
        setShowForm(false);
        setEditId(null);
        setForm(emptyForm);
    };

    const deleteChallenge = (id) => {
        const updated = safeChallenges.filter((c) => String(c.id) !== String(id));
        saveChallenges(updated);
        setChallenges(updated);
        toast.success('Challenge deleted');
    };

    const startEdit = (ch) => {
        setForm({
            title: ch.title || '',
            emoji: ch.emoji || '🌱',
            category: ch.category || 'Transport',
            description: ch.description || '',
            longDescription: ch.longDescription || ch.description || '',
            ecoPoints: Number(ch.ecoPoints ?? ch.points_reward ?? 100),
            co2Reduction: Number(ch.co2Reduction ?? ch.co2_saved_kg ?? 2.0),
            difficulty: ch.difficulty || 'Easy',
            verificationMethod: Array.isArray(ch.verificationMethod) ? ch.verificationMethod : ['Photo', 'Timestamp'],
            active: ch.active !== false,
            steps: Array.isArray(ch.steps) ? ch.steps : ['Complete the action', 'Submit proof'],
            timeRequired: ch.timeRequired || '1 day',
        });
        setEditId(ch.id);
        setShowForm(true);
    };

    const toggleVerify = (method) => {
        const cur = Array.isArray(form.verificationMethod) ? form.verificationMethod : [];
        setForm({
            ...form,
            verificationMethod: cur.includes(method) ? cur.filter((m) => m !== method) : [...cur, method],
        });
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Challenge Management</h1>
                        <p className="text-gray-400 text-sm mt-0.5">Create and manage eco challenges</p>
                    </div>
                    <button
                        onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700"
                    >
                        <Plus size={16} /> New Challenge
                    </button>
                </div>

                {/* Create/Edit form */}
                {showForm && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-gray-800">{editId ? 'Edit Challenge' : 'Create New Challenge'}</h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-1">Challenge Name *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="Green Commute"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-1">Emoji</label>
                                <input type="text" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
                                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                                    {(Array.isArray(CATEGORIES) ? CATEGORIES : []).map((c) => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-1">Difficulty</label>
                                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                                    {(Array.isArray(DIFFICULTIES) ? DIFFICULTIES : []).map((d) => <option key={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-1">Eco Points</label>
                                <input type="number" min={0} value={form.ecoPoints} onChange={(e) => setForm({ ...form, ecoPoints: Number(e.target.value) })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-1">CO₂ Reduction (kg)</label>
                                <input type="number" min={0} step="0.1" value={form.co2Reduction} onChange={(e) => setForm({ ...form, co2Reduction: Number(e.target.value) })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-medium text-gray-500 block mb-1">Short Description *</label>
                                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-medium text-gray-500 block mb-1">Verification Methods</label>
                                <div className="flex flex-wrap gap-2">
                                    {(Array.isArray(VERIFY_METHODS) ? VERIFY_METHODS : []).map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => toggleVerify(m)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${(form.verificationMethod || []).includes(m)
                                                    ? 'bg-green-600 text-white border-green-600'
                                                    : 'border-gray-200 text-gray-600 hover:border-green-300'
                                                }`}
                                        >
                                            {(form.verificationMethod || []).includes(m) && <Check size={10} className="inline mr-1" />}
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={save}
                            className="mt-5 flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700"
                        >
                            <Save size={14} /> {editId ? 'Update Challenge' : 'Create Challenge'}
                        </button>
                    </div>
                )}

                {/* Challenge table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Challenge</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Category</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Points</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Status</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {safeChallenges.map((c, idx) => {
                                    const points = Number(c?.ecoPoints ?? c?.points_reward ?? 100);
                                    const isActive = c?.active !== false && c?.is_active !== false;

                                    return (
                                        <tr key={c?.id || idx} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{c?.emoji || '🌱'}</span>
                                                    <div>
                                                        <p className="font-medium text-gray-800 text-sm">{c?.title}</p>
                                                        <p className="text-gray-400 text-xs hidden sm:block">{c?.difficulty}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <span className="text-xs text-gray-500">{c?.category}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-green-600 font-bold text-sm">{points}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => startEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => deleteChallenge(c?.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {safeChallenges.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-sm">No challenges yet. Create one above.</div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
