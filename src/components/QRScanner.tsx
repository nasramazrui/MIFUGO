import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, title = "Scan QR Code" }) => {
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (activeMode === 'camera') {
      // Initialize scanner
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          onScan(decodedText);
          scanner.clear();
        },
        (errorMessage) => {
          // Only log errors if they are not "NotFound"
          if (!errorMessage.includes("NotFound")) {
            console.warn(errorMessage);
          }
        }
      );

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        scannerRef.current = null;
      }
    };
  }, [onScan, activeMode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-white/10"
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-amber-950 shadow-lg">
              {activeMode === 'camera' ? <Camera size={20} /> : <RefreshCw size={20} />}
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white leading-tight">{title}</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                {activeMode === 'camera' ? 'Elekeza kamera kwenye kodi' : 'Ingiza namba ya kodi hapa'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveMode('camera')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeMode === 'camera' ? "bg-white dark:bg-slate-700 text-amber-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Kamera
            </button>
            <button 
              onClick={() => setActiveMode('manual')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeMode === 'manual' ? "bg-white dark:bg-slate-700 text-amber-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Manual
            </button>
          </div>

          {activeMode === 'camera' ? (
            <div id="qr-reader" className="overflow-hidden rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950" />
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Namba ya Kodi</label>
                <input 
                  type="text"
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm dark:text-white"
                  placeholder="Mfano: ORDER:12345"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-amber-950 font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                THIBITISHA KODI
              </button>
            </form>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
              <X size={14} />
              {error}
            </div>
          )}

          <div className="mt-6">
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
              {activeMode === 'camera' ? 'Hakikisha una mwanga wa kutosha' : 'Hakikisha kodi ni sahihi'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
