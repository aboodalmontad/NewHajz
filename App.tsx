
import React, { useState, useEffect } from 'react';
import AdminDashboard from './components/AdminDashboard';
import CentralDisplay from './components/CentralDisplay';
import EmployeeView from './components/EmployeeView';
import KioskView from './components/KioskView';
import LoginSelector from './components/LoginSelector';
import { QueueProvider, useQueueSystem } from './context/QueueContext';
import { Employee } from './types';

const Header: React.FC<{ currentView: string, onNavigate: (view: string | null) => void, loggedInEmployee?: Employee }> = ({ currentView, onNavigate, loggedInEmployee }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <header className="bg-slate-800 text-white p-4 shadow-md border-b border-slate-700">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="bg-sky-500 p-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold leading-none">نظام الطابور الذكي</h1>
                        <p className="text-xs mt-1 flex items-center">
                            <span className={`w-2 h-2 rounded-full ml-1 ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></span>
                            {isOnline ? (
                                <span className="text-green-400">متصل بالشبكة</span>
                            ) : (
                                <span className="text-slate-400 font-medium">وضع العمل المحلي (بدون إنترنت)</span>
                            )}
                        </p>
                    </div>
                </div>
                <div>
                {currentView !== 'login' && (
                    <div className="flex items-center space-x-4 space-x-reverse">
                       {loggedInEmployee && (
                           <span className="text-slate-300 hidden sm:inline">الموظف: {loggedInEmployee.name}</span>
                       )}
                       <button onClick={() => onNavigate(null)} className="text-sm bg-slate-700 hover:bg-red-600 px-4 py-2 rounded-md transition-colors border border-slate-600">
                           {currentView === 'admin' || currentView === 'employee' ? 'خروج' : 'تغيير الوضع'}
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
    const [currentView, setCurrentView] = useState<string | null>(null);
    const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | undefined>();
    const { state, isLoading, fetchState } = useQueueSystem();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view');
        const savedView = localStorage.getItem('app_role_lock');
        
        if (viewParam) {
            setCurrentView(viewParam);
            localStorage.setItem('app_role_lock', viewParam);
        } else if (savedView) {
            setCurrentView(savedView);
        } else {
            setCurrentView('login');
        }
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (!document.querySelector('[role="dialog"]')) {
                fetchState();
            }
        }, 3000); 

        return () => clearInterval(intervalId);
    }, [fetchState]);

    useEffect(() => {
        if (loggedInEmployee && state && !state.employees.find(e => e.id === loggedInEmployee.id)) {
            handleLogout();
        }
    }, [state, loggedInEmployee]);

    const updateHistory = (view: string | null) => {
        try {
            // لا نحاول تحديث التاريخ إذا كان الرابط يبدأ بـ blob لتجنب أخطاء المتصفح الأمنية
            if (window.location.href.startsWith('blob:')) return;

            const url = new URL(window.location.href);
            if (view) {
                url.searchParams.set('view', view);
            } else {
                url.searchParams.delete('view');
            }
            window.history.pushState({}, '', url);
        } catch (e) {
            console.warn('History pushState failed, skipping URL update', e);
        }
    }

    const handleLogin = (view: string, employee?: Employee) => {
        setCurrentView(view);
        setLoggedInEmployee(employee);
        localStorage.setItem('app_role_lock', view);
        updateHistory(view);
    };
    
    const handleLogout = () => {
        setCurrentView('login');
        setLoggedInEmployee(undefined);
        localStorage.removeItem('app_role_lock');
        updateHistory(null);
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
                return <LoginSelector onLogin={handleLogin} defaultToEmployee={true} />;
            case 'admin':
                return <AdminDashboard />;
            case 'login':
                return <LoginSelector onLogin={handleLogin} />;
            default:
                return null;
        }
    };

    if (isLoading || currentView === null) {
        return (
             <div className="min-h-screen bg-slate-900 text-slate-100 flex justify-center items-center">
                <div className="text-center">
                    <div className="relative inline-block">
                        <div className="w-16 h-16 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
                    </div>
                    <p className="mt-6 text-xl font-medium text-slate-300">جاري مزامنة النظام...</p>
                    <p className="text-sm text-slate-500 mt-2">يعمل النظام بشكل كامل بدون إنترنت</p>
                </div>
            </div>
        );
    }
    
    if (!state) {
         return (
             <div className="min-h-screen bg-slate-900 text-slate-100 flex justify-center items-center p-4">
                 <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-2xl text-center max-w-md">
                    <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-xl font-bold text-white mb-2">خطأ في البيانات</h3>
                    <p className="text-slate-400">حدث خطأ أثناء تحميل مخزن البيانات المحلي.</p>
                    <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition-colors">
                        إعادة المحاولة
                    </button>
                 </div>
             </div>
         )
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
            <Header currentView={currentView} onNavigate={handleLogout} loggedInEmployee={loggedInEmployee}/>
            <main className="container mx-auto p-4 sm:p-6 lg:p-10">
                {renderView()}
            </main>
        </div>
    );
}

export default App;
