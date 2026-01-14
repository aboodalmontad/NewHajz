
import React, { useState, useEffect, useMemo } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Employee, EmployeeStatus } from '../types';
import { Button } from './shared/Button';
import { Card } from './shared/Card';

interface EmployeeViewProps {
    employee: Employee;
}

const EmployeeView: React.FC<EmployeeViewProps> = ({ employee }) => {
    const { 
        state,
        assignEmployeeToWindow, 
        unassignEmployeeFromWindow,
        callNextCustomer,
        finishService,
    } = useQueueSystem();

    const [selectedWindowId, setSelectedWindowId] = useState<string>(employee.windowId?.toString() || '');
    const [localLoading, setLocalLoading] = useState(false);

    useEffect(() => {
        setSelectedWindowId(employee.windowId?.toString() || '');
    }, [employee.windowId]);

    if (!state) return null;

    const { windows, customers, queue } = state;
    const assignedWindow = windows.find(w => w.id === employee.windowId);
    const currentCustomer = customers.find(c => c.id === assignedWindow?.currentCustomerId);

    const filteredQueueCount = useMemo(() => {
        if (!assignedWindow) return 0;
        const task = assignedWindow.customTask || 'خدمات عامة';
        return queue.filter(customerId => {
            const customer = customers.find(c => c.id === customerId);
            return task === 'خدمات عامة' || customer?.serviceName === task;
        }).length;
    }, [queue, customers, assignedWindow]);

    const handleAction = async (action: () => Promise<any>) => {
        if (localLoading) return;
        setLocalLoading(true);
        try {
            await action();
        } finally {
            setTimeout(() => setLocalLoading(false), 150);
        }
    };

    const handleWindowSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const winId = e.target.value;
        setSelectedWindowId(winId);
        if (winId) {
            handleAction(() => assignEmployeeToWindow(employee.id, parseInt(winId, 10)));
        } else {
            handleAction(() => unassignEmployeeFromWindow(employee.id));
        }
    };

    const availableWindows = windows.filter(w => !w.employeeId || w.employeeId === employee.id);
    const isReadyToServe = employee.status === EmployeeStatus.Available && assignedWindow;
    const isServing = employee.status === EmployeeStatus.Busy && assignedWindow && currentCustomer;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card className="bg-slate-800 p-8 text-center border border-slate-700">
                <h2 className="text-3xl font-bold text-sky-400">أهلاً بك، {employee.name}</h2>
                <p className={`mt-2 text-lg font-semibold ${employee.status === EmployeeStatus.Available ? 'text-green-400' : 'text-yellow-400'}`}>
                    الحالة: {employee.status}
                </p>
            </Card>

            <Card className="bg-slate-800 p-6 border border-slate-700">
                <h3 className="text-xl font-semibold mb-4">إدارة الشباك</h3>
                <div className="flex items-center space-x-4 space-x-reverse">
                    <select 
                        value={selectedWindowId} 
                        onChange={handleWindowSelection} 
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-sky-500 focus:border-sky-500 outline-none"
                    >
                        <option value="">اختر شباكاً للعمل عليه</option>
                        {availableWindows.map(win => (
                            <option key={win.id} value={win.id}>
                                {win.name} {win.customTask ? `(تخصص: ${win.customTask})` : '(خدمات عامة)'}
                            </option>
                        ))}
                    </select>
                </div>
                {assignedWindow && (
                    <div className="mt-4 p-3 bg-sky-500/10 rounded-lg border border-sky-500/20">
                         <p className="text-sky-400 font-medium">أنت تعمل الآن على {assignedWindow.name}.</p>
                         <p className="text-xs text-slate-400 mt-1">التخصص الحالي: <span className="text-white font-bold">{assignedWindow.customTask || 'خدمات عامة'}</span></p>
                    </div>
                )}
            </Card>
            
            <Card className="bg-slate-800 p-6 flex flex-col items-center justify-center min-h-[450px] border border-slate-700 transition-all duration-300">
                {isServing && (
                     <div className="text-center w-full animate-in fade-in zoom-in duration-200">
                        <div className="mb-4">
                            <span className="bg-yellow-400/10 text-yellow-400 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-tighter border border-yellow-400/20">قيد الخدمة حالياً</span>
                        </div>
                        <p className="text-slate-400 text-lg">الرقم الحالي</p>
                        <p className="text-9xl font-mono font-bold text-white my-6 drop-shadow-lg">{currentCustomer?.ticketNumber}</p>
                        <p className="text-slate-500 mb-8">الخدمة: {currentCustomer?.serviceName}</p>
                        <Button 
                            size="lg" 
                            variant="danger" 
                            className="w-full max-w-sm py-6 !rounded-3xl shadow-2xl shadow-red-600/30 text-2xl font-black" 
                            onClick={() => handleAction(() => finishService(employee.id))}
                            disabled={localLoading}
                        >
                            إنـهـاء الـخـدمـة
                        </Button>
                    </div>
                )}
                
                {isReadyToServe && (
                    <div className="text-center w-full animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-900/50 p-10 rounded-[3rem] mb-10 border border-slate-700/50 inline-block min-w-[320px] shadow-inner">
                            <p className="text-slate-400 text-lg mb-2">عملاء في الانتظار</p>
                            <p className="text-8xl font-black text-sky-400">{filteredQueueCount}</p>
                            <div className="h-1 w-12 bg-sky-500/30 mx-auto mt-4 rounded-full"></div>
                        </div>
                        <div className="block">
                            <Button 
                                size="lg" 
                                className="w-full max-w-sm py-6 !rounded-3xl shadow-2xl shadow-sky-600/30 text-2xl font-black" 
                                onClick={() => handleAction(() => callNextCustomer(employee.id))} 
                                disabled={filteredQueueCount === 0 || localLoading}
                            >
                                استدعاء التالي
                            </Button>
                        </div>
                    </div>
                )}
                
                {!assignedWindow && (
                     <div className="text-center text-slate-500 opacity-40">
                        <svg className="h-24 w-24 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-2xl font-bold">بانتظار اختيار شباك العمل...</p>
                     </div>
                )}
            </Card>

             <Card className="bg-slate-800 p-6 border border-slate-700">
                 <h3 className="text-xl font-semibold mb-3">ملخص الأداء اليوم</h3>
                 <div className="flex items-center justify-between bg-slate-900/50 p-5 rounded-2xl border border-slate-700">
                    <span className="text-slate-400">إجمالي من تمت خدمتهم</span>
                    <span className="text-3xl font-bold text-sky-400">{employee.customersServed}</span>
                 </div>
             </Card>
        </div>
    );
};

export default EmployeeView;
