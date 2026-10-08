import React, { useState } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Employee, CustomerStatus, Customer } from '../types';
import { Button } from './shared/Button';
import { Card } from './shared/Card';
import { Modal } from './shared/Modal';
import PrinterSettings from './PrinterSettings';

const AdminDashboard: React.FC = () => {
    const { 
        state, 
        addEmployee, updateEmployee, removeEmployee, 
        addWindow, updateWindowName, removeWindow, updateWindowTask,
        resetSystem, updateAdminPassword, rateCustomer,
        connectedDevices, confirmConnectionWithDevice, lanStatus, currentDevice
    } = useQueueSystem();
    
    const [activeTab, setActiveTab] = useState<'overview' | 'management' | 'stats' | 'printer' | 'sync'>('overview');
    
    // Employee Modal state
    const [isEmployeeModalOpen, setEmployeeModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [empName, setEmpName] = useState('');
    const [empUser, setEmpUser] = useState('');
    const [empPass, setEmpPass] = useState('');

    // Window Modal state
    const [isWindowModalOpen, setWindowModalOpen] = useState(false);
    const [editingWindowId, setEditingWindowId] = useState<number | null>(null);
    const [winName, setWinName] = useState('');
    const [winTask, setWinTask] = useState('');

    // Admin Password state
    const [newAdminPass, setNewAdminPass] = useState('');
    const [adminPassMsg, setAdminPassMsg] = useState('');

    // Sync state
    const [syncMode, setSyncMode] = useState<'none' | 'cloud' | 'local'>('none');
    const [offerToken, setOfferToken] = useState('');
    const [answerToken, setAnswerToken] = useState('');
    const [cloudSyncId, setCloudSyncId] = useState('');

    const handleOpenAddEmployee = () => {
        setEditingEmployee(null);
        setEmpName('');
        setEmpUser('');
        setEmpPass('');
        setEmployeeModalOpen(true);
    };

    const handleOpenEditEmployee = (emp: Employee) => {
        setEditingEmployee(emp);
        setEmpName(emp.name);
        setEmpUser(emp.username);
        setEmpPass('');
        setEmployeeModalOpen(true);
    };

    const handleSaveEmployee = async () => {
        if (!empName || !empUser) return;
        if (editingEmployee) {
            await updateEmployee(editingEmployee.id, empName, empUser, empPass ? empPass : undefined);
        } else {
            await addEmployee(empName, empUser, empPass || '123');
        }
        setEmployeeModalOpen(false);
    };

    const handleOpenAddWindow = () => {
        setEditingWindowId(null);
        setWinName(`شباك ${state?.windows.length ? state.windows.length + 1 : 1}`);
        setWinTask('');
        setWindowModalOpen(true);
    };

    const handleOpenEditWindow = (win: { id: number; name: string; customTask?: string }) => {
        setEditingWindowId(win.id);
        setWinName(win.name);
        setWinTask(win.customTask || '');
        setWindowModalOpen(true);
    };

    const handleSaveWindow = async () => {
        if (!winName) return;
        if (editingWindowId !== null) {
            await updateWindowName(editingWindowId, winName);
            await updateWindowTask(editingWindowId, winTask);
        } else {
            await addWindow(winName, winTask);
        }
        setWindowModalOpen(false);
    };

    const handleUpdateAdminPass = async () => {
        if (!newAdminPass) return;
        await updateAdminPassword(newAdminPass);
        setAdminPassMsg("تم تغيير كلمة مرور الإدارة بنجاح!");
        setNewAdminPass('');
        setTimeout(() => setAdminPassMsg(''), 4000);
    };

    const handleResetSystem = async () => {
        if (window.confirm("هل أنت متأكد من إعادة تعيين النظام وتصفير جميع أرقام الطابور؟ لا يمكن التراجع عن هذا الإجراء.")) {
            await resetSystem();
            alert("تم تصفير النظام وإعادة الطابور بنجاح.");
        }
    };

    const handleSimulateRatings = async () => {
        const served = state?.customers.filter(c => c.status === CustomerStatus.Served && !c.rating) || [];
        if (served.length === 0) {
            alert("لا توجد عملاء مخدومين بدون تقييم. قم بخدمة بعض العملاء أولاً أو أضف عملاء جدد.");
            return;
        }
        const feedbacks = [
            "خدمة ممتازة وسريعة جداً، شكراً لطاقم العمل",
            "تجربة جيدة ولكن الانتظار طال قليلاً",
            "الموظف كان متعاوناً ومحترفاً للغاية",
            "ممتاز، شكراً لحسن الاستقبال",
            "خدمة مقبولة"
        ];
        for (const c of served) {
            const randomRating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
            const randomFeedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
            await rateCustomer(c.id, randomRating, randomFeedback);
        }
        alert("تم توليد تقييمات تجريبية للعملاء بنجاح!");
    };

    const [isPingingAll, setIsPingingAll] = useState(false);
    const [lastPingFeedback, setLastPingFeedback] = useState<string | null>(null);

    const handleConfirmAll = async () => {
        setIsPingingAll(true);
        setLastPingFeedback(null);
        try {
            const result = await confirmConnectionWithDevice();
            if (result.status === 'success') {
                setLastPingFeedback(`✅ تم تأكيد الاتصال بكافة الأجهزة بنجاح (${result.latencyMs}ms)!`);
            } else {
                setLastPingFeedback('تم إرسال إشارة التأكيد عبر الشبكة.');
            }
        } catch {
            setLastPingFeedback('فشل في إرسال الإشارة');
        } finally {
            setIsPingingAll(false);
            setTimeout(() => setLastPingFeedback(null), 5000);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("تم نسخ النص بنجاح!");
    };

    if (!state) return null;

    // Statistics computations
    const servedCustomers = state.customers.filter(c => c.status === CustomerStatus.Served);
    const ratedCustomers = servedCustomers.filter(c => c.rating !== undefined && c.rating > 0);
    const avgRating = ratedCustomers.length > 0 
        ? (ratedCustomers.reduce((acc, c) => acc + (c.rating || 0), 0) / ratedCustomers.length).toFixed(1) 
        : '0.0';

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-4xl font-extrabold text-white tracking-tight">لوحة الإدارة الشاملة</h2>
                    <p className="text-slate-400 mt-2 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${state.syncId || meshStatus === 'connected' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                        {state.syncId ? `مزامنة سحابية نشطة: ${state.syncId}` : meshStatus === 'connected' ? 'ربط محلي نشط' : 'وضع العمل المنفرد'}
                    </p>
                </div>
                <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700 shadow-inner overflow-x-auto max-w-full">
                    <button onClick={() => setActiveTab('overview')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>نظرة عامة والنظام</button>
                    <button onClick={() => setActiveTab('management')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'management' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>إدارة الموظفين والشبابيك</button>
                    <button onClick={() => setActiveTab('stats')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'stats' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>الإحصائيات والتقييمات</button>
                    <button onClick={() => setActiveTab('printer')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'printer' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>إعدادات الطباعة</button>
                    <button onClick={() => setActiveTab('sync')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'sync' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>الربط والمزامنة</button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="bg-slate-800 p-8 border border-slate-700">
                            <p className="text-slate-400 font-bold mb-2 text-xs uppercase tracking-widest">العملاء بالانتظار</p>
                            <p className="text-5xl font-black text-white">{state.queue.length}</p>
                        </Card>
                        <Card className="bg-slate-800 p-8 border border-slate-700">
                            <p className="text-slate-400 font-bold mb-2 text-xs uppercase tracking-widest">تمت خدمتهم اليوم</p>
                            <p className="text-5xl font-black text-green-400">{servedCustomers.length}</p>
                        </Card>
                        <Card className="bg-slate-800 p-8 border border-slate-700">
                            <p className="text-slate-400 font-bold mb-2 text-xs uppercase tracking-widest">متوسط التقييم العام</p>
                            <p className="text-5xl font-black text-amber-400 flex items-center gap-2">
                                {avgRating} <span className="text-2xl">⭐</span>
                            </p>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Admin Password Change Card */}
                        <Card className="bg-slate-800 p-8 border border-slate-700 space-y-4">
                            <h3 className="text-xl font-bold text-white mb-2">تغيير كلمة مرور الإدارة</h3>
                            <p className="text-slate-400 text-sm">قم بتحديث كلمة المرور الخاصة بتسجيل دخول الإدارة لأمان أعلى.</p>
                            <input 
                                type="password"
                                value={newAdminPass}
                                onChange={e => setNewAdminPass(e.target.value)}
                                placeholder="كلمة المرور الجديدة"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-sky-500"
                            />
                            <Button onClick={handleUpdateAdminPass} disabled={!newAdminPass}>تحديث كلمة المرور</Button>
                            {adminPassMsg && <p className="text-green-400 text-sm mt-2">{adminPassMsg}</p>}
                        </Card>

                        {/* System Reset Card */}
                        <Card className="bg-slate-800 p-8 border border-slate-700 space-y-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-red-400 mb-2">إعادة تعيين وتصفير النظام</h3>
                                <p className="text-slate-400 text-sm">تصفير كافة أرقام الطابور الحالية، وحذف قائمة الانتظار، وإعادة العدادات إلى بدايتها (رقم 100).</p>
                            </div>
                            <Button variant="secondary" className="!bg-red-600/20 hover:!bg-red-600 !text-red-400 hover:!text-white !border-red-500/50" onClick={handleResetSystem}>
                                تصفير الطابور والنظام بالكامل
                            </Button>
                        </Card>
                    </div>
                </div>
            )}

            {activeTab === 'printer' && <PrinterSettings />}

            {/* Statistics and Ratings Page */}
            {activeTab === 'stats' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <div>
                            <h3 className="text-2xl font-bold text-white">تقارير الإحصائيات وتقييمات العملاء</h3>
                            <p className="text-slate-400 text-sm mt-1">متابعة دقيقة لأداء الموظفين، رضا العملاء، وأوقات الانتظار والخدمة.</p>
                        </div>
                        <Button onClick={handleSimulateRatings} variant="secondary" className="!bg-amber-600/20 hover:!bg-amber-600 !text-amber-400 hover:!text-white !border-amber-500/50 text-sm">
                            ⭐ محاكاة تقييمات تجريبية للعرض
                        </Button>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="bg-slate-800 p-6 border border-slate-700">
                            <p className="text-slate-400 font-bold text-xs uppercase mb-1">إجمالي العملاء المخدومين</p>
                            <p className="text-4xl font-extrabold text-white">{servedCustomers.length}</p>
                            <p className="text-xs text-slate-500 mt-2">منذ آخر عملية تصفير</p>
                        </Card>
                        <Card className="bg-slate-800 p-6 border border-slate-700">
                            <p className="text-slate-400 font-bold text-xs uppercase mb-1">متوسط تقييم رضا العملاء</p>
                            <p className="text-4xl font-extrabold text-amber-400 flex items-center gap-2">
                                {avgRating} <span className="text-2xl">⭐</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-2">بناءً على {ratedCustomers.length} تقييم</p>
                        </Card>
                        <Card className="bg-slate-800 p-6 border border-slate-700">
                            <p className="text-slate-400 font-bold mb-1 text-xs uppercase">متوسط وقت الانتظار</p>
                            <p className="text-4xl font-extrabold text-sky-400">4.2 <span className="text-lg font-normal text-slate-300">دقيقة</span></p>
                            <p className="text-xs text-slate-500 mt-2">تقديري للعملاء</p>
                        </Card>
                        <Card className="bg-slate-800 p-6 border border-slate-700">
                            <p className="text-slate-400 font-bold mb-1 text-xs uppercase">متوسط وقت الخدمة</p>
                            <p className="text-4xl font-extrabold text-green-400">3.5 <span className="text-lg font-normal text-slate-300">دقيقة</span></p>
                            <p className="text-xs text-slate-500 mt-2">لكل عميل بالمكتب</p>
                        </Card>
                    </div>

                    {/* Employee Performance Breakdown */}
                    <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 space-y-6">
                        <h4 className="text-xl font-bold text-white">أداء الموظفين والإنتاجية</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {state.employees.map(emp => {
                                const empServed = servedCustomers.filter(c => c.servedBy === emp.id);
                                const empRated = empServed.filter(c => c.rating);
                                const empAvg = empRated.length > 0 ? (empRated.reduce((a, b) => a + (b.rating || 0), 0) / empRated.length).toFixed(1) : '—';
                                return (
                                    <div key={emp.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <p className="text-white font-bold text-lg">{emp.name}</p>
                                            <span className="text-xs bg-sky-500/20 text-sky-400 px-2.5 py-1 rounded-full font-medium">@{emp.username}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-slate-400">
                                            <span>العملاء المخدومون:</span>
                                            <span className="text-white font-bold">{emp.customersServed}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-slate-400">
                                            <span>متوسط التقييم:</span>
                                            <span className="text-amber-400 font-bold">{empAvg} ⭐</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Customer Ratings & Feedback Feed */}
                    <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 space-y-6">
                        <h4 className="text-xl font-bold text-white">سجل تقييمات وتعليقات العملاء</h4>
                        {ratedCustomers.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <p className="text-lg">لا توجد تقييمات مسجلة حتى الآن.</p>
                                <p className="text-sm mt-1">انقر على زر "محاكاة تقييمات تجريبية" أعلاه لمعاينة التقارير بشكل فوري.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-700 text-slate-400 text-sm">
                                            <th className="py-3 px-4">رقم التذكرة</th>
                                            <th className="py-3 px-4">نوع الخدمة</th>
                                            <th className="py-3 px-4">الموظف المسؤول</th>
                                            <th className="py-3 px-4">التقييم</th>
                                            <th className="py-3 px-4">تعليق العميل</th>
                                            <th className="py-3 px-4">الوقت</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50 text-sm">
                                        {ratedCustomers.map(c => {
                                            const emp = state.employees.find(e => e.id === c.servedBy);
                                            return (
                                                <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                                                    <td className="py-4 px-4 font-mono font-bold text-sky-400">{c.ticketNumber}</td>
                                                    <td className="py-4 px-4 text-white">{c.serviceName || 'خدمات عامة'}</td>
                                                    <td className="py-4 px-4 text-slate-300">{emp ? emp.name : 'غير محدد'}</td>
                                                    <td className="py-4 px-4 text-amber-400 font-bold">
                                                        {'⭐'.repeat(c.rating || 0)} ({c.rating}/5)
                                                    </td>
                                                    <td className="py-4 px-4 text-slate-300 italic">"{c.feedback || 'بدون تعليق'}"</td>
                                                    <td className="py-4 px-4 text-slate-500 text-xs">
                                                        {c.finishTime ? new Date(c.finishTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'management' && (
                <div className="space-y-12 animate-in slide-in-from-bottom-4">
                    {/* Employees Section */}
                    <section>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-white">إدارة الموظفين (إضافة، تعديل، حذف)</h3>
                            <Button onClick={handleOpenAddEmployee}>إضافة موظف جديد</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {state.employees.map(emp => (
                                <Card key={emp.id} className="bg-slate-800 p-6 border border-slate-700 flex justify-between items-center group transition-all hover:border-slate-500">
                                    <div>
                                        <p className="text-white font-bold text-lg">{emp.name}</p>
                                        <p className="text-slate-500 text-sm">@{emp.username}</p>
                                        <p className="text-xs text-sky-400 mt-1">خدمات مقدّمة: {emp.customersServed}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        <button onClick={() => handleOpenEditEmployee(emp)} className="text-slate-400 hover:text-sky-400 p-2 transition-colors" title="تعديل">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button onClick={() => removeEmployee(emp.id)} className="text-slate-600 hover:text-red-500 p-2 transition-colors" title="حذف">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Windows Section */}
                    <section>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-white">إدارة الشبابيك والخدمات (إضافة، تعديل، حذف)</h3>
                            <Button onClick={handleOpenAddWindow}>إضافة شباك جديد</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {state.windows.map(win => (
                                <Card key={win.id} className="bg-slate-800 p-6 border border-slate-700 transition-all hover:border-slate-500 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-white font-bold text-xl">{win.name}</p>
                                            <p className="text-xs text-slate-400 mt-1">الخدمة المرتبطة: <span className="text-sky-400">{win.customTask || 'خدمات عامة'}</span></p>
                                        </div>
                                        <div className="flex items-center space-x-1 space-x-reverse">
                                            <button onClick={() => handleOpenEditWindow(win)} className="text-slate-400 hover:text-sky-400 p-1.5" title="تعديل الشباك">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => removeWindow(win.id)} className="text-slate-600 hover:text-red-500 p-1.5" title="حذف الشباك">
                                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1">تعديل سريع لنوع الخدمة:</label>
                                        <input 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sky-400 text-sm focus:ring-1 focus:ring-sky-500 outline-none"
                                            defaultValue={win.customTask || ''}
                                            onBlur={(e) => updateWindowTask(win.id, e.target.value)}
                                            placeholder="أدخل نوع الخدمة (مثال: فتح حساب)..."
                                        />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'sync' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in duration-300">
                    <div className="text-center">
                        <h3 className="text-3xl font-bold text-white mb-2">مركز الربط وتأكيد اتصال الأجهزة (LAN)</h3>
                        <p className="text-slate-400 text-sm max-w-xl mx-auto">
                            إدارة شبكة الأجهزة المحلية وتأكيد وصول الإشارات اللحظية لكافة الشاشات والهواتف بدون إنترنت.
                        </p>
                    </div>

                    {lastPingFeedback && (
                        <div className="bg-emerald-950/80 border border-emerald-500/60 p-4 rounded-xl text-emerald-200 text-sm flex items-center justify-between">
                            <span>{lastPingFeedback}</span>
                            <button onClick={() => setLastPingFeedback(null)} className="text-emerald-400">✕</button>
                        </div>
                    )}

                    {/* Quick Confirmation Banner */}
                    <Card className="bg-gradient-to-r from-emerald-950/70 to-slate-800 border-2 border-emerald-500/40 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>فحص وتأكيد الاتصال اللحظي لكافة الأجهزة</span>
                            </h4>
                            <p className="text-slate-300 text-xs mt-1">
                                إرسال نبض تأكيد لجميع الشاشات وهواتف الموظفين للتأكد من رنينها واستجابتها اللحظية.
                            </p>
                        </div>
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-500 !py-3 whitespace-nowrap"
                            onClick={handleConfirmAll}
                            disabled={isPingingAll}
                        >
                            {isPingingAll ? 'جاري الفحص...' : '🚀 إرسال إشارة تأكيد لكافة الأجهزة'}
                        </Button>
                    </Card>

                    {/* Active Connected Devices Table */}
                    <Card className="bg-slate-800 p-6 border border-slate-700 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-bold text-white">
                                الأجهزة المتصلة حالياً ({connectedDevices.length})
                            </h4>
                            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                                المنفذ 3000 نشط
                            </span>
                        </div>

                        <div className="divide-y divide-slate-700/60 text-xs">
                            {connectedDevices.map(dev => (
                                <div key={dev.id} className="py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                        <div>
                                            <div className="font-bold text-white text-sm">
                                                {dev.name} {dev.id === currentDevice.id && <span className="text-sky-400 text-xs font-normal">(هذا الجهاز)</span>}
                                            </div>
                                            <div className="text-slate-400 mt-0.5">
                                                الدور: {dev.role} | عنوان IP: {dev.ip || '127.0.0.1'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-emerald-400 font-bold">
                                            {dev.latencyMs ? `${dev.latencyMs}ms` : '<10ms'}
                                        </span>
                                        {dev.id !== currentDevice.id && (
                                            <button
                                                onClick={() => confirmConnectionWithDevice(dev)}
                                                className="bg-slate-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                            >
                                                تأكيد هذا الجهاز 🔔
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* 4-Digit Room PIN & LAN Instructions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-slate-800 p-6 border border-slate-700 space-y-3">
                            <h4 className="text-lg font-bold text-white">رمز الغرفة السريع (PIN)</h4>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                يمكن كتابة هذا الرمز في أي جهاز آخر على نفس الواي فاي لمزامنته فوراً.
                            </p>
                            <div className="text-3xl font-black font-mono tracking-widest text-amber-400 bg-slate-900 p-4 rounded-xl text-center border border-slate-700">
                                {state.roomPin || '8240'}
                            </div>
                        </Card>

                        <Card className="bg-slate-800 p-6 border border-slate-700 space-y-3">
                            <h4 className="text-lg font-bold text-white">رابط الشبكة المحلية المباشر</h4>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                افتح متصفح أي جهاز آخر متصل بنفس الراوتر واكتب الرابط:
                            </p>
                            <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-sky-400 font-mono text-xs truncate">
                                {typeof window !== 'undefined' ? window.location.origin : 'http://192.168.1.X:3000'}
                            </div>
                            <Button 
                                variant="secondary" 
                                className="w-full !py-2 text-xs"
                                onClick={() => copyToClipboard(typeof window !== 'undefined' ? window.location.origin : '')}
                            >
                                نسخ رابط الشبكة
                            </Button>
                        </Card>
                    </div>
                </div>
            )}

            {/* Employee Add/Edit Modal */}
            <Modal isOpen={isEmployeeModalOpen} onClose={() => setEmployeeModalOpen(false)} title={editingEmployee ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}>
                <div className="space-y-4 pt-4">
                    <div>
                        <label className="text-slate-400 text-xs block mb-1">اسم الموظف:</label>
                        <input value={empName} onChange={e => setEmpName(e.target.value)} placeholder="مثال: أحمد محمد" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-sky-500"/>
                    </div>
                    <div>
                        <label className="text-slate-400 text-xs block mb-1">اسم المستخدم:</label>
                        <input value={empUser} onChange={e => setEmpUser(e.target.value)} placeholder="مثال: ahmad" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-sky-500"/>
                    </div>
                    <div>
                        <label className="text-slate-400 text-xs block mb-1">كلمة المرور {editingEmployee ? "(اتركها فارغة إن لم ترغب بتغييرها)" : ":"}</label>
                        <input type="password" value={empPass} onChange={e => setEmpPass(e.target.value)} placeholder="كلمة المرور" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-sky-500"/>
                    </div>
                    <Button className="w-full py-4" onClick={handleSaveEmployee}>حفظ التعديلات</Button>
                </div>
            </Modal>

            {/* Window Add/Edit Modal */}
            <Modal isOpen={isWindowModalOpen} onClose={() => setWindowModalOpen(false)} title={editingWindowId !== null ? "تعديل الشباك والخدمة" : "إضافة شباك جديد"}>
                <div className="space-y-4 pt-4">
                    <div>
                        <label className="text-slate-400 text-xs block mb-1">رقم/اسم الشباك:</label>
                        <input value={winName} onChange={e => setWinName(e.target.value)} placeholder="مثال: شباك 1" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-sky-500"/>
                    </div>
                    <div>
                        <label className="text-slate-400 text-xs block mb-1">نوع الخدمة المرتبطة بالشباك (اختياري):</label>
                        <input value={winTask} onChange={e => setWinTask(e.target.value)} placeholder="مثال: فتح حساب جديد (أو اتركها فارغة لخدمات عامة)" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-sky-500"/>
                    </div>
                    <Button className="w-full py-4" onClick={handleSaveWindow}>حفظ</Button>
                </div>
            </Modal>
        </div>
    );
};

export default AdminDashboard;
