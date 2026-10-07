
import React, { useState, useEffect } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Button } from './shared/Button';
import { Card } from './shared/Card';
import { Employee } from '../types';

const LoginSelector: React.FC<{ onLogin: (view: string, employee?: Employee) => void }> = ({ onLogin }) => {
    const [loginMode, setLoginMode] = useState<'none' | 'employee' | 'admin' | 'sync_join'>('none');
    const [joinMode, setJoinMode] = useState<'none' | 'cloud' | 'local'>('none');
    
    // Cloud Sync Join
    const [syncId, setSyncId] = useState('');
    // Local Mesh Join
    const [offerToken, setOfferToken] = useState('');
    const [answerToken, setAnswerToken] = useState('');

    const { authenticateEmployee, authenticateAdmin, joinCloudSync, joinMeshClient, meshStatus } = useQueueSystem();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (meshStatus === 'connected') {
            alert("✅ تم بنجاح! تم تأسيس الاتصال المحلي (LAN) بين الجهازين بنجاح وتفعيل المزامنة.");
        } else if (meshStatus === 'failed') {
            alert("❌ فشل الربط المحلي (WebRTC).\n\nالسبب المحتمل:\n1. قيود جدار الحماية (Firewall) أو شبكة الإنترنت التي تمنع اتصال الأجهزة المباشر.\n2. إعدادات المتصفح أو بيئة الـ Sandbox الأمنية.\n\n💡 الحل: يُنصح بشدة باستخدام (المزامنة السحابية) كبديل فوري ومستقر بنسبة 100%.");
        }
    }, [meshStatus]);

    const handleCloudJoin = async () => {
        const success = await joinCloudSync(syncId);
        if (success) {
            alert("تم الربط السحابي بنجاح!");
            setLoginMode('none');
        } else {
            alert("فشل الربط، تأكد من الـ Sync ID.");
        }
    };

    const handleLocalJoin = async () => {
        try {
            const answer = await joinMeshClient(offerToken);
            setAnswerToken(answer);
        } catch (e) {
            alert("❌ فشل معالجة كود العرض.\nالسبب: الكود المدخل غير صالح، تالف، أو تم إلغاء الجلسة. تأكد من نسخ الكود كاملاً من الجهاز الرئيسي.");
        }
    };

    return (
        <div className="max-w-6xl mx-auto text-center mt-8 pb-20">
            <h1 className="text-5xl font-extrabold text-white mb-12">نظام الطابور الذكي</h1>
            
            {loginMode === 'none' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                    <Card className="bg-slate-800 p-8 cursor-pointer hover:border-sky-500 border border-slate-700" onClick={() => onLogin('kiosk')}>
                        <h3 className="text-2xl font-bold text-white">كشك العملاء</h3>
                    </Card>
                    <Card className="bg-slate-800 p-8 cursor-pointer hover:border-sky-500 border border-slate-700" onClick={() => onLogin('display')}>
                        <h3 className="text-2xl font-bold text-white">الشاشة الرئيسية</h3>
                    </Card>
                    <Card className="bg-slate-800 p-8 cursor-pointer border-2 border-dashed border-sky-500/30 hover:bg-sky-500/5" onClick={() => setLoginMode('sync_join')}>
                        <h3 className="text-2xl font-bold text-sky-400">ربط بجهاز رئيسي</h3>
                        <p className="text-slate-500 text-sm mt-2">مزامنة البيانات بين الأجهزة</p>
                    </Card>
                    <div className="col-span-full h-px bg-slate-700/50 my-6"></div>
                    <Card className="bg-slate-800/50 p-6 cursor-pointer hover:bg-slate-800 border border-slate-700" onClick={() => setLoginMode('employee')}>
                        <h3 className="text-xl font-bold text-white">دخول الموظفين</h3>
                    </Card>
                    <Card className="bg-slate-800/50 p-6 cursor-pointer hover:bg-slate-800 border border-slate-700" onClick={() => setLoginMode('admin')}>
                        <h3 className="text-xl font-bold text-white">إدارة النظام</h3>
                    </Card>
                </div>
            ) : loginMode === 'sync_join' ? (
                <div className="max-w-xl mx-auto bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-2xl text-right">
                    <h2 className="text-3xl font-bold text-white mb-4">ربط الأجهزة على الشبكة</h2>
                    <p className="text-slate-400 text-sm mb-8">أدخل كود الغرفة أو الفرع القصير الموحد على جميع الأجهزة (مثال: <span className="text-sky-400 font-bold">123</span> أو <span className="text-sky-400 font-bold">branch1</span>):</p>
                    
                    <div className="space-y-6">
                        <div>
                            <input 
                                value={syncId} 
                                onChange={e => setSyncId(e.target.value)} 
                                placeholder="أدخل كود الشبكة (مثال: 123)..." 
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 text-white text-center font-mono text-2xl tracking-widest outline-none focus:border-sky-500"
                            />
                        </div>
                        <Button className="w-full py-4 text-lg font-bold" onClick={handleCloudJoin} disabled={!syncId}>اتصال فوري بالشبكة</Button>
                        <button onClick={() => setLoginMode('none')} className="w-full text-slate-500 text-sm mt-4 hover:underline text-center block">إلغاء والعودة</button>
                    </div>
                </div>
            ) : (
                <div className="max-w-md mx-auto bg-slate-800 p-10 rounded-3xl border border-slate-700 animate-in zoom-in">
                    <h2 className="text-2xl font-bold text-white mb-6">تسجيل الدخول</h2>
                    <input value={username} onChange={e => setUsername(e.target.value)} placeholder="اسم المستخدم" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white mb-4 outline-none focus:ring-1 focus:ring-sky-500"/>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white mb-6 outline-none focus:ring-1 focus:ring-sky-500"/>
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="secondary" onClick={() => setLoginMode('none')}>رجوع</Button>
                        <Button onClick={async () => {
                            if (loginMode === 'employee') {
                                const emp = await authenticateEmployee(username, password);
                                if (emp) onLogin('employee', emp); else alert("خطأ في البيانات");
                            } else {
                                if (await authenticateAdmin(password)) onLogin('admin'); else alert("كلمة المرور خطأ");
                            }
                        }}>دخول</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginSelector;
