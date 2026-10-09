import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

export default function AdminRoute({ children }) {
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && user && user.role !== 'admin' && user.role !== 'ADMIN') {
            toast.error('Access Denied: Administrative privileges required.');
        }
    }, [user, loading]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-emerald-400 gap-3">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-sm font-medium text-slate-400">Verifying administrative credentials...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/admin/login" replace />;
    }

    if (user.role !== 'admin' && user.role !== 'ADMIN') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
