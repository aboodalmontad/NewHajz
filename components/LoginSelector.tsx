
import React, { useState, useEffect } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Button } from './shared/Button';
import { Employee } from '../types';

interface LoginSelectorProps {
    onLogin: (view: string, employee?: Employee) => void;
    defaultToEmployee?: boolean;
}

const RoleCard: React.FC<{ title: string, description: string, icon: React.ReactElement<{ className?: string }>, onClick: () => void }> = ({ title, description, icon, onClick }) => (
    <div onClick={onClick} className="bg-slate-800 p-8 rounded-2xl shadow-xl hover:bg-slate-700 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer text-center border border-slate-700 hover:border-sky-500 group">
        <div className="flex justify-center text-slate-400 group-hover:text-sky-400 mb-6 transition-colors">{React.cloneElement(icon, { className: "h-16 w-16" })}</div>
        <h3 className="text-2xl font-bold mb-3 text-white">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
)

const LoginSelector: React.FC<LoginSelectorProps> = ({ onLogin, defaultToEmployee = false }) => {
    const [loginMode, setLoginMode] = useState<'none' | 'employee' | 'admin'>(defaultToEmployee ? 'employee' : 'none');
    const { authenticateEmployee, authenticateAdmin } = useQueueSystem();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (defaultToEmployee) setLoginMode('employee');
    }, [defaultToEmployee]);
    
    const handleEmployeeLogin = async () => {
        setError('');
        if (!username || !password) return;
        setIsLoading(true);
        try {
            const employee = await authenticateEmployee(username, password);
            if(employee) {
                onLogin('employee', employee);
            } else {
                setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
            }
        } catch (e) {
            setError('حدث خطأ أثناء تسجيل الدخول.');
        } finally {
            setIsLoading(false);
        }
    }

    const handleAdminLogin = async () => {
        setError('');
        if (!password) return;
        setIsLoading(true);
        try {
            const success = await authenticateAdmin(password);
            if (success) {
                onLogin('admin');
            } else {
                setError('كلمة المرور غير صحيحة.');
            }
        } catch (e) {
            setError('حدث خطأ أثناء تسجيل الدخول.');
        } finally {
            setIsLoading(false);
        }
    }

    const Icons = {
        Kiosk: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5a.75.75 0 0 0-.75.75v14.25a.75.75 0 0 0 .75.75h16.5a.75.75 0 0 0 .75-.75V5.25a.75.75 0 0 0-.75-.75H3.75Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 9.75h3v4.5h-3v-4.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 16.5h3" /></svg>,
        Display: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-1.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" /></svg>,
        Employee: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
        Admin: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>,
    }

    if (loginMode === 'employee') {
        return (
             <div className="max-w-md mx-auto mt-16 bg-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-700">
                 <div className="text-center mb-8">
                    <div className="bg-sky-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-sky-500/20">
                        {Icons.Employee}
                    </div>
                    <h2 className="text-3xl font-bold text-white">تسجيل دخول الموظف</h2>
                    <p className="text-slate-400 mt-2">أدخل بياناتك للوصول إلى شباك الخدمة</p>
                 </div>
                 <div className="space-y-5">
                     <div className="relative">
                        <input 
                            type="text" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)}
                            placeholder="اسم المستخدم"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                        />
                     </div>
                      <div className="relative">
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleEmployeeLogin()}
                            placeholder="كلمة المرور"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                        />
                     </div>
                 </div>
                 {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-center mt-5 text-sm">
                        {error}
                    </div>
                 )}
                 <div className="mt-8 grid grid-cols-2 gap-4">
                    <Button variant="secondary" size="lg" onClick={() => setLoginMode('none')} className="w-full !rounded-xl">رجوع</Button>
                    <Button onClick={handleEmployeeLogin} size="lg" disabled={!username || !password || isLoading} className="w-full !rounded-xl">
                       {isLoading ? 'جاري الدخول...' : 'دخول'}
                    </Button>
                 </div>
             </div>
        )
    }

    if (loginMode === 'admin') {
        return (
             <div className="max-w-md mx-auto mt-16 bg-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-700">
                 <div className="text-center mb-8">
                    <div className="bg-yellow-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                        <div className="text-yellow-500">{Icons.Admin}</div>
                    </div>
                    <h2 className="text-3xl font-bold text-white">تسجيل دخول المدير</h2>
                    <p className="text-slate-400 mt-2">يرجى إدخال كلمة مرور الإدارة للمتابعة</p>
                 </div>
                 <div className="space-y-5">
                      <div className="relative">
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                            placeholder="كلمة مرور الإدارة"
                            autoFocus
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                        />
                     </div>
                 </div>
                 {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-center mt-5 text-sm">
                        {error}
                    </div>
                 )}
                 <div className="mt-8 grid grid-cols-2 gap-4">
                    <Button variant="secondary" size="lg" onClick={() => setLoginMode('none')} className="w-full !rounded-xl">رجوع</Button>
                    <Button onClick={handleAdminLogin} size="lg" disabled={!password || isLoading} className="w-full !rounded-xl bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500">
                       {isLoading ? 'جاري التحقق...' : 'دخول'}
                    </Button>
                 </div>
                 <p className="mt-8 text-xs text-center text-slate-500">
                    * الافتراضية: admin123
                 </p>
             </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto text-center mt-8">
            <div className="mb-12">
                <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight">مرحباً بك في <span className="text-sky-500">الطابور الذكي</span></h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto">قم بتعيين دور هذا الجهاز في الشبكة المحلية لبدء التشغيل.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <RoleCard 
                    title="كشك العملاء" 
                    description="جهاز لوحي أو شاشة لمس للعملاء لسحب أرقام الدور." 
                    icon={Icons.Kiosk} 
                    onClick={() => onLogin('kiosk')} 
                />
                <RoleCard 
                    title="الشاشة الرئيسية" 
                    description="شاشة عرض كبيرة لعرض الأرقام التي يتم مناداتها حالياً." 
                    icon={Icons.Display} 
                    onClick={() => onLogin('display')} 
                />
                <RoleCard 
                    title="شباك الموظف" 
                    description="واجهة للموظفين لاستدعاء العملاء وإدارة طلبات الخدمة." 
                    icon={Icons.Employee} 
                    onClick={() => setLoginMode('employee')} 
                />
                <RoleCard 
                    title="الإدارة العامة" 
                    description="لوحة تحكم كاملة لإدارة الموظفين والشبابيك ومتابعة الإحصائيات." 
                    icon={Icons.Admin} 
                    onClick={() => setLoginMode('admin')} 
                />
            </div>

            <div className="mt-16 p-6 bg-sky-500/5 rounded-2xl border border-sky-500/10 max-w-3xl mx-auto">
                <h4 className="text-sky-400 font-bold mb-2">تعليمات الشبكة المحلية:</h4>
                <p className="text-sm text-slate-400">
                    لربط أجهزة أخرى بهذا النظام، افتح المتصفح في الأجهزة الأخرى وأدخل عنوان الـ IP الخاص بهذا الجهاز مع إضافة <code className="bg-slate-800 px-2 py-1 rounded text-white">?view=[الوضع]</code> للرابط.
                </p>
            </div>
        </div>
    );
};

export default LoginSelector;
