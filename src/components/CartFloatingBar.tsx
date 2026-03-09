import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface CartFloatingBarProps {
  onClick: () => void;
}

export const CartFloatingBar: React.FC<CartFloatingBarProps> = ({ onClick }) => {
  const { cart } = useApp();
  
  if (cart.length === 0) return null;

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  
  // Get unique images for the thumbnails (up to 3)
  const thumbnails = Array.from(new Set(cart.map(item => item.image))).slice(0, 3);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md"
      >
        <button
          onClick={onClick}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-2 pl-4 pr-2 flex items-center justify-between shadow-2xl shadow-emerald-900/20 transition-all active:scale-95 group"
        >
          <div className="flex items-center gap-3">
            {/* Thumbnails Stack */}
            <div className="flex -space-x-3">
              {thumbnails.map((img, i) => (
                <div 
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-emerald-600 bg-white overflow-hidden shadow-sm"
                  style={{ zIndex: 3 - i }}
                >
                  <img 
                    src={img} 
                    alt="" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col items-start leading-none">
              <span className="text-sm font-black tracking-tight">View Cart</span>
              <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                {totalItems} {totalItems === 1 ? 'ITEM' : 'ITEMS'}
              </span>
            </div>
          </div>

          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <ChevronRight size={24} />
          </div>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
