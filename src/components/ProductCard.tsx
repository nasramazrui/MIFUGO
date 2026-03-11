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

  const cartItem = cart.find(item => item.productId === product.id);
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[32px] border border-slate-100 dark:border-slate-800/50 overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-amber-900/5 transition-all duration-500 flex flex-col h-full"
    >
      <div 
        onClick={onClick}
        className="aspect-square sm:aspect-[4/5] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center relative overflow-hidden"
      >
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-6xl group-hover:scale-125 transition-transform duration-500">{product.emoji}</span>
        )}
        
        {/* Overlay Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
          <div className={cn(
            "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm",
            isOpen ? "bg-white/90 text-emerald-600 dark:bg-slate-900/90" : "bg-red-500 text-white"
          )}>
            {isOpen ? `● ${t('open')}` : `🔒 ${t('closed')}`}
          </div>
          
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-xl flex items-center gap-1 shadow-sm">
            <Star size={10} className={cn(rating > 0 ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700")} />
            <span className="text-[10px] font-black text-slate-900 dark:text-white">{rating > 0 ? rating.toFixed(1) : '0'}</span>
          </div>
        </div>

        {/* Add to Cart Button */}
        <div className="absolute bottom-4 right-4">
          <AnimatePresence mode="wait">
            {cartItem ? (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center bg-amber-600 text-white rounded-2xl p-1 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => updateCartQty(product.id, -1)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-xs font-black">{cartItem.qty}</span>
                <button 
                  onClick={() => updateCartQty(product.id, 1)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Plus size={14} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product, 1);
                }}
                className="w-10 h-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-amber-600 rounded-2xl flex items-center justify-center shadow-lg hover:bg-amber-600 hover:text-white transition-all duration-300 pointer-events-auto"
              >
                <Plus size={20} strokeWidth={3} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-3 sm:p-5 flex-1 flex flex-col" onClick={onClick}>
        <div className="mb-2 sm:mb-3">
          <span className="text-[8px] sm:text-[10px] font-black text-amber-600/60 dark:text-amber-500/60 uppercase tracking-[0.2em] mb-0.5 sm:mb-1 block">
            {t(product.category)}
          </span>
          <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-tight group-hover:text-amber-600 transition-colors duration-300 line-clamp-2">
            {product.name}
          </h3>
        </div>
        
        <div className="flex items-center justify-between mt-auto gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[8px] sm:text-[10px] font-black text-slate-400">
              {product.vendorName[0]}
            </div>
            <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
              {product.vendorName}
            </p>
          </div>
          <p className="text-[10px] sm:text-xs font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {formatCurrency(product.price, currency)}
            <span className="text-[8px] sm:text-[10px] font-medium text-slate-400 ml-0.5">/{product.unit}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};
