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
    const { state, isLoading, fetchState } = useQueueSystem();

    // Polling effect for real-time updates
    useEffect(() => {
        const intervalId = setInterval(() => {
            // Only poll if the user is not interacting with a modal/form to avoid state jumps
            if (!document.querySelector('[role="dialog"]')) {
                fetchState();
            }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(intervalId);
    }, [fetchState]);


    // Effect to auto-logout employee if they are deleted from the system
    useEffect(() => {
        if (loggedInEmployee && state && !state.employees.find(e => e.id === loggedInEmployee.id)) {
            handleLogout();
        }
    }, [state, loggedInEmployee]);

    const handleLogin = (view: string, employee?: Employee) => {
        setCurrentView(view);
        setLoggedInEmployee(employee);
    };
    
    const handleLogout = () => {
        setCurrentView('login');
        setLoggedInEmployee(undefined);
    }
    
    const renderView = () => {
        switch (currentView) {
            case 'kiosk':
                return <KioskView />;
            case 'display':
                return <CentralDisplay />;
            case 'employee':
                if(loggedInEmployee && state){
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

    if (isLoading) {
        return (
             <div className="min-h-screen bg-slate-900 text-slate-100 flex justify-center items-center">
                <div className="text-center">
                    <svg className="animate-spin h-10 w-10 text-sky-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-lg">...جاري تحميل النظام</p>
                </div>
            </div>
        );
    }
    
    if (!state) {
         return (
             <div className="min-h-screen bg-slate-900 text-slate-100 flex justify-center items-center">
                 <p className="text-xl text-red-400">فشل تحميل بيانات النظام. يرجى المحاولة مرة أخرى.</p>
             </div>
         )
    }

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
