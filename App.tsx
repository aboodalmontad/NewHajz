import React, { useState, useEffect } from 'react';
import AdminDashboard from './components/AdminDashboard';
import CentralDisplay from './components/CentralDisplay';
import EmployeeView from './components/EmployeeView';
import KioskView from './components/KioskView';
import LoginSelector from './components/LoginSelector';
import { QueueProvider, useQueueSystem } from './context/QueueContext';
import { Employee } from './types';
import { LanConnectionBar } from './components/LanConnectionBar';
import { LanConnectionModal } from './components/LanConnectionModal';
import { ConfirmationToast } from './components/ConfirmationToast';
import { Wifi, Send, QrCode } from 'lucide-react';

const Header: React.FC<{
  currentView: string;
  onNavigate: (view: string | null) => void;
  loggedInEmployee?: Employee;
  onOpenLanModal: (tab?: 'confirm' | 'pair' | 'diagnostics' | 'identity') => void;
}> = ({ currentView, onNavigate, loggedInEmployee, onOpenLanModal }) => {
  const { lanStatus, connectedDevices } = useQueueSystem();

  return (
    <header className="bg-slate-800 text-white p-3 sm:p-4 shadow-md border-b border-slate-700">
      <div className="container mx-auto flex flex-wrap justify-between items-center gap-3">
        {/* Brand & Title */}
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="bg-sky-500 p-2.5 rounded-xl shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black leading-none flex items-center gap-2">
              <span>نظام الطابور والربط المحلي</span>
              <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-700 px-2 py-0.5 rounded-md font-mono hidden sm:inline">
                LAN v2.0
              </span>
            </h1>
            <p className="text-xs mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${lanStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className={lanStatus === 'connected' ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                {lanStatus === 'connected' ? `متصل بالشبكة المحلية (${connectedDevices.length} أجهزة)` : 'وضع العمل المحلي'}
              </span>
            </p>
          </div>
        </div>

        {/* Center / Actions */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Quick LAN Center Button */}
          <button
            onClick={() => onOpenLanModal('confirm')}
            className="flex items-center gap-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-500 shadow-sm transition-all cursor-pointer"
            title="فتح مركز تأكيد اتصال الأجهزة"
          >
            <Send className="w-3.5 h-3.5" />
            <span>تأكيد وفحص الأجهزة</span>
            <span className="bg-emerald-800 text-emerald-200 px-1.5 py-0.2 rounded font-mono text-[10px]">
              {connectedDevices.length}
            </span>
          </button>

          {/* Quick QR Pairing Button */}
          <button
            onClick={() => onOpenLanModal('pair')}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-600 transition-colors cursor-pointer"
            title="مسح رمز الاستجابة السريعة لربط أجهزة أخرى"
          >
            <QrCode className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">ربط جهاز جديد</span>
          </button>

          {/* User Status / Mode Switch */}
          {currentView !== 'login' && (
            <div className="flex items-center space-x-2 space-x-reverse">
              {loggedInEmployee && (
                <span className="text-slate-300 text-xs hidden md:inline bg-slate-750 px-2.5 py-1 rounded-md border border-slate-700">
                  الموظف: {loggedInEmployee.name}
                </span>
              )}
              <button
                onClick={() => onNavigate(null)}
                className="text-xs bg-slate-700 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg transition-colors border border-slate-600 cursor-pointer"
              >
                {currentView === 'admin' || currentView === 'employee' ? 'خروج' : 'تغيير الوضع'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

function MainApp() {
  const [currentView, setCurrentView] = useState<string | null>(null);
  const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | undefined>();
  const [isLanModalOpen, setIsLanModalOpen] = useState(false);
  const [lanModalTab, setLanModalTab] = useState<'confirm' | 'pair' | 'diagnostics' | 'identity' | 'guide'>('confirm');

  const {
    state,
    isLoading,
    fetchState,
    confirmAlert,
    dismissConfirmAlert
  } = useQueueSystem();

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

  // Periodic state fetch fallback
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!document.querySelector('[role="dialog"]')) {
        fetchState();
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [fetchState]);

  useEffect(() => {
    if (loggedInEmployee && state && !state.employees.find(e => e.id === loggedInEmployee.id)) {
      handleLogout();
    }
  }, [state, loggedInEmployee]);

  const updateHistory = (view: string | null) => {
    try {
      if (window.location.href.startsWith('blob:')) return;
      const url = new URL(window.location.href);
      if (view) {
        url.searchParams.set('view', view);
      } else {
        url.searchParams.delete('view');
      }
      window.history.pushState({}, '', url);
    } catch (e) {
      console.warn('History pushState failed', e);
    }
  };

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
  };

  const openLanModal = (tab?: 'confirm' | 'pair' | 'diagnostics' | 'identity' | 'guide') => {
    setLanModalTab(tab || 'confirm');
    setIsLanModalOpen(true);
  };

  const renderView = () => {
    switch (currentView) {
      case 'kiosk':
        return <KioskView />;
      case 'display':
        return <CentralDisplay />;
      case 'employee':
        if (loggedInEmployee && state) {
          const currentEmployeeData = state.employees.find(e => e.id === loggedInEmployee.id);
          return currentEmployeeData ? (
            <EmployeeView employee={currentEmployeeData} />
          ) : (
            <LoginSelector onLogin={handleLogin} onOpenLanModal={openLanModal} />
          );
        }
        return <LoginSelector onLogin={handleLogin} defaultToEmployee={true} onOpenLanModal={openLanModal} />;
      case 'admin':
        return <AdminDashboard />;
      case 'login':
        return <LoginSelector onLogin={handleLogin} onOpenLanModal={openLanModal} />;
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
          <p className="mt-6 text-xl font-medium text-slate-300">جاري بدء خادم الشبكة المحلية...</p>
          <p className="text-sm text-slate-500 mt-2">يعمل النظام بشكل كامل بدون إنترنت خارجي على الشبكة المحلية</p>
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
          <h3 className="text-xl font-bold text-white mb-2">خطأ في الاتصال بالبيانات</h3>
          <p className="text-slate-400">حدث خطأ أثناء تحميل بيانات الشبكة المحلية.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-sky-500 selection:text-white flex flex-col">
      {/* Header */}
      <Header
        currentView={currentView}
        onNavigate={handleLogout}
        loggedInEmployee={loggedInEmployee}
        onOpenLanModal={openLanModal}
      />

      {/* LAN Connectivity Bar */}
      <LanConnectionBar onOpenModal={openLanModal} />

      {/* Main Content Area */}
      <main className="container mx-auto p-3 sm:p-6 lg:p-8 flex-1">
        {renderView()}
      </main>

      {/* Confirmation Toast Alert */}
      <ConfirmationToast alert={confirmAlert} onDismiss={dismissConfirmAlert} />

      {/* LAN Connection & Confirmation Center Modal */}
      <LanConnectionModal
        isOpen={isLanModalOpen}
        initialTab={lanModalTab}
        onClose={() => setIsLanModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <QueueProvider>
      <MainApp />
    </QueueProvider>
  );
}
