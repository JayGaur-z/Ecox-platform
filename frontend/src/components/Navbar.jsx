import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ setMobileOpen }) {
    const { user } = useAuth();

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
            <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setMobileOpen(true)}
            >
                <Menu size={20} className="text-gray-600" />
            </button>

            <div className="flex-1">
                <h2 className="text-gray-800 font-semibold text-base md:text-lg">
                    {getGreeting()}, {user?.name?.split(' ')[0]} 👋
                </h2>
                <p className="text-gray-400 text-xs hidden md:block">
                    SDG 13 — Climate Action Platform
                </p>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
                    <span className="text-green-600 font-semibold text-sm">🌿 {user?.ecoPoints || 0}</span>
                    <span className="text-gray-400 text-xs">Eco Points</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
            </div>
        </header>
    );
}
