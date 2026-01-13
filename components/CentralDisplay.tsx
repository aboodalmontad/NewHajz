
import React from 'react';
import { useQueueSystem } from '../context/QueueContext';

const CentralDisplay: React.FC = () => {
    const { state } = useQueueSystem();

    if (!state) return null;

    const { windows, customers } = state;

    const activeWindows = windows.filter(w => w.currentCustomerId);
    const servingCustomers = activeWindows.map(w => {
        const customer = customers.find(c => c.id === w.currentCustomerId);
        return {
            windowName: w.name,
            ticketNumber: customer?.ticketNumber || '---',
            serviceName: customer?.serviceName || ''
        };
    }).sort((a,b) => a.windowName.localeCompare(b.windowName));

    return (
        <div className="bg-slate-900 min-h-[85vh] flex flex-col items-center justify-start text-white p-4">
            <div className="text-center mt-8 mb-16">
                <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-4">يتم خدمة الآن</h1>
                <div className="h-1.5 w-32 bg-sky-500 mx-auto rounded-full"></div>
            </div>

            <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 px-4">
                {servingCustomers.length > 0 ? (
                    servingCustomers.map((item, index) => (
                        <div key={index} className="bg-slate-800 rounded-[2.5rem] shadow-2xl p-10 transform transition-all duration-500 hover:scale-105 border border-slate-700/50 flex flex-col items-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4">
                                <span className="bg-sky-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">{item.serviceName}</span>
                            </div>
                            <p className="text-3xl md:text-4xl text-slate-400 font-bold mb-6 group-hover:text-sky-400 transition-colors">{item.windowName}</p>
                            <div className="bg-slate-900 w-full rounded-3xl py-12 flex items-center justify-center border border-slate-700">
                                <p className="text-7xl md:text-9xl text-yellow-400 font-mono font-black tracking-[0.2em] animate-pulse drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">{item.ticketNumber}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center p-24 bg-slate-800/50 rounded-[3rem] border border-slate-700 border-dashed">
                        <p className="text-4xl text-slate-500 font-bold">لا يوجد أرقام مستدعاة حالياً.</p>
                        <p className="text-lg text-slate-600 mt-4 italic">يرجى الانتظار في صالة الاستراحة حتى يظهر رقمك هنا.</p>
                    </div>
                )}
            </div>

            <div className="mt-20 w-full max-w-4xl bg-slate-800/30 p-6 rounded-2xl border border-slate-700 flex justify-between items-center text-slate-500 text-sm">
                <div className="flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full ml-3"></span>
                    <span>النظام يعمل محلياً</span>
                </div>
                <div>{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        </div>
    );
};

export default CentralDisplay;
