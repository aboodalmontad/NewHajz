import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Employee, Window } from '../types';

interface EmployeeChatProps {
  employee: Employee;
  windowData?: Window;
}

const QUICK_EMPLOYEE_REPLIES = [
  '👍 تم وجاري التنفيذ',
  '📝 أحتاج موافقة على المعاملة',
  '👤 العميل يطلب مقابلتك',
  '⏱️ دقيقتان وأنتهي',
  '⚠️ واجهت مشكلة فنية',
  '☕ استراحة 5 دقائق'
];

export const EmployeeChat: React.FC<EmployeeChatProps> = ({ employee, windowData }) => {
  const { state, sendChatMessage, markChatMessagesAsRead } = useQueueSystem();
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [filterManagerOnly, setFilterManagerOnly] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // If no window is assigned yet, fallback to a virtual employee channel
  const windowId = windowData?.id || employee.windowId || 1;
  const hasWindow = !!(windowData || employee.windowId);
  const allMessages = state?.chatMessages || [];

  // Messages for this specific window
  const windowMessages = useMemo(() => {
    return allMessages
      .filter(m => Number(m.windowId) === Number(windowId))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [allMessages, windowId]);

  // Filtered messages (if user toggles manager only)
  const displayedMessages = useMemo(() => {
    if (filterManagerOnly) {
      return windowMessages.filter(m => m.senderType === 'admin');
    }
    return windowMessages;
  }, [windowMessages, filterManagerOnly]);

  // Unread messages from admin
  const unreadCount = useMemo(() => {
    return allMessages.filter(
      m => Number(m.windowId) === Number(windowId) && m.senderType === 'admin' && !m.readByWindow
    ).length;
  }, [allMessages, windowId]);

  // Latest message from manager specifically
  const latestManagerMessage = useMemo(() => {
    const managerMsgs = windowMessages.filter(m => m.senderType === 'admin');
    return managerMsgs.length > 0 ? managerMsgs[managerMsgs.length - 1] : null;
  }, [windowMessages]);

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
  }, [displayedMessages, isMinimized]);

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
    <div className="bg-slate-850 rounded-xl border border-slate-700 shadow-lg overflow-hidden transition-all duration-200">
      {/* Ultra Compact Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-750 flex items-center justify-between select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs border border-amber-500/30">
              💬
            </span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
          </div>
          
          <div className="truncate flex items-center gap-1.5">
            <span className="font-bold text-xs text-white">رسائل وتوجيهات المدير</span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              ({hasWindow ? (windowData?.name || `شباك ${windowId}`) : 'مباشر'})
            </span>
            {unreadCount > 0 ? (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse shrink-0">
                {unreadCount} جديد
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-medium shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                متصل
              </span>
            )}
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isMinimized && (
            <>
              <button
                type="button"
                onClick={() => setFilterManagerOnly(!filterManagerOnly)}
                className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                  filterManagerOnly 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="تصفية رسائل المدير فقط"
              >
                {filterManagerOnly ? '★ رسائل المدير فقط' : 'عرض الكل'}
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-slate-400 hover:text-white text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded transition cursor-pointer"
                title={isExpanded ? 'تصغير الحجم' : 'تكبير مؤقت'}
              >
                {isExpanded ? '⤓ مصغر' : '⤢ توسيع'}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-slate-300 hover:text-white text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5 rounded transition cursor-pointer font-bold"
          >
            {isMinimized ? 'إظهار ▲' : 'تصغير ▼'}
          </button>
        </div>
      </div>

      {/* When Minimized: Single Slim Alert Strip */}
      {isMinimized && (
        <div 
          onClick={() => setIsMinimized(false)}
          className="px-3 py-1.5 bg-slate-900/90 text-xs flex items-center justify-between cursor-pointer hover:bg-slate-900 transition"
        >
          <div className="flex items-center gap-2 truncate">
            {latestManagerMessage ? (
              <span className="text-slate-300 truncate">
                <strong className="text-amber-400">آخر رسالة من المدير:</strong> {latestManagerMessage.text}
              </span>
            ) : (
              <span className="text-slate-500">لا توجد رسائل حالياً من المدير</span>
            )}
          </div>
          <span className="text-[10px] text-sky-400 font-bold shrink-0 mr-2">فتح الشات ↗</span>
        </div>
      )}

      {/* Active Small Chat Body */}
      {!isMinimized && (
        <div>
          {/* Latest Manager Message Highlight Banner (If Available) */}
          {latestManagerMessage && (
            <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 truncate text-amber-200">
                <span className="font-bold text-amber-400 shrink-0">⚡ توجيه المدير:</span>
                <span className="truncate">{latestManagerMessage.text}</span>
              </div>
              <span className="text-[10px] text-amber-400/80 font-mono shrink-0 mr-2">
                {formatTime(latestManagerMessage.timestamp)}
              </span>
            </div>
          )}

          {/* Messages list - Small Compact Height */}
          <div 
            className={`overflow-y-auto px-3 py-2 space-y-2 bg-slate-950/70 transition-all duration-200 ${
              isExpanded ? 'h-[280px]' : 'h-[140px]'
            }`}
          >
            {displayedMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-2 text-slate-500">
                <p className="text-xs font-semibold text-slate-400">لا توجد رسائل مسجلة مع المدير بعد</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  أي توجيه أو استفسار من المدير سيظهر فوراً هنا
                </p>
              </div>
            ) : (
              displayedMessages.map(msg => {
                const isFromAdmin = msg.senderType === 'admin';
                const isBroadcast = msg.text.startsWith('📢 [تعميم');

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isFromAdmin ? 'items-start' : 'items-end'}`}
                  >
                    {/* Header: Sender & Time */}
                    <div className="flex items-center gap-1 mb-0.5 text-[10px] text-slate-400">
                      <span className={`font-bold ${isFromAdmin ? 'text-amber-400' : 'text-sky-300'}`}>
                        {isFromAdmin ? '👑 المدير' : 'أنت'}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[9px]">{formatTime(msg.timestamp)}</span>
                    </div>

                    {/* Small Message Bubble */}
                    <div className={`max-w-[90%] rounded-xl px-2.5 py-1.5 text-xs shadow-sm ${
                      isBroadcast
                        ? 'bg-amber-950/40 text-amber-100 border border-amber-500/50 rounded-tr-xs ring-1 ring-amber-500/20'
                        : isFromAdmin 
                          ? 'bg-slate-800 text-white border border-amber-500/40 rounded-tr-xs shadow' 
                          : 'bg-sky-600/90 text-white rounded-tl-xs'
                    }`}>
                      <p className="leading-snug whitespace-pre-wrap break-words">{msg.text}</p>
                      
                      <div className={`flex justify-end mt-0.5 text-[9px] ${isFromAdmin ? 'text-amber-300/80' : 'text-sky-200/80'}`}>
                        {isFromAdmin ? (
                          <span>{msg.readByWindow ? '✓ مقروءة' : '● جديد'}</span>
                        ) : (
                          <span>{msg.readByAdmin ? '✓✓ اطلع عليها المدير' : '✓ تم الإرسال'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick reply shortcuts - Slim Compact Chips */}
          <div className="px-2.5 py-1 bg-slate-900/90 border-t border-slate-800 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap shrink-0">رد سريع:</span>
              <div className="flex gap-1">
                {QUICK_EMPLOYEE_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(reply)}
                    className="text-[10px] bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-slate-300 border border-slate-700/80 hover:border-sky-500/40 px-2 py-0.5 rounded-md whitespace-nowrap transition cursor-pointer shrink-0"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Message Input Form - Small & Thin */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-1.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب رداً سريعاً للمدير..."
                className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-sky-500 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors pl-6"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded text-[10px] cursor-pointer"
                  title="مسح"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-sky-500 text-white font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer text-xs shadow-sm shrink-0 h-[28px]"
              title="إرسال"
            >
              <span>إرسال</span>
              <span className="text-[10px]">➤</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
