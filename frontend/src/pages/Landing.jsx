import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, BarChart2, Trophy, Shield, Zap, Users, Target } from 'lucide-react';

const stats = [
    { value: '4,582 kg', label: 'CO₂ Reduced' },
    { value: '24', label: 'Active Challenges' },
    { value: '1,248', label: 'Active Users' },
    { value: '89,200', label: 'Eco Points Earned' },
];

const steps = [
    { step: 1, icon: '🧮', title: 'Calculate', desc: 'Measure your monthly carbon footprint with our calculator.' },
    { step: 2, icon: '🎯', title: 'Choose Challenge', desc: 'Pick from transport, energy, food, and nature challenges.' },
    { step: 3, icon: '✅', title: 'Complete Action', desc: 'Take real-world green actions in your community.' },
    { step: 4, icon: '📸', title: 'Submit Proof', desc: 'Upload photo, GPS location, and timestamp evidence.' },
    { step: 5, icon: '🔍', title: 'Get Verified', desc: 'Our verification engine checks your submission.' },
    { step: 6, icon: '⚡', title: 'Earn Eco Points', desc: 'Points added to your profile and leaderboard ranking.' },
];

const features = [
    { icon: BarChart2, title: 'Carbon Tracking', desc: 'Real-time footprint monitoring with detailed category analysis.' },
    { icon: Target, title: 'Personalized Actions', desc: 'AI-suggested reduction plans tailored to your lifestyle.' },
    { icon: Shield, title: 'Verified Challenges', desc: 'Multi-evidence verification: photo, GPS, timestamp, QR.' },
    { icon: Trophy, title: 'Gamification', desc: 'Earn points, unlock badges, and climb the leaderboard.' },
    { icon: Users, title: 'College Competitions', desc: 'Compete with teams and colleges for campus glory.' },
    { icon: Leaf, title: 'Real Impact', desc: 'Track your total CO₂ reduction and compare with global averages.' },
];

export default function Landing() {
    return (
        <div className="min-h-screen bg-white font-sans">
            {/* Navbar */}
            <nav className="flex items-center justify-between px-6 md:px-16 py-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
                        <Zap size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-green-700 text-xl">EcoX</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link to="/login" className="text-gray-600 font-medium text-sm hover:text-green-600 transition-colors px-4 py-2">Login</Link>
                    <Link to="/register" className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative px-6 md:px-16 py-20 md:py-28 gradient-eco overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="absolute rounded-full bg-white"
                            style={{
                                width: Math.random() * 80 + 20,
                                height: Math.random() * 80 + 20,
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                opacity: Math.random() * 0.3
                            }}
                        />
                    ))}
                </div>
                <div className="relative max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm px-4 py-2 rounded-full mb-6 font-medium">
                        <span>🌍</span> SDG 13 — Climate Action Platform
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
                        Turn Green Actions<br />Into <span className="text-green-200">Real Impact.</span>
                    </h1>
                    <p className="text-green-100 text-lg md:text-xl max-w-2xl mx-auto mb-10">
                        Measure your carbon footprint, complete real-world eco challenges, and build a greener future — one action at a time.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/register" className="bg-white text-green-700 font-bold px-8 py-4 rounded-xl hover:bg-green-50 transition-all flex items-center gap-2 justify-center text-base">
                            Calculate My Footprint <ArrowRight size={18} />
                        </Link>
                        <Link to="/challenges" className="bg-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/30 transition-all text-base border border-white/30">
                            Explore Challenges
                        </Link>
                    </div>
                </div>
            </section>

            {/* Flow section */}
            <section className="py-12 bg-green-50">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <p className="text-gray-500 text-sm font-medium mb-6">THE ECOX FLOW</p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {['Calculate', 'Act', 'Verify', 'Earn', 'Reduce'].map((step, i, arr) => (
                            <div key={step} className="flex items-center gap-3">
                                <div className="bg-green-600 text-white px-4 py-2 rounded-xl font-semibold text-sm">{step}</div>
                                {i < arr.length - 1 && <ArrowRight size={18} className="text-green-400" />}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-16 px-6 md:px-16 border-b border-gray-100">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
                    {stats.map((s) => (
                        <div key={s.label} className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-green-600 mb-1">{s.value}</div>
                            <div className="text-gray-500 text-sm">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="py-20 px-6 md:px-16">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">How EcoX Works</h2>
                        <p className="text-gray-500">Six simple steps to make a real environmental difference.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {steps.map((s) => (
                            <div key={s.step} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm card-hover">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">
                                        {s.step}
                                    </div>
                                    <span className="text-2xl">{s.icon}</span>
                                </div>
                                <h3 className="font-bold text-gray-800 mb-2">{s.title}</h3>
                                <p className="text-gray-500 text-sm">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why EcoX */}
            <section className="py-20 px-6 md:px-16 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">Why EcoX?</h2>
                        <p className="text-gray-500">Built for students. Designed for impact.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {features.map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="bg-white rounded-2xl p-6 border border-green-100 shadow-sm card-hover">
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                                    <Icon size={22} className="text-green-600" />
                                </div>
                                <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
                                <p className="text-gray-500 text-sm">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6 gradient-eco text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to make a difference?</h2>
                <p className="text-green-100 mb-8 text-lg">Join 1,248 students already reducing their carbon footprint.</p>
                <Link to="/register" className="bg-white text-green-700 font-bold px-8 py-4 rounded-xl hover:bg-green-50 transition-all inline-flex items-center gap-2 text-base">
                    Join EcoX for Free <ArrowRight size={18} />
                </Link>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-gray-100 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-green-600 rounded-lg flex items-center justify-center">
                        <Zap size={12} className="text-white" />
                    </div>
                    <span className="font-bold text-green-700">EcoX</span>
                </div>
                <p className="text-gray-400 text-sm">AI-Assisted Carbon Reduction & Green Challenge Platform</p>
                <p className="text-gray-300 text-xs mt-2">SDG 13 — Climate Action | Prototype Version</p>
            </footer>
        </div>
    );
}
