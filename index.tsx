
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// معالج أخطاء عالمي لتشخيص الأخطاء غير المتوقعة
window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (msg.includes('WebSocket') || msg.includes('closed without opened')) {
    event.preventDefault();
    return;
  }
  console.error('Global Uncaught Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = event?.reason?.message || String(event?.reason || '');
  // Ignore WebSocket HMR/closed errors per environment instructions
  if (reasonStr.includes('WebSocket') || reasonStr.includes('closed without opened')) {
    event.preventDefault();
    return;
  }
  console.error('Unhandled Promise Rejection:', event.reason);
});

// تسجيل الـ Service Worker للعمل بدون إنترنت
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('SW registered successfully');
      })
      .catch(error => {
        console.warn('SW registration failed:', error);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical: Root element not found");
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
