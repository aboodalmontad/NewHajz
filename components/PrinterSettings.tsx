
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
            {/* استراتيجية الطباعة الموثوقة - تحويل كل شيء للأسود الصريح */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { 
                        margin: 0; 
                        size: ${config.paperWidth === 'A4' ? 'A4' : config.paperWidth + ' auto'}; 
                    }
                    
                    /* تصفير خلفية الصفحة وفرض الألوان */
                    html, body {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* إخفاء كل شيء ما عدا منطقة التذكرة */
                    #root > *:not(#ticket-print-area) {
                        display: none !important;
                    }

                    header, nav, .no-print {
                        display: none !important;
                    }
                    
                    /* منطقة التذكرة - التموضع واللون */
                    #ticket-print-area {
                        display: block !important;
                        visibility: visible !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: ${config.paperWidth === 'A4' ? '100%' : config.paperWidth} !important;
                        margin: 0 auto !important;
                        padding: 10mm 5mm !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        text-align: center !important;
                        box-sizing: border-box !important;
                        font-family: Arial, sans-serif !important;
                    }

                    /* إجبار كافة العناصر الداخلية على اللون الأسود */
                    #ticket-print-area div, 
                    #ticket-print-area p, 
                    #ticket-print-area span,
                    #ticket-print-area h1 {
                        color: #000000 !important;
                        background: transparent !important;
                        border-color: #000000 !important;
                        opacity: 1 !important;
                    }

                    .p-head { font-size: ${config.headerFontSize}px !important; font-weight: bold; margin-bottom: 8px; line-height: 1.2; }
                    .p-num { 
                        font-size: ${config.numberFontSize}px !important; 
                        font-weight: 900 !important; 
                        margin: 15px 0 !important; 
                        border-top: 3px solid #000000 !important; 
                        border-bottom: 3px solid #000000 !important; 
                        padding: 15px 0 !important;
                        line-height: 1 !important;
                    }
                    .p-serv { font-size: ${config.detailsFontSize + 4}px !important; font-weight: bold; }
                    .p-foot { font-size: ${config.detailsFontSize}px !important; margin-top: 10px; line-height: 1.5; }
                    .p-date { font-size: ${config.detailsFontSize - 2}px !important; margin-top: 15px; border-top: 1px dashed #000000 !important; padding-top: 10px; }
                }

                #ticket-print-area {
                    display: none;
                }
            ` }} />

            {/* منطقة التذكرة الفعلية التي تظهر في الطباعة فقط */}
            <div id="ticket-print-area">
                <div className="p-head">نظام الطابور الذكي</div>
                <div className="p-serv">تذكرة تجريبية</div>
                <div className="p-num">A-000</div>
                <div className="p-foot">{config.footerText}</div>
                {config.showDate && (
                    <div className="p-date">
                        {new Date().toLocaleTimeString('ar-EG')} - {new Date().toLocaleDateString('ar-EG')}
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tight text-right">استوديو الطباعة</h2>
                    <p className="text-slate-400 mt-2 text-lg italic text-right">تحكم كامل في مظهر التذكرة وأبعاد الورق</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="secondary" onClick={handleTestPrint}>تجربة طباعة</Button>
                    <Button onClick={handleSave}>حفظ الإعدادات</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                    <Card className="bg-slate-800 p-8 border border-slate-700 space-y-6">
                        <h3 className="text-xl font-bold text-sky-400 text-right">أبعاد الورق والخطوط</h3>
                        
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
                        <h3 className="text-xl font-bold text-sky-400 text-right">نص التذكرة والرسائل</h3>
                        <div>
                            <label className="text-sm text-slate-400 block mb-2 font-medium">رسالة تذييل التذكرة</label>
                            <textarea 
                                value={config.footerText}
                                onChange={e => setConfig({...config, footerText: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white min-h-[100px] outline-none text-right"
                                dir="rtl"
                            />
                        </div>
                        <div className="flex items-center gap-3 justify-end">
                            <label className="text-slate-300 font-medium">إظهار التاريخ والوقت في التذكرة</label>
                            <input type="checkbox" checked={config.showDate} onChange={e => setConfig({...config, showDate: e.target.checked})} className="w-5 h-5 rounded accent-sky-500"/>
                        </div>
                    </Card>
                </div>

                <div className="sticky top-10">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">المعاينة على الشاشة</h3>
                    <div className="flex justify-center">
                        <div 
                            style={{ width: config.paperWidth === 'A4' ? '210mm' : config.paperWidth }}
                            className="bg-white p-6 text-black text-center transition-all duration-300 transform scale-90 origin-top shadow-2xl border border-slate-200"
                        >
                            <div className="border-b-2 border-black pb-4 mb-4">
                                <h1 style={{ fontSize: `${config.headerFontSize}px` }} className="font-bold text-black">نظام الطابور الذكي</h1>
                                <p style={{ fontSize: `${config.detailsFontSize}px` }} className="text-black opacity-70">مركز الخدمات الموحد</p>
                            </div>
                            
                            <div className="py-6 border-b-2 border-black border-dashed">
                                <p style={{ fontSize: `${config.detailsFontSize + 2}px` }} className="font-bold text-black text-right pr-2">تذكرة تجريبية</p>
                                <div style={{ fontSize: `${config.numberFontSize}px` }} className="font-black my-4 leading-none font-sans text-black">A-000</div>
                                <p style={{ fontSize: `${config.detailsFontSize}px` }} className="text-black">يرجى الانتظار في صالة الاستقبال</p>
                            </div>

                            <div className="mt-6 space-y-2">
                                {config.showDate && (
                                    <p style={{ fontSize: `${config.detailsFontSize - 2}px` }} className="text-black">
                                        {new Date().toLocaleTimeString('ar-EG')} | {new Date().toLocaleDateString('ar-EG')}
                                    </p>
                                )}
                                <p style={{ fontSize: `${config.detailsFontSize}px` }} className="font-medium italic text-black whitespace-pre-wrap">
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
