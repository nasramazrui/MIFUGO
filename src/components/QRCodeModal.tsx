import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Share2, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  subtitle?: string;
  logo?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ 
  isOpen, 
  onClose, 
  url, 
  title, 
  subtitle,
  logo = 'https://cdn-icons-png.flaticon.com/512/2395/2395796.png' // Default livestock icon
}) => {
  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 1024, 1024);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR-${title.replace(/\s+/g, '-')}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const shareQRCode = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: subtitle || `Check out this ${title} on Digital Livestock Market`,
          url: url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

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
            className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-8 text-center">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
              
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600">
                  <QrCode size={32} />
                </div>
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2">{title}</h3>
              {subtitle && <p className="text-sm font-bold text-slate-500 mb-8">{subtitle}</p>}
              
              <div className="bg-white p-6 rounded-[32px] border-4 border-emerald-50 shadow-inner inline-block mb-8">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={url}
                  size={200}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: logo,
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={downloadQRCode}
                  className="flex items-center justify-center gap-2 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
                >
                  <Download size={18} /> Download
                </button>
                <button
                  onClick={shareQRCode}
                  className="flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-emerald-100"
                >
                  <Share2 size={18} /> Share
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Digital Livestock Market • QR ID
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
