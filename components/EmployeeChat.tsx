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
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // If no window is assigned yet, fallback to a virtual employee channel (e.g. window 1 or 999)
  const windowId = windowData?.id || employee.windowId || 1;
  const hasWindow = !!(windowData || employee.windowId);
  const allMessages = state?.chatMessages || [];

  // Messages for this specific window
  const windowMessages = useMemo(() => {
    return allMessages
      .filter(m => Number(m.windowId) === Number(windowId))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [allMessages, windowId]);

  // Count unread messages from admin
  const unreadCount = useMemo(() => {
    return allMessages.filter(
      m => Number(m.windowId) === Number(windowId) && m.senderType === 'admin' && !m.readByWindow
    ).length;
  }, [allMessages, windowId]);

  // Mark messages as read by window when open
  useEffect(() => {
    if (windowId && !isMinimized && unreadCount > 0) {
      markChatMessagesAsRead(Number(windowId), 'window');
    }
  }, [windowId, isMinimized, unreadCount, markChatMessagesAsRead]);

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    if (!isMinimized) {
      scrollToBottom('smooth');
    }
  }, [windowMessages, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const windowLabel = windowData?.name || (employee.windowId ? `شباك ${employee.windowId}` : 'بدون شباك');
    const senderDisplayName = `${employee.name} (${windowLabel})`;
    await sendChatMessage(Number(windowId), 'window', senderDisplayName, text);
    setInputText('');
    setTimeout(() => scrollToBottom('smooth'), 100);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-slate-850 rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden transition-all duration-300">
      {/* Header with expand/minimize controls and unread indicator */}
      <div 
        className="p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 border-b border-slate-700/80 flex items-center justify-between select-none"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-xl border border-sky-500/30">
              💬
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-base">المحادثة المباشرة مع المدير والإدارة</h3>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-xs font-black px-2 py-0.5 rounded-full animate-bounce shadow-sm">
                  {unreadCount} رسالة جديدة
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {hasWindow 
                ? `قناة اتصال مخصصة لـ ${windowData?.name || `الشباك ${windowId}`} • متصل لحظياً` 
                : 'قناة الاتصال المباشر مع الإدارة • متصل لحظياً'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isMinimized && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-white text-xs bg-slate-850 hover:bg-slate-700 border border-slate-750 px-2.5 py-1.5 rounded-lg transition hidden sm:inline-block cursor-pointer"
              title={isExpanded ? 'تصغير الحجم' : 'تكبير الحجم'}
            >
              {isExpanded ? '⤓ قياسي' : '⤢ تكبير'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-slate-400 hover:text-white text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition cursor-pointer font-bold"
          >
            {isMinimized ? 'فتح المحادثة ▲' : 'إخفاء ▼'}
          </button>
        </div>
      </div>

      {/* Expandable Chat Body */}
      {!isMinimized && (
        <div className={`flex flex-col transition-all duration-200 ${
          isExpanded ? 'h-[600px]' : 'h-[420px]'
        }`}>
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-950/60">
            {windowMessages.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <span className="text-4xl mb-2">🤝</span>
                <p className="text-base font-bold text-slate-300">قناة المحادثة المباشرة مع المدير جاهزة</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                  يمكنك مراسلة المدير في أي وقت لطلب موافقة، استفسار عن معاملة، أو إبلاغ عن مشكلة أثناء خدمة العملاء.
                </p>
              </div>
            ) : (
              windowMessages.map(msg => {
                const isFromAdmin = msg.senderType === 'admin';
                const isBroadcast = msg.text.startsWith('📢 [تعميم');

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isFromAdmin ? 'items-start' : 'items-end'}`}
                  >
                    {/* Sender and time */}
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                      <span className={`font-bold ${isFromAdmin ? 'text-amber-400' : 'text-sky-300'}`}>
                        {isFromAdmin ? 'المدير / الإدارة' : 'أنت'}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">{formatTime(msg.timestamp)}</span>
                    </div>

                    {/* Message Bubble */}
                    <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-md ${
                      isBroadcast
                        ? 'bg-amber-500/20 text-white border-2 border-amber-500/40 rounded-tr-sm ring-1 ring-amber-500/20'
                        : isFromAdmin 
                          ? 'bg-slate-800 text-white border border-amber-500/30 rounded-tr-sm ring-1 ring-amber-500/20' 
                          : 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-tl-sm'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                      
                      <div className={`flex justify-end mt-1.5 text-[10px] ${isFromAdmin ? 'text-amber-300' : 'text-sky-200'}`}>
                        {isFromAdmin ? (
                          <span>{msg.readByWindow ? '✓✓ مقروءة' : 'رسالة جديدة من المدير'}</span>
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

          {/* Quick reply shortcuts - Ultra Compact */}
          <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800/80 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap shrink-0">ردود سريعة:</span>
              <div className="flex gap-1.5">
                {QUICK_EMPLOYEE_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(reply)}
                    className="text-[11px] bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-slate-300 border border-slate-700 hover:border-sky-500/40 px-2 py-0.5 rounded-lg whitespace-nowrap transition cursor-pointer shrink-0"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Message Input Form - Compact Sleek Design */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2 sm:p-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center gap-1.5 sm:gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب رسالتك للمدير هنا..."
                className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-sky-500 rounded-lg sm:rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors pr-3 pl-8"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full text-xs cursor-pointer"
                  title="مسح النص"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-sky-500 text-white font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition flex items-center gap-1 cursor-pointer text-xs sm:text-sm shadow-sm shrink-0 h-[34px] sm:h-[38px]"
              title="إرسال الرسالة"
            >
              <span>إرسال</span>
              <span className="text-xs">➤</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
