
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setSelectedWindowId(employee.windowId?.toString() || '');
    }, [employee.windowId]);

    if (!state) return null;

    const { windows, customers, queue } = state;

    const assignedWindow = windows.find(w => w.id === employee.windowId);
    const currentCustomer = customers.find(c => c.id === assignedWindow?.currentCustomerId);

    // حساب عدد العملاء في الطابور المخصص لهذا الشباك فقط
    const filteredQueueCount = useMemo(() => {
        if (!assignedWindow) return 0;
        
        const task = assignedWindow.customTask || 'خدمات عامة';
        
        return queue.filter(customerId => {
            const customer = customers.find(c => c.id === customerId);
            // إذا كان الشباك خدمات عامة، يرى الجميع
            if (task === 'خدمات عامة') return true;
            // وإلا يرى فقط من يطابق تخصصه
            return customer?.serviceName === task;
        }).length;
    }, [queue, customers, assignedWindow]);

    const handleAction = async (action: () => Promise<any>) => {
        setIsSubmitting(true);
        try {
            await action();
        } catch (error) {
            console.error("Action failed", error);
        } finally {
            setIsSubmitting(false);
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
                        disabled={isSubmitting}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50"
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
                         <p className="text-xs text-slate-400 mt-1">تخصص هذا الشباك: <span className="text-white font-bold">{assignedWindow.customTask || 'خدمات عامة'}</span></p>
                    </div>
                )}
            </Card>
            
            <Card className="bg-slate-800 p-6 flex flex-col items-center justify-center min-h-[300px] border border-slate-700">
                {isServing && (
                     <div className="text-center w-full">
                        <div className="mb-4">
                            <span className="bg-yellow-400/10 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-tighter">الخدمة الحالية: {currentCustomer?.serviceName}</span>
                        </div>
                        <p className="text-slate-400 text-lg">العميل الحالي</p>
                        <p className="text-8xl font-mono font-bold text-white my-4">{currentCustomer?.ticketNumber}</p>
                        <Button size="lg" variant="danger" className="w-full max-w-xs py-4 !rounded-xl shadow-lg shadow-red-600/20" onClick={() => handleAction(() => finishService(employee.id))} disabled={isSubmitting}>
                            {isSubmitting ? 'جاري الإنهاء...' : 'إنهاء الخدمة'}
                        </Button>
                    </div>
                )}
                {isReadyToServe && (
                    <div className="text-center">
                        <div className="bg-slate-900/50 p-6 rounded-2xl mb-6 border border-slate-700">
                            <p className="text-slate-400 text-lg mb-1">العملاء المنتظرون لخدمتك</p>
                            <p className="text-6xl font-bold text-sky-400">{filteredQueueCount}</p>
                            <p className="text-xs text-slate-500 mt-2 italic">يتم عرض العملاء الذين يطلبون "{assignedWindow.customTask || 'خدمات عامة'}" فقط</p>
                        </div>
                        <Button 
                            size="lg" 
                            className="w-full min-w-[250px] py-4 !rounded-xl shadow-lg shadow-sky-600/20" 
                            onClick={() => handleAction(() => callNextCustomer(employee.id))} 
                            disabled={filteredQueueCount === 0 || isSubmitting}
                        >
                           {isSubmitting ? 'جاري الاستدعاء...' : 'استدعاء العميل التالي'}
                        </Button>
                    </div>
                )}
                {!assignedWindow && (
                     <div className="text-center text-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-xl">يرجى اختيار شباك متاح لبدء العمل.</p>
                     </div>
                )}
            </Card>

             <Card className="bg-slate-800 p-6 border border-slate-700">
                 <h3 className="text-xl font-semibold mb-2">إحصائيات الأداء</h3>
                 <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <span className="text-slate-400">إجمالي العملاء الذين خدمتهم اليوم</span>
                    <span className="text-2xl font-bold text-sky-400">{employee.customersServed}</span>
                 </div>
             </Card>
        </div>
    );
};

export default EmployeeView;
