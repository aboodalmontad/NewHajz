import React, { useState } from 'react';
import { Button } from './Button';
import { Card } from './Card';

interface DbConnectorProps {
    onConnect: (key: string) => void;
}

const DbConnector: React.FC<DbConnectorProps> = ({ onConnect }) => {
    const [key, setKey] = useState('');

    const handleConnect = () => {
        if (key.trim()) {
            onConnect(key.trim());
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[70vh]">
            <Card className="bg-slate-800 p-8 text-center max-w-md w-full">
                <h2 className="text-3xl font-bold text-sky-400 mb-2">اتصال بقاعدة البيانات</h2>
                <p className="text-slate-400 mb-6">أدخل معرفًا لقاعدة البيانات للاتصال بها أو لإنشاء واحدة جديدة.</p>
                <div className="space-y-4">
                    <input
                        type="text"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                        placeholder="مثال: main_branch"
                        className="w-full text-center bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-sky-500 focus:border-sky-500"
                    />
                    <Button size="lg" className="w-full" onClick={handleConnect} disabled={!key.trim()}>
                        اتصال
                    </Button>
                </div>
                 <p className="text-xs text-slate-500 mt-4">سيتم حفظ البيانات في متصفحك. يمكن لأي شخص يستخدم نفس المعرف على هذا الجهاز الوصول إلى نفس البيانات.</p>
            </Card>
        </div>
    );
};

export default DbConnector;
