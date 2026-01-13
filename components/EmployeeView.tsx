import React, { useState, useEffect } from 'react';
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
            <Card className="bg-slate-800 p-8 text-center">
                <h2 className="text-3xl font-bold text-sky-400">أهلاً بك، {employee.name}</h2>
                <p className={`mt-2 text-lg font-semibold ${employee.status === EmployeeStatus.Available ? 'text-green-400' : 'text-yellow-400'}`}>
                    الحالة: {employee.status}
                </p>
            </Card>

            <Card className="bg-slate-800 p-6">
                <h3 className="text-xl font-semibold mb-4">تخصيص الشباك</h3>
                <div className="flex items-center space-x-4">
                    <select 
                        value={selectedWindowId} 
                        onChange={handleWindowSelection} 
                        disabled={isSubmitting}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50"
                    >
                        <option value="">اختر شباكاً</option>
                        {availableWindows.map(win => (
                            <option key={win.id} value={win.id}>
                                {win.name} {win.customTask ? `(${win.customTask})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                {assignedWindow && <p className="mt-4 text-green-400">أنت معين على {assignedWindow.name}.</p>}
            </Card>
            
            <Card className="bg-slate-800 p-6 flex flex-col items-center justify-center min-h-[250px]">
                {isServing && (
                     <div className="text-center">
                        <p className="text-slate-400 text-lg">تخدم حالياً</p>
                        <p className="text-7xl font-mono font-bold text-yellow-400 my-4">{currentCustomer?.ticketNumber}</p>
                        <Button size="lg" variant="danger" onClick={() => handleAction(() => finishService(employee.id))} disabled={isSubmitting}>
                            {isSubmitting ? '...' : 'إنهاء الخدمة'}
                        </Button>
                    </div>
                )}
                {isReadyToServe && (
                    <div className="text-center">
                         <p className="text-slate-400 text-lg mb-4">يوجد {queue.length} عميل في الانتظار.</p>
                        <Button size="lg" onClick={() => handleAction(() => callNextCustomer(employee.id))} disabled={queue.length === 0 || isSubmitting}>
                           {isSubmitting ? '...' : 'استدعاء العميل التالي'}
                        </Button>
                    </div>
                )}
                {!assignedWindow && (
                     <p className="text-slate-400 text-xl">يرجى اختيار شباك لبدء خدمة العملاء.</p>
                )}
            </Card>

             <Card className="bg-slate-800 p-6">
                 <h3 className="text-xl font-semibold mb-2">إحصائياتك</h3>
                 <p className="text-lg">إجمالي العملاء الذين تمت خدمتهم اليوم: <span className="font-bold text-sky-400">{employee.customersServed}</span></p>
             </Card>
        </div>
    );
};

export default EmployeeView;
