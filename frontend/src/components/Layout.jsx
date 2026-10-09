import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <div className="main-content min-h-screen flex flex-col">
                <Navbar setMobileOpen={setMobileOpen} />
                <main className="flex-1 p-4 md:p-6 fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
