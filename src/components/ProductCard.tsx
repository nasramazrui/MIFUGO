import React from 'react';
import { Product } from '../types';
import { formatCurrency, cn } from '../utils';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  isOpen?: boolean;
  rating?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, isOpen = true, rating = 0 }) => {
  const { t } = useApp();
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800/50 overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-amber-900/5 transition-all duration-500"
    >
      <div className="aspect-[4/5] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center relative overflow-hidden">
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

        {/* Price Tag Overlay */}
        <div className="absolute bottom-4 right-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
          <div className="bg-amber-600 text-white px-4 py-2 rounded-2xl font-black text-xs shadow-xl">
            {formatCurrency(product.price)}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-3">
          <span className="text-[10px] font-black text-amber-600/60 dark:text-amber-500/60 uppercase tracking-[0.2em] mb-1 block">
            {t(product.category)}
          </span>
          <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight group-hover:text-amber-600 transition-colors duration-300">
            {product.name}
          </h3>
        </div>
        
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
              {product.vendorName[0]}
            </div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[100px]">
              {product.vendorName}
            </p>
          </div>
          <p className="text-xs font-black text-slate-900 dark:text-slate-100">
            {formatCurrency(product.price)}
            <span className="text-[10px] font-medium text-slate-400 ml-1">/{product.unit}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};
