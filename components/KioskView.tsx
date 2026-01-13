
import React, { useState, useMemo } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Customer } from '../types';
import { Button } from './shared/Button';
import { Card } from './shared/Card';

const ServiceOption: React.FC<{ title: string, icon: React.ReactNode, onClick: () => void, disabled: boolean }> = ({ title, icon, onClick, disabled }) => (
    <Card 
        className={`bg-slate-800 p-8 flex flex-col items-center justify-center border border-slate-700 hover:border-sky-500 hover:bg-slate-700 cursor-pointer transition-all active:scale-95 shadow-xl group ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={onClick}
    >
        <div className="text-sky-400 mb-4 transform group-hover:scale-110 transition-transform">{icon}</div>
        <h3 className="text-2xl font-bold text-white text-center">{title}</h3>
    </Card>
);

const KioskView: React.FC = () => {
    const { state, addCustomer } = useQueueSystem();
    const [lastTicket, setLastTicket] = useState<Customer | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // استخراج الخدمات الفريدة من الشبابيك المعرفة في النظام
    const dynamicServices = useMemo(() => {
        if (!state) return [];
        
        // استخراج المهام المخصصة من كل الشبابيك
        const tasks = state.windows.map(w => w.customTask || 'خدمات عامة');
        
        // إزالة التكرار
        const uniqueTasks = Array.from(new Set(tasks));
        
        // تعيين أيقونات افتراضية بناءً على الاسم
        // Fix: Explicitly type 'task' as string to avoid 'unknown' type error on .includes() calls
        return uniqueTasks.map((task: string) => {
            let icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            
            if (task.includes('حساب')) icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            if (task.includes('استقبال')) icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
            if (task.includes('عملاء')) icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
            if (task.includes('صراف') || task.includes('مالية')) icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

            return { name: task, icon };
        });
    }, [state]);

    const handleTakeNumber = async (serviceName: string) => {
        setIsLoading(true);
        try {
            const newCustomer = await addCustomer(serviceName);
            if (newCustomer) {
                setLastTicket(newCustomer);
                // صوت تنبيه بسيط عند قطع التذكرة (اختياري)
                try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
                    audio.play();
                } catch(e) {}
            }
        } catch (error) {
            console.error("Failed to get ticket:", error);
            alert("عذراً، حدث خطأ أثناء إصدار التذكرة. يرجى المحاولة مرة أخرى.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!state) return <div className="text-white text-center mt-20">جاري تحميل الخدمات...</div>;

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
            {!lastTicket ? (
                <>
                    <h1 className="text-5xl font-extrabold text-white mb-4">مرحباً بك</h1>
                    <p className="text-xl text-slate-300 mb-12">يرجى اختيار الخدمة المطلوبة للحصول على رقم دورك.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-6xl">
                        {dynamicServices.length > 0 ? (
                            dynamicServices.map(service => (
                                <ServiceOption 
                                    key={service.name} 
                                    title={service.name} 
                                    icon={service.icon} 
                                    onClick={() => handleTakeNumber(service.name)} 
                                    disabled={isLoading}
                                />
                            ))
                        ) : (
                            <div className="col-span-full bg-slate-800 p-10 rounded-2xl border border-dashed border-slate-600">
                                <p className="text-slate-400">لا توجد خدمات متاحة حالياً. يرجى مراجعة مسؤول النظام.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="bg-slate-800 p-12 rounded-[2.5rem] shadow-2xl border border-sky-500/30 max-w-lg w-full transform animate-in fade-in zoom-in duration-300">
                    <div className="mb-6">
                        <span className="bg-sky-500/20 text-sky-400 text-sm font-bold px-4 py-2 rounded-full uppercase tracking-widest border border-sky-500/30">
                            {lastTicket.serviceName}
                        </span>
                    </div>
                    <p className="text-lg text-slate-400">رقم بطاقتك هو:</p>
                    <h2 className="text-9xl font-mono font-extrabold text-yellow-400 my-8 tracking-wider drop-shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                        {lastTicket.ticketNumber}
                    </h2>
                    <div className="space-y-2 mb-10">
                        <p className="text-lg text-slate-300">يرجى الانتظار حتى يتم استدعاء رقمك.</p>
                        <p className="text-sm text-slate-500 italic">وقت الطلب: {lastTicket.requestTime.toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                    <Button variant="secondary" className="w-full py-5 !rounded-2xl text-xl shadow-lg" onClick={() => setLastTicket(null)}>
                        حسناً، فهمت
                    </Button>
                </div>
            )}
        </div>
    );
};

export default KioskView;
