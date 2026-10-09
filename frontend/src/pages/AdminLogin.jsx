import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertTriangle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLogin() {
    const navigate = useNavigate();
    const { adminLogin } = useAuth();
    const [identifier, setIdentifier] = useState('admin@ecox.com');
    const [password, setPassword] = useState('123456');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await adminLogin(identifier, password);
        setLoading(false);

        if (result.success) {
            toast.success('Administrative session established ✓');
            navigate('/admin/dashboard', { replace: true });
        } else {
            setError(result.error || 'Access Denied: Administrative privileges required.');
            toast.error(result.error || 'Access Denied: Administrative privileges required.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
            {/* Top Bar with switch back to Student Portal */}
            <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🌱</span>
                    <span className="font-black text-lg tracking-wider text-white">Eco<span className="text-emerald-400">X</span></span>
                    <span className="ml-2 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Admin Portal
                    </span>
                </div>
                <Link
                    to="/login"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-emerald-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 transition-all shadow-sm"
                >
                    <ArrowLeft size={13} /> Switch to Student Portal
                </Link>
            </header>

            {/* Central Administrative Sign-In Card */}
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                    <div className="text-center mb-8">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                            <ShieldCheck size={28} />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Administrative Sign-In</h1>
                        <p className="text-xs text-slate-400 mt-1.5">
                            Restricted access: EcoX verification & challenge oversight
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-950/60 border border-red-800/80 text-red-300 text-xs rounded-xl p-4 flex items-start gap-2.5">
                            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold block">403 Forbidden</span>
                                {error}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Admin Email or Username
                            </label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="admin@ecox.com"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Security Password
                            </label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Authenticate Operations Session <ArrowRight size={16} /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
                        <p className="text-xs text-slate-500">
                            Looking for Student Challenges?{' '}
                            <Link to="/login" className="text-emerald-400 hover:underline font-semibold ml-1">
                                Switch to Student Portal →
                            </Link>
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900">
                EcoX Production Security Layer &bull; Zero Client-Side Trust &bull; Administrative Verification Queue
            </footer>
        </div>
    );
}
