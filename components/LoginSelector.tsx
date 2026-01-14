
import React, { useState, useEffect } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Button } from './shared/Button';
import { Card } from './shared/Card';
import { Employee } from '../types';

const LoginSelector: React.FC<{ onLogin: (view: string, employee?: Employee) => void }> = ({ onLogin }) => {
    const [loginMode, setLoginMode] = useState<'none' | 'employee' | 'admin' | 'sync_join'>('none');
    const [joinMode, setJoinMode] = useState<'none' | 'cloud' | 'local'>('none');
    
    // Cloud Sync Join
    const [syncIdInput, setSyncIdInput] = useState('');
    // Local Mesh Join
    const [offerToken, setOfferToken] = useState('');
    const [answerToken, setAnswerToken] = useState('');

    const { state, authenticateEmployee, authenticateAdmin, joinCloudSync, joinMeshClient, disconnectSync, meshStatus } = useQueueSystem();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // مراقبة حالة الربط المحلي
    useEffect(() => {
        if (meshStatus === 'connected') {
            alert("✅ تم الربط بنجاح! يمكنك الآن اختيار الوضع المناسب.");
            setLoginMode('none');
        } else if (meshStatus === 'failed') {
            alert("❌ فشل الربط المحلي. يرجى مراجعة الكود.");
        }
    }, [meshStatus]);

    const handleCloudJoin = async () => {
        const success = await joinCloudSync(syncIdInput);
        if (success) {
            alert("✅ تم الربط السحابي الدائم بنجاح! سيتذكر الجهاز هذا الارتباط تلقائياً.");
            setLoginMode('none');
        } else {
            alert("❌ فشل الربط، تأكد من الـ Sync ID.");
        }
    };

    const handleLocalJoin = async () => {
        try {
            const answer = await joinMeshClient(offerToken);
            setAnswerToken(answer);
        } catch (e) {
            alert("❌ الكود غير صالح.");
        }
    };

    const isLinked = !!state?.syncId;

    return (
        <div className="max-w-6xl mx-auto text-center mt-8 pb-20 px-4 animate-in fade-in duration-500">
            <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tighter">نظام الطابور الذكي</h1>
            
            {(isLinked || meshStatus === 'connected') && (
                <div className="flex items-center justify-center gap-2 mb-12">
                    <span className="flex h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-slate-400 text-sm font-medium">الجهاز مرتبط حالياً بنظام: </span>
                    <span className="bg-slate-800 text-sky-400 px-3 py-1 rounded-lg text-xs font-mono font-bold border border-slate-700">
                        {state?.syncId || 'ربط محلي نشط'}
                    </span>
                </div>
            )}

            {loginMode === 'none' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="bg-slate-800 p-8 cursor-pointer hover:border-sky-500 border border-slate-700 group transition-all" onClick={() => onLogin('kiosk')}>
                        <div className="text-sky-500 mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white">كشك العملاء</h3>
                        <p className="text-slate-500 text-xs mt-2">لإصدار تذاكر الدور للزبائن</p>
                    </Card>
                    <Card className="bg-slate-800 p-8 cursor-pointer hover:border-sky-500 border border-slate-700 group transition-all" onClick={() => onLogin('display')}>
                        <div className="text-sky-500 mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white">الشاشة الرئيسية</h3>
                        <p className="text-slate-500 text-xs mt-2">لعرض الأرقام التي يتم خدمتها حالياً</p>
                    </Card>
                    
                    {!isLinked && meshStatus !== 'connected' ? (
                        <Card className="bg-slate-800 p-8 cursor-pointer border-2 border-dashed border-sky-500/30 hover:bg-sky-500/5 group" onClick={() => setLoginMode('sync_join')}>
                            <div className="text-sky-400 mb-4 group-hover:rotate-12 transition-transform">
                                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-sky-400">ربط بجهاز رئيسي</h3>
                            <p className="text-slate-500 text-sm mt-2">لمزامنة هذا الجهاز مع نظام قائم</p>
                        </Card>
                    ) : (
                        <Card className="bg-slate-900 p-8 border border-slate-700 flex flex-col justify-center">
                            <h3 className="text-xl font-bold text-slate-400 mb-4">إدارة الربط</h3>
                            <Button variant="danger" size="sm" onClick={() => {
                                if(confirm("هل أنت متأكد من قطع الارتباط؟ سيعمل هذا الجهاز كجهاز منفصل.")) disconnectSync();
                            }}>قطع الارتباط بالنظام</Button>
                        </Card>
                    )}

                    <div className="col-span-full h-px bg-slate-700/50 my-6"></div>
                    <Card className="bg-slate-800/50 p-6 cursor-pointer hover:bg-slate-800 border border-slate-700 flex items-center justify-center gap-4 group" onClick={() => setLoginMode('employee')}>
                        <svg className="w-6 h-6 text-slate-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        <h3 className="text-xl font-bold text-white">دخول الموظفين</h3>
                    </Card>
                    <Card className="bg-slate-800/50 p-6 cursor-pointer hover:bg-slate-800 border border-slate-700 flex items-center justify-center gap-4 group" onClick={() => setLoginMode('admin')}>
                        <svg className="w-6 h-6 text-slate-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /></svg>
                        <h3 className="text-xl font-bold text-white">إدارة النظام</h3>
                    </Card>
                </div>
            ) : loginMode === 'sync_join' ? (
                <div className="max-w-2xl mx-auto bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-2xl animate-in zoom-in duration-300">
                    <h2 className="text-3xl font-bold text-white mb-8">اختر طريقة الربط</h2>
                    
                    {joinMode === 'none' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Button onClick={() => setJoinMode('cloud')} className="py-6">مزامنة سحابية دائمة (Sync ID)</Button>
                            <Button variant="secondary" onClick={() => setJoinMode('local')} className="py-6">ربط محلي مؤقت (LAN)</Button>
                            <button onClick={() => setLoginMode('none')} className="col-span-full text-slate-500 mt-4 hover:underline text-sm">إلغاء والعودة للرئيسية</button>
                        </div>
                    ) : joinMode === 'cloud' ? (
                        <div className="space-y-6 text-right">
                            <div className="bg-sky-500/5 p-4 rounded-xl border border-sky-500/20 mb-4">
                                <p className="text-sky-400 text-sm">ميزة المزامنة السحابية تسمح لهذا الجهاز بالعمل بانسجام تام مع الجهاز الرئيسي حتى بعد إغلاق المتصفح.</p>
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-2">أدخل معرف المزامنة (Sync ID) من الجهاز الرئيسي:</label>
                                <input value={syncIdInput} onChange={e => setSyncIdInput(e.target.value)} placeholder="مثال: f6d8... " className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-center font-mono text-xl tracking-widest outline-none focus:border-sky-500"/>
                            </div>
                            <Button className="w-full py-4" onClick={handleCloudJoin} disabled={!syncIdInput}>تفعيل الربط والمزامنة</Button>
                            <button onClick={() => setJoinMode('none')} className="w-full text-slate-500 text-sm">رجوع</button>
                        </div>
                    ) : (
                        <div className="space-y-6 text-right">
                             <div>
                                <label className="text-slate-400 text-sm block mb-2">الصق كود العرض من الجهاز الرئيسي:</label>
                                <textarea value={offerToken} onChange={e => setOfferToken(e.target.value)} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-[8px] font-mono text-white outline-none focus:border-green-500" placeholder="الصق الكود هنا..." />
                            </div>
                            <Button className="w-full py-4" onClick={handleLocalJoin} disabled={!offerToken}>توليد كود الرد</Button>
                            
                            {answerToken && (
                                <div className="p-4 bg-slate-900 rounded-xl border border-green-500/30 animate-in slide-in-from-top-2">
                                    <p className="text-xs text-green-400 mb-2 font-bold">انسخ هذا الكود وارجع به للجهاز الرئيسي:</p>
                                    <textarea readOnly value={answerToken} className="w-full h-24 bg-transparent text-[8px] text-white font-mono outline-none" />
                                    <p className="text-[10px] text-slate-500 mt-2">بمجرد تفعيل هذا الكود هناك، سيعمل هذا الجهاز تلقائياً.</p>
                                </div>
                            )}
                            <button onClick={() => setJoinMode('none')} className="w-full text-slate-500 text-sm">رجوع</button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="max-w-md mx-auto bg-slate-800 p-10 rounded-3xl border border-slate-700 animate-in zoom-in duration-300">
                    <h2 className="text-2xl font-bold text-white mb-6">تسجيل الدخول</h2>
                    <input value={username} onChange={e => setUsername(e.target.value)} placeholder="اسم المستخدم" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white mb-4 outline-none focus:ring-1 focus:ring-sky-500"/>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white mb-6 outline-none focus:ring-1 focus:ring-sky-500"/>
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="secondary" onClick={() => setLoginMode('none')}>رجوع</Button>
                        <Button onClick={async () => {
                            if (loginMode === 'employee') {
                                const emp = await authenticateEmployee(username, password);
                                if (emp) onLogin('employee', emp); else alert("اسم المستخدم أو كلمة المرور غير صحيحة");
                            } else {
                                if (await authenticateAdmin(password)) onLogin('admin'); else alert("كلمة مرور الإدارة غير صحيحة");
                            }
                        }}>دخول</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginSelector;
