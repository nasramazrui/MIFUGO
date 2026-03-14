import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

export const RecentPurchases: React.FC = () => {
  const { orders } = useApp();
  const [currentOrder, setCurrentOrder] = useState<any>(null);

  useEffect(() => {
    if (orders.length === 0) return;

    // Show a random recent order every 15-30 seconds
    const interval = setInterval(() => {
      // Pick a random order from the top 10 most recent
      const recentOrders = orders.slice(0, 10);
      const randomOrder = recentOrders[Math.floor(Math.random() * recentOrders.length)];
      
      setCurrentOrder(randomOrder);

      // Hide after 5 seconds
      setTimeout(() => {
        setCurrentOrder(null);
      }, 5000);
    }, Math.random() * 15000 + 15000);

    return () => clearInterval(interval);
  }, [orders]);

  return (
    <AnimatePresence>
      {currentOrder && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 left-6 z-50 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 max-w-sm pointer-events-none"
        >
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-2xl overflow-hidden shrink-0">
            {currentOrder.items[0]?.image ? (
              <img src={currentOrder.items[0].image} alt="" className="w-full h-full object-cover" />
            ) : (
              currentOrder.items[0]?.emoji || '🛍️'
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-bold text-slate-900 dark:text-white">{currentOrder.userName}</span> amenunua
            </p>
            <p className="text-sm font-black text-amber-600 dark:text-amber-500 line-clamp-1">
              {currentOrder.items[0]?.name}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Sasa hivi</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
