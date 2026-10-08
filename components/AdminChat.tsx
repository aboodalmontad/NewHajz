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
  'عمل رائع اليوم، استمروا في هذا الأداء 👍'
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const windows = state?.windows || [];
  const employees = state?.employees || [];
  const allMessages = state?.chatMessages || [];

  // Select initial window or first available
  useEffect(() => {
    if (initialWindowId && windows.some(w => w.id === initialWindowId)) {
      setSelectedWindowId(initialWindowId);
    } else if (!selectedWindowId && windows.length > 0) {
      setSelectedWindowId(windows[0].id);
    }
  }, [initialWindowId, windows]);

  // Mark as read whenever selected window changes or new messages arrive
  useEffect(() => {
    if (selectedWindowId) {
      markChatMessagesAsRead(selectedWindowId, 'admin');
    }
  }, [selectedWindowId, allMessages.length]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, selectedWindowId]);

  const selectedWindow = windows.find(w => w.id === selectedWindowId);
  const selectedWindowEmployee = selectedWindow 
    ? employees.find(e => e.windowId === selectedWindow.id || e.id === selectedWindow.employeeId) 
    : undefined;

  const currentWindowMessages = useMemo(() => {
    if (!selectedWindowId) return [];
    return allMessages
      .filter(m => m.windowId === selectedWindowId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [allMessages, selectedWindowId]);

  // Calculate unread counts per window for admin
  const unreadCountByWindow = useMemo(() => {
    const counts: Record<number, number> = {};
    allMessages.forEach(m => {
      if (m.senderType === 'window' && !m.readByAdmin) {
        counts[m.windowId] = (counts[m.windowId] || 0) + 1;
      }
    });
    return counts;
  }, [allMessages]);

  const totalUnreadForAdmin = Object.values(unreadCountByWindow).reduce((a, b) => a + b, 0);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedWindowId) return;

    await sendChatMessage(selectedWindowId, 'admin', 'المدير / الإدارة', text);
    setInputText('');
  };

  const handleSendBroadcast = async () => {
    if (!broadcastText.trim()) return;
    await broadcastChatMessage('المدير العام', broadcastText.trim());
    setBroadcastText('');
    setIsBroadcastModalOpen(false);
  };

  const handleClearCurrent = async () => {
    if (!selectedWindowId) return;
    if (window.confirm(`هل أنت متأكد من مسح محادثة ${selectedWindow?.name}؟`)) {
      await clearChatHistory(selectedWindowId);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  if (windows.length === 0) {
    return (
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center text-slate-400">
        <p className="text-lg">لا توجد شبابيك مضافة حالياً لإجراء المحادثات معها.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/90 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col md:flex-row h-[720px]">
      {/* SIDEBAR: Windows list */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-l border-slate-700 bg-slate-900/60 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h3 className="font-bold text-white text-base">شبابيك الخدمة</h3>
          </div>
          {totalUnreadForAdmin > 0 && (
            <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              {totalUnreadForAdmin} جديدة
            </span>
          )}
        </div>

        {/* Broadcast action button */}
        <div className="p-3 border-b border-slate-800">
          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 cursor-pointer"
          >
            <span>📢</span>
            <span>إرسال تعميم لكافة الشبابيك</span>
          </button>
        </div>

        {/* Windows List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
          {windows.map(win => {
            const isSelected = win.id === selectedWindowId;
            const emp = employees.find(e => e.windowId === win.id || e.id === win.employeeId);
            const winMessages = allMessages.filter(m => m.windowId === win.id);
            const lastMsg = winMessages[winMessages.length - 1];
            const unread = unreadCountByWindow[win.id] || 0;
            const isOnline = !!emp;

            return (
              <button
                key={win.id}
                onClick={() => setSelectedWindowId(win.id)}
                className={`w-full text-right p-3.5 transition flex items-start gap-3 cursor-pointer ${
                  isSelected 
                    ? 'bg-sky-500/15 border-r-4 border-sky-400' 
                    : 'hover:bg-slate-800/60'
                }`}
              >
                {/* Status indicator avatar */}
                <div className="relative mt-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                    isSelected ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {win.id}
                  </div>
                  <span className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                    isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}></span>
                </div>

                {/* Window Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {win.name}
                    </span>
                    {lastMsg && (
                      <span className="text-[10px] text-slate-500">
                        {formatTime(lastMsg.timestamp)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 truncate text-[11px]">
                      {emp ? `الموظف: ${emp.name}` : 'غير مفعل حالياً'}
                    </span>
                    {unread > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                        {unread}
                      </span>
                    )}
                  </div>

                  {lastMsg && (
                    <p className="text-[11px] text-slate-500 truncate mt-1">
                      {lastMsg.senderType === 'admin' ? 'أنت: ' : ''}{lastMsg.text}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CHAT CONVERSATION AREA */}
      <div className="flex-1 flex flex-col bg-slate-950/40">
        {selectedWindow ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-900/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-lg">
                  {selectedWindow.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-base">{selectedWindow.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedWindowEmployee 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {selectedWindowEmployee ? `الموظف: ${selectedWindowEmployee.name}` : 'الشباك شاغر'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تخصص الشباك: {selectedWindow.customTask || 'خدمات عامة'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearCurrent}
                  title="مسح محادثة هذا الشباك"
                  className="text-xs text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  مسح المحادثة
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {currentWindowMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <span className="text-5xl mb-3">💬</span>
                  <p className="text-base font-bold text-slate-300">لا توجد رسائل سابقة مع {selectedWindow.name}</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    ابدأ المحادثة بإرسال رسالة أو اختر أحد التوجيهات السريعة أدناه لتصل فوراً لموظف هذا الشباك.
                  </p>
                </div>
              ) : (
                currentWindowMessages.map(msg => {
                  const isAdmin = msg.senderType === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                        <span className="font-bold text-slate-300">{msg.senderName}</span>
                        <span>•</span>
                        <span>{formatTime(msg.timestamp)}</span>
                      </div>

                      <div className={`max-w-[80%] rounded-2xl p-3.5 shadow-md ${
                        isAdmin 
                          ? 'bg-sky-600 text-white rounded-tr-sm' 
                          : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-sm ring-1 ring-emerald-500/20'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <div className={`flex justify-end mt-1 text-[10px] ${isAdmin ? 'text-sky-200' : 'text-slate-400'}`}>
                          {isAdmin ? (
                            <span>{msg.readByWindow ? '✓✓ تمت القراءة' : '✓ تم الإرسال'}</span>
                          ) : (
                            <span>{msg.readByAdmin ? '✓✓ مقروءة' : 'رسالة واردة'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions / Canned Messages */}
            <div className="px-4 py-2 bg-slate-900/40 border-t border-slate-800/80 overflow-x-auto">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">توجيهات سريعة للإدارة:</p>
              <div className="flex gap-2">
                {QUICK_ADMIN_MESSAGES.map((canned, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(canned)}
                    className="text-xs bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-slate-300 border border-slate-700 hover:border-sky-500/50 px-2.5 py-1 rounded-lg whitespace-nowrap transition cursor-pointer"
                  >
                    {canned}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-slate-900 border-t border-slate-700 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`اكتب رسالة إلى ${selectedWindow.name}...`}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-sky-500 text-white font-bold px-5 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-500/20 text-sm"
              >
                <span>إرسال</span>
                <span>➤</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            اختر شباكاً للبدء بالمحادثة
          </div>
        )}
      </div>

      {/* BROADCAST MODAL */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="📢 إرسال تعميم لجميع الشبابيك دفعة واحدة"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            سيتم إرسال هذه الرسالة بشكل فوري لجميع شبابيك الخدمة ({windows.length} شبابيك) في وقت واحد وتظهر بتنبيه بارز في شاشات الموظفين.
          </p>

          <div>
            <textarea
              rows={4}
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="اكتب نص التعميم الإداري هنا (مثال: نرجو من الجميع التوجه لصالة الاجتماعات بعد انتهاء دوام العملاء)..."
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
              إرسال التعميم الآن
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
