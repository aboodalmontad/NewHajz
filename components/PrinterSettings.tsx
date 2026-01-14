
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
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

    // تذكرة المعاينة للطباعة الفعلية (Portal)
    const PrintPreviewPortal = () => {
        return ReactDOM.createPortal(
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
            </div>,
            document.body
        );
    };

    return (
        <div className="max-w-full mx-auto py-4 px-2 animate-in fade-in duration-500">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { 
                        margin: 0; 
                        size: ${config.paperWidth === 'A4' ? 'A4' : config.paperWidth + ' auto'}; 
                    }
                    
                    #root { display: none !important; }
                    body { background: white !important; margin: 0 !important; padding: 0 !important; visibility: hidden !important; }

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
                        background: white !important;
                        color: #000000 !important;
                        text-align: center !important;
                    }

                    #ticket-print-area * {
                        visibility: visible !important;
                        color: #000000 !important;
                        background: transparent !important;
                        font-family: Arial, sans-serif !important;
                    }

                    .p-head { font-size: ${config.headerFontSize}px !important; font-weight: bold; margin-bottom: 5px; }
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
                    .p-foot { font-size: ${config.detailsFontSize}px !important; margin-top: 10px; line-height: 1.4; white-space: pre-wrap; }
                    .p-date { font-size: ${config.detailsFontSize - 2}px !important; margin-top: 15px; border-top: 1px dashed #000000 !important; padding-top: 10px; }
                }

                #ticket-print-area { display: none; }
            ` }} />

            <PrintPreviewPortal />

            <div className="flex flex-col gap-6">
                <div className="text-right">
                    <h2 className="text-2xl font-black text-white tracking-tight">إعدادات التذكرة</h2>
                    <p className="text-slate-400 text-sm italic">اضبط الحجم والنصوص كما تريد</p>
                </div>

                <div className="space-y-6">
                    <Card className="bg-slate-800 p-6 border border-slate-700 space-y-4 text-right">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">عرض الورق</label>
                                <select 
                                    value={config.paperWidth}
                                    onChange={e => setConfig({...config, paperWidth: e.target.value as any})}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none"
                                >
                                    <option value="58mm">58mm</option>
                                    <option value="80mm">80mm</option>
                                    <option value="A4">A4</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">طباعة تلقائية</label>
                                <select 
                                    value={config.autoPrint ? 'true' : 'false'}
                                    onChange={e => setConfig({...config, autoPrint: e.target.value === 'true'})}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none"
                                >
                                    <option value="true">تفعيل</option>
                                    <option value="false">إيقاف</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sky-500 font-mono text-[10px]">{config.headerFontSize}px</span>
                                    <label className="text-[10px] text-slate-400">خط العنوان</label>
                                </div>
                                <input type="range" min="12" max="40" value={config.headerFontSize} onChange={e => setConfig({...config, headerFontSize: parseInt(e.target.value)})} className="w-full accent-sky-500"/>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sky-500 font-mono text-[10px]">{config.numberFontSize}px</span>
                                    <label className="text-[10px] text-slate-400">خط الرقم</label>
                                </div>
                                <input type="range" min="40" max="120" value={config.numberFontSize} onChange={e => setConfig({...config, numberFontSize: parseInt(e.target.value)})} className="w-full accent-sky-500"/>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 block mb-1">نص التذييل</label>
                            <textarea 
                                value={config.footerText}
                                onChange={e => setConfig({...config, footerText: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none text-right"
                                rows={2}
                                dir="rtl"
                            />
                        </div>
                    </Card>

                    <div className="flex gap-2">
                        <Button variant="secondary" className="flex-1" onClick={handleTestPrint}>تجربة</Button>
                        <Button className="flex-1" onClick={handleSave}>حفظ</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrinterSettings;
