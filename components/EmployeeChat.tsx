import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Employee, Window } from '../types';

interface EmployeeChatProps {
  employee: Employee;
  windowData?: Window;
}

const QUICK_EMPLOYEE_REPLIES = [
  'تم الاستلام وجاري التنفيذ 👍',
  'أحتاج إلى موافقة الإدارة على هذه المعاملة 📝',
  'العميل يطلب مقابلة المدير شخصياً 👤',
  'سأنتهي من المعاملة الحالية خلال دقيقتين ⏱️',
  'النظام بطيء أو أواجه مشكلة فنية ⚠️',
  'أحتاج إلى استراحة قصيرة ☕'
];

export const EmployeeChat: React.FC<EmployeeChatProps> = ({ employee, windowData }) => {
  const { state, sendChatMessage, markChatMessagesAsRead } = useQueueSystem();
  const [inputText, setInputText] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const windowId = windowData?.id || employee.windowId;
  const allMessages = state?.chatMessages || [];

  // Messages for this specific window
  const windowMessages = useMemo(() => {
    if (!windowId) return [];
    return allMessages
      .filter(m => m.windowId === windowId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [allMessages, windowId]);

  // Count unread messages from admin
  const unreadCount = useMemo(() => {
    if (!windowId) return 0;
    return allMessages.filter(m => m.windowId === windowId && m.senderType === 'admin' && !m.readByWindow).length;
  }, [allMessages, windowId]);

  // Mark messages as read by window when open
  useEffect(() => {
    if (windowId && isOpen && unreadCount > 0) {
      markChatMessagesAsRead(windowId, 'window');
    }
  }, [windowId, isOpen, unreadCount]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [windowMessages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !windowId) return;

    const senderDisplayName = `${employee.name} (${windowData?.name || `شباك ${windowId}`})`;
    await sendChatMessage(windowId, 'window', senderDisplayName, text);
    setInputText('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  if (!windowId) {
    return (
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 text-center text-slate-400">
        <span className="text-3xl mb-2 block">💬</span>
        <h4 className="text-white font-bold mb-1">المحادثة المباشرة مع الإدارة والمدير</h4>
        <p className="text-sm">يرجى اختيار شباك متاح للعمل عليه أولاً لتفعيل قناة المحادثة الفورية مع المدير.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl transition-all">
      {/* Header with toggle and badge */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-gradient-to-r from-slate-800 to-slate-850 hover:bg-slate-750 flex items-center justify-between cursor-pointer border-b border-slate-700/80 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-xl border border-sky-500/30">
              💬
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-base">محادثة مباشرة مع المدير والإدارة</h3>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-bounce">
                  {unreadCount} رسالة جديدة
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              قناة اتصال مخصصة لـ {windowData?.name || `الشباك ${windowId}`} • متصل لحظياً
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-slate-400 hover:text-white text-sm bg-slate-700/60 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            {isOpen ? 'تصغير ▼' : 'فتح المحادثة ▲'}
          </button>
        </div>
      </div>

      {/* Expandable Chat Body */}
      {isOpen && (
        <div className="flex flex-col h-[400px]">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40">
            {windowMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <span className="text-4xl mb-2">🤝</span>
                <p className="text-base font-bold text-slate-300">قناة المحادثة المباشرة مع المدير جاهزة</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  يمكنك مراسلة المدير في أي وقت لطلب موافقة، استفسار، أو إبلاغ عن مشكلة أثناء خدمة العملاء.
                </p>
              </div>
            ) : (
              windowMessages.map(msg => {
                const isFromAdmin = msg.senderType === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isFromAdmin ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                      <span className={`font-bold ${isFromAdmin ? 'text-amber-400' : 'text-sky-300'}`}>
                        {msg.senderName}
                      </span>
                      <span>•</span>
                      <span>{formatTime(msg.timestamp)}</span>
                    </div>

                    <div className={`max-w-[85%] rounded-2xl p-3 shadow-md ${
                      isFromAdmin 
                        ? 'bg-amber-500/20 text-white border border-amber-500/30 rounded-tr-sm ring-1 ring-amber-500/20' 
                        : 'bg-sky-600 text-white rounded-tl-sm'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <div className={`flex justify-end mt-1 text-[10px] ${isFromAdmin ? 'text-amber-200' : 'text-sky-200'}`}>
                        {isFromAdmin ? (
                          <span>{msg.readByWindow ? '✓✓ مقروءة' : 'رسالة من الإدارة'}</span>
                        ) : (
                          <span>{msg.readByAdmin ? '✓✓ قرأها المدير' : '✓ تم الإرسال للمدير'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick reply shortcuts */}
          <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800 overflow-x-auto">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ردود سريعة للإدارة:</p>
            <div className="flex gap-1.5">
              {QUICK_EMPLOYEE_REPLIES.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(reply)}
                  className="text-xs bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-slate-300 border border-slate-700 hover:border-sky-500/40 px-2.5 py-1 rounded-lg whitespace-nowrap transition cursor-pointer"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          {/* Input field */}
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
              placeholder="اكتب رسالتك للمدير هنا..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-sky-500 text-white font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer text-sm shadow-md shadow-sky-500/20"
            >
              <span>إرسال</span>
              <span>➤</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
