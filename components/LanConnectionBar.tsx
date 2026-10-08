import React from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Wifi, WifiOff, RefreshCw, Send, QrCode, Volume2, VolumeX, Laptop, Smartphone, Tablet } from 'lucide-react';

interface LanConnectionBarProps {
  onOpenModal: (tab?: 'confirm' | 'pair' | 'diagnostics' | 'identity') => void;
}

export const LanConnectionBar: React.FC<LanConnectionBarProps> = ({ onOpenModal }) => {
  const {
    lanStatus,
    currentDevice,
    connectedDevices,
    confirmConnectionWithDevice,
    soundEnabled,
    setSoundEnabled
  } = useQueueSystem();

  const [isPinging, setIsPinging] = React.useState(false);
  const [lastPingFeedback, setLastPingFeedback] = React.useState<string | null>(null);

  const handleQuickPing = async () => {
    setIsPinging(true);
    setLastPingFeedback('جاري إرسال إشارة التأكيد...');
    try {
      const result = await confirmConnectionWithDevice();
      if (result.status === 'success') {
        setLastPingFeedback(`✅ تم التأكيد (${result.latencyMs}ms)`);
      } else {
        setLastPingFeedback('⚠️ لم يتم استلام رد');
      }
    } catch {
      setLastPingFeedback('خطأ في الإرسال');
    } finally {
      setIsPinging(false);
      setTimeout(() => setLastPingFeedback(null), 4000);
    }
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'mobile') return <Smartphone className="w-3.5 h-3.5" />;
    if (platform === 'tablet') return <Tablet className="w-3.5 h-3.5" />;
    return <Laptop className="w-3.5 h-3.5" />;
  };

  const isOnline = lanStatus === 'connected';

  return (
    <div className="bg-slate-900 border-b border-slate-700 text-slate-200 text-xs px-3 sm:px-4 py-2">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left Side: Status & Device Info */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-4">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            {isOnline ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-emerald-300">متصل بالشبكة المحلية LAN</span>
              </>
            ) : lanStatus === 'connecting' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-300">جاري الاتصال بالشبكة...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-300">غير متصل بالشبكة</span>
              </>
            )}
          </div>

          {/* Connected Devices Count */}
          <button
            onClick={() => onOpenModal('confirm')}
            className="flex items-center gap-1.5 bg-sky-950/60 hover:bg-sky-900/80 text-sky-200 border border-sky-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            title="انقر لعرض قائمة الأجهزة وتأكيد الاتصال بها"
          >
            <span className="font-bold text-sky-300">{connectedDevices.length}</span>
            <span>{connectedDevices.length === 1 ? 'جهاز نشط' : 'أجهزة متصلة'}</span>
          </button>

          {/* Current Device Identity Tag */}
          <button
            onClick={() => onOpenModal('identity')}
            className="hidden md:flex items-center gap-1 bg-slate-800 hover:bg-slate-750 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
            title="انقر لتعديل اسم هذا الجهاز ودوره"
          >
            {getPlatformIcon(currentDevice.platform)}
            <span className="text-slate-400">جهازي:</span>
            <span className="font-medium text-white truncate max-w-[130px]">{currentDevice.name}</span>
          </button>

          {/* Realtime Latency */}
          {isOnline && (
            <div className="hidden lg:flex items-center gap-1 text-slate-400">
              <span>زمن الاستجابة:</span>
              <span className={`font-mono font-semibold ${
                (currentDevice.latencyMs || 0) < 30 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {currentDevice.latencyMs ? `${currentDevice.latencyMs}ms` : '<10ms'}
              </span>
            </div>
          )}

          {/* Instant feedback badge */}
          {lastPingFeedback && (
            <span className="bg-emerald-900/80 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-600 animate-fade-in font-medium">
              {lastPingFeedback}
            </span>
          )}
        </div>

        {/* Right Side: Fast Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Ping Confirmation Button */}
          <button
            onClick={handleQuickPing}
            disabled={isPinging}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2.5 py-1 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            title="إرسال إشارة تأكيد فورية للتحقق من اتصال جميع الأجهزة"
          >
            <Send className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'جاري التأكيد...' : 'تأكيد الاتصال اللحظي'}</span>
          </button>

          {/* Open Connection & Pairing Hub */}
          <button
            onClick={() => onOpenModal('pair')}
            className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white font-medium px-2.5 py-1 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
            title="إظهار باركود QR أو رمز الربط لإضافة هاتف أو شاشة أخرى"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ربط جهاز جديد</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={soundEnabled ? 'كتم رنين التنبيهات' : 'تفعيل رنين التنبيهات'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
