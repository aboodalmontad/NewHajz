import React, { useState } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Button } from './shared/Button';
import { Card } from './shared/Card';
import { Employee } from '../types';

const LoginSelector: React.FC<{ onLogin: (view: string, employee?: Employee) => void }> = ({ onLogin }) => {
    const [loginMode, setLoginMode] = useState<'none' | 'employee' | 'admin' | 'sync_join'>('none');
    const [networkCode, setNetworkCode] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [statusFeedback, setStatusFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

    const { 
        state, 
        authenticateEmployee, 
        authenticateAdmin, 
        joinCloudSync, 
        createCustomSyncSession,
        networkInfo
    } = useQueueSystem();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleJoinNetwork = async () => {
        if (!networkCode.trim()) {
            setStatusFeedback({ text: 'يرجى إدخال كود الشبكة', isError: true });
            return;
        }
        setIsConnecting(true);
        setStatusFeedback(null);
        try {
            const success = await joinCloudSync(networkCode.trim());
            if (success) {
                setStatusFeedback({ text: `✅ تم الربط بالشبكة بنجاح بكود: ${networkCode.trim()}`, isError: false });
                setTimeout(() => setLoginMode('none'), 1200);
            } else {
                await createCustomSyncSession(networkCode.trim());
                setStatusFeedback({ text: `✅ تم تفعيل الشبكة بنجاح بكود: ${networkCode.trim()}`, isError: false });
                setTimeout(() => setLoginMode('none'), 1200);
            }
        } catch (e) {
            setStatusFeedback({ text: 'حدث خطأ أثناء الربط، يرجى المحاولة مرة أخرى.', isError: true });
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto text-center mt-8 pb-20">
            <h1 className="text-5xl font-extrabold text-white mb-4">نظام الطابور الذكي</h1>
            <p className="text-slate-400 mb-12 text-lg">
                {state?.syncId ? (
                    <span className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-1.5 rounded-full text-sm font-medium border border-green-500/20">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        متصل بالشبكة المحلية (الكود: {state.syncId})
                    </span>
                ) : (
                    <span className="text-slate-500 text-sm">وضع التشغيل المحلي المستقل</span>
                )}
            </p>
            
            {loginMode === 'none' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                    <Card className="bg-slate-800 p-8 cursor-pointer hover:border-sky-500 border border-slate-700 transition-all hover:scale-[1.02]" onClick={() => onLogin('kiosk')}>
                        <div className="bg-sky-500/10 w-14 h-14 rounded-2xl flex items-center justify-center text-sky-400 mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white">كشك العملاء</h3>
                        <p className="text-slate-400 text-sm mt-2">لحجز وسحب تذاكر الدور للزبائن</p>
                    </Card>

                    <Card className="bg-slate-800 p-8 cursor-pointer hover:border-sky-500 border border-slate-700 transition-all hover:scale-[1.02]" onClick={() => onLogin('display')}>
                        <div className="bg-emerald-500/10 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white">الشاشة الرئيسية</h3>
                        <p className="text-slate-400 text-sm mt-2">شاشة العرض المركزية والنداء الصوتي</p>
                    </Card>

                    <Card className="bg-slate-800 p-8 cursor-pointer border-2 border-dashed border-sky-500/40 hover:bg-sky-500/5 hover:border-sky-400 transition-all hover:scale-[1.02]" onClick={() => {
                        setNetworkCode(state?.syncId || '');
                        setStatusFeedback(null);
                        setLoginMode('sync_join');
                    }}>
                        <div className="bg-sky-500/10 w-14 h-14 rounded-2xl flex items-center justify-center text-sky-400 mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-sky-400">الربط بالشبكة المحلية</h3>
                        <p className="text-slate-400 text-sm mt-2">ربط هذا الجهاز بالأجهزة الأخرى بكود موحد</p>
                    </Card>

                    <div className="col-span-full h-px bg-slate-700/50 my-4"></div>

                    <Card className="bg-slate-800/60 p-6 cursor-pointer hover:bg-slate-800 border border-slate-700 transition-all" onClick={() => setLoginMode('employee')}>
                        <h3 className="text-xl font-bold text-white">دخول الموظفين</h3>
                        <p className="text-slate-400 text-xs mt-1">نداء وخدمة العملاء من الشبابيك</p>
                    </Card>

                    <Card className="bg-slate-800/60 p-6 cursor-pointer hover:bg-slate-800 border border-slate-700 transition-all" onClick={() => setLoginMode('admin')}>
                        <h3 className="text-xl font-bold text-white">إدارة النظام</h3>
                        <p className="text-slate-400 text-xs mt-1">الإحصائيات، الإعدادات، والتحكم الشامل</p>
                    </Card>
                </div>
            ) : loginMode === 'sync_join' ? (
                <div className="max-w-xl mx-auto bg-slate-800 p-8 sm:p-10 rounded-3xl border border-slate-700 shadow-2xl text-right animate-in zoom-in duration-300">
                    <div className="text-center mb-6">
                        <div className="bg-sky-500/10 w-16 h-16 rounded-3xl flex items-center justify-center text-sky-400 mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        </div>
                        <h2 className="text-3xl font-extrabold text-white">الربط بالشبكة المحلية</h2>
                        <p className="text-slate-400 text-sm mt-2">أدخل نفس كود الشبكة على جميع أجهزتك لتعمل معاً فورياً وبشكل متزامن</p>
                    </div>

                    {/* LAN instructions */}
                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700 mb-6 text-xs text-slate-300 space-y-2">
                        <p className="font-bold text-sky-400 flex items-center gap-1.5">
                            <span>💡</span>
                            <span>طريقة الربط بين الأجهزة:</span>
                        </p>
                        <p>1. تأكد أن جميع الأجهزة (الهواتف، الأجهزة اللوحية، الكمبيوترات) متصلة بنفس شبكة الواي فاي أو الراوتر المحلي.</p>
                        <p>2. افتح التطبيق على الأجهزة الأخرى وأدخل نفس الكود أدناه (مثال: <strong className="text-white">1234</strong>).</p>
                    </div>

                    {statusFeedback && (
                        <div className={`p-3.5 rounded-xl text-center text-xs font-bold mb-4 ${
                            statusFeedback.isError 
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                            {statusFeedback.text}
                        </div>
                    )}
                    
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs text-slate-300 font-bold block mb-2">كود الشبكة الموحد (مثال: 1234 أو branch1):</label>
                            <input 
                                value={networkCode} 
                                onChange={e => setNetworkCode(e.target.value)} 
                                placeholder="اكتب كود الشبكة هنا..." 
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 text-white text-center font-mono text-2xl font-bold tracking-widest outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-2 justify-center">
                            {['1234', 'desk1', 'branch1', 'room1'].map(suggested => (
                                <button
                                    key={suggested}
                                    type="button"
                                    onClick={() => setNetworkCode(suggested)}
                                    className="text-xs bg-slate-900 hover:bg-slate-700 text-sky-400 px-3 py-1.5 rounded-lg border border-slate-700 font-mono"
                                >
                                    {suggested}
                                </button>
                            ))}
                        </div>

                        <Button 
                            className="w-full py-4 text-lg font-bold" 
                            onClick={handleJoinNetwork} 
                            disabled={!networkCode.trim() || isConnecting}
                        >
                            {isConnecting ? 'جاري الربط...' : 'تأكيد الربط بالشبكة'}
                        </Button>

                        <button 
                            onClick={() => {
                                setStatusFeedback(null);
                                setLoginMode('none');
                            }} 
                            className="w-full text-slate-400 text-sm hover:text-white transition-colors text-center block pt-2 cursor-pointer"
                        >
                            إلغاء والعودة للقائمة
                        </button>
                    </div>
                </div>
            ) : (
                <div className="max-w-md mx-auto bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-2xl animate-in zoom-in text-right">
                    <h2 className="text-2xl font-bold text-white mb-2 text-center">
                        {loginMode === 'employee' ? 'تسجيل دخول الموظف' : 'تسجيل دخول الإدارة'}
                    </h2>
                    <p className="text-slate-400 text-xs mb-6 text-center">
                        {loginMode === 'employee' ? 'أدخل اسم المستخدم وكلمة المرور' : 'أدخل كلمة مرور لوحة التحكم (الافتراضية: admin123)'}
                    </p>

                    {statusFeedback && (
                        <div className="p-3 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-center text-xs font-bold mb-4">
                            {statusFeedback.text}
                        </div>
                    )}

                    {loginMode === 'employee' && (
                        <input 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            placeholder="اسم المستخدم" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white mb-4 outline-none focus:ring-1 focus:ring-sky-500 text-right"
                        />
                    )}
                    <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="كلمة المرور" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white mb-6 outline-none focus:ring-1 focus:ring-sky-500 text-right"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="secondary" onClick={() => {
                            setStatusFeedback(null);
                            setLoginMode('none');
                        }}>رجوع</Button>
                        <Button onClick={async () => {
                            if (loginMode === 'employee') {
                                const emp = await authenticateEmployee(username, password);
                                if (emp) {
                                    onLogin('employee', emp);
                                } else {
                                    setStatusFeedback({ text: 'اسم المستخدم أو كلمة المرور غير صحيحة', isError: true });
                                }
                            } else {
                                if (await authenticateAdmin(password)) {
                                    onLogin('admin');
                                } else {
                                    setStatusFeedback({ text: 'كلمة المرور غير صحيحة (الافتراضية: admin123)', isError: true });
                                }
                            }
                        }}>دخول</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginSelector;
