import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) {
            setError('Please fill in all fields.');
            return;
        }
        setLoading(true);
        try {
            const result = await login(form.email, form.password);
            setLoading(false);
            if (result.success) {
                toast.success(`Welcome back, ${result.user.name || result.user.username}! 🌿`);
                const roleLower = String(result.user?.role || '').toLowerCase();
                if (roleLower === 'admin') {
                    navigate('/admin/dashboard', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }
            } else {
                setError(result.error);
            }
        } catch (err) {
            setLoading(false);
            setError(err.message || 'Login failed.');
        }
    };

    const loginAsDemo = async () => {
        setLoading(true);
        try {
            const result = await login('demo@ecox.com', '123456');
            setLoading(false);
            if (result.success) {
                toast.success('Welcome, Ayush! 🌍');
                navigate('/dashboard');
            } else {
                setError(result.error);
            }
        } catch (err) {
            setLoading(false);
            setError(err.message || 'Demo login failed.');
        }
    };

    return (
        <div className="min-h-screen gradient-eco flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                            <Zap size={20} className="text-white" />
                        </div>
                        <span className="font-bold text-green-700 text-2xl">EcoX</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Welcome back</h2>
                    <p className="text-gray-400 text-sm mt-1">Sign in to continue your eco journey</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1.5">Password</label>
                        <div className="relative">
                            <input
                                type={showPass ? 'text' : 'password'}
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-11"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {loading ? <Loader size={16} className="spinner" /> : null}
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                    <div className="flex-1 border-t border-gray-100" />
                    <span className="text-gray-300 text-xs">or</span>
                    <div className="flex-1 border-t border-gray-100" />
                </div>

                <button
                    onClick={loginAsDemo}
                    disabled={loading}
                    className="w-full border-2 border-green-200 text-green-700 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors text-sm"
                >
                    🌍 Login as Demo User (Ayush)
                </button>

                <p className="text-center text-sm text-gray-400 mt-6">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-green-600 font-semibold hover:underline">
                        Create one free
                    </Link>
                </p>

                <div className="mt-4 bg-green-50 rounded-xl px-4 py-3 text-xs text-gray-600 flex items-center justify-between border border-green-200">
                    <span className="font-semibold text-gray-700">Are you a Platform Admin?</span>
                    <Link
                        to="/admin/login"
                        className="text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                        Switch to Admin Portal →
                    </Link>
                </div>
            </div>
        </div>
    );
}
