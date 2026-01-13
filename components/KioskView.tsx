import React, { useState } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Customer } from '../types';
import { Button } from './shared/Button';

const KioskView: React.FC = () => {
    const { addCustomer } = useQueueSystem();
    const [lastTicket, setLastTicket] = useState<Customer | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleTakeNumber = async () => {
        setIsLoading(true);
        try {
            const newCustomer = await addCustomer();
            if (newCustomer) {
                setLastTicket(newCustomer);
            }
        } catch (error) {
            console.error("Failed to get ticket:", error);
            // Optionally show an error message to the user
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
            {!lastTicket ? (
                <>
                    <h1 className="text-5xl font-extrabold text-white mb-4">أهلاً وسهلاً</h1>
                    <p className="text-xl text-slate-300 mb-8">يرجى سحب رقم للدخول إلى الطابور.</p>
                    <Button size="xl" onClick={handleTakeNumber} disabled={isLoading}>
                        {isLoading ? '...جاري الإصدار' : 'اسحب رقم'}
                    </Button>
                </>
            ) : (
                <div className="bg-slate-800 p-12 rounded-2xl shadow-lg border border-sky-500/30">
                    <p className="text-2xl text-slate-300">رقم بطاقتك هو:</p>
                    <h2 className="text-9xl font-mono font-extrabold text-yellow-400 my-6 tracking-wider">
                        {lastTicket.ticketNumber}
                    </h2>
                    <p className="text-lg text-slate-400">يرجى الانتظار حتى يتم استدعاء رقمك.</p>
                     <Button variant="secondary" className="mt-8" onClick={() => setLastTicket(null)}>
                        الحصول على بطاقة جديدة
                    </Button>
                </div>
            )}
        </div>
    );
};

export default KioskView;
