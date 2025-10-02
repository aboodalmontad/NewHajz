
import React from 'react';
import { useQueueSystem } from '../context/QueueContext';

const CentralDisplay: React.FC = () => {
    const { windows, customers } = useQueueSystem();

    const activeWindows = windows.filter(w => w.currentCustomerId);
    const servingCustomers = activeWindows.map(w => {
        const customer = customers.find(c => c.id === w.currentCustomerId);
        return {
            windowName: w.name,
            ticketNumber: customer?.ticketNumber || '---'
        };
    }).sort((a,b) => a.windowName.localeCompare(b.windowName));

    return (
        <div className="bg-slate-900 min-h-[80vh] flex flex-col items-center justify-center text-white p-4">
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-sky-400 tracking-wider">يتم خدمة الآن</h1>
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {servingCustomers.length > 0 ? (
                    servingCustomers.map((item, index) => (
                        <div key={index} className="bg-slate-800 rounded-xl shadow-2xl p-8 transform transition-all duration-300 hover:scale-105">
                            <p className="text-3xl md:text-4xl text-slate-400 font-semibold text-center mb-4">{item.windowName}</p>
                            <p className="text-6xl md:text-8xl text-yellow-400 font-mono font-extrabold text-center tracking-widest animate-pulse">{item.ticketNumber}</p>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center text-3xl text-slate-500 p-16">
                        لا يتم خدمة أي عملاء حالياً.
                    </div>
                )}
            </div>
        </div>
    );
};

export default CentralDisplay;