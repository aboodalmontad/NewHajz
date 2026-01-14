
import React, { useState, useEffect } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Button } from './shared/Button';
import { Card } from './shared/Card';
import { Employee } from '../types';

const LoginSelector: React.FC<{ onLogin: (view: string, employee?: Employee) => void }> = ({ onLogin }) => {
    const [loginMode, setLoginMode] = useState<'none' | 'employee' | 'admin' | 'sync_join'>('none');
    const [joinMode, setJoinMode] = useState<'none' | 'cloud' | 'local'>('none');
    const [syncIdInput, setSyncIdInput] = useState('');
    const [offerToken, setOfferToken] = useState('');
    const [answerToken, setAnswerToken] = useState('');

    const { state, authenticateEmployee, authenticateAdmin, joinCloudSync, joinMeshClient, disconnectSync, meshStatus } = useQueueSystem();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (meshStatus === 'connected') {
            alert("✅ تم الربط بنجاح! سيتم تذكر هذا الجهاز دائماً.");
            setLoginMode('none');
        }
    }, [meshStatus]);

    const handleCloudJoin = async () => {
        const success = await joinCloudSync(syncIdInput);
        if (success) {
            alert("✅ تم الربط بنجاح! هذا الجهاز مرتبط الآن بشكل دائم.");
            setLoginMode('none');
        } else {
            alert("❌ فشل الربط، تأكد من الكود.");
        }
    };

    const isLinked = !!state?.syncId;

    return (
        <div className="max-w-6xl mx-auto text-center mt-12 pb-20 px-4 animate-in fade-in duration-500">
            <h1 className="text-6xl font-black text-white mb-6 tracking-tighter">نظام الطابور الذكي</h1>
            
            {(isLinked || meshStatus === 'connected') && (
                <div className="mb-12">
                    <div className="inline-flex items-center gap-3 bg-green-500/10 border border-green-500/30 px-8 py-4 rounded-3xl shadow-lg">
                        <span className="flex h-4 w-4 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-green-400 font-bold">هذا الجهاز مرتبط بنظام نشط وجاهز للعمل</span>
                        {state?.syncId && (
                            <span className="bg-slate-800 text-sky-400 px-4 py-1.5 rounded-xl text-xs font-mono font-bold border border-slate-700 ml-4">ID: {state.syncId}</span>
                        )}
                    </div>
                </div>
            )}

            {loginMode === 'none' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <Card className="bg-slate-800 p-10 cursor-pointer hover:border-sky-500 border border-slate-700 group transition-all rounded-[2.5rem] shadow-2xl" onClick={() => onLogin('kiosk')}>
                        <div className="text-sky-500 mb-6 group-hover:scale-110 transition-transform">
                            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-3xl font-bold text-white">كشك العملاء</h3>
                        <p className="text-slate-500 text-sm mt-3">لإصدار التذاكر للزبائن</p>
                    </Card>

                    <Card className="bg-slate-800 p-10 cursor-pointer hover:border-sky-500 border border-slate-700 group transition-all rounded-[2.5rem] shadow-2xl" onClick={() => onLogin('display')}>
                        <div className="text-sky-500 mb-6 group-hover:scale-110 transition-transform">
                            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-3xl font-bold text-white">الشاشة الكبرى</h3>
                        <p className="text-slate-500 text-sm mt-3">لعرض الأرقام المستدعاة</p>
                    </Card>
                    
                    {!isLinked ? (
                        <Card className="bg-slate-800 p-10 cursor-pointer border-2 border-dashed border-sky-500/30 hover:bg-sky-500/5 group rounded-[2.5rem]" onClick={() => setLoginMode('sync_join')}>
                            <div className="text-sky-400 mb-6 group-hover:rotate-12 transition-transform">
                                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <h3 className="text-3xl font-bold text-sky-400">ربط بالنظام</h3>
                            <p className="text-slate-500 text-sm mt-3">لمزامنة البيانات (لمرة واحدة فقط)</p>
                        </Card>
                    ) : (
                        <Card className="bg-slate-900 p-10 border border-slate-700 rounded-[2.5rem] flex flex-col justify-center">
                            <p className="text-slate-400 mb-6">الجهاز مرتبط حالياً</p>
                            <Button variant="danger" size="sm" className="opacity-60 hover:opacity-100 py-3" onClick={() => { if(confirm("هل تريد قطع الارتباط؟")) disconnectSync(); }}>قطع الارتباط بالنظام</Button>
                        </Card>
                    )}

                    <div className="col-span-full h-px bg-slate-800 my-8"></div>

                    <Card className="bg-slate-800/40 p-8 cursor-pointer hover:bg-slate-800 border border-slate-700 flex items-center justify-center gap-6 group rounded-3xl" onClick={() => setLoginMode('employee')}>
                        <svg className="w-8 h-8 text-slate-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        <h3 className="text-2xl font-bold text-white">دخول الموظفين</h3>
                    </Card>

                    <Card className="bg-slate-800/40 p-8 cursor-pointer hover:bg-slate-800 border border-slate-700 flex items-center justify-center gap-6 group rounded-3xl" onClick={() => setLoginMode('admin')}>
                        <svg className="w-8 h-8 text-slate-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        <h3 className="text-2xl font-bold text-white">إدارة النظام</h3>
                    </Card>
                </div>
            ) : loginMode === 'sync_join' ? (
                <div className="max-w-xl mx-auto bg-slate-800 p-12 rounded-[3rem] border border-slate-700 shadow-2xl animate-in zoom-in">
                    <h2 className="text-4xl font-bold text-white mb-10">ربط الجهاز</h2>
                    {joinMode === 'none' ? (
                        <div className="grid gap-6">
                            <Button onClick={() => setJoinMode('cloud')} className="py-6 text-xl">استخدام كود المزامنة (ID)</Button>
                            <Button variant="secondary" onClick={() => setJoinMode('local')} className="py-6 text-xl">الربط المحلي (LAN)</Button>
                            <button onClick={() => setLoginMode('none')} className="text-slate-500 mt-4 hover:text-white transition-colors">رجوع</button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <input value={syncIdInput} onChange={e => setSyncIdInput(e.target.value)} placeholder="أدخل الكود هنا..." className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 text-white text-center font-mono text-2xl tracking-widest outline-none focus:border-sky-500"/>
                            <Button className="w-full py-5 text-xl" onClick={handleCloudJoin} disabled={!syncIdInput}>تأكيد الربط</Button>
                            <button onClick={() => setJoinMode('none')} className="w-full text-slate-500">إلغاء</button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="max-w-md mx-auto bg-slate-800 p-12 rounded-[3rem] border border-slate-700 shadow-2xl animate-in zoom-in">
                    <h2 className="text-3xl font-bold text-white mb-8">تسجيل الدخول</h2>
                    <div className="space-y-5">
                        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="اسم المستخدم" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 text-white outline-none focus:border-sky-500 text-right"/>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 text-white outline-none focus:border-sky-500 text-right"/>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <Button variant="secondary" className="py-4" onClick={() => setLoginMode('none')}>رجوع</Button>
                            <Button className="py-4" onClick={async () => {
                                if (loginMode === 'employee') {
                                    const emp = await authenticateEmployee(username, password);
                                    if (emp) onLogin('employee', emp); else alert("البيانات غير صحيحة");
                                } else {
                                    if (await authenticateAdmin(password)) onLogin('admin'); else alert("كلمة مرور الإدارة خاطئة");
                                }
                            }}>دخول</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginSelector;
