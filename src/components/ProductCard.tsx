import React, { useState } from 'react';
import { Product } from '../types';
import { formatCurrency, cn } from '../utils';
import { Star, Plus, Minus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { toast } from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onVendorClick?: (vendorId: string) => void;
  isOpen?: boolean;
  rating?: number;
  vendorAvatar?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onVendorClick, isOpen = true, rating = 0 }) => {
  const { t, systemSettings, addToCart, vendors } = useApp();
  const [isAdded, setIsAdded] = useState(false);
  const currency = systemSettings?.currency || 'TZS';
  const vendor = vendors.find(v => v.id === product.vendorId);
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] border border-slate-100 dark:border-slate-800/50 overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full relative"
    >
      <div 
        onClick={onClick}
        className="aspect-square sm:aspect-[4/5] bg-[#F8FAFC] dark:bg-slate-800/50 flex items-center justify-center relative"
      >
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-6xl sm:text-8xl group-hover:scale-110 transition-transform duration-500 drop-shadow-sm">{product.emoji}</span>
        )}
        
        {/* Vendor Avatar */}
        {vendor && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onVendorClick?.(product.vendorId);
            }}
            className="absolute bottom-4 left-4 z-10 hover:scale-110 transition-transform"
            title={vendor.name}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white dark:border-slate-800 shadow-lg overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center">
              {vendor.avatar?.startsWith('http') ? (
                <img src={vendor.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg sm:text-xl">{vendor.avatar || '👤'}</div>
              )}
            </div>
          </div>
        )}

        {/* Rating Badge */}
        <div className="absolute top-4 right-4">
          <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-slate-100 dark:border-slate-700">
            <Star size={12} className={cn(rating > 0 ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600")} />
            <span className="text-xs font-black text-slate-900 dark:text-white">{rating > 0 ? rating.toFixed(1) : '0'}</span>
          </div>
        </div>

        {/* Status Badge (Optional, kept for functionality but styled minimally) */}
        {!isOpen && (
          <div className="absolute top-4 left-4">
            <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
              🔒 {t('closed')}
            </div>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 pt-8 sm:pt-10 flex-1 flex flex-col bg-white dark:bg-slate-900" onClick={onClick}>
        <div className="mb-4">
          <span className="text-[10px] sm:text-[11px] font-black text-[#D97706] dark:text-amber-500 uppercase tracking-widest mb-1.5 block">
            {t(product.category)}
          </span>
          <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg leading-tight group-hover:text-amber-600 transition-colors duration-300 line-clamp-2">
            {product.name}
          </h3>
        </div>
        
        <div className="flex items-center justify-between mt-auto gap-2 pt-4 border-t border-slate-50 dark:border-slate-800/30">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-full border border-slate-100 dark:border-slate-700/50">
            <p className="text-[11px] sm:text-sm font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
              {formatCurrency(product.price, currency)}
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 ml-0.5">/{product.unit}</span>
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={isAdded ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
            onClick={(e) => {
              e.stopPropagation();
              if (isAdded) return;
              setIsAdded(true);
              addToCart(product, 1);
              toast.success('Imeongezwa! 🛒', {
                icon: '🛒',
                style: {
                  borderRadius: '20px',
                  background: '#050A18',
                  color: '#fff',
                  border: '1px solid #f59e0b',
                  fontWeight: '900',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }
              });
              setTimeout(() => setIsAdded(false), 800);
            }}
            className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
              isAdded 
                ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                : "bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600"
            )}
          >
            {isAdded ? <Check size={18} /> : <Plus size={18} />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
