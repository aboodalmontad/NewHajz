
import React, { useState, useMemo, useEffect } from 'react';
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

    useEffect(() => {
        if (lastTicket && state?.printerConfig.autoPrint) {
            const timer = setTimeout(() => {
                try {
                    window.print();
                } catch (e) {
                    console.error("Print call failed:", e);
                }
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [lastTicket, state?.printerConfig.autoPrint]);

    const dynamicServices = useMemo(() => {
        if (!state) return [];
        const tasks = state.windows.map(w => w.customTask || 'خدمات عامة');
        const uniqueTasks = Array.from(new Set(tasks));
        
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
            }
        } catch (error) {
            console.error("Add Customer Error:", error);
            alert("حدث خطأ أثناء إصدار التذكرة.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!state) return <div className="text-white text-center mt-20 font-bold">جاري تحميل النظام...</div>;

    const { printerConfig } = state;

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
            {/* إعدادات الطباعة المحسنة - الاستراتيجية المضمونة */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { 
                        margin: 0; 
                        size: ${printerConfig.paperWidth === 'A4' ? 'A4' : printerConfig.paperWidth + ' auto'}; 
                    }
                    
                    body { 
                        visibility: hidden !important; 
                        background: white !important; 
                    }
                    
                    #ticket-print-area {
                        visibility: visible !important;
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 10mm 5mm !important;
                        background: white !important;
                        color: black !important;
                        text-align: center !important;
                        box-sizing: border-box !important;
                    }
                    
                    #ticket-print-area * { 
                        visibility: visible !important; 
                        color: black !important;
                    }

                    .p-head { font-size: ${printerConfig.headerFontSize}px !important; font-weight: bold; margin-bottom: 5px; }
                    .p-num { 
                        font-size: ${printerConfig.numberFontSize}px !important; 
                        font-weight: 900; 
                        margin: 10px 0; 
                        border-top: 2px solid black !important; 
                        border-bottom: 2px solid black !important; 
                        padding: 10px 0;
                        line-height: 1;
                        font-family: monospace;
                    }
                    .p-foot { font-size: ${printerConfig.detailsFontSize}px !important; margin-top: 10px; line-height: 1.4; }
                }

                /* إخفاء عن الشاشة العادية */
                #ticket-print-area {
                    display: none;
                }
            ` }} />

            <div id="ticket-print-area">
                {lastTicket && (
                    <>
                        <div className="p-head">نظام الطابور الذكي</div>
                        <div className="p-foot" style={{fontWeight: 'bold', fontSize: '1.2em'}}>{lastTicket.serviceName}</div>
                        <div className="p-num">{lastTicket.ticketNumber}</div>
                        <div className="p-foot">{printerConfig.footerText}</div>
                        {printerConfig.showDate && (
                            <div className="p-foot" style={{borderTop: '1px dashed black', marginTop: '15px', paddingTop: '10px', fontSize: '0.9em'}}>
                                {new Date(lastTicket.requestTime).toLocaleTimeString('ar-EG')} - {new Date(lastTicket.requestTime).toLocaleDateString('ar-EG')}
                            </div>
                        )}
                    </>
                )}
            </div>

            {!lastTicket ? (
                <>
                    <h1 className="text-6xl font-black text-white mb-6 tracking-tighter animate-in fade-in slide-in-from-top-4 duration-1000">مرحباً بك</h1>
                    <p className="text-2xl text-slate-400 mb-12">يرجى اختيار الخدمة للحصول على رقم دورك</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full max-w-6xl px-4">
                        {dynamicServices.map(service => (
                            <ServiceOption 
                                key={service.name} 
                                title={service.name} 
                                icon={service.icon} 
                                onClick={() => handleTakeNumber(service.name)} 
                                disabled={isLoading}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <div className="bg-slate-800 p-12 rounded-[3.5rem] shadow-2xl border-2 border-sky-500/50 max-w-lg w-full transform animate-in zoom-in duration-300">
                    <div className="mb-8 flex justify-center">
                        <div className="bg-green-500/20 text-green-400 p-6 rounded-full ring-8 ring-green-500/10 animate-pulse">
                            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                    </div>
                    <p className="text-xl text-slate-400 mb-2 font-medium">تم إصدار رقمك بنجاح</p>
                    <h2 className="text-[10rem] font-mono font-black text-yellow-400 leading-none my-6 tracking-tighter drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]">
                        {lastTicket.ticketNumber}
                    </h2>
                    
                    <div className="bg-sky-500/10 py-6 rounded-3xl border border-sky-500/20 mb-10">
                         <div className="flex items-center justify-center gap-4 text-sky-400 mb-2">
                             {printerConfig.autoPrint ? (
                                 <>
                                    <div className="w-4 h-4 bg-sky-500 rounded-full animate-ping"></div>
                                    <p className="text-2xl font-black">جاري الطباعة...</p>
                                 </>
                             ) : (
                                 <p className="text-2xl font-black">اضغط لطباعة التذكرة</p>
                             )}
                         </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Button variant="primary" className="w-full py-5 !rounded-2xl text-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all" onClick={() => window.print()}>
                            {printerConfig.autoPrint ? 'إعادة الطباعة' : 'طباعة التذكرة'}
                        </Button>
                        <Button variant="secondary" className="w-full py-5 !rounded-2xl text-xl font-bold opacity-60 hover:opacity-100" onClick={() => setLastTicket(null)}>
                            العودة للرئيسية
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KioskView;
