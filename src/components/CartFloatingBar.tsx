import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../utils';

interface CartFloatingBarProps {
  onClick: () => void;
}

export const CartFloatingBar: React.FC<CartFloatingBarProps> = ({ onClick }) => {
  const { cart, t } = useApp();
  
  if (cart.length === 0) return null;

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  
  // Get unique item images (up to 5)
  const thumbnails = cart.slice(0, 5).map(item => item.image || item.emoji);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-24 left-4 right-4 z-40 flex justify-center"
    >
      <button
        onClick={onClick}
        className="bg-emerald-600 text-white px-6 py-4 rounded-[32px] shadow-2xl shadow-emerald-900/40 flex items-center gap-6 group hover:bg-emerald-700 transition-all active:scale-95 border border-emerald-500/30 backdrop-blur-md"
      >
        <div className="flex -space-x-3">
          {cart.slice(0, 5).map((item, i) => (
            <div 
              key={item.id} 
              className="w-10 h-10 rounded-full border-2 border-emerald-600 bg-white overflow-hidden flex items-center justify-center shadow-lg"
              style={{ zIndex: 5 - i }}
            >
              {item.image ? (
                <img src={item.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">{item.emoji || '📦'}</span>
              )}
            </div>
          ))}
          {cart.length > 5 && (
            <div className="w-10 h-10 rounded-full border-2 border-emerald-600 bg-emerald-800 flex items-center justify-center text-[10px] font-black z-0 shadow-lg">
              +{cart.length - 5}
            </div>
          )}
        </div>

        <div className="text-left">
          <p className="text-sm font-black leading-tight">{t('view_cart') || 'View Cart'}</p>
          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
            {totalItems} {totalItems === 1 ? t('item') || 'ITEM' : t('items') || 'ITEMS'}
          </p>
        </div>

        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
          <ChevronRight size={20} />
        </div>
      </button>
    </motion.div>
  );
};
