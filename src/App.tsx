import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ShopPage } from './pages/ShopPage';
import { VendorPortal } from './pages/VendorPortal';
import { AdminPanel } from './pages/AdminPanel';
import { Toaster } from 'react-hot-toast';

const AppContent: React.FC = () => {
  const { user, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf8]">
        <div className="flex flex-col items-center gap-4">
          <div className="text-6xl animate-bounce">🐔</div>
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          <p className="font-serif italic text-xl text-amber-900">KukuMart Tanzania...</p>
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
