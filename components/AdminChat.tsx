import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { Button } from './shared/Button';
import { Modal } from './shared/Modal';

interface AdminChatProps {
  initialWindowId?: number | null;
}

const QUICK_ADMIN_MESSAGES = [
  'يرجى تسريع وتيرة الخدمة ⏱️',
  'عميل VIP قادم إليك ⭐',
  'استراحة قصيرة 10 دقائق ☕',
  'هل تحتاج مساعدة؟ ❓',
  'تحويل المعاملة للإدارة 📑',
  'عمل ممتاز استمروا 👍'
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [browseOrientation, setBrowseOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const windows = state?.windows || [];
  const employees = state?.employees || [];
  const allMessages = state?.chatMessages || [];

  // Lock body scroll in full screen mode and support Escape key
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

  // Select initial window or first available
  useEffect(() => {
    if (initialWindowId && windows.some(w => Number(w.id) === Number(initialWindowId))) {
      setSelectedWindowId(Number(initialWindowId));
      setMobileView('chat');
    } else if (!selectedWindowId && windows.length > 0) {
      setSelectedWindowId(Number(windows[0].id));
    }
  }, [initialWindowId, windows]);

  // Mark messages as read by admin when window is selected
  useEffect(() => {
    if (selectedWindowId) {
      markChatMessagesAsRead(selectedWindowId, 'admin');
    }
  }, [selectedWindowId, allMessages.length, markChatMessagesAsRead]);

  // Scroll to latest message
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (browseOrientation === 'horizontal') {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          left: messagesContainerRef.current.scrollWidth,
          behavior
        });
      }
    } else {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior });
      }
    }
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [selectedWindowId, browseOrientation]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [allMessages.length]);

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

  const totalUnread = Object.values(unreadCountByWindow).reduce((a, b) => a + b, 0);

  // Filter windows by search query
  const filteredWindows = useMemo(() => {
    if (!searchQuery.trim()) return windows;
    const q = searchQuery.toLowerCase();
    return windows.filter(win => {
      const emp = employees.find(e => Number(e.windowId) === Number(win.id) || Number(e.id) === Number(win.employeeId));
      return (
        win.name.toLowerCase().includes(q) ||
        (emp && emp.name.toLowerCase().includes(q)) ||
        win.id.toString().includes(q)
      );
    });
  }, [windows, employees, searchQuery]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedWindowId) return;

    await sendChatMessage(selectedWindowId, 'admin', 'المدير العام', text);
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
    if (window.confirm(`مسح محادثة ${selectedWindow?.name}؟`)) {
      await clearChatHistory(selectedWindowId);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 1500);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  if (windows.length === 0) {
    return (
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center text-slate-400">
        <span className="text-4xl mb-3 block">🏢</span>
        <h4 className="text-lg font-bold text-white mb-1">لا توجد شبابيك خدمة</h4>
        <p className="text-sm">أضف شبابيك خدمة أولاً للتواصل معها.</p>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col transition-all ${
      isFullScreen 
        ? 'fixed inset-0 z-50 rounded-none h-screen w-screen p-3 sm:p-5 bg-slate-950/95' 
        : 'rounded-2xl h-[560px] sm:h-[620px]'
    }`}>
      
      {/* SIMPLE HEADER BAR */}
      <div className="bg-slate-850 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">💬</span>
          <h2 className="font-bold text-sm text-white">محادثة الشبابيك</h2>
          {totalUnread > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              {totalUnread} جديدة
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Orientation Toggle (Vertical / Horizontal) */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setBrowseOrientation('vertical')}
              className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                browseOrientation === 'vertical' 
                  ? 'bg-sky-500 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="عرض عمودي"
            >
              ↕ عمودي
            </button>
            <button
              type="button"
              onClick={() => setBrowseOrientation('horizontal')}
              className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                browseOrientation === 'horizontal' 
                  ? 'bg-sky-500 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="عرض أفقي"
            >
              ↔ أفقي
            </button>
          </div>

          {/* Broadcast Button */}
          <button
            type="button"
            onClick={() => setIsBroadcastModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-1.5 px-2.5 sm:px-3 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
            title="إرسال تعميم لجميع الشبابيك"
          >
            <span>📢</span>
            <span className="hidden sm:inline">تعميم للجميع</span>
            <span className="sm:hidden">تعميم</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs py-1.5 px-2.5 rounded-lg transition cursor-pointer flex items-center gap-1"
            title={isFullScreen ? 'تصغير' : 'ملء الشاشة'}
          >
            <span>{isFullScreen ? '✕' : '⛶'}</span>
            <span className="hidden md:inline">{isFullScreen ? 'تصغير' : 'ملء الشاشة'}</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-PANE BODY */}
      <div className="flex-1 flex overflow-hidden">

        {/* SIDEBAR: WINDOWS LIST */}
        <div className={`w-full md:w-72 lg:w-80 border-l border-slate-800 bg-slate-900/90 flex flex-col shrink-0 ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Simple Search */}
          <div className="p-2 border-b border-slate-800">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 بحث عن شباك..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Windows Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {filteredWindows.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">
                لا توجد شبابيك مطابقة
              </div>
            ) : (
              filteredWindows.map(win => {
                const isSelected = Number(win.id) === Number(selectedWindowId);
                const emp = employees.find(e => Number(e.windowId) === Number(win.id) || Number(e.id) === Number(win.employeeId));
                const unread = unreadCountByWindow[Number(win.id)] || 0;

                return (
                  <button
                    key={win.id}
                    onClick={() => {
                      setSelectedWindowId(Number(win.id));
                      setMobileView('chat');
                    }}
                    className={`w-full text-right p-3 transition flex items-center gap-2.5 cursor-pointer ${
                      isSelected 
                        ? 'bg-sky-500/15 border-r-3 border-sky-400 text-white' 
                        : 'hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    {/* Window badge */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected 
                        ? 'bg-sky-500 text-white shadow-sm' 
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {win.id}
                    </div>

                    {/* Window Name & Employee */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">
                          {win.name}
                        </span>
                        {unread > 0 && (
                          <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate mt-0.5 ${emp ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {emp ? `👤 ${emp.name}` : '⚪ شباك شاغر'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* CHAT CONVERSATION VIEW */}
        <div className={`flex-1 flex flex-col bg-slate-950 min-w-0 ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}>
          {selectedWindow ? (
            <>
              {/* Simple Chat Header */}
              <div className="px-3 py-2 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Back to list on mobile */}
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="md:hidden text-xs text-sky-400 hover:text-white px-2 py-1 rounded bg-slate-800"
                  >
                    ← الشبابيك
                  </button>
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                    {selectedWindow.id}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-xs sm:text-sm truncate">
                      {selectedWindow.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {selectedWindowEmployee ? `الموظف: ${selectedWindowEmployee.name}` : 'شباك شاغر'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearCurrent}
                  title="مسح سجل المحادثة"
                  className="text-[11px] text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-2 py-1 rounded transition cursor-pointer"
                >
                  مسح السجل
                </button>
              </div>

              {/* Messages Area with High Visibility Scrollbar */}
              <div 
                ref={messagesContainerRef}
                className={`flex-1 ${
                  browseOrientation === 'horizontal'
                    ? 'overflow-x-auto overflow-y-hidden p-3 sm:p-4 flex items-stretch gap-2.5'
                    : 'overflow-y-auto p-3 sm:p-4 space-y-3'
                }`}
              >
                {currentWindowMessages.length === 0 ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                    <span className="text-3xl mb-2">💬</span>
                    <p className="text-sm font-bold text-slate-300">لا توجد رسائل مع {selectedWindow.name}</p>
                    <p className="text-xs text-slate-500 mt-1">أرسل رسالة أو اختر توجيهاً سريعاً من الأسفل.</p>
                  </div>
                ) : browseOrientation === 'horizontal' ? (
                  /* Horizontal mode */
                  currentWindowMessages.map(msg => {
                    const isAdmin = msg.senderType === 'admin';
                    const isBroadcast = msg.text.startsWith('📢 [تعميم');

                    return (
                      <div
                        key={msg.id}
                        className={`w-[230px] sm:w-[280px] shrink-0 rounded-xl p-3 shadow-md flex flex-col justify-between border ${
                          isBroadcast
                            ? 'bg-amber-500/20 text-white border-amber-500/40'
                            : isAdmin 
                              ? 'bg-sky-600/90 text-white border-sky-400/50' 
                              : 'bg-slate-800 text-slate-100 border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5 text-[10px] text-slate-300">
                            <span className="font-bold">{isAdmin ? 'الإدارة' : msg.senderName}</span>
                            <span className="font-mono">{formatTime(msg.timestamp)}</span>
                          </div>
                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-1 border-t border-white/10 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.text)}
                            className="text-slate-300 hover:text-white cursor-pointer"
                          >
                            {copiedMsgId === msg.id ? 'تم النسخ ✓' : 'نسخ'}
                          </button>
                          <span>{isAdmin ? (msg.readByWindow ? '✓✓ مقروءة' : '✓ مرسلة') : ''}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Vertical mode */
                  currentWindowMessages.map(msg => {
                    const isAdmin = msg.senderType === 'admin';
                    const isBroadcast = msg.text.startsWith('📢 [تعميم');

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center gap-1 mb-0.5 text-[10px] text-slate-400">
                          <span className="font-bold">{isAdmin ? 'الإدارة' : msg.senderName}</span>
                          <span>•</span>
                          <span className="font-mono">{formatTime(msg.timestamp)}</span>
                        </div>
                        <div className={`max-w-[85%] sm:max-w-[75%] rounded-xl p-2.5 shadow-md ${
                          isBroadcast
                            ? 'bg-amber-500/20 text-white border border-amber-500/40 rounded-tr-sm'
                            : isAdmin 
                              ? 'bg-sky-600 text-white rounded-tr-sm' 
                              : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-sm'
                        }`}>
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                          <div className="flex justify-between items-center mt-1.5 pt-1 border-t border-white/10 text-[9px] text-slate-300">
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg.id, msg.text)}
                              className="hover:text-white cursor-pointer"
                            >
                              {copiedMsgId === msg.id ? 'تم النسخ ✓' : 'نسخ'}
                            </button>
                            {isAdmin && (
                              <span>{msg.readByWindow ? '✓✓ مقروءة' : '✓ مرسلة'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Canned Messages Bar - Very Simple */}
              <div className="px-2.5 py-1.5 bg-slate-900 border-t border-slate-800 overflow-x-auto">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[10px] text-slate-400 shrink-0 font-bold">توجيه سريع:</span>
                  {QUICK_ADMIN_MESSAGES.map((canned, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(canned)}
                      className="text-[11px] bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-lg whitespace-nowrap transition cursor-pointer shrink-0"
                    >
                      {canned}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input Form - Clean & Simple */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-2 sm:p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 sm:gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`اكتب رسالة إلى ${selectedWindow.name}...`}
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-lg sm:rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition text-xs sm:text-sm shrink-0 cursor-pointer"
                >
                  إرسال ➤
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6">
              <span className="text-4xl mb-2">💬</span>
              <p className="text-sm font-bold text-slate-300">اختر شباكاً للبدء بالمحادثة</p>
            </div>
          )}
        </div>

      </div>

      {/* BROADCAST MODAL */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="📢 إرسال تعميم لجميع الشبابيك"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-300">
            سيصل هذا التعميم فورياً لجميع شبابيك الخدمة ({windows.length} شبابيك) في وقت واحد.
          </p>

          <textarea
            rows={3}
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            placeholder="اكتب نص التعميم هنا..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-amber-500 focus:outline-none"
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              onClick={() => setIsBroadcastModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSendBroadcast}
              disabled={!broadcastText.trim()}
              className="!bg-amber-500 hover:!bg-amber-600 !text-slate-950 font-bold"
            >
              إرسال التعميم الآن
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
