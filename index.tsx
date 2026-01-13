
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// معالج أخطاء عالمي لتشخيص الأخطاء غير المتوقعة
window.addEventListener('error', (event) => {
  console.error('Global Uncaught Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
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
