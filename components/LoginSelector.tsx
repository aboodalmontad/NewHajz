import React, { useState } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Button } from './shared/Button';
import { Card } from './shared/Card';
import { Employee } from '../types';
import { Wifi, Send, QrCode, Monitor, Tablet, Users, Shield, Sparkles, CheckCircle2 } from 'lucide-react';

interface LoginSelectorProps {
  onLogin: (view: string, employee?: Employee) => void;
  defaultToEmployee?: boolean;
  onOpenLanModal?: (tab?: 'confirm' | 'pair' | 'diagnostics' | 'identity') => void;
}

const LoginSelector: React.FC<LoginSelectorProps> = ({
  onLogin,
  defaultToEmployee = false,
  onOpenLanModal
}) => {
  const [loginMode, setLoginMode] = useState<'none' | 'employee' | 'admin'>(
    defaultToEmployee ? 'employee' : 'none'
  );

  const {
    authenticateEmployee,
    authenticateAdmin,
    connectedDevices,
    lanStatus,
    currentDevice,
    confirmConnectionWithDevice
  } = useQueueSystem();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pingSuccess, setPingSuccess] = useState<string | null>(null);

  const handleTestConfirmation = async () => {
    try {
      const result = await confirmConnectionWithDevice();
      if (result.status === 'success') {
        setPingSuccess(`تم تأكيد الاتصال بكافة الأجهزة بنجاح (${result.latencyMs}ms)!`);
      } else {
        setPingSuccess('تم إرسال إشارة التأكيد عبر الشبكة.');
      }
      setTimeout(() => setPingSuccess(null), 4000);
    } catch {
      setPingSuccess('تعذر إرسال الإشارة');
    }
  };

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const emp = await authenticateEmployee(username, password);
    if (emp) {
      onLogin('employee', emp);
    } else {
      setErrorMsg('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const isValid = await authenticateAdmin(password);
    if (isValid) {
      onLogin('admin');
    } else {
      setErrorMsg('كلمة مرور الإدارة غير صحيحة');
    }
  };

  return (
    <div className="max-w-6xl mx-auto text-center mt-4 sm:mt-8 pb-16 px-4">
      
      {/* Hero Title */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          نظام الربط المحلي وإدارة الطابور الذكي
        </h1>
        <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-2xl mx-auto">
          ربط وتزامن الأجهزة (شاشات، كشك تذاكر، شبابيك الموظفين) بكل سهولة عبر الشبكة المحلية (LAN) مع أداة فحص وتأكيد الاتصال اللحظي.
        </p>

        {/* LAN Quick Status Banner */}
        <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-3 bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${lanStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${lanStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {lanStatus === 'connected' ? 'الشبكة المحلية جاهزة ومتصلة' : 'جاري فحص الشبكة المحلية'}
            </span>
          </div>

          <span className="text-slate-600">|</span>

          <span className="text-xs text-sky-400 font-bold flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5" />
            <span>{connectedDevices.length} أجهزة متصلة بالشبكة</span>
          </span>

          <span className="text-slate-600">|</span>

          <button
            onClick={() => onOpenLanModal?.('confirm')}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span>تأكيد وفحص الاتصال</span>
          </button>

          <button
            onClick={() => onOpenLanModal?.('pair')}
            className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-medium px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <QrCode className="w-3 h-3" />
            <span>ربط جهاز جديد (QR)</span>
          </button>
        </div>

        {pingSuccess && (
          <div className="mt-3 text-xs bg-emerald-950/80 border border-emerald-600 text-emerald-300 py-1.5 px-4 rounded-xl inline-flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{pingSuccess}</span>
          </div>
        )}
      </div>

      {loginMode === 'none' ? (
        <div className="space-y-6">
          {/* Main Role Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Kiosk Card */}
            <Card
              className="bg-slate-800/90 hover:bg-slate-800 border-2 border-slate-700/80 hover:border-sky-500 p-8 cursor-pointer transition-all transform hover:-translate-y-1 shadow-xl group text-right"
              onClick={() => onLogin('kiosk')}
            >
              <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl w-fit mb-4 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                <Tablet className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">كشك العملاء (قطع التذاكر)</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                واجهة شاشة اللمس المخصصة لدخول المراجعين وسحب تذاكر الدور حسب نوع الخدمة مع طباعة التذكرة.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-sky-400 font-semibold">
                <span>فتح وضع الكشك</span>
                <span>←</span>
              </div>
            </Card>

            {/* Central Display Card */}
            <Card
              className="bg-slate-800/90 hover:bg-slate-800 border-2 border-slate-700/80 hover:border-purple-500 p-8 cursor-pointer transition-all transform hover:-translate-y-1 shadow-xl group text-right"
              onClick={() => onLogin('display')}
            >
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <Monitor className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">شاشة العرض المركزية</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                شاشة الصالة الكبيرة لعرض الأرقام المستدعاة والشبابيك مع تنبيه صوتي فوري عند نداء أي عميل.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-purple-400 font-semibold">
                <span>فتح شاشة العرض</span>
                <span>←</span>
              </div>
            </Card>

            {/* LAN Devices & Confirmation Hub Card */}
            <Card
              className="bg-gradient-to-br from-slate-850 to-slate-800 hover:from-slate-800 hover:to-slate-750 border-2 border-emerald-500/40 hover:border-emerald-400 p-8 cursor-pointer transition-all transform hover:-translate-y-1 shadow-xl group text-right"
              onClick={() => onOpenLanModal?.('confirm')}
            >
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Wifi className="w-8 h-8" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold text-white">إدارة وتأكيد اتصال الأجهزة</h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  {connectedDevices.length} متصل
                </span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                إرسال إشارات تأكيد لحظية للأجهزة، مسح باركود QR لربط الهواتف بالشبكة، وفحص جودة الاتصال الداخلي.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>فتح مركز تأكيد الاتصال والباركود</span>
                <span>←</span>
              </div>
            </Card>

            {/* Employee Access */}
            <Card
              className="bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500 p-6 cursor-pointer transition-all group text-right"
              onClick={() => setLoginMode('employee')}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-lg group-hover:bg-teal-500 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">دخول الموظفين والشبابيك</h3>
                  <p className="text-slate-400 text-xs">واجهة الموظف لمناداة العملاء وإنهاء الخدمات</p>
                </div>
              </div>
            </Card>

            {/* Admin Dashboard */}
            <Card
              className="bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500 p-6 cursor-pointer transition-all group text-right"
              onClick={() => setLoginMode('admin')}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">إدارة النظام والتقارير</h3>
                  <p className="text-slate-400 text-xs">إعداد الشبابيك، الموظفين، الطابعات، والإحصائيات</p>
                </div>
              </div>
            </Card>

            {/* Instant Ping All Button */}
            <Card
              className="bg-slate-850 hover:bg-slate-800 border border-dashed border-emerald-500/50 p-6 cursor-pointer transition-all text-right"
              onClick={handleTestConfirmation}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-300">اختبار سريع: تأكيد الاتصال الآن</h3>
                  <p className="text-slate-400 text-xs">إرسال نبضة لجميع الأجهزة للتأكد من رنينها</p>
                </div>
              </div>
            </Card>

          </div>
        </div>
      ) : loginMode === 'employee' ? (
        /* Employee Login Form */
        <div className="max-w-md mx-auto bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl text-right">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">دخول موظف الخدمة</h2>
            <button
              onClick={() => setLoginMode('none')}
              className="text-xs text-slate-400 hover:text-white"
            >
              إلغاء والعودة
            </button>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs mb-4">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleEmployeeLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="مثال: ahmad أو fatima"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-teal-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="كلمة المرور (الافتراضية: 123)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-teal-500"
                required
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setLoginMode('none')} className="w-1/3">
                رجوع
              </Button>
              <Button type="submit" className="w-2/3 bg-teal-600 hover:bg-teal-500">
                تسجيل الدخول
              </Button>
            </div>
          </form>
        </div>
      ) : (
        /* Admin Login Form */
        <div className="max-w-md mx-auto bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl text-right">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">دخول إدارة النظام</h2>
            <button
              onClick={() => setLoginMode('none')}
              className="text-xs text-slate-400 hover:text-white"
            >
              إلغاء والعودة
            </button>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs mb-4">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">كلمة مرور المسؤول</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="كلمة المرور (الافتراضية: admin123)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setLoginMode('none')} className="w-1/3">
                رجوع
              </Button>
              <Button type="submit" className="w-2/3 bg-amber-600 hover:bg-amber-500">
                دخول الإدارة
              </Button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default LoginSelector;
