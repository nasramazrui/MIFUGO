import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Auction, Bid } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Gavel, Clock, Trophy, TrendingUp, AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import { formatCurrency } from '../utils';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, orderBy, onSnapshot, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { cn } from '../utils';

export const AuctionPage: React.FC = () => {
  const { user, auctions, systemSettings, t, language } = useApp();
  const currency = systemSettings?.currency || 'TZS';
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isBidding, setIsBidding] = useState(false);
  const [auctionBids, setAuctionBids] = useState<Bid[]>([]);

  useEffect(() => {
    if (selectedAuction) {
      const q = query(
        collection(db, 'kuku_bids'),
        where('auctionId', '==', selectedAuction.id),
        orderBy('amount', 'desc')
      );
      const unsub = onSnapshot(q, (snap) => {
        setAuctionBids(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bid)));
      });
      return unsub;
    }
  }, [selectedAuction]);

  const handlePlaceBid = async () => {
    if (!user) {
      toast.error('Tafadhali ingia kwanza ili kuweka dau.');
      return;
    }

    if (!selectedAuction) return;

    const amount = Number(bidAmount);
    if (isNaN(amount) || amount <= selectedAuction.currentBid) {
      toast.error(t('bid_error'));
      return;
    }

    if (user.walletBalance !== undefined && user.walletBalance < amount) {
      toast.error('Salio la wallet halitoshi kuweka dau hili.');
      return;
    }

    setIsBidding(true);
    try {
      // 1. Add Bid record
      await addDoc(collection(db, 'kuku_bids'), {
        auctionId: selectedAuction.id,
        userId: user.id,
        userName: user.name,
        amount: amount,
        createdAt: serverTimestamp()
      });

      // 2. Update Auction current bid
      await updateDoc(doc(db, 'kuku_auctions', selectedAuction.id), {
        currentBid: amount,
        highestBidderId: user.id,
        highestBidderName: user.name
      });

      toast.success(t('bid_success'));
      setBidAmount('');
    } catch (error) {
      console.error(error);
      toast.error('Imeshindwa kuweka dau. Jaribu tena.');
    } finally {
      setIsBidding(false);
    }
  };

  const getTimeRemaining = (endTime: any) => {
    if (!endTime) return '...';
    const end = endTime.toDate ? endTime.toDate() : new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours}h ${mins}m ${secs}s`;
  };

  const [timers, setTimers] = useState<Record<string, string>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimers: Record<string, string> = {};
      auctions.forEach(a => {
        newTimers[a.id] = getTimeRemaining(a.endTime);
      });
      setTimers(newTimers);
    }, 1000);
    return () => clearInterval(interval);
  }, [auctions]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
              <Gavel size={20} />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{t('auction_title')}</h1>
          </div>
          {user && (
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
              <Wallet size={16} className="text-amber-500" />
              <span className="text-xs font-black text-slate-700">{formatCurrency(user.walletBalance || 0, currency)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {auctions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[40px] border border-slate-100 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Gavel size={40} className="text-slate-200" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">{t('no_auctions')}</h2>
            <p className="text-slate-400 font-bold">Angalia tena baadae kwa minada mipya ya mifugo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {auctions.map((auction) => (
              <motion.div 
                key={auction.id}
                layoutId={auction.id}
                onClick={() => setSelectedAuction(auction)}
                className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all cursor-pointer group"
              >
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img 
                    src={auction.image || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=800'} 
                    alt={auction.productName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl border border-white/20">
                    <Clock size={14} className="text-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                      {timers[auction.id] || '...'}
                    </span>
                  </div>
                  <div className="absolute bottom-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                    {auction.vendorName}
                  </div>
                </div>

                <div className="p-8">
                  <h3 className="text-xl font-black text-slate-900 mb-2">{auction.productName}</h3>
                  <p className="text-slate-400 text-sm font-bold mb-6 line-clamp-2">{auction.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('starting_price')}</p>
                      <p className="text-sm font-black text-slate-900">{formatCurrency(auction.startingPrice, currency)}</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100">
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">{t('current_bid')}</p>
                      <p className="text-sm font-black text-amber-900">{formatCurrency(auction.currentBid, currency)}</p>
                    </div>
                  </div>

                  {auction.highestBidderName && (
                    <div className="flex items-center gap-3 bg-emerald-50 p-3 rounded-2xl border border-emerald-100 mb-6">
                      <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                        <Trophy size={14} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">{t('highest_bidder')}</p>
                        <p className="text-xs font-black text-emerald-900">{auction.highestBidderName}</p>
                      </div>
                    </div>
                  )}

                  <button className="w-full bg-slate-900 text-white py-4 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-amber-500 transition-all shadow-xl shadow-slate-200 active:scale-95">
                    {t('place_bid')}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Auction Detail Modal */}
      <AnimatePresence>
        {selectedAuction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAuction(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              layoutId={selectedAuction.id}
              className="relative w-full max-w-4xl bg-white rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            >
              <div className="md:w-1/2 relative">
                <img 
                  src={selectedAuction.image || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=800'} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
                <button 
                  onClick={() => setSelectedAuction(null)}
                  className="absolute top-6 left-6 w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-900 shadow-xl"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="md:w-1/2 p-10 overflow-y-auto scrollbar-hide">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-amber-500 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                    {selectedAuction.vendorName}
                  </div>
                  <div className="flex items-center gap-2 text-amber-500">
                    <Clock size={16} className="animate-pulse" />
                    <span className="text-sm font-black uppercase tracking-widest">{timers[selectedAuction.id]}</span>
                  </div>
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-4">{selectedAuction.productName}</h2>
                <p className="text-slate-500 font-bold leading-relaxed mb-8">{selectedAuction.description}</p>

                <div className="grid grid-cols-2 gap-6 mb-10">
                  <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('starting_price')}</p>
                    <p className="text-xl font-black text-slate-900">{formatCurrency(selectedAuction.startingPrice, currency)}</p>
                  </div>
                  <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">{t('current_bid')}</p>
                    <p className="text-xl font-black text-amber-900">{formatCurrency(selectedAuction.currentBid, currency)}</p>
                  </div>
                </div>

                {/* Bidding Section */}
                {selectedAuction.status === 'active' && (
                  <div className="space-y-6 mb-10">
                    <div className="relative">
                      <input 
                        type="number" 
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={`${t('bid_amount')} (${currency})`}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-5 outline-none focus:border-amber-500 transition-all font-black text-lg"
                      />
                      <TrendingUp className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                    </div>
                    <button 
                      onClick={handlePlaceBid}
                      disabled={isBidding || !bidAmount}
                      className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black text-lg uppercase tracking-widest hover:bg-amber-500 transition-all shadow-2xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      {isBidding ? 'Inatuma...' : t('place_bid')}
                    </button>
                  </div>
                )}

                {/* Bid History */}
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <TrendingUp size={14} /> Historia ya Dau
                  </h4>
                  <div className="space-y-4">
                    {auctionBids.length === 0 ? (
                      <p className="text-slate-400 font-bold italic text-sm">Bado hakuna dau lililowekwa.</p>
                    ) : (
                      auctionBids.map((bid, idx) => (
                        <div key={bid.id} className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all",
                          idx === 0 ? "bg-emerald-50 border-emerald-100 scale-[1.02]" : "bg-white border-slate-100"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                              idx === 0 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                            )}>
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{bid.userName}</p>
                              <p className="text-[10px] text-slate-400 font-bold">
                                {bid.createdAt?.toDate ? bid.createdAt.toDate().toLocaleTimeString() : 'Sasa hivi'}
                              </p>
                            </div>
                          </div>
                          <p className={cn(
                            "font-black",
                            idx === 0 ? "text-emerald-700 text-lg" : "text-slate-600"
                          )}>
                            {formatCurrency(bid.amount, currency)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const X: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
