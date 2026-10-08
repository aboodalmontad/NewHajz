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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'manager' | 'broadcast'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [browseOrientation, setBrowseOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [scrollProgress, setScrollProgress] = useState(100);

  const compactScrollContainerRef = useRef<HTMLDivElement>(null);
  const fullScreenScrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fullScreenMessagesEndRef = useRef<HTMLDivElement>(null);

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

  // Filtered messages (for compact view)
  const displayedMessages = useMemo(() => {
    if (filterManagerOnly) {
      return windowMessages.filter(m => m.senderType === 'admin');
    }
    return windowMessages;
  }, [windowMessages, filterManagerOnly]);

  // Filtered messages (for full page view with search)
  const fullScreenFilteredMessages = useMemo(() => {
    let msgs = windowMessages;
    if (filterType === 'manager') {
      msgs = msgs.filter(m => m.senderType === 'admin');
    } else if (filterType === 'broadcast') {
      msgs = msgs.filter(m => m.text.startsWith('📢 [تعميم'));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      msgs = msgs.filter(m => 
        m.text.toLowerCase().includes(q) || 
        m.senderName.toLowerCase().includes(q)
      );
    }
    return msgs;
  }, [windowMessages, filterType, searchQuery]);

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

  // Mark messages as read by window when open or full screen
  useEffect(() => {
    if (windowId && (!isMinimized || isFullScreen) && unreadCount > 0) {
      markChatMessagesAsRead(Number(windowId), 'window');
    }
  }, [windowId, isMinimized, isFullScreen, unreadCount, markChatMessagesAsRead]);

  // Lock body scroll and handle ESC key when in full screen
  useEffect(() => {
    if (!isFullScreen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen]);

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (browseOrientation === 'horizontal') {
      const container = isFullScreen ? fullScreenScrollContainerRef.current : compactScrollContainerRef.current;
      if (container) {
        container.scrollTo({ left: container.scrollWidth, behavior });
      }
    } else {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior });
      }
      if (fullScreenMessagesEndRef.current) {
        fullScreenMessagesEndRef.current.scrollIntoView({ behavior });
      }
    }
  };

  // Directional scroll handler for both vertical and horizontal browsing bars
  const handleScrollStep = (dir: 'start' | 'prev' | 'next' | 'end') => {
    const container = isFullScreen ? fullScreenScrollContainerRef.current : compactScrollContainerRef.current;
    if (!container) return;

    if (browseOrientation === 'horizontal') {
      const step = 280;
      if (dir === 'start') {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (dir === 'prev') {
        container.scrollBy({ left: -step, behavior: 'smooth' });
      } else if (dir === 'next') {
        container.scrollBy({ left: step, behavior: 'smooth' });
      } else if (dir === 'end') {
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      }
    } else {
      const step = 160;
      if (dir === 'start') {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (dir === 'prev') {
        container.scrollBy({ top: -step, behavior: 'smooth' });
      } else if (dir === 'next') {
        container.scrollBy({ top: step, behavior: 'smooth' });
      } else if (dir === 'end') {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  };

  // Update progress on scroll
  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (browseOrientation === 'horizontal') {
      const max = el.scrollWidth - el.clientWidth;
      if (max > 0) {
        setScrollProgress(Math.min(100, Math.max(0, Math.round((el.scrollLeft / max) * 100))));
      }
    } else {
      const max = el.scrollHeight - el.clientHeight;
      if (max > 0) {
        setScrollProgress(Math.min(100, Math.max(0, Math.round((el.scrollTop / max) * 100))));
      }
    }
  };

  // Slider scrubber
  const handleSliderChange = (percent: number) => {
    setScrollProgress(percent);
    const container = isFullScreen ? fullScreenScrollContainerRef.current : compactScrollContainerRef.current;
    if (!container) return;
    if (browseOrientation === 'horizontal') {
      const max = container.scrollWidth - container.clientWidth;
      container.scrollTo({ left: (percent / 100) * max, behavior: 'auto' });
    } else {
      const max = container.scrollHeight - container.clientHeight;
      container.scrollTo({ top: (percent / 100) * max, behavior: 'auto' });
    }
  };

  useEffect(() => {
    if (!isMinimized || isFullScreen) {
      scrollToBottom('smooth');
    }
  }, [displayedMessages, fullScreenFilteredMessages, isMinimized, isFullScreen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const windowLabel = windowData?.name || (employee.windowId ? `شباك ${employee.windowId}` : 'بدون شباك');
    const senderDisplayName = `${employee.name} (${windowLabel})`;
    await sendChatMessage(Number(windowId), 'window', senderDisplayName, text);
    setInputText('');
    setTimeout(() => scrollToBottom('smooth'), 100);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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
          {/* Prominent Full Screen View Button */}
          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-white border border-sky-500/50 px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
            title="استعراض صفحة الشات بشكل كامل على كامل الشاشة"
          >
            <span>⛶</span>
            <span>استعراض كامل</span>
          </button>

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
                {filterManagerOnly ? '★ رسائل المدير' : 'الكل'}
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-slate-400 hover:text-white text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded transition cursor-pointer"
                title={isExpanded ? 'تصغير الحجم' : 'تكبير مؤقت'}
              >
                {isExpanded ? '⤓ مصغر' : '⤢ متوسط'}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-slate-300 hover:text-white text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5 rounded transition cursor-pointer font-bold"
          >
            {isMinimized ? 'إظهار ▲' : 'طي ▼'}
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
          <div className="flex items-center gap-2 shrink-0 mr-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullScreen(true);
              }}
              className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[10px] font-bold px-2 py-0.5 rounded transition cursor-pointer"
              title="استعراض صفحة الشات بشكل كامل"
            >
              ⛶ استعراض كامل
            </button>
            <span className="text-[10px] text-sky-400 font-bold">فتح المصغر ▲</span>
          </div>
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

          {/* Interactive Browsing Bar (عمودي أو أفقي) */}
          <div className="bg-slate-900 border-b border-slate-800 px-2.5 py-1.5 flex items-center justify-between gap-1 text-[11px] select-none">
            {/* View Orientation Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setBrowseOrientation('vertical')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  browseOrientation === 'vertical'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="شريط استعراض عمودي (من الأعلى للأسفل)"
              >
                <span>↕</span>
                <span>شريط عمودي</span>
              </button>
              <button
                type="button"
                onClick={() => setBrowseOrientation('horizontal')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  browseOrientation === 'horizontal'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="شريط استعراض أفقي (كروت أفقية مع شريط تمرير أفقي)"
              >
                <span>↔</span>
                <span>شريط أفقي</span>
              </button>
            </div>

            {/* Quick Browsing Step Buttons */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 hidden sm:inline">شريط التنقل:</span>
              <button
                type="button"
                onClick={() => handleScrollStep('start')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-1.5 py-0.5 rounded text-[10px] border border-slate-700 cursor-pointer"
                title="الأولى / البداية"
              >
                ⏮
              </button>
              <button
                type="button"
                onClick={() => handleScrollStep('prev')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded text-[10px] border border-slate-700 font-bold cursor-pointer"
                title={browseOrientation === 'horizontal' ? 'تمرير لليمين' : 'تمرير للأعلى'}
              >
                {browseOrientation === 'horizontal' ? '◀' : '▲'}
              </button>
              <button
                type="button"
                onClick={() => handleScrollStep('next')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded text-[10px] border border-slate-700 font-bold cursor-pointer"
                title={browseOrientation === 'horizontal' ? 'تمرير لليسار' : 'تمرير للأسفل'}
              >
                {browseOrientation === 'horizontal' ? '▶' : '▼'}
              </button>
              <button
                type="button"
                onClick={() => handleScrollStep('end')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-1.5 py-0.5 rounded text-[10px] border border-slate-700 cursor-pointer"
                title="الأحدث / النهاية"
              >
                ⏭
              </button>
            </div>
          </div>

          {/* Messages list - Small Compact Height (Supports Vertical & Horizontal Modes) */}
          <div 
            ref={compactScrollContainerRef}
            onScroll={handleContainerScroll}
            className={`transition-all duration-200 bg-slate-950/70 ${
              browseOrientation === 'horizontal'
                ? `overflow-x-auto overflow-y-hidden px-3 py-2.5 flex items-stretch gap-2.5 ${isExpanded ? 'h-[280px]' : 'h-[160px]'}`
                : `overflow-y-auto overflow-x-hidden px-3 py-2 space-y-2 ${isExpanded ? 'h-[280px]' : 'h-[140px]'}`
            }`}
          >
            {displayedMessages.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-2 text-slate-500">
                <p className="text-xs font-semibold text-slate-400">لا توجد رسائل مسجلة مع المدير بعد</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  أي توجيه أو استفسار من المدير سيظهر فوراً هنا
                </p>
              </div>
            ) : browseOrientation === 'horizontal' ? (
              /* Horizontal Card Stream with Visible Horizontal Scrollbar */
              displayedMessages.map(msg => {
                const isFromAdmin = msg.senderType === 'admin';
                const isBroadcast = msg.text.startsWith('📢 [تعميم');

                return (
                  <div
                    key={msg.id}
                    className={`w-[220px] sm:w-[260px] shrink-0 rounded-xl p-2.5 flex flex-col justify-between border shadow-sm ${
                      isBroadcast
                        ? 'bg-amber-950/40 text-amber-100 border-amber-500/50 ring-1 ring-amber-500/20'
                        : isFromAdmin 
                          ? 'bg-slate-800 text-white border-amber-500/40 shadow' 
                          : 'bg-sky-900/70 text-white border-sky-500/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400">
                        <span className={`font-bold ${isFromAdmin ? 'text-amber-400' : 'text-sky-300'}`}>
                          {isFromAdmin ? (isBroadcast ? '📢 تعميم' : '👑 المدير') : 'أنت'}
                        </span>
                        <span className="font-mono text-[9px]">{formatTime(msg.timestamp)}</span>
                      </div>
                      <p className="text-xs leading-snug whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>

                    <div className="flex justify-between items-center mt-2 pt-1 border-t border-white/10 text-[9px]">
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="opacity-70 hover:opacity-100 text-slate-300 hover:text-white cursor-pointer"
                        title="نسخ النص"
                      >
                        {copiedId === msg.id ? 'تم النسخ ✓' : 'نسخ 📋'}
                      </button>
                      <span className={isFromAdmin ? 'text-amber-300/80' : 'text-sky-200/80'}>
                        {isFromAdmin ? (msg.readByWindow ? '✓ مقروءة' : '● جديد') : (msg.readByAdmin ? '✓✓ اطلع عليها المدير' : '✓ تم الإرسال')}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Vertical Bubbles Stream with Visible Vertical Scrollbar */
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

      {/* FULL SCREEN COMPLETE CHAT VIEW OVERLAY */}
      {isFullScreen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col p-2 sm:p-4 md:p-6 text-white animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col bg-slate-900 rounded-2xl border border-slate-750 shadow-2xl overflow-hidden min-h-0">
            {/* Top Header */}
            <div className="bg-slate-850 px-4 sm:px-6 py-3.5 border-b border-slate-750 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold border border-amber-500/30 shrink-0">
                  💬
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-extrabold text-white">صفحة المحادثة الكاملة مع الإدارة</h2>
                    <span className="bg-sky-500/20 text-sky-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-sky-500/30">
                      {hasWindow ? (windowData?.name || `شباك ${windowId}`) : 'مباشر'}
                    </span>
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      متصل بالشبكة المحلية
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    الموظف: {employee.name} • استعراض كامل لكافة التوجيهات والمحادثات مع الإدارة
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFullScreen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>⤓</span>
                  <span>العودة للوضع المصغر (Esc)</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="px-4 sm:px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`text-xs px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-sky-500 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  جميع الرسائل ({windowMessages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('manager')}
                  className={`text-xs px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    filterType === 'manager'
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'bg-slate-800 text-amber-300/80 hover:text-amber-200 border border-slate-700'
                  }`}
                >
                  <span>👑 توجيهات المدير</span>
                  <span>({windowMessages.filter(m => m.senderType === 'admin').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('broadcast')}
                  className={`text-xs px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    filterType === 'broadcast'
                      ? 'bg-orange-500 text-slate-950 font-black shadow'
                      : 'bg-slate-800 text-orange-300/80 hover:text-orange-200 border border-slate-700'
                  }`}
                >
                  <span>📢 التعميمات العامة</span>
                  <span>({windowMessages.filter(m => m.text.startsWith('📢 [تعميم')).length})</span>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في محتوى الرسائل..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 pl-7"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Browse and Scroll Toolbar for Full Screen */}
            <div className="px-4 sm:px-6 py-2 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs select-none">
              {/* Orientation Switcher: Vertical vs Horizontal */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold hidden sm:inline">طريقة الاستعراض:</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBrowseOrientation('vertical')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      browseOrientation === 'vertical'
                        ? 'bg-sky-500 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="شريط استعراض عمودي كالمعتاد"
                  >
                    <span>↕</span>
                    <span>شريط استعراض عمودي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrowseOrientation('horizontal')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      browseOrientation === 'horizontal'
                        ? 'bg-sky-500 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="شريط استعراض أفقي مع كروت متجاورة وشريط تمرير أفقي"
                  >
                    <span>↔</span>
                    <span>شريط استعراض أفقي</span>
                  </button>
                </div>
              </div>

              {/* Navigation Controls & Scrubber */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Scrubber slider */}
                <div className="hidden md:flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">سحب للاستعراض السريع:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={scrollProgress}
                    onChange={(e) => handleSliderChange(Number(e.target.value))}
                    className="w-28 accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    title="شريط سحب للتنقل في المحادثة"
                  />
                  <span className="text-[10px] text-sky-400 font-mono w-8 text-center">{scrollProgress}%</span>
                </div>

                {/* Step buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleScrollStep('start')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-bold transition cursor-pointer"
                    title="الانتقال للبداية (أقدم رسالة)"
                  >
                    ⏮ البداية
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScrollStep('prev')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-bold transition cursor-pointer"
                    title={browseOrientation === 'horizontal' ? 'تمرير لليمين' : 'تمرير للأعلى'}
                  >
                    {browseOrientation === 'horizontal' ? '◀ السابق' : '▲ للأعلى'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScrollStep('next')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-bold transition cursor-pointer"
                    title={browseOrientation === 'horizontal' ? 'تمرير لليسار' : 'تمرير للأسفل'}
                  >
                    {browseOrientation === 'horizontal' ? 'التالي ▶' : 'للأسفل ▼'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScrollStep('end')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-bold transition cursor-pointer"
                    title="الانتقال للنهاية (أحدث رسالة)"
                  >
                    الأحدث ⏭
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area (Supports Vertical & Horizontal Browsing) */}
            <div 
              ref={fullScreenScrollContainerRef}
              onScroll={handleContainerScroll}
              className={`flex-1 bg-slate-950/70 ${
                browseOrientation === 'horizontal'
                  ? 'overflow-x-auto overflow-y-hidden p-4 sm:p-6 flex items-stretch gap-4'
                  : 'overflow-y-auto p-4 sm:p-6 space-y-4'
              }`}
            >
              {fullScreenFilteredMessages.length === 0 ? (
                <div className="h-full w-full min-h-[250px] flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <span className="text-4xl mb-3">💬</span>
                  <p className="text-sm font-bold text-slate-300">
                    {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا توجد رسائل مسجلة حتى الآن'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {searchQuery ? 'جرب البحث بكلمة أخرى' : 'أي توجيه أو استفسار سيظهر هنا مباشرة وبشكل كامل'}
                  </p>
                </div>
              ) : browseOrientation === 'horizontal' ? (
                /* Horizontal Card Browsing with Horizontal Scrollbar */
                fullScreenFilteredMessages.map((msg) => {
                  const isFromAdmin = msg.senderType === 'admin';
                  const isBroadcast = msg.text.startsWith('📢 [تعميم');

                  return (
                    <div
                      key={msg.id}
                      className={`w-[300px] sm:w-[360px] shrink-0 rounded-2xl p-4 shadow-lg flex flex-col justify-between border ${
                        isBroadcast
                          ? 'bg-amber-950/60 text-amber-100 border-2 border-amber-500/60 ring-1 ring-amber-500/30'
                          : isFromAdmin
                            ? 'bg-slate-800 text-white border border-amber-500/40 shadow-xl'
                            : 'bg-sky-900/70 text-white border border-sky-500/50'
                      }`}
                    >
                      <div>
                        {/* Header: Sender & Time */}
                        <div className="flex items-center justify-between mb-2 text-xs text-slate-400">
                          <span className={`font-bold ${isFromAdmin ? 'text-amber-400' : 'text-sky-300'}`}>
                            {isFromAdmin ? (isBroadcast ? '📢 تعميم إداري' : '👑 المدير / الإدارة') : 'أنت'}
                          </span>
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <span>{formatTime(msg.timestamp)}</span>
                            <span className="text-[10px] text-slate-500">({formatDate(msg.timestamp)})</span>
                          </div>
                        </div>

                        {/* Content */}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-2 border-t border-white/10 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          className="opacity-70 hover:opacity-100 transition cursor-pointer text-slate-300 hover:text-white flex items-center gap-1"
                        >
                          <span>📋</span>
                          <span>{copiedId === msg.id ? 'تم النسخ ✓' : 'نسخ النص'}</span>
                        </button>

                        <div className={isFromAdmin ? 'text-amber-300' : 'text-sky-200'}>
                          {isFromAdmin ? (
                            <span>{msg.readByWindow ? '✓ تمت القراءة' : '● جديد'}</span>
                          ) : (
                            <span>{msg.readByAdmin ? '✓✓ اطلع عليها المدير' : '✓ تم الإرسال'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Vertical Bubble Browsing with Vertical Scrollbar */
                fullScreenFilteredMessages.map((msg) => {
                  const isFromAdmin = msg.senderType === 'admin';
                  const isBroadcast = msg.text.startsWith('📢 [تعميم');

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isFromAdmin ? 'items-start' : 'items-end'}`}
                    >
                      {/* Header: Sender & Full Time */}
                      <div className="flex items-center gap-2 mb-1 text-xs text-slate-400">
                        <span className={`font-bold ${isFromAdmin ? 'text-amber-400' : 'text-sky-300'}`}>
                          {isFromAdmin ? (isBroadcast ? '📢 تعميم إداري' : '👑 المدير / الإدارة') : 'أنت'}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{formatTime(msg.timestamp)}</span>
                        <span className="text-[10px] text-slate-500">({formatDate(msg.timestamp)})</span>
                      </div>

                      {/* Message Bubble */}
                      <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 shadow-md relative group ${
                        isBroadcast
                          ? 'bg-amber-950/60 text-amber-100 border-2 border-amber-500/60 rounded-tr-sm ring-1 ring-amber-500/30'
                          : isFromAdmin
                            ? 'bg-slate-800 text-white border border-amber-500/40 rounded-tr-sm shadow-lg'
                            : 'bg-sky-600 text-white rounded-tl-sm'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/10 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.id, msg.text)}
                            className="opacity-70 hover:opacity-100 transition cursor-pointer text-slate-300 hover:text-white flex items-center gap-1"
                          >
                            <span>📋</span>
                            <span>{copiedId === msg.id ? 'تم النسخ ✓' : 'نسخ النص'}</span>
                          </button>

                          <div className={isFromAdmin ? 'text-amber-300' : 'text-sky-200'}>
                            {isFromAdmin ? (
                              <span>{msg.readByWindow ? '✓ تمت القراءة' : '● جديد'}</span>
                            ) : (
                              <span>{msg.readByAdmin ? '✓✓ اطلع عليها المدير' : '✓ تم الإرسال'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={fullScreenMessagesEndRef} />
            </div>

            {/* Quick Replies Bar */}
            <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 shrink-0 overflow-x-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 whitespace-nowrap shrink-0">ردود سريعة:</span>
                <div className="flex gap-1.5">
                  {QUICK_EMPLOYEE_REPLIES.map((reply, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(reply)}
                      className="text-xs bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-slate-300 border border-slate-700/80 hover:border-sky-500/50 px-2.5 py-1 rounded-lg whitespace-nowrap transition cursor-pointer shrink-0"
                    >
                      {reply}
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
              className="p-3 sm:p-4 bg-slate-850 border-t border-slate-800 flex items-center gap-2 sm:gap-3 shrink-0"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="اكتب ردك أو استفسارك للمدير هنا واضغط Enter للإرسال..."
                  className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-sky-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors pl-8"
                  autoFocus
                />
                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full text-xs cursor-pointer"
                    title="مسح النص"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-sky-500 text-white font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer text-sm shadow-md shrink-0 h-[42px]"
                title="إرسال الرسالة"
              >
                <span>إرسال</span>
                <span className="text-xs">➤</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
