import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      scanner.render((decodedText) => {
        onScan(decodedText);
        scanner.clear();
        onClose();
      }, (error) => {
        // console.warn(error);
      });
      
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [isOpen, onScan, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Camera size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Scan QR Code</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Livestock ID Scanner</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>
              
              <div id="qr-reader" className="overflow-hidden rounded-[32px] border-4 border-slate-50 bg-slate-50" />
              
              <div className="mt-8 p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-800 leading-relaxed text-center">
                  Elekeza kamera yako kwenye QR code ya mifugo ili kuona taarifa zake, afya, na historia ya chanjo.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
