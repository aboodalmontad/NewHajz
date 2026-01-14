
import React, { useState } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { EmployeeStatus, CustomerStatus } from '../types';
import { Button } from './shared/Button';
import { Card } from './shared/Card';
import { Modal } from './shared/Modal';
import PrinterSettings from './PrinterSettings';

const AdminDashboard: React.FC = () => {
    const { 
        state, 
        addEmployee, removeEmployee, 
        addWindow, removeWindow, updateWindowTask,
        startMeshHost, completeMeshHost, meshStatus,
        enableCloudSync
    } = useQueueSystem();
    
    const [activeTab, setActiveTab] = useState<'overview' | 'management' | 'sync' | 'printer'>('overview');
    const [isEmployeeModalOpen, setEmployeeModalOpen] = useState(false);
    const [isWindowModalOpen, setWindowModalOpen] = useState(false);
    
    const [newEmpName, setNewEmpName] = useState('');
    const [newEmpUser, setNewEmpUser] = useState('');
    const [newEmpPass, setNewEmpPass] = useState('');
    const [newWinName, setNewWinName] = useState('');
    const [newWinTask, setNewWinTask] = useState('');

    const [syncMode, setSyncMode] = useState<'none' | 'cloud' | 'local'>('none');
    const [offerToken, setOfferToken] = useState('');
    const [answerToken, setAnswerToken] = useState('');
    const [cloudSyncId, setCloudSyncId] = useState('');

    const handleEnableCloud = async () => {
        const id = await enableCloudSync();
        setCloudSyncId(id);
    };

    const handleStartLocalHost = async () => {
        const token = await startMeshHost();
        setOfferToken(token);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("تم نسخ الكود بنجاح!");
    };

    if (!state) return null;

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-4xl font-extrabold text-white tracking-tight">لوحة الإدارة</h2>
                    <p className="text-slate-400 mt-2 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${state.syncId || meshStatus === 'connected' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                        {state.syncId ? `مزامنة سحابية نشطة: ${state.syncId}` : meshStatus === 'connected' ? 'ربط محلي نشط' : 'وضع العمل المنفرد'}
                    </p>
                </div>
                <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700 shadow-inner overflow-x-auto max-w-full">
                    <button onClick={() => setActiveTab('overview')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>نظرة عامة</button>
                    <button onClick={() => setActiveTab('management')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'management' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>إدارة النظام</button>
                    <button onClick={() => setActiveTab('printer')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'printer' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>إعدادات الطباعة</button>
                    <button onClick={() => setActiveTab('sync')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'sync' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>الربط والمزامنة</button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="bg-slate-800 p-8 border border-slate-700">
                        <p className="text-slate-400 font-bold mb-2 text-xs uppercase tracking-widest">العملاء بالانتظار</p>
                        <p className="text-5xl font-black text-white">{state.queue.length}</p>
                    </Card>
                    <Card className="bg-slate-800 p-8 border border-slate-700">
                        <p className="text-slate-400 font-bold mb-2 text-xs uppercase tracking-widest">تمت خدمتهم اليوم</p>
                        <p className="text-5xl font-black text-green-400">{state.customers.filter(c => c.status === CustomerStatus.Served).length}</p>
                    </Card>
                </div>
            )}

            {activeTab === 'printer' && <PrinterSettings />}

            {activeTab === 'management' && (
                <div className="space-y-12 animate-in slide-in-from-bottom-4">
                    <section>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-white">إدارة الموظفين</h3>
                            <Button onClick={() => setEmployeeModalOpen(true)}>إضافة موظف</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {state.employees.map(emp => (
                                <Card key={emp.id} className="bg-slate-800 p-6 border border-slate-700 flex justify-between items-center group transition-all hover:border-slate-500">
                                    <div>
                                        <p className="text-white font-bold">{emp.name}</p>
                                        <p className="text-slate-500 text-sm">@{emp.username}</p>
                                    </div>
                                    <button onClick={() => removeEmployee(emp.id)} className="text-slate-600 hover:text-red-500 p-2 transition-opacity opacity-0 group-hover:opacity-100">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </Card>
                            ))}
                        </div>
                    </section>

                    <section>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-white">إدارة الشبابيك</h3>
                            <Button onClick={() => setWindowModalOpen(true)}>إضافة شباك</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {state.windows.map(win => (
                                <Card key={win.id} className="bg-slate-800 p-6 border border-slate-700 group transition-all hover:border-slate-500">
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="text-white font-bold text-lg">{win.name}</p>
                                        <button onClick={() => removeWindow(win.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                    <input 
                                        className="w-full bg-slate-900 border-none rounded-lg p-2 text-sky-400 text-sm focus:ring-1 focus:ring-sky-500"
                                        defaultValue={win.customTask || 'خدمات عامة'}
                                        onBlur={(e) => updateWindowTask(win.id, e.target.value)}
                                        placeholder="تعديل اسم الخدمة..."
                                    />
                                </Card>
                            ))}
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'sync' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in duration-300">
                    <h3 className="text-3xl font-bold text-white text-center mb-8">مركز الربط والمزامنة</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className={`p-8 border-2 transition-all ${syncMode === 'cloud' ? 'border-sky-500 bg-slate-800' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'}`} onClick={() => setSyncMode('cloud')}>
                            <div className="bg-sky-500/10 w-16 h-16 rounded-3xl flex items-center justify-center text-sky-500 mb-6">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                            </div>
                            <h4 className="text-2xl font-bold text-white mb-2">المزامنة السحابية</h4>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">الأفضل لربط الأجهزة البعيدة أو عبر الإنترنت. سهلة الإعداد باستخدام كود قصير.</p>
                            
                            {syncMode === 'cloud' && (
                                <div className="space-y-4 animate-in fade-in">
                                    {state.syncId || cloudSyncId ? (
                                        <div className="bg-slate-900 p-4 rounded-xl border border-sky-500/30">
                                            <p className="text-xs text-sky-400 font-bold mb-1">كود المزامنة (Sync ID):</p>
                                            <div className="flex justify-between items-center">
                                                <p className="text-2xl font-mono font-bold text-white tracking-widest">{state.syncId || cloudSyncId}</p>
                                                <button onClick={() => copyToClipboard(state.syncId || cloudSyncId)} className="text-sky-500 text-sm hover:underline">نسخ</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button className="w-full" onClick={handleEnableCloud}>تفعيل المزامنة السحابية</Button>
                                    )}
                                </div>
                            )}
                        </Card>

                        <Card className={`p-8 border-2 transition-all ${syncMode === 'local' ? 'border-green-500 bg-slate-800' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'}`} onClick={() => setSyncMode('local')}>
                            <div className="bg-green-500/10 w-16 h-16 rounded-3xl flex items-center justify-center text-green-500 mb-6">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                            </div>
                            <h4 className="text-2xl font-bold text-white mb-2">الربط المحلي (LAN)</h4>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">الأفضل داخل نفس المبنى. سريعة جداً وتعمل حتى بدون إنترنت، تعتمد على ربط الأجهزة ببعضها مباشرة.</p>
                            
                            {syncMode === 'local' && (
                                <div className="space-y-4 animate-in fade-in">
                                    {meshStatus === 'idle' ? (
                                        <Button variant="secondary" className="w-full !bg-green-600 hover:!bg-green-700" onClick={handleStartLocalHost}>بدء الربط المحلي</Button>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                                                <label className="text-[10px] text-green-400 block mb-1">انسخ كود العرض للجهاز الآخر:</label>
                                                <div className="relative">
                                                    <textarea readOnly value={offerToken} className="w-full h-20 bg-transparent text-[8px] text-white font-mono outline-none resize-none" />
                                                    <button onClick={() => copyToClipboard(offerToken)} className="absolute bottom-0 left-0 text-[10px] text-sky-500 bg-slate-800 px-2 py-1 rounded">نسخ</button>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                                                <label className="text-[10px] text-slate-400 block mb-1">الصق كود الرد هنا:</label>
                                                <textarea value={answerToken} onChange={(e) => setAnswerToken(e.target.value)} className="w-full h-20 bg-transparent text-[8px] text-white font-mono outline-none focus:ring-1 focus:ring-green-500" placeholder="الصق كود الرد..." />
                                                <Button className="w-full mt-2 !py-2 !text-xs" onClick={() => completeMeshHost(answerToken)} disabled={!answerToken}>تفعيل الربط المحلي</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            <Modal isOpen={isEmployeeModalOpen} onClose={() => setEmployeeModalOpen(false)} title="إضافة موظف">
                <div className="space-y-4 pt-4">
                    <input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="الاسم" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white"/>
                    <input value={newEmpUser} onChange={e => setNewEmpUser(e.target.value)} placeholder="اسم المستخدم" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white"/>
                    <input type="password" value={newEmpPass} onChange={e => setNewEmpPass(e.target.value)} placeholder="كلمة المرور" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white"/>
                    <Button className="w-full" onClick={async () => {
                        if(newEmpName) { await addEmployee(newEmpName, newEmpUser, newEmpPass); setEmployeeModalOpen(false); }
                    }}>حفظ</Button>
                </div>
            </Modal>
            <Modal isOpen={isWindowModalOpen} onClose={() => setWindowModalOpen(false)} title="إضافة شباك">
                <div className="space-y-4 pt-4">
                    <input value={newWinName} onChange={e => setNewWinName(e.target.value)} placeholder="رقم الشباك" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white"/>
                    <input value={newWinTask} onChange={e => setNewWinTask(e.target.value)} placeholder="اسم الخدمة (اختياري)" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white"/>
                    <Button className="w-full" onClick={async () => {
                        if(newWinName) { await addWindow(newWinName, newWinTask); setWindowModalOpen(false); }
                    }}>حفظ</Button>
                </div>
            </Modal>
        </div>
    );
};

export default AdminDashboard;
