import React, { useState } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Button } from './shared/Button';
import { Employee } from '../types';

interface LoginSelectorProps {
    onLogin: (view: string, employee?: Employee) => void;
}

const RoleCard: React.FC<{ title: string, description: string, icon: React.ReactElement<{ className?: string }>, onClick: () => void }> = ({ title, description, icon, onClick }) => (
    <div onClick={onClick} className="bg-slate-800 p-6 rounded-lg shadow-lg hover:bg-slate-700 hover:ring-2 hover:ring-sky-500 transition-all cursor-pointer text-center">
        <div className="flex justify-center text-sky-400 mb-4">{React.cloneElement(icon, { className: "h-12 w-12" })}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-slate-400">{description}</p>
    </div>
)

const LoginSelector: React.FC<LoginSelectorProps> = ({ onLogin }) => {
    const [isEmployeeLogin, setEmployeeLogin] = useState(false);
    const { authenticateEmployee } = useQueueSystem();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const handleEmployeeLogin = () => {
        setError('');
        if (!username || !password) return;

        const employee = authenticateEmployee(username, password);
        if(employee) {
            onLogin('employee', employee);
        } else {
            setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
        }
    }

    const Icons = {
        Kiosk: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5a.75.75 0 0 0-.75.75v14.25a.75.75 0 0 0 .75.75h16.5a.75.75 0 0 0 .75-.75V5.25a.75.75 0 0 0-.75-.75H3.75Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 9.75h3v4.5h-3v-4.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 16.5h3" /></svg>,
        Display: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-1.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" /></svg>,
        Employee: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
        Admin: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-1.621-.621A3 3 0 0 1 15 18.257V17.25m-6-12V5.25A2.25 2.25 0 0 1 11.25 3h1.5A2.25 2.25 0 0 1 15 5.25v2.25m-6-3h6M6 12.75H4.5v4.5H6v-4.5Zm13.5 0H18v4.5h1.5v-4.5Z" /></svg>,
    }

    if (isEmployeeLogin) {
        return (
             <div className="max-w-md mx-auto mt-20 bg-slate-800 p-8 rounded-lg shadow-xl">
                 <h2 className="text-2xl font-bold text-center mb-6">تسجيل دخول الموظف</h2>
                 <div className="space-y-4">
                     <input 
                        type="text" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)}
                        placeholder="اسم المستخدم"
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-sky-500 focus:border-sky-500"
                     />
                      <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEmployeeLogin()}
                        placeholder="كلمة المرور"
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-sky-500 focus:border-sky-500"
                     />
                 </div>
                 {error && <p className="text-red-400 text-center mt-4">{error}</p>}
                 <div className="mt-6 flex items-center space-x-4">
                    <Button variant="secondary" onClick={() => setEmployeeLogin(false)} className="w-full">رجوع</Button>
                    <Button onClick={handleEmployeeLogin} disabled={!username || !password} className="w-full">
                       دخول
                    </Button>
                 </div>
             </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto text-center mt-10">
            <h1 className="text-4xl font-bold mb-2">اختر دورك</h1>
            <p className="text-slate-400 mb-10">اختر الواجهة التي تريد الوصول إليها.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <RoleCard title="كشك العملاء" description="للحصول على بطاقة خدمة." icon={Icons.Kiosk} onClick={() => onLogin('kiosk')} />
                <RoleCard title="الشاشة الرئيسية" description="شاشة عامة لعرض الأرقام المطلوبة." icon={Icons.Display} onClick={() => onLogin('display')} />
                <RoleCard title="الموظف" description="لتسجيل الدخول وإدارة شباكك وخدمة العملاء." icon={Icons.Employee} onClick={() => setEmployeeLogin(true)} />
                <RoleCard title="الإدارة" description="للوصول إلى لوحة التحكم وإدارة النظام." icon={Icons.Admin} onClick={() => onLogin('admin')} />
            </div>
        </div>
    );
};

export default LoginSelector;
