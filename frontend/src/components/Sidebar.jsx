import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Calculator, ClipboardList, Leaf, BarChart2,
    Trophy, Medal, User, Shield, CheckSquare, LogOut, Menu, X, Zap
} from 'lucide-react';

const userNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calculator', icon: Calculator, label: 'Carbon Calculator' },
    { to: '/planner', icon: ClipboardList, label: 'Reduction Planner' },
    { to: '/challenges', icon: Leaf, label: 'Challenges' },
    { to: '/progress', icon: BarChart2, label: 'My Progress' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/badges', icon: Medal, label: 'Badges' },
    { to: '/profile', icon: User, label: 'Profile' },
];

const adminNavItems = [
    { to: '/admin', icon: Shield, label: 'Admin Dashboard' },
    { to: '/admin/challenges', icon: Leaf, label: 'Challenges' },
    { to: '/admin/verification', icon: CheckSquare, label: 'Verification' },
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = user?.role === 'admin' ? adminNavItems : userNavItems;

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`sidebar gradient-eco flex flex-col shadow-2xl z-40 transition-transform duration-300
          ${mobileOpen ? 'open' : ''}`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-green-700">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                        <Zap size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-xl leading-none">EcoX</h1>
                        <p className="text-green-200 text-xs">Climate Action Platform</p>
                    </div>
                    <button
                        className="ml-auto md:hidden text-white"
                        onClick={() => setMobileOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* User info */}
                <div className="px-6 py-4 border-b border-green-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{user?.name}</p>
                            <p className="text-green-200 text-xs truncate">{user?.role === 'admin' ? '⚙ Admin' : `${user?.ecoPoints || 0} Eco Points`}</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                                    ? 'bg-white/20 text-white shadow-sm'
                                    : 'text-green-100 hover:bg-white/10 hover:text-white'
                                }`
                            }
                        >
                            <Icon size={18} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className="px-3 py-4 border-t border-green-700">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-green-100
              hover:bg-white/10 hover:text-white transition-all"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
