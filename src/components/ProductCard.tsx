import React from 'react';
import { Product } from '../types';
import { formatCurrency } from '../utils';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  isOpen?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, isOpen = true }) => {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-[24px] border border-amber-100 overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:shadow-amber-100/50 transition-all duration-300"
    >
      <div className="aspect-square bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-6xl relative">
        {product.emoji}
        {!isOpen && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              🔒 Closed
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
            {product.category}
          </span>
          <div className="flex items-center gap-0.5">
            <Star size={10} className="fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-bold text-slate-400">4.8</span>
          </div>
        </div>
        <h3 className="font-bold text-slate-900 text-sm leading-tight mb-1 line-clamp-1">
          {product.name}
        </h3>
        <p className="text-[10px] text-slate-400 mb-3 flex items-center gap-1">
          <span>📍</span> {product.location} · {product.vendorName}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-amber-700">
            {formatCurrency(product.price)}
          </p>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"
          )} />
        </div>
      </div>
    </motion.div>
  );
};

import { cn } from '../utils';
