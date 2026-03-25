import React from 'react';
import { Product } from '../types';
import { formatCurrency, cn } from '../utils';
import { Star, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  isOpen?: boolean;
  rating?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, isOpen = true, rating = 0 }) => {
  const { t, systemSettings, cart, addToCart, updateCartQty } = useApp();
  const currency = systemSettings?.currency || 'TZS';

  const cartItem = Array.isArray(cart) ? cart.find(item => item.productId === product.id) : undefined;
  
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

        {/* Add to Cart Button - Floating between image and text */}
        <div className="absolute -bottom-6 right-4 sm:right-6 z-10">
          <AnimatePresence mode="wait">
            {cartItem ? (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center bg-amber-600 text-white rounded-[20px] p-1 shadow-lg h-12"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => updateCartQty(product.id, -1)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-2xl transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center text-sm font-black">{cartItem.qty}</span>
                <button 
                  onClick={() => updateCartQty(product.id, 1)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-2xl transition-colors"
                >
                  <Plus size={16} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product, 1);
                }}
                className="w-12 h-12 bg-white dark:bg-slate-800 text-amber-600 rounded-[20px] flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-none border border-slate-50 dark:border-slate-700 hover:text-amber-700 transition-all duration-300 pointer-events-auto"
              >
                <Plus size={24} strokeWidth={3} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
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
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
              {product.vendorName[0]}
            </div>
            <p className="text-[9px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 truncate hidden xs:block">
              {product.vendorName}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-full border border-slate-100 dark:border-slate-700/50">
            <p className="text-[11px] sm:text-sm font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
              {formatCurrency(product.price, currency)}
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 ml-0.5">/{product.unit}</span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
