import { createContext, useContext, useState, useEffect } from 'react';
import {
    getCurrentUser,
    setCurrentUser,
    logoutUser,
    getUsers,
    saveUser,
    updateUser,
    generateId,
} from '../utils/localStorage';
import {
    loginUser,
    adminLoginUser,
    registerUser,
    getMe,
    logoutUserAPI,
    getAccessToken,
} from '../services/api';
import { DEMO_USER, ADMIN_USER } from '../data/demoUsers';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check token and load current user from API or localStorage
    useEffect(() => {
        const initAuth = async () => {
            const token = getAccessToken();
            if (token) {
                try {
                    const me = await getMe();
                    setUser(me);
                    setCurrentUser(me);
                    setLoading(false);
                    return;
                } catch {
                    // Token expired or server unavailable
                }
            }

            // Fallback to local storage if token not present or API unavailable
            const current = getCurrentUser();
            if (current) setUser(current);
            setLoading(false);
        };

        // Seed fallback demo users
        const users = getUsers();
        if (!users.find((u) => u.email === DEMO_USER.email)) {
            saveUser(DEMO_USER);
        }
        if (!users.find((u) => u.email === ADMIN_USER.email)) {
            saveUser(ADMIN_USER);
        }

        initAuth();
    }, []);

    const login = async (email, password) => {
        try {
            // Attempt login via FastAPI backend
            const loggedInUser = await loginUser(email, password);
            setCurrentUser(loggedInUser);
            setUser(loggedInUser);
            return { success: true, user: loggedInUser };
        } catch (apiError) {
            // Fallback to demo local storage users if offline
            const users = getUsers();
            const found = users.find(
                (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
            );
            if (found) {
                setCurrentUser(found);
                setUser(found);
                return { success: true, user: found };
            }
            return { success: false, error: apiError.message || 'Invalid email or password.' };
        }
    };

    const register = async (data) => {
        try {
            // Register via FastAPI backend
            const newUser = await registerUser(data);
            setCurrentUser(newUser);
            setUser(newUser);
            return { success: true, user: newUser };
        } catch (apiError) {
            // Fallback to local storage if offline
            const users = getUsers();
            if (users.find((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
                return { success: false, error: 'An account with this email already exists.' };
            }
            const localUser = {
                id: generateId(),
                name: data.name,
                email: data.email,
                password: data.password,
                college: data.college,
                role: 'user',
                ecoPoints: 0,
                co2Reduced: 0,
                challengesCompleted: 0,
                ecoScore: 0,
                streak: 0,
                joinedDate: new Date().toISOString().split('T')[0],
            };
            saveUser(localUser);
            setCurrentUser(localUser);
            setUser(localUser);
            return { success: true, user: localUser };
        }
    };

    const logout = () => {
        logoutUserAPI();
        logoutUser();
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const me = await getMe();
            setUser(me);
            setCurrentUser(me);
        } catch {
            const current = getCurrentUser();
            if (current) setUser(current);
        }
    };

    const adminLogin = async (email, password) => {
        try {
            const adminData = await adminLoginUser(email, password);
            if (adminData.role !== 'admin' && adminData.role !== 'ADMIN') {
                logout();
                return { success: false, error: 'Access Denied: Administrative privileges required.' };
            }
            setCurrentUser(adminData);
            setUser(adminData);
            return { success: true, user: adminData };
        } catch (apiError) {
            return {
                success: false,
                error: apiError.message || 'Access Denied: Administrative privileges required.',
            };
        }
    };

    const updateCurrentUser = (updates) => {
        if (!user) return;
        const updated = updateUser(user.id, updates);
        if (updated) setUser(updated);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, adminLogin, register, logout, refreshUser, updateCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
