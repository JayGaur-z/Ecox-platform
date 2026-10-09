import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', college: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password || !form.college) {
            setError('Please fill in all fields.');
            return;
        }
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setError('Please enter a valid email address.');
            return;
        }
        setLoading(true);
        try {
            const result = await register(form);
            setLoading(false);
            if (result.success) {
                toast.success(`Welcome to EcoX, ${result.user.name || result.user.username}! 🌿`);
                navigate('/dashboard');
            } else {
                setError(result.error);
            }
        } catch (err) {
            setLoading(false);
            setError(err.message || 'Registration failed.');
        }
    };

    return (
        <div className="min-h-screen gradient-eco flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                            <Zap size={20} className="text-white" />
                        </div>
                        <span className="font-bold text-green-700 text-2xl">EcoX</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Join EcoX</h2>
                    <p className="text-gray-400 text-sm mt-1">Start your climate action journey today</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1.5">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Ayush Jaju"
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

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
                        <label className="text-sm font-medium text-gray-700 block mb-1.5">College</label>
                        <input
                            type="text"
                            name="college"
                            value={form.college}
                            onChange={handleChange}
                            placeholder="Thakur College of Engineering and Technology"
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
                                placeholder="Min. 8 characters"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-11"
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                        {loading && <Loader size={16} className="spinner" />}
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-400 mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-green-600 font-semibold hover:underline">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
