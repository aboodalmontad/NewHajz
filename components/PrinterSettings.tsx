
import React, { useState } from 'react';
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
            {/* CSS الطباعة المطور - حل جذري لمشكلة الورقة الفارغة */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    /* إعدادات الصفحة الأساسية */
                    @page { 
                        margin: 0; 
                        size: ${config.paperWidth === 'A4' ? 'A4' : config.paperWidth + ' auto'}; 
                    }
                    
                    /* إخفاء كل شيء بشكل افتراضي باستخدام visibility لضمان بقاء العناصر في الـ DOM */
                    html, body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        visibility: hidden !important;
                    }
                    
                    /* إظهار منطقة الطباعة فقط وبقوة */
                    #ticket-print-area {
                        visibility: visible !important;
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: ${config.paperWidth === 'A4' ? '100%' : config.paperWidth} !important;
                        margin: 0 !important;
                        padding: 8mm 4mm !important;
                        background: white !important;
                        color: black !important;
                        text-align: center !important;
                    }

                    /* ضمان أن جميع النصوص داخل منطقة الطباعة سوداء وظاهرة */
                    #ticket-print-area * {
                        visibility: visible !important;
                        color: black !important;
                        background: transparent !important;
                    }

                    .p-head { font-size: ${config.headerFontSize}px !important; font-weight: bold; margin-bottom: 5px; }
                    .p-num { 
                        font-size: ${config.numberFontSize}px !important; 
                        font-weight: 900; 
                        margin: 10px 0; 
                        border-top: 2px solid black !important; 
                        border-bottom: 2px solid black !important; 
                        padding: 5px 0;
                        line-height: 1;
                    }
                    .p-serv { font-size: ${config.detailsFontSize + 4}px !important; font-weight: bold; }
                    .p-foot { font-size: ${config.detailsFontSize}px !important; margin-top: 10px; line-height: 1.4; }
                    .p-date { font-size: ${config.detailsFontSize - 2}px !important; margin-top: 15px; border-top: 1px dashed black !important; padding-top: 10px; }
                }

                /* إخفاء منطقة الطباعة في الوضع العادي للشاشة */
                #ticket-print-area {
                    display: none;
                }
            ` }} />

            {/* منطقة التذكرة (تظهر في الطباعة فقط) */}
            <div id="ticket-print-area">
                <div className="p-head">نظام الطابور الذكي</div>
                <div className="p-serv">تذكرة تجريبية</div>
                <div className="p-num">ر-000</div>
                <div className="p-foot">{config.footerText}</div>
                {config.showDate && (
                    <div className="p-date">
                        {new Date().toLocaleTimeString('ar-EG')} - {new Date().toLocaleDateString('ar-EG')}
                    </div>
                )}
            </div>

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
                <div className="space-y-8">
                    {/* خيارات التحكم */}
                    <Card className="bg-slate-800 p-8 border border-slate-700 space-y-6">
                        <h3 className="text-xl font-bold text-sky-400 flex items-center gap-2">
                             أبعاد الورق والخطوط
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm text-slate-400 block mb-2 font-medium">عرض الورق</label>
                                <select 
                                    value={config.paperWidth}
                                    onChange={e => setConfig({...config, paperWidth: e.target.value as any})}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none"
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
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none"
                                >
                                    <option value="true">نعم (تلقائي)</option>
                                    <option value="false">لا (يدوي)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-6">
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
                            نص التذكرة والرسائل
                        </h3>
                        <div>
                            <label className="text-sm text-slate-400 block mb-2 font-medium">رسالة تذييل التذكرة</label>
                            <textarea 
                                value={config.footerText}
                                onChange={e => setConfig({...config, footerText: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white min-h-[100px] outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={config.showDate} onChange={e => setConfig({...config, showDate: e.target.checked})} className="w-5 h-5 rounded accent-sky-500"/>
                            <label className="text-slate-300 font-medium">إظهار التاريخ والوقت في التذكرة</label>
                        </div>
                    </Card>
                </div>

                {/* المعاينة المباشرة على الشاشة */}
                <div className="sticky top-10">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">المعاينة على الشاشة</h3>
                    <div className="flex justify-center">
                        <div 
                            style={{ width: config.paperWidth === 'A4' ? '210mm' : config.paperWidth }}
                            className="bg-white p-6 text-black text-center transition-all duration-300 transform scale-90 origin-top shadow-2xl"
                        >
                            <div className="border-b-2 border-black pb-4 mb-4">
                                <h1 style={{ fontSize: `${config.headerFontSize}px` }} className="font-bold">نظام الطابور الذكي</h1>
                                <p style={{ fontSize: `${config.detailsFontSize}px` }} className="opacity-70">مركز الخدمات الموحد</p>
                            </div>
                            
                            <div className="py-6 border-b-2 border-black border-dashed">
                                <p style={{ fontSize: `${config.detailsFontSize + 2}px` }} className="font-bold">تذكرة تجريبية</p>
                                <div style={{ fontSize: `${config.numberFontSize}px` }} className="font-black my-4 leading-none">ر-000</div>
                                <p style={{ fontSize: `${config.detailsFontSize}px` }}>يرجى الانتظار في صالة الاستقبال</p>
                            </div>

                            <div className="mt-6 space-y-2">
                                {config.showDate && (
                                    <p style={{ fontSize: `${config.detailsFontSize - 2}px` }}>
                                        {new Date().toLocaleTimeString('ar-EG')} | {new Date().toLocaleDateString('ar-EG')}
                                    </p>
                                )}
                                <p style={{ fontSize: `${config.detailsFontSize}px` }} className="font-medium italic">
                                    {config.footerText}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrinterSettings;
