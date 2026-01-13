
import React, { useState, useCallback, useEffect } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { EmployeeStatus, Window, CustomerStatus, Customer } from '../types';
import { Button } from './shared/Button';
import { Card } from './shared/Card';
import { Modal } from './shared/Modal';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactElement }> = ({ title, value, icon }) => (
    <Card className="flex items-center p-6 bg-slate-800 border border-slate-700 shadow-xl transition-transform hover:scale-[1.02]">
        <div className="bg-sky-500/20 text-sky-400 p-4 rounded-xl">{icon}</div>
        <div className="mr-4">
            <p className="text-slate-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </Card>
);

const AdminDashboard: React.FC = () => {
    const { 
        state,
        addEmployee,
        removeEmployee,
        addWindow,
        removeWindow,
        updateWindowTask
    } = useQueueSystem();

    const [isEmployeeModalOpen, setEmployeeModalOpen] = useState(false);
    const [isWindowModalOpen, setWindowModalOpen] = useState(false);
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [newEmployeeUsername, setNewEmployeeUsername] = useState('');
    const [newEmployeePassword, setNewEmployeePassword] = useState('');
    const [newWindowName, setNewWindowName] = useState('');
    const [newWindowTask, setNewWindowTask] = useState('');
    const [editingWindow, setEditingWindow] = useState<Window | null>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    
    const [hostUrl, setHostUrl] = useState('');

    useEffect(() => {
        setHostUrl(window.location.origin + window.location.pathname);
    }, []);

    const getAverageWaitTime = useCallback(() => {
        if (!state) return 0;
        const served = state.customers.filter(c => c.status === CustomerStatus.Served && c.callTime && c.requestTime);
        if (served.length === 0) return 0;
        const totalWait = served.reduce((acc, c) => acc + (new Date(c.callTime!).getTime() - new Date(c.requestTime).getTime()), 0);
        return totalWait / served.length / 1000 / 60; // in minutes
    }, [state]);

    const getAverageServiceTime = useCallback(() => {
        if (!state) return 0;
        const served = state.customers.filter(c => c.status === CustomerStatus.Served && c.finishTime && c.callTime);
        if (served.length === 0) return 0;
        const totalService = served.reduce((acc, c) => acc + (new Date(c.finishTime!).getTime() - new Date(c.callTime!).getTime()), 0);
        return totalService / served.length / 1000 / 60; // in minutes
    }, [state]);

    const handleAddEmployee = async () => {
        if (newEmployeeName.trim() && newEmployeeUsername.trim() && newEmployeePassword.trim()) {
            setIsSubmitting(true);
            await addEmployee(newEmployeeName.trim(), newEmployeeUsername.trim(), newEmployeePassword.trim());
            setNewEmployeeName('');
            setNewEmployeeUsername('');
            setNewEmployeePassword('');
            setEmployeeModalOpen(false);
            setIsSubmitting(false);
        }
    };
    
    const handleAddWindow = async () => {
        if(newWindowName.trim()) {
            setIsSubmitting(true);
            await addWindow(newWindowName.trim(), newWindowTask.trim());
            setNewWindowName('');
            setNewWindowTask('');
            setWindowModalOpen(false);
            setIsSubmitting(false);
        }
    };

    const handleUpdateWindow = async () => {
        if(editingWindow && newWindowTask.trim()) {
            setIsSubmitting(true);
            await updateWindowTask(editingWindow.id, newWindowTask.trim());
            closeEditModal();
            setIsSubmitting(false);
        }
    }

    const handleRemoveEmployee = async (id: number) => {
        if(!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
        setDeletingId(id);
        await removeEmployee(id);
        setDeletingId(null);
    }
    
    const handleRemoveWindow = async (id: number) => {
        if(!confirm('هل أنت متأكد من حذف هذا الشباك؟')) return;
        setDeletingId(id);
        await removeWindow(id);
        setDeletingId(null);
    }

    const openEditModal = (window: Window) => {
        setEditingWindow(window);
        setNewWindowTask(window.customTask || '');
    };

    const closeEditModal = () => {
        setEditingWindow(null);
        setNewWindowTask('');
    };

    if (!state) return null;
    
    const { queue, employees, windows } = state;
    const avgWaitTime = getAverageWaitTime().toFixed(1);
    const avgServiceTime = getAverageServiceTime().toFixed(1);
    const availableEmployees = employees.filter(e => e.status === EmployeeStatus.Available).length;

    const Icons = {
        Queue: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        WaitTime: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        ServiceTime: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
        Available: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-extrabold text-white">لوحة تحكم الإدارة</h2>
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl">
                    <p className="text-xs text-slate-400 mb-1">رابط الربط عبر الشبكة المحلية (LAN):</p>
                    <code className="text-sky-400 font-mono text-sm break-all">{hostUrl}</code>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="عملاء في الانتظار" value={queue.length.toString()} icon={Icons.Queue} />
                <StatCard title="متوسط وقت الانتظار" value={`${avgWaitTime} دقيقة`} icon={Icons.WaitTime} />
                <StatCard title="متوسط وقت الخدمة" value={`${avgServiceTime} دقيقة`} icon={Icons.ServiceTime} />
                <StatCard title="الموظفون المتاحون" value={`${availableEmployees} / ${employees.length}`} icon={Icons.Available} />
            </div>

            <Card className="bg-slate-800 p-6 border border-sky-500/20">
                <h3 className="text-xl font-bold mb-4 flex items-center text-sky-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    دليل تشغيل الأجهزة المتعددة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                        <p className="font-bold text-white mb-2">1. الكشك (سحب الأرقام)</p>
                        <p className="text-slate-400 mb-2">استخدم هذا الرابط على الجهاز اللوحي المخصص للعملاء:</p>
                        <code className="bg-slate-800 p-1 rounded text-sky-300 select-all">{hostUrl}?view=kiosk</code>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                        <p className="font-bold text-white mb-2">2. شاشة العرض الرئيسية</p>
                        <p className="text-slate-400 mb-2">استخدم هذا الرابط على الشاشة الكبيرة في صالة الانتظار:</p>
                        <code className="bg-slate-800 p-1 rounded text-sky-300 select-all">{hostUrl}?view=display</code>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                        <p className="font-bold text-white mb-2">3. شبابيك الموظفين</p>
                        <p className="text-slate-400 mb-2">يفتح الموظفون الرابط التالي لتسجيل الدخول:</p>
                        <code className="bg-slate-800 p-1 rounded text-sky-300 select-all">{hostUrl}?view=employee</code>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-slate-800 p-6 border border-slate-700 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold">الموظفون</h3>
                        <Button size="sm" onClick={() => setEmployeeModalOpen(true)}>إضافة موظف</Button>
                    </div>
                    <ul className="space-y-4">
                        {employees.map(emp => (
                            <li key={emp.id} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700 transition-all hover:bg-slate-900">
                                <div>
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        <span className="font-bold text-white">{emp.name}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${emp.status === EmployeeStatus.Available ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{emp.status}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">المستخدم: {emp.username}</p>
                                </div>
                                <div className="flex items-center space-x-4 space-x-reverse">
                                    <div className="text-center ml-4">
                                        <p className="text-xs text-slate-500 uppercase">خدم</p>
                                        <p className="text-lg font-bold text-sky-500">{emp.customersServed}</p>
                                    </div>
                                    <button onClick={() => handleRemoveEmployee(emp.id)} disabled={deletingId === emp.id} className="text-slate-500 hover:text-red-500 transition-colors p-2">
                                        {deletingId === emp.id ? '...' : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>

                <Card className="bg-slate-800 p-6 border border-slate-700 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold">الشبابيك</h3>
                        <Button size="sm" onClick={() => setWindowModalOpen(true)}>إضافة شباك</Button>
                    </div>
                     <ul className="space-y-4">
                        {windows.map(win => (
                            <li key={win.id} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700 transition-all hover:bg-slate-900">
                                <div className="flex-1">
                                    <span className="font-bold text-white">{win.name}</span>
                                    <p className="text-xs text-slate-400 mt-1">{win.customTask || 'خدمات عامة'}</p>
                                    {win.employeeId && (
                                        <div className="flex items-center mt-2">
                                            <span className="w-1.5 h-1.5 bg-sky-500 rounded-full ml-1"></span>
                                            <span className="text-[10px] text-sky-400">يشغله حالياً: {employees.find(e => e.id === win.employeeId)?.name}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <Button size="sm" variant="secondary" onClick={() => openEditModal(win)}>تعديل</Button>
                                    <button onClick={() => handleRemoveWindow(win.id)} disabled={deletingId === win.id} className="text-slate-500 hover:text-red-500 transition-colors p-2">
                                         {deletingId === win.id ? '...' : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            <Modal isOpen={isEmployeeModalOpen} onClose={() => setEmployeeModalOpen(false)} title="إضافة موظف جديد">
                <div className="space-y-4 mt-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">اسم الموظف</label>
                        <input type="text" value={newEmployeeName} onChange={e => setNewEmployeeName(e.target.value)} placeholder="مثال: أحمد محمد" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">اسم المستخدم للشبكة</label>
                        <input type="text" value={newEmployeeUsername} onChange={e => setNewEmployeeUsername(e.target.value)} placeholder="مثال: ahmad_01" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">كلمة المرور</label>
                        <input type="password" value={newEmployeePassword} onChange={e => setNewEmployeePassword(e.target.value)} placeholder="******" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500"/>
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={() => setEmployeeModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleAddEmployee} disabled={isSubmitting}>{isSubmitting ? 'جاري الإضافة...' : 'إضافة الموظف'}</Button>
                </div>
            </Modal>
            
            <Modal isOpen={isWindowModalOpen} onClose={() => setWindowModalOpen(false)} title="إضافة شباك جديد">
                <div className="space-y-4 mt-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">اسم الشباك</label>
                        <input type="text" value={newWindowName} onChange={e => setNewWindowName(e.target.value)} placeholder="مثال: شباك رقم 1" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">المهمة المخصصة (اختياري)</label>
                        <input type="text" value={newWindowTask} onChange={e => setNewWindowTask(e.target.value)} placeholder="مثال: فتح حسابات" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500"/>
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={() => setWindowModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleAddWindow} disabled={isSubmitting}>{isSubmitting ? 'جاري الإضافة...' : 'إضافة الشباك'}</Button>
                </div>
            </Modal>

            <Modal isOpen={!!editingWindow} onClose={closeEditModal} title={`تعديل مهمة ${editingWindow?.name}`}>
                 <div className="space-y-4 mt-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">المهمة المخصصة</label>
                        <input type="text" value={newWindowTask} onChange={e => setNewWindowTask(e.target.value)} placeholder="مهمة الشباك الحالية" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500"/>
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={closeEditModal}>إلغاء</Button>
                    <Button onClick={handleUpdateWindow} disabled={isSubmitting}>{isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}</Button>
                </div>
            </Modal>

        </div>
    );
};

export default AdminDashboard;
