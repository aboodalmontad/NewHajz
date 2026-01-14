
import React, { useState, useEffect } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Button } from './shared/Button';
import { Card } from './shared/Card';
import { PrinterConfig } from '../types';

const PrinterSettings: React.FC = () => {
    const { state, updatePrinterConfig } = useQueueSystem();
    const [config, setConfig] = useState<PrinterConfig>(state?.printerConfig || {
        paperWidth: '80mm',
        headerFontSize: 20,
        numberFontSize: 70,
        detailsFontSize: 14,
        footerText: 'شكراً لزيارتكم',
        showDate: true,
        autoPrint: true
    });

    const handleSave = async () => {
        await updatePrinterConfig(config);
        alert("تم حفظ إعدادات الطباعة بنجاح!");
    };

    const handleTestPrint = () => {
        window.print();
    };

    if (!state) return null;

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tight">استوديو الطباعة</h2>
                    <p className="text-slate-400 mt-2 text-lg italic">تحكم كامل في مظهر التذكرة وأبعاد الورق الحراري</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="secondary" onClick={handleTestPrint}>تجربة طباعة</Button>
                    <Button onClick={handleSave}>حفظ الإعدادات</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* لوحة التحكم */}
                <div className="space-y-8">
                    <Card className="bg-slate-800 p-8 border border-slate-700 space-y-6">
                        <h3 className="text-xl font-bold text-sky-400 flex items-center gap-2">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                             أبعاد الورق والخطوط
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm text-slate-400 block mb-2 font-medium">عرض الورق</label>
                                <select 
                                    value={config.paperWidth}
                                    onChange={e => setConfig({...config, paperWidth: e.target.value as any})}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500"
                                >
                                    <option value="58mm">58mm (صغير)</option>
                                    <option value="80mm">80mm (قياسي)</option>
                                    <option value="A4">A4 (مكتبي)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 block mb-2 font-medium">الطباعة التلقائية</label>
                                <select 
                                    value={config.autoPrint ? 'true' : 'false'}
                                    onChange={e => setConfig({...config, autoPrint: e.target.value === 'true'})}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500"
                                >
                                    <option value="true">نعم (تلقائي)</option>
                                    <option value="false">لا (يدوي)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-6 pt-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm text-slate-400 font-medium">حجم خط العنوان</label>
                                    <span className="text-sky-500 font-mono text-xs">{config.headerFontSize}px</span>
                                </div>
                                <input type="range" min="12" max="40" value={config.headerFontSize} onChange={e => setConfig({...config, headerFontSize: parseInt(e.target.value)})} className="w-full accent-sky-500"/>
                            </div>
                            
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm text-slate-400 font-medium">حجم خط الرقم الكبير</label>
                                    <span className="text-sky-500 font-mono text-xs">{config.numberFontSize}px</span>
                                </div>
                                <input type="range" min="40" max="120" value={config.numberFontSize} onChange={e => setConfig({...config, numberFontSize: parseInt(e.target.value)})} className="w-full accent-sky-500"/>
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm text-slate-400 font-medium">حجم خط التفاصيل</label>
                                    <span className="text-sky-500 font-mono text-xs">{config.detailsFontSize}px</span>
                                </div>
                                <input type="range" min="8" max="24" value={config.detailsFontSize} onChange={e => setConfig({...config, detailsFontSize: parseInt(e.target.value)})} className="w-full accent-sky-500"/>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-slate-800 p-8 border border-slate-700 space-y-6">
                        <h3 className="text-xl font-bold text-sky-400 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            نص التذكرة والرسائل
                        </h3>
                        <div>
                            <label className="text-sm text-slate-400 block mb-2 font-medium">رسالة تذييل التذكرة</label>
                            <textarea 
                                value={config.footerText}
                                onChange={e => setConfig({...config, footerText: e.target.value})}
                                placeholder="مثال: يرجى الاحتفاظ بالتذكرة حتى استدعاء رقمك..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white min-h-[100px] outline-none focus:ring-1 focus:ring-sky-500"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={config.showDate} onChange={e => setConfig({...config, showDate: e.target.checked})} className="w-5 h-5 rounded accent-sky-500 cursor-pointer"/>
                            <label className="text-slate-300 font-medium">إظهار التاريخ والوقت في التذكرة</label>
                        </div>
                    </Card>
                </div>

                {/* معاينة التذكرة */}
                <div className="sticky top-10">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">المعاينة الحية (Live Preview)</h3>
                    <div className="flex justify-center">
                        <div 
                            style={{ width: config.paperWidth === 'A4' ? '210mm' : config.paperWidth }}
                            className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 text-black text-center font-sans transition-all duration-300 transform scale-90 origin-top overflow-hidden min-h-[400px]"
                        >
                            <div className="border-b-2 border-black pb-4 mb-4">
                                <h1 style={{ fontSize: `${config.headerFontSize}px` }} className="font-bold">نظام الطابور الذكي</h1>
                                <p style={{ fontSize: `${config.detailsFontSize}px` }} className="opacity-70">مركز الخدمات الموحد</p>
                            </div>
                            
                            <div className="py-6 border-b-2 border-black border-dashed">
                                <p style={{ fontSize: `${config.detailsFontSize + 2}px` }} className="font-bold">خدمات فتح الحساب</p>
                                <div 
                                    style={{ fontSize: `${config.numberFontSize}px` }} 
                                    className="font-black my-4 leading-none"
                                >
                                    ر-101
                                </div>
                                <p style={{ fontSize: `${config.detailsFontSize}px` }}>يرجى الانتظار في صالة الاستقبال</p>
                            </div>

                            <div className="mt-6 space-y-2">
                                {config.showDate && (
                                    <p style={{ fontSize: `${config.detailsFontSize - 2}px` }}>
                                        {new Date().toLocaleTimeString('ar-EG')} | {new Date().toLocaleDateString('ar-EG')}
                                    </p>
                                )}
                                <p style={{ fontSize: `${config.detailsFontSize}px`, whiteSpace: 'pre-wrap' }} className="font-medium italic">
                                    {config.footerText}
                                </p>
                            </div>

                            <div className="mt-8 opacity-20 flex justify-center">
                                <div className="h-8 w-full border-t border-b border-black flex items-center justify-between px-2">
                                    {[...Array(15)].map((_, i) => <div key={i} className="w-1 h-full bg-black"></div>)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* CSS إضافي للمتصفح عند الطلب */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { margin: 0; size: ${config.paperWidth} auto; }
                    body * { visibility: hidden; }
                    #ticket-print-area, #ticket-print-area * { visibility: visible; }
                    #ticket-print-area {
                        position: absolute; left: 0; top: 0; width: 100%;
                        display: block !important; padding: 10mm 5mm; text-align: center;
                    }
                    .p-head { font-size: ${config.headerFontSize}px !important; font-weight: bold; }
                    .p-num { font-size: ${config.numberFontSize}px !important; font-weight: 900; border-top: 2px solid #000; border-bottom: 2px solid #000; margin: 10px 0; padding: 10px 0; }
                    .p-foot { font-size: ${config.detailsFontSize}px !important; }
                }
            ` }} />
        </div>
    );
};

export default PrinterSettings;
