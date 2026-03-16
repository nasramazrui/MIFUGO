import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, title = "Scan QR Code" }) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
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

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [onScan]);

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
              <Camera size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white leading-tight">{title}</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Elekeza kamera kwenye kodi</p>
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
          <div id="qr-reader" className="overflow-hidden rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950" />
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
              <X size={14} />
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-sm font-black text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Anza Upya
            </button>
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
              Hakikisha una mwanga wa kutosha
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
