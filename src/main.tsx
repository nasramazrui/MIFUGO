import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { toast } from 'react-hot-toast';

// Global error handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Rejection:', event.reason);
  let message = 'Unknown error';
  
  if (event.reason) {
    const reasonStr = String(event.reason);
    if (reasonStr.includes('WebSocket closed without opened') || 
        reasonStr.includes('failed to connect to websocket') ||
        reasonStr.includes('vite')) {
      return;
    }

    if (typeof event.reason === 'string') {
      message = event.reason;
    } else if (event.reason.message) {
      message = event.reason.message;
    } else {
      try {
        message = JSON.stringify(event.reason);
      } catch (e) {
        message = String(event.reason);
      }
    }
  }

  // Try to parse JSON error if it looks like one
  if (message.startsWith('{') && message.endsWith('}')) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.error) message = parsed.error;
    } catch (e) {
      // Not valid JSON or doesn't have error field
    }
  }

  if (message && message !== 'undefined' && message !== 'null') {
    toast.error(`Hitilafu ya Mfumo: ${message}`);
  }
});

window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error);
  let message = event.message || 'Unknown error';
  
  if (event.error) {
    const errorStr = String(event.error);
    if (errorStr.includes('WebSocket closed without opened') || 
        errorStr.includes('failed to connect to websocket') ||
        errorStr.includes('vite')) {
      return;
    }

    if (typeof event.error === 'string') {
      message = event.error;
    } else if (event.error.message) {
      message = event.error.message;
    } else {
      try {
        message = JSON.stringify(event.error);
      } catch (e) {
        message = String(event.error);
      }
    }
  }

  if (message && message !== 'undefined' && message !== 'null') {
    // Try to parse JSON error if it looks like one
    if (message.startsWith('{') && message.endsWith('}')) {
      try {
        const parsed = JSON.parse(message);
        if (parsed.error) message = parsed.error;
      } catch (e) {
        // Not valid JSON or doesn't have error field
      }
    }
    toast.error(`Hitilafu ya Mfumo: ${message}`);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
