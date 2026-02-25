import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ShopPage } from './pages/ShopPage';
import { VendorPortal } from './pages/VendorPortal';
import { AdminPanel } from './pages/AdminPanel';
import { Toaster } from 'react-hot-toast';

const AppContent: React.FC = () => {
  const { user, loading, systemSettings } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-8">
          <div className="relative">
            <div className="text-8xl animate-pulse select-none flex items-center justify-center">
              {systemSettings?.loading_url ? (
                <img 
                  src={systemSettings.loading_url} 
                  alt="Loading..." 
                  className="w-32 h-32 object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                systemSettings?.loading_icon || '🚜'
              )}
            </div>
            {!systemSettings?.loading_icon && !systemSettings?.loading_url && (
              <div className="absolute -bottom-2 -right-2 text-4xl animate-bounce">🌱</div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-black text-amber-900 tracking-tighter">
              {systemSettings?.app_name || 'FarmConnect'}
            </h1>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i} 
                  className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" 
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Inapakia Soko la Kilimo...</p>
        </div>
      </div>
    );
  }

  // Simple role-based routing
  if (user?.role === 'admin') {
    return <AdminPanel />;
  }

  if (user?.role === 'vendor') {
    return <VendorPortal />;
  }

  return <ShopPage />;
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster 
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#78350f',
            color: '#fff',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: 'bold',
          },
        }}
      />
    </AppProvider>
  );
}
