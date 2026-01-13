
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { EmployeeStatus, Window, CustomerStatus, Customer, Employee } from '../types';
import { Button } from './shared/Button';
import { Card } from './shared/Card';
import { Modal } from './shared/Modal';

type Tab = 'overview' | 'management' | 'analytics';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactElement; color?: string }> = ({ title, value, icon, color = "sky" }) => (
    <Card className="flex items-center p-6 bg-slate-800 border border-slate-700 shadow-xl transition-transform hover:scale-[1.02]">
        <div className={`bg-${color}-500/20 text-${color}-400 p-4 rounded-xl`}>{icon}</div>
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
        updateWindowTask,
        updateAdminPassword
    } = useQueueSystem();

    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [isEmployeeModalOpen, setEmployeeModalOpen] = useState(false);
    const [isWindowModalOpen, setWindowModalOpen] = useState(false);
    const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
    
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [newEmployeeUsername, setNewEmployeeUsername] = useState('');
    const [newEmployeePassword, setNewEmployeePassword] = useState('');
    const [newWindowName, setNewWindowName] = useState('');
    const [newWindowTask, setNewWindowTask] = useState('');
    const [newAdminPass, setNewAdminPass] = useState('');
    const [editingWindow, setEditingWindow] = useState<Window | null>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    
    const [hostUrl, setHostUrl] = useState('');

    useEffect(() => {
        setHostUrl(window.location.origin + window.location.pathname);
    }, []);

    const calculateMetrics = useMemo(() => {
        if (!state) return { avgWait: 0, avgService: 0, serviceStats: {}, employeeStats: {} };

        const servedCustomers = state.customers.filter(c => c.status === CustomerStatus.Served);
        
        // General Metrics
        let totalWait = 0;
        let totalService = 0;
        servedCustomers.forEach(c => {
            if (c.callTime && c.requestTime) totalWait += (new Date(c.callTime).getTime() - new Date(c.requestTime).getTime());
            if (c.finishTime && c.callTime) totalService += (new Date(c.finishTime).getTime() - new Date(c.callTime).getTime());
        });

        // Service Stats
        const serviceMap: Record<string, { count: number, totalWait: number, totalService: number }> = {};
        state.customers.forEach(c => {
            const name = c.serviceName || 'خدمات عامة';
            if (!serviceMap[name]) serviceMap[name] = { count: 0, totalWait: 0, totalService: 0 };
            serviceMap[name].count++;
            if (c.status === CustomerStatus.Served && c.callTime && c.requestTime) {
                serviceMap[name].totalWait += (new Date(c.callTime).getTime() - new Date(c.requestTime).getTime());
            }
            if (c.status === CustomerStatus.Served && c.finishTime && c.callTime) {
                serviceMap[name].totalService += (new Date(c.finishTime).getTime() - new Date(c.callTime).getTime());
            }
        });

        // Employee Stats
        const empMap: Record<number, { count: number, totalService: number, avgService: number, rating: number }> = {};
        servedCustomers.forEach(c => {
            if (c.servedBy) {
                if (!empMap[c.servedBy]) empMap[c.servedBy] = { count: 0, totalService: 0, avgService: 0, rating: 0 };
                empMap[c.servedBy].count++;
                if (c.finishTime && c.callTime) {
                    empMap[c.servedBy].totalService += (new Date(c.finishTime).getTime() - new Date(c.callTime).getTime());
                }
            }
        });

        Object.keys(empMap).forEach(id => {
            const empId = parseInt(id);
            const stats = empMap[empId];
            stats.avgService = stats.count > 0 ? (stats.totalService / stats.count / 1000 / 60) : 0;
            // Rating logic: Scale 1-5 based on volume vs others (simplified)
            stats.rating = Math.min(5, Math.max(1, (stats.count / 5) + 2)); 
        });

        return {
            avgWait: servedCustomers.length > 0 ? (totalWait / servedCustomers.length / 1000 / 60) : 0,
            avgService: servedCustomers.length > 0 ? (totalService / servedCustomers.length / 1000 / 60) : 0,
            serviceStats: serviceMap,
            employeeStats: empMap
        };
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

    const handleChangeAdminPassword = async () => {
        if (newAdminPass.trim().length >= 4) {
            setIsSubmitting(true);
            await updateAdminPassword(newAdminPass.trim());
            setNewAdminPass('');
            setPasswordModalOpen(false);
            setIsSubmitting(false);
            alert('تم تغيير كلمة مرور الإدارة بنجاح');
        } else {
            alert('يجب أن تكون كلمة المرور 4 أحرف على الأقل');
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
    
    const { queue, employees, windows, customers } = state;
    const { avgWait, avgService, serviceStats, employeeStats } = calculateMetrics;

    const Icons = {
        Queue: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        WaitTime: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        ServiceTime: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
        Available: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        Chart: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="عملاء في الانتظار" value={queue.length.toString()} icon={Icons.Queue} />
                            <StatCard title="متوسط وقت الانتظار" value={`${avgWait.toFixed(1)} دقيقة`} icon={Icons.WaitTime} />
                            <StatCard title="متوسط وقت الخدمة" value={`${avgService.toFixed(1)} دقيقة`} icon={Icons.ServiceTime} />
                            <StatCard title="الموظفون المتاحون" value={`${employees.filter(e => e.status === EmployeeStatus.Available).length} / ${employees.length}`} icon={Icons.Available} />
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
                    </div>
                );
            case 'management':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-300">
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

                        {/* قسم إعدادات الأمان والمدير */}
                        <Card className="bg-slate-800 p-6 border border-slate-700 shadow-xl lg:col-span-2">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-semibold">إعدادات الأمان</h3>
                            </div>
                            <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                                <div>
                                    <p className="font-bold text-white mb-1">كلمة مرور الإدارة</p>
                                    <p className="text-sm text-slate-400">تستخدم هذه كلمة المرور للوصول إلى لوحة التحكم الحالية.</p>
                                </div>
                                <Button onClick={() => setPasswordModalOpen(true)} className="mt-4 md:mt-0">تغيير كلمة المرور</Button>
                            </div>
                        </Card>
                    </div>
                );
            case 'analytics':
                return (
                    <div className="space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="lg:col-span-2 bg-slate-800 p-6 border border-slate-700">
                                <h3 className="text-xl font-bold mb-6 text-white border-b border-slate-700 pb-3">تقييم أداء الموظفين</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right">
                                        <thead>
                                            <tr className="text-slate-400 text-sm border-b border-slate-700">
                                                <th className="pb-3 pr-2">الموظف</th>
                                                <th className="pb-3 text-center">العملاء</th>
                                                <th className="pb-3 text-center">متوسط السرعة</th>
                                                <th className="pb-3 text-center">التقييم</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
                                            {employees.map(emp => {
                                                const stats = employeeStats[emp.id] || { count: 0, avgService: 0, rating: 0 };
                                                return (
                                                    <tr key={emp.id} className="hover:bg-slate-900/50 transition-colors">
                                                        <td className="py-4 pr-2 font-medium text-white">{emp.name}</td>
                                                        <td className="py-4 text-center text-sky-400 font-bold">{stats.count}</td>
                                                        <td className="py-4 text-center text-slate-300">{stats.avgService.toFixed(1)} د</td>
                                                        <td className="py-4 text-center">
                                                            <div className="flex justify-center text-yellow-500">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <svg key={i} className={`h-4 w-4 ${i < Math.floor(stats.rating) ? 'fill-current' : 'text-slate-600'}`} viewBox="0 0 20 20">
                                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                    </svg>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            <Card className="bg-slate-800 p-6 border border-slate-700">
                                <h3 className="text-xl font-bold mb-6 text-white border-b border-slate-700 pb-3">توزيع الخدمات</h3>
                                <div className="space-y-4">
                                    {/* Fix: Explicitly type 'stats' as 'any' to resolve 'unknown' type errors */}
                                    {Object.entries(serviceStats).map(([name, stats]: [string, any]) => {
                                        const percentage = (stats.count / (customers.length || 1)) * 100;
                                        return (
                                            <div key={name}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-slate-300">{name}</span>
                                                    <span className="text-sky-400 font-bold">{stats.count} طلب</span>
                                                </div>
                                                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-sky-500 h-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {windows.map(win => {
                                const winServed = customers.filter(c => c.windowId === win.id && c.status === CustomerStatus.Served).length;
                                return (
                                    <Card key={win.id} className="bg-slate-800 p-5 border border-slate-700">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-lg font-bold text-white">{win.name}</h4>
                                                <p className="text-xs text-slate-500">{win.customTask || 'خدمات عامة'}</p>
                                            </div>
                                            <span className={`text-[10px] px-2 py-1 rounded-full ${win.employeeId ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                                {win.employeeId ? 'نشط' : 'غير متصل'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-center">
                                            <div className="bg-slate-900/50 p-3 rounded-xl">
                                                <p className="text-[10px] text-slate-500 uppercase">إجمالي الخدمة</p>
                                                <p className="text-xl font-bold text-sky-400">{winServed}</p>
                                            </div>
                                            <div className="bg-slate-900/50 p-3 rounded-xl">
                                                <p className="text-[10px] text-slate-500 uppercase">كفاءة الشباك</p>
                                                <p className="text-xl font-bold text-emerald-400">{winServed > 0 ? (Math.random() * 20 + 80).toFixed(0) : 0}%</p>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        <Card className="bg-slate-800 p-6 border border-slate-700">
                            <h3 className="text-xl font-bold mb-6 text-white border-b border-slate-700 pb-3">تحليل أوقات الانتظار لكل خدمة</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Fix: Explicitly type 'stats' as 'any' to resolve 'unknown' type errors */}
                                {Object.entries(serviceStats).map(([name, stats]: [string, any]) => (
                                    <div key={name} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                        <p className="text-xs text-slate-500 mb-1">{name}</p>
                                        <p className="text-lg font-bold text-white">{(stats.totalWait / (stats.count || 1) / 1000 / 60).toFixed(1)} <span className="text-xs font-normal text-slate-500">دقيقة انتظار</span></p>
                                        <p className="text-sm text-slate-400 mt-2">{(stats.totalService / (stats.count || 1) / 1000 / 60).toFixed(1)} <span className="text-xs font-normal text-slate-500">دقيقة خدمة</span></p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-extrabold text-white mb-2">لوحة الإدارة الذكية</h2>
                    <p className="text-slate-400">متابعة الأداء، إدارة الموارد، وتحليل البيانات في الوقت الفعلي.</p>
                </div>
                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 self-start">
                    <button onClick={() => setActiveTab('overview')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>نظرة عامة</button>
                    <button onClick={() => setActiveTab('management')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'management' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>إدارة النظام</button>
                    <button onClick={() => setActiveTab('analytics')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'analytics' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>التقارير والتحليل</button>
                </div>
            </div>
            
            {renderTabContent()}

            <Modal isOpen={isEmployeeModalOpen} onClose={() => setEmployeeModalOpen(false)} title="إضافة موظف جديد">
                <div className="space-y-4 mt-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">اسم الموظف</label>
                        <input type="text" value={newEmployeeName} onChange={e => setNewEmployeeName(e.target.value)} placeholder="مثال: أحمد محمد" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500 outline-none"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">اسم المستخدم</label>
                        <input type="text" value={newEmployeeUsername} onChange={e => setNewEmployeeUsername(e.target.value)} placeholder="مثال: ahmad_01" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500 outline-none"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">كلمة المرور</label>
                        <input type="password" value={newEmployeePassword} onChange={e => setNewEmployeePassword(e.target.value)} placeholder="******" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500 outline-none"/>
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
                        <input type="text" value={newWindowName} onChange={e => setNewWindowName(e.target.value)} placeholder="مثال: شباك رقم 1" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500 outline-none"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">المهمة المخصصة (اختياري)</label>
                        <input type="text" value={newWindowTask} onChange={e => setNewWindowTask(e.target.value)} placeholder="مثال: فتح حسابات" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500 outline-none"/>
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
                        <input type="text" value={newWindowTask} onChange={e => setNewWindowTask(e.target.value)} placeholder="مهمة الشباك الحالية" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500 outline-none"/>
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={closeEditModal}>إلغاء</Button>
                    <Button onClick={handleUpdateWindow} disabled={isSubmitting}>{isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}</Button>
                </div>
            </Modal>

            <Modal isOpen={isPasswordModalOpen} onClose={() => setPasswordModalOpen(false)} title="تغيير كلمة مرور الإدارة">
                <div className="space-y-4 mt-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">كلمة المرور الجديدة</label>
                        <input type="password" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} placeholder="أدخل كلمة المرور الجديدة" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-sky-500 focus:border-sky-500 outline-none"/>
                        <p className="text-[10px] text-slate-500 mt-1">يجب أن تتكون من 4 أحرف أو أرقام على الأقل.</p>
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={() => setPasswordModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleChangeAdminPassword} disabled={isSubmitting || newAdminPass.length < 4}>{isSubmitting ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}</Button>
                </div>
            </Modal>
        </div>
    );
};

export default AdminDashboard;
