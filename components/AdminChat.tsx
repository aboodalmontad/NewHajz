import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Window } from '../types';
import { Button } from './shared/Button';
import { Modal } from './shared/Modal';

interface AdminChatProps {
  initialWindowId?: number | null;
}

const QUICK_ADMIN_MESSAGES = [
  'يرجى تسريع وتيرة الخدمة ⏱️',
  'عميل VIP قادم إليك، يرجى الاهتمام ⭐',
  'استراحة قصيرة مسموحة بعد 10 دقائق ☕',
  'هل تواجه أي مشكلة فنية أو تحتاج مساعدة؟ ❓',
  'يرجى تحويل المعاملة التالية للإدارة 📑',
  'عمل ممتاز اليوم، استمروا في هذا الأداء 👍'
];

export const AdminChat: React.FC<AdminChatProps> = ({ initialWindowId }) => {
  const { 
    state, 
    sendChatMessage, 
    broadcastChatMessage, 
    markChatMessagesAsRead, 
    clearChatHistory 
  } = useQueueSystem();

  const [selectedWindowId, setSelectedWindowId] = useState<number | null>(null);
  const [inputText, setInputText] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const windows = state?.windows || [];
  const employees = state?.employees || [];
  const allMessages = state?.chatMessages || [];

  // Select initial window or first window if available
  useEffect(() => {
    if (initialWindowId && windows.some(w => Number(w.id) === Number(initialWindowId))) {
      setSelectedWindowId(Number(initialWindowId));
      setMobileView('chat');
    } else if (!selectedWindowId && windows.length > 0) {
      setSelectedWindowId(Number(windows[0].id));
    }
  }, [initialWindowId, windows]);

  // Mark messages for the selected window as read by admin
  useEffect(() => {
    if (selectedWindowId) {
      markChatMessagesAsRead(selectedWindowId, 'admin');
    }
  }, [selectedWindowId, allMessages.length, markChatMessagesAsRead]);

  // Auto scroll to bottom of messages container
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [selectedWindowId]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [allMessages]);

  const selectedWindow = windows.find(w => Number(w.id) === Number(selectedWindowId));
  const selectedWindowEmployee = selectedWindow 
    ? employees.find(e => Number(e.windowId) === Number(selectedWindow.id) || Number(e.id) === Number(selectedWindow.employeeId)) 
    : undefined;

  // Filter messages for current selected window
  const currentWindowMessages = useMemo(() => {
    if (!selectedWindowId) return [];
    return allMessages
      .filter(m => Number(m.windowId) === Number(selectedWindowId))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [allMessages, selectedWindowId]);

  // Compute unread messages count per window
  const unreadCountByWindow = useMemo(() => {
    const counts: Record<number, number> = {};
    allMessages.forEach(m => {
      if (m.senderType === 'window' && !m.readByAdmin) {
        const wid = Number(m.windowId);
        counts[wid] = (counts[wid] || 0) + 1;
      }
    });
    return counts;
  }, [allMessages]);

  const totalUnreadForAdmin = Object.values(unreadCountByWindow).reduce((a, b) => a + b, 0);

  // Filter windows by search query
  const filteredWindows = useMemo(() => {
    if (!searchQuery.trim()) return windows;
    const q = searchQuery.toLowerCase();
    return windows.filter(win => {
      const emp = employees.find(e => Number(e.windowId) === Number(win.id) || Number(e.id) === Number(win.employeeId));
      return (
        win.name.toLowerCase().includes(q) ||
        (win.customTask && win.customTask.toLowerCase().includes(q)) ||
        (emp && emp.name.toLowerCase().includes(q)) ||
        win.id.toString().includes(q)
      );
    });
  }, [windows, employees, searchQuery]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedWindowId) return;

    await sendChatMessage(selectedWindowId, 'admin', 'المدير / الإدارة', text);
    setInputText('');
    setTimeout(() => scrollToBottom('smooth'), 100);
  };

  const handleSendBroadcast = async () => {
    if (!broadcastText.trim()) return;
    await broadcastChatMessage('المدير العام', broadcastText.trim());
    setBroadcastText('');
    setIsBroadcastModalOpen(false);
  };

  const handleClearCurrent = async () => {
    if (!selectedWindowId) return;
    if (window.confirm(`هل أنت متأكد من مسح سجل محادثة ${selectedWindow?.name}؟`)) {
      await clearChatHistory(selectedWindowId);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  if (windows.length === 0) {
    return (
      <div className="bg-slate-800 p-12 rounded-2xl border border-slate-700 text-center text-slate-400">
        <span className="text-5xl mb-4 block">🏢</span>
        <h4 className="text-xl font-bold text-white mb-2">لا توجد شبابيك خدمة مضافة</h4>
        <p className="text-sm">يرجى إضافة شبابيك خدمة أولاً من تبويب "إدارة النظام" لبدء التواصل معها.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[580px] max-h-[820px]">
      
      {/* TOP BAR / HEADER */}
      <div className="bg-slate-850 px-5 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-xl font-bold border border-sky-500/30">
            💬
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">مركز المحادثة المباشرة مع الشبابيك</h2>
              {totalUnreadForAdmin > 0 && (
                <span className="bg-rose-500 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                  {totalUnreadForAdmin} رسالة غير مقروءة
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">تواصل لحظي وسريع على الشبكة المحلية بين الإدارة وكافة الموظفين</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs py-2 px-3.5 rounded-xl transition flex items-center gap-2 shadow-md shadow-amber-500/10 cursor-pointer"
          >
            <span>📢</span>
            <span className="hidden sm:inline">إرسال تعميم للجميع</span>
            <span className="sm:hidden">تعميم</span>
          </button>
        </div>
      </div>

      {/* MAIN DUAL-PANE CONTAINER */}
      <div className="flex-1 flex overflow-hidden">

        {/* SIDEBAR: WINDOWS LIST */}
        <div className={`w-full md:w-80 lg:w-96 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Search Input */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن شباك أو موظف..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Windows Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
            {filteredWindows.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                لا توجد شبابيك مطابقة للبحث
              </div>
            ) : (
              filteredWindows.map(win => {
                const isSelected = Number(win.id) === Number(selectedWindowId);
                const emp = employees.find(e => Number(e.windowId) === Number(win.id) || Number(e.id) === Number(win.employeeId));
                const winMessages = allMessages.filter(m => Number(m.windowId) === Number(win.id));
                const lastMsg = winMessages[winMessages.length - 1];
                const unread = unreadCountByWindow[Number(win.id)] || 0;
                const isOnline = !!emp;

                return (
                  <button
                    key={win.id}
                    onClick={() => {
                      setSelectedWindowId(Number(win.id));
                      setMobileView('chat');
                    }}
                    className={`w-full text-right p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected 
                        ? 'bg-sky-500/15 border-r-4 border-sky-400' 
                        : 'hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Window avatar & online dot */}
                    <div className="relative mt-1 shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isSelected 
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' 
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {win.id}
                      </div>
                      <span className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                      }`} title={isOnline ? 'الموظف متواجد' : 'الشباك شاغر'}></span>
                    </div>

                    {/* Window Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {win.name}
                        </span>
                        {lastMsg && (
                          <span className="text-[10px] text-slate-500 shrink-0 mr-1 font-mono">
                            {formatTime(lastMsg.timestamp)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`text-[11px] truncate ${emp ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                          {emp ? `الموظف: ${emp.name}` : 'الشباك شاغر حالياً'}
                        </span>
                        {unread > 0 && (
                          <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                            {unread} جديدة
                          </span>
                        )}
                      </div>

                      {lastMsg ? (
                        <p className="text-[11px] text-slate-400 truncate">
                          <span className="text-slate-500">{lastMsg.senderType === 'admin' ? 'أنت: ' : ''}</span>
                          {lastMsg.text}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-600 italic">لا توجد رسائل سابقة</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* CHAT CONVERSATION VIEW */}
        <div className={`flex-1 flex flex-col bg-slate-950/60 min-w-0 ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}>
          {selectedWindow ? (
            <>
              {/* Conversation Top Header */}
              <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    title="العودة لقائمة الشبابيك"
                  >
                    <span>←</span>
                    <span>الشبابيك</span>
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black text-base shrink-0">
                    {selectedWindow.id}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-white text-base truncate">{selectedWindow.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedWindowEmployee 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {selectedWindowEmployee ? `الموظف المناوب: ${selectedWindowEmployee.name}` : 'الشباك شاغر'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      التخصص: {selectedWindow.customTask || 'خدمات عامة'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleClearCurrent}
                    title="مسح سجل محادثة هذا الشباك"
                    className="text-xs text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    مسح السجل
                  </button>
                </div>
              </div>

              {/* Messages Body */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
              >
                {currentWindowMessages.length === 0 ? (
                  <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-3xl mb-3 text-sky-400">
                      💬
                    </div>
                    <p className="text-base font-bold text-slate-200">لا توجد رسائل سابقة مع {selectedWindow.name}</p>
                    <p className="text-xs text-slate-400 mt-1.5 max-w-sm leading-relaxed">
                      ابدأ المحادثة الآن بإرسال رسالة أو اضغط على أحد التوجيهات السريعة أدناه لتصل فوراً لموظف الشباك.
                    </p>
                  </div>
                ) : (
                  currentWindowMessages.map(msg => {
                    const isAdmin = msg.senderType === 'admin';
                    const isBroadcast = msg.text.startsWith('📢 [تعميم');

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                      >
                        {/* Sender Name & Time */}
                        <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                          <span className={`font-bold ${isAdmin ? 'text-sky-400' : 'text-emerald-400'}`}>
                            {isAdmin ? 'أنت (الإدارة)' : msg.senderName}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">{formatTime(msg.timestamp)}</span>
                        </div>

                        {/* Bubble */}
                        <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-lg ${
                          isBroadcast
                            ? 'bg-amber-500/20 text-white border-2 border-amber-500/40 rounded-tr-sm ring-1 ring-amber-500/20'
                            : isAdmin 
                              ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-tr-sm shadow-sky-900/20' 
                              : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-sm ring-1 ring-emerald-500/30'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                          <div className={`flex justify-end mt-1.5 text-[10px] ${isAdmin ? 'text-sky-200' : 'text-slate-400'}`}>
                            {isAdmin ? (
                              <span className="font-medium">{msg.readByWindow ? '✓✓ تمت القراءة من الشباك' : '✓ تم الإرسال'}</span>
                            ) : (
                              <span className="font-medium">{msg.readByAdmin ? '✓✓ مقروءة' : 'رسالة واردة جديدة'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Canned Messages Bar */}
              <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 overflow-x-auto">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap shrink-0">توجيهات سريعة:</span>
                  <div className="flex gap-2">
                    {QUICK_ADMIN_MESSAGES.map((canned, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(canned)}
                        className="text-xs bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-slate-300 border border-slate-700 hover:border-sky-500/40 px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer shrink-0"
                      >
                        {canned}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Message Input Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`اكتب رسالة إلى ${selectedWindow.name}...`}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-sky-500 text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-500/20 text-sm shrink-0"
                >
                  <span>إرسال</span>
                  <span>➤</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
              <span className="text-5xl mb-3">💬</span>
              <p className="text-base font-bold text-slate-300">اختر شباكاً من القائمة الجانبية للبدء بالمحادثة</p>
              <p className="text-xs text-slate-500 mt-1">يمكنك مراسلة كل شباك على حدة أو إرسال تعميم للجميع.</p>
            </div>
          )}
        </div>

      </div>

      {/* BROADCAST MODAL */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="📢 إرسال تعميم إداري لجميع الشبابيك دفعة واحدة"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            سيتم إرسال هذا التعميم فورياً لجميع شبابيك الخدمة ({windows.length} شبابيك) في وقت واحد ويظهر بتنبيه بارز على شاشات الموظفين.
          </p>

          <div>
            <textarea
              rows={4}
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="اكتب نص التعميم الإداري هنا (مثال: نرجو تسريع خدمة العملاء قبل موعد الصلاة / اجتماع للإدارة الساعة 2:00)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsBroadcastModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSendBroadcast}
              disabled={!broadcastText.trim()}
              className="!bg-gradient-to-r !from-amber-500 !to-orange-500 !text-slate-950 font-black hover:opacity-95"
            >
              إرسال التعميم لجميع الشبابيك الآن
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
