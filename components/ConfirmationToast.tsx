import React from 'react';
import { ConfirmationAlert } from '../utils/lanClient';
import { Wifi, CheckCircle, Bell, X } from 'lucide-react';

interface ConfirmationToastProps {
  alert: ConfirmationAlert | null;
  onDismiss: () => void;
}

export const ConfirmationToast: React.FC<ConfirmationToastProps> = ({ alert, onDismiss }) => {
  if (!alert) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-400 flex items-start space-x-3 space-x-reverse">
        <div className="bg-white/20 p-2.5 rounded-xl shrink-0">
          <Bell className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-800/80 px-2 py-0.5 rounded-full text-emerald-200">
              إشارة تأكيد اتصال LAN واردة
            </span>
            <button
              onClick={onDismiss}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h4 className="text-base font-bold mt-1 text-white flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-300 inline" />
            تم تأكيد الاتصال بنجاح من: {alert.fromName}
          </h4>
          <p className="text-xs text-emerald-100 mt-1">
            الجهاز متصل ويعمل بكفاءة على نفس الشبكة المحلية. تم الرد وإرسال إشعار التأكيد المتبادل.
          </p>
          <div className="mt-2 text-[11px] text-emerald-200 flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5" />
            <span>وقت الإشارة: {new Date(alert.timestamp).toLocaleTimeString('ar-EG')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
