import React, { useState, useEffect } from 'react';
import AdminDashboard from './components/AdminDashboard';
import CentralDisplay from './components/CentralDisplay';
import EmployeeView from './components/EmployeeView';
import KioskView from './components/KioskView';
import LoginSelector from './components/LoginSelector';
import { QueueProvider, useQueueSystem } from './context/QueueContext';
import { Employee } from './types';

const Header: React.FC<{ currentView: string, onNavigate: (view: string | null) => void, loggedInEmployee?: Employee }> = ({ currentView, onNavigate, loggedInEmployee }) => {
    return (
        <header className="bg-slate-800 text-white p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-sky-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <h1 className="text-2xl font-bold">الطابور الذكي</h1>
                </div>
                <div>
                {currentView !== 'login' && (
                    <div className="flex items-center space-x-4">
                       {loggedInEmployee && (
                           <span className="text-slate-300">أهلاً، {loggedInEmployee.name}</span>
                       )}
                       <button onClick={() => onNavigate(null)} className="bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-md transition-colors">
                           تسجيل الخروج
                       </button>
                    </div>
                )}
                </div>
            </div>
        </header>
    );
}


function App() {
    return (
        <QueueProvider>
            <MainApp />
        </QueueProvider>
    );
}

function MainApp() {
    const [currentView, setCurrentView] = useState<string | null>('login');
    const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | undefined>();
    const { state, fetchState } = useQueueSystem();

    useEffect(() => {
        fetchState(); // Fetch initial state
        const interval = setInterval(fetchState, 3000); // Poll for updates every 3 seconds
        return () => clearInterval(interval);
    }, [fetchState]);

    const handleLogin = (view: string, employee?: Employee) => {
        setCurrentView(view);
        setLoggedInEmployee(employee);
    };
    
    const handleLogout = () => {
        setCurrentView('login');
        setLoggedInEmployee(undefined);
    }
    
    if (!state) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-white text-2xl">جاري تحميل النظام...</div>
            </div>
        );
    }

    const renderView = () => {
        switch (currentView) {
            case 'kiosk':
                return <KioskView />;
            case 'display':
                return <CentralDisplay />;
            case 'employee':
                if(loggedInEmployee){
                    // Find the most up-to-date employee object from the global state
                    const currentEmployeeData = state.employees.find(e => e.id === loggedInEmployee.id);
                    return currentEmployeeData ? <EmployeeView employee={currentEmployeeData} /> : <LoginSelector onLogin={handleLogin} />;
                }
                return <LoginSelector onLogin={handleLogin} />;
            case 'admin':
                return <AdminDashboard />;
            case 'login':
            default:
                return <LoginSelector onLogin={handleLogin} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
            <Header currentView={currentView || 'login'} onNavigate={handleLogout} loggedInEmployee={loggedInEmployee}/>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {renderView()}
            </main>
        </div>
    );
}

export default App;
