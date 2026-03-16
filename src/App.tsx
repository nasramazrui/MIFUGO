import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ShopPage } from './pages/ShopPage';
import { VendorPortal } from './pages/VendorPortal';
import { AdminPanel } from './pages/AdminPanel';
import { Toaster } from 'react-hot-toast';
import { applyThemeColor } from './utils/theme';
import { Wrench, LogIn } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { RecentPurchases } from './components/RecentPurchases';

const AppContent: React.FC = () => {
  const { user, loading, systemSettings, view } = useApp();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (systemSettings?.themeColor) {
      applyThemeColor(systemSettings.themeColor);
    }
  }, [systemSettings?.themeColor]);

  return (
    <>
      <div className="relative min-h-screen">
        {(() => {
          if (loading) {
            if (!systemSettings) {
              return (
                <div className="min-h-screen flex items-center justify-center bg-white">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Inapakia...</p>
                  </div>
                </div>
              );
            }

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
                      ) : systemSettings?.app_logo ? (
                        <img 
                          src={systemSettings.app_logo} 
                          alt="Loading..." 
                          className="w-32 h-32 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        systemSettings?.loading_icon || '🚜'
                      )}
                    </div>
                    {!systemSettings?.loading_icon && !systemSettings?.loading_url && !systemSettings?.app_logo && (
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

          // Simple role-based routing with view override
          if (systemSettings?.maintenanceMode && user?.role !== 'admin') {
            return (
              <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="bg-white rounded-[40px] border border-slate-100 p-10 max-w-md w-full text-center shadow-sm">
                  <div className="w-20 h-20 bg-amber-50 rounded-3xl mx-auto flex items-center justify-center text-amber-500 mb-6">
                    <Wrench size={40} />
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 mb-4">Mfumo Uko Kwenye Matengenezo</h1>
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    Tunaomba radhi, {systemSettings?.app_name || 'FarmConnect'} iko kwenye matengenezo kwa sasa ili kuboresha huduma zetu. Tafadhali rudi baadae.
                  </p>
                  <div className="flex gap-2 justify-center mb-8">
                    {[0, 1, 2].map((i) => (
                      <div 
                        key={i} 
                        className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" 
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100">
                    <button 
                      onClick={() => setIsAuthModalOpen(true)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold transition-colors"
                    >
                      <LogIn size={18} />
                      Ingia kama Admin
                    </button>
                  </div>
                </div>

                <AuthModal 
                  isOpen={isAuthModalOpen} 
                  onClose={() => setIsAuthModalOpen(false)} 
                />
              </div>
            );
          }

          if (view === 'shop') {
            return <ShopPage />;
          }

          if (user?.role === 'admin') {
            return <AdminPanel />;
          }

          if (user?.role === 'vendor') {
            return <VendorPortal />;
          }

          return <ShopPage />;
        })()}
        
        {/* Global Components */}
        <RecentPurchases />
      </div>
    </>
  );
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
