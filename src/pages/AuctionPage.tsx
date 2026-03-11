import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Auction, Bid } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Gavel, Clock, Trophy, TrendingUp, AlertCircle, CheckCircle2, Wallet, Send, CreditCard, Smartphone } from 'lucide-react';
import { formatCurrency, cn } from '../utils';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, orderBy, onSnapshot, increment, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export const AuctionPage: React.FC = () => {
  const { user, auctions, systemSettings, t, language } = useApp();
  const currency = systemSettings?.currency || 'TZS';
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isBidding, setIsBidding] = useState(false);
  const [auctionBids, setAuctionBids] = useState<Bid[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'shipping' | 'options' | 'details' | 'success'>('shipping');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'city' | 'out'>('pickup');
  const [slaughterRequested, setSlaughterRequested] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'tigo' | 'mpesa' | 'airtel' | 'halopesa' | 'cash'>('tigo');
  const [paymentForm, setPaymentForm] = useState({
    transactionId: '',
    senderPhone: user?.contact || '',
    senderName: user?.name || ''
  });

  useEffect(() => {
    if (selectedAuction) {
      const q = query(
        collection(db, 'kuku_bids'),
        where('auctionId', '==', selectedAuction.id)
      );
      const unsub = onSnapshot(q, (snap) => {
        const bids = snap.docs.map(d => ({ id: d.id, ...d.data() } as Bid));
        // Sort by amount descending on client side to avoid index requirement
        bids.sort((a, b) => b.amount - a.amount);
        setAuctionBids(bids);
      });
      return unsub;
    }
  }, [selectedAuction]);

  const finalizeAuction = async (auctionId: string) => {
    try {
      const auctionRef = doc(db, 'kuku_auctions', auctionId);
      const auctionSnap = await getDoc(auctionRef);
      
      if (auctionSnap.exists()) {
        const auction = auctionSnap.data();
        if (auction.status !== 'ended') {
          await updateDoc(auctionRef, {
            status: 'ended',
            winnerId: auction.highestBidderId || null,
            winnerName: auction.highestBidderName || null,
            paymentStatus: 'pending'
          });
          console.log(`Auction ${auctionId} finalized on client`);
        }
      }
    } catch (err) {
      console.error('Finalize error:', err);
    }
  };

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
        const time = getTimeRemaining(a.endTime);
        newTimers[a.id] = time;
        if (time === 'Ended' && a.status === 'active') {
          finalizeAuction(a.id);
        }
      });
      setTimers(newTimers);
    }, 1000);
    return () => clearInterval(interval);
  }, [auctions]);

  const handleAuctionPayment = async () => {
    if (!selectedAuction || !user) return;
    setIsPaying(true);
    
    const deliveryFee = deliveryMethod === 'city' ? (selectedAuction.deliveryCity || 0) : 
                       deliveryMethod === 'out' ? (selectedAuction.deliveryOut || 0) : 0;
    const slaughterFee = slaughterRequested ? (selectedAuction.slaughterFee || 0) : 0;
    const totalAmount = selectedAuction.currentBid + deliveryFee + slaughterFee;

    try {
      if (paymentMethod === 'wallet') {
        if ((user.walletBalance || 0) < totalAmount) {
          toast.error('Salio la wallet halitoshi.');
          setIsPaying(false);
          return;
        }
        
        // Deduct from wallet
        await updateDoc(doc(db, 'kuku_users', user.id), {
          walletBalance: increment(-totalAmount)
        });
        
        // Record transaction
        await addDoc(collection(db, 'kuku_wallet'), {
          userId: user.id,
          userName: user.name,
          amount: totalAmount,
          type: 'purchase',
          status: 'approved',
          method: 'wallet',
          date: new Date().toISOString(),
          createdAt: serverTimestamp()
        });
      }

      // Update auction payment status
      await updateDoc(doc(db, 'kuku_auctions', selectedAuction.id), {
        paymentStatus: 'paid',
        paymentMethod,
        transactionId: paymentForm.transactionId || (paymentMethod === 'wallet' ? `WALLET-${Date.now()}` : `CASH-${Date.now()}`),
        senderPhone: paymentForm.senderPhone,
        senderName: paymentForm.senderName,
        deliveryMethod,
        deliveryFee,
        slaughterRequested,
        slaughterFee,
        totalAmount,
        paidAt: serverTimestamp()
      });

      // Create a real order in kuku_orders for the vendor to manage
      const orderData = {
        userId: user.id,
        userName: user.name,
        userContact: user.contact || '',
        userWA: user.contact || '',
        payPhone: paymentForm.senderPhone || user.contact || '',
        vendorId: selectedAuction.vendorId,
        vendorName: selectedAuction.vendorName,
        productId: selectedAuction.id, // Use auction ID as product ID for reference
        productPrice: selectedAuction.currentBid,
        qty: 1,
        deliveryFee,
        deliveryMethod,
        slaughterRequested,
        slaughterFee,
        total: totalAmount,
        payMethod: paymentMethod,
        senderName: paymentForm.senderName,
        transactionId: paymentForm.transactionId || (paymentMethod === 'wallet' ? `WALLET-${Date.now()}` : `CASH-${Date.now()}`),
        sentAmount: totalAmount.toString(),
        status: 'pending',
        items: [{
          name: `MNADA: ${selectedAuction.productName}${slaughterRequested ? ' (Aliyechinjwa)' : ''}`,
          qty: 1,
          price: selectedAuction.currentBid,
          emoji: '🏆',
          image: selectedAuction.image || ''
        }],
        date: new Date().toLocaleString(),
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'kuku_orders'), orderData);

      // Send WhatsApp to Admin
      const waMsg = `HABARI ADMIN! MNADA UMEKAMILIKA 🐔\n\nBIDHAA: *${selectedAuction.productName}*\nMUUZAJI: *${selectedAuction.vendorName}*\nMSHINDI: *${user.name}*\nKIASI: *${formatCurrency(selectedAuction.currentBid, currency)}*\nNJIA: *${paymentMethod}*\nTXID: *${paymentForm.transactionId || 'WALLET'}*\n\nTafadhali hakiki malipo haya.`;
      window.open(`https://wa.me/${systemSettings?.adminWhatsApp || '255764225358'}?text=${encodeURIComponent(waMsg)}`);

      setPaymentStep('success');
      toast.success('Malipo yamethibitishwa!');
    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error(err.message || 'Imeshindwa kuthibitisha malipo');
    } finally {
      setIsPaying(false);
    }
  };

  const isWinner = selectedAuction?.status === 'ended' && selectedAuction?.winnerId === user?.id;
  const isPaid = selectedAuction?.paymentStatus === 'paid';

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

                {/* Winner Status */}
                {selectedAuction.status === 'ended' && (
                  <div className={cn(
                    "p-6 rounded-[32px] border mb-8 flex items-center gap-4",
                    isWinner ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
                  )}>
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl",
                      isWinner ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                    )}>
                      {isWinner ? '🏆' : '🏁'}
                    </div>
                    <div>
                      <h4 className={cn("font-black", isWinner ? "text-emerald-900" : "text-slate-900")}>
                        {isWinner ? 'Hongera! Wewe ndiye mshindi!' : 'Mnada Umekwisha'}
                      </h4>
                      <p className="text-xs font-bold text-slate-500">
                        {isWinner ? 'Tafadhali kamilisha malipo ili kupata bidhaa yako.' : `Mshindi ni ${selectedAuction.winnerName || 'hakuna'}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Payment Section for Winner */}
                {isWinner && !isPaid && (
                  <div className="bg-white rounded-[32px] border-2 border-amber-400 p-8 mb-10 shadow-xl shadow-amber-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                      <CreditCard className="text-amber-500" /> Kamilisha Malipo
                    </h3>
                    
                    {paymentStep === 'shipping' && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Chagua Njia ya Kupokea</label>
                          <div className="grid grid-cols-1 gap-3">
                            <button 
                              onClick={() => setDeliveryMethod('pickup')}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                                deliveryMethod === 'pickup' ? "border-amber-500 bg-amber-50" : "border-slate-100"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">🏠</div>
                                <div className="text-left">
                                  <p className="font-bold text-sm">Nitakuja Kuchukua</p>
                                  <p className="text-[10px] text-slate-400">Bure (Self-pickup)</p>
                                </div>
                              </div>
                              {deliveryMethod === 'pickup' && <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>}
                            </button>

                            <button 
                              onClick={() => setDeliveryMethod('city')}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                                deliveryMethod === 'city' ? "border-amber-500 bg-amber-50" : "border-slate-100"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">🛵</div>
                                <div className="text-left">
                                  <p className="font-bold text-sm">Niletee (Ndani ya Mji)</p>
                                  <p className="text-[10px] text-slate-400">Gharama: {formatCurrency(selectedAuction.deliveryCity || 0, currency)}</p>
                                </div>
                              </div>
                              {deliveryMethod === 'city' && <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>}
                            </button>

                            <button 
                              onClick={() => setDeliveryMethod('out')}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                                deliveryMethod === 'out' ? "border-amber-500 bg-amber-50" : "border-slate-100"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">🚚</div>
                                <div className="text-left">
                                  <p className="font-bold text-sm">Niletee (Nje ya Mji)</p>
                                  <p className="text-[10px] text-slate-400">Gharama: {formatCurrency(selectedAuction.deliveryOut || 0, currency)}</p>
                                </div>
                              </div>
                              {deliveryMethod === 'out' && <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>}
                            </button>
                          </div>
                        </div>

                        {selectedAuction.canSlaughter && (
                          <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h4 className="font-black text-slate-900 text-sm">Je, unataka achinjwe?</h4>
                                <p className="text-[10px] text-slate-400">Gharama ya kuchinja: {formatCurrency(selectedAuction.slaughterFee || 0, currency)}</p>
                              </div>
                              <button 
                                onClick={() => setSlaughterRequested(!slaughterRequested)}
                                className={cn(
                                  "w-12 h-6 rounded-full transition-all relative",
                                  slaughterRequested ? "bg-emerald-500" : "bg-slate-300"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                  slaughterRequested ? "right-1" : "left-1"
                                )} />
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="pt-4">
                          <button 
                            onClick={() => setPaymentStep('options')}
                            className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200"
                          >
                            ENDELEA KWENYE MALIPO
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {paymentStep === 'options' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Muhtasari wa Malipo</p>
                          <button onClick={() => setPaymentStep('shipping')} className="text-[10px] font-black text-amber-600 uppercase">Badili</button>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-3 mb-6">
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-slate-500">Bei ya Mnada:</span>
                            <span className="text-slate-900">{formatCurrency(selectedAuction.currentBid, currency)}</span>
                          </div>
                          {deliveryMethod !== 'pickup' && (
                            <div className="flex justify-between text-sm font-bold">
                              <span className="text-slate-500">Usafiri ({deliveryMethod === 'city' ? 'Ndani' : 'Nje'}):</span>
                              <span className="text-slate-900">{formatCurrency(deliveryMethod === 'city' ? (selectedAuction.deliveryCity || 0) : (selectedAuction.deliveryOut || 0), currency)}</span>
                            </div>
                          )}
                          {slaughterRequested && (
                            <div className="flex justify-between text-sm font-bold">
                              <span className="text-slate-500">Gharama ya Kuchinja:</span>
                              <span className="text-slate-900">{formatCurrency(selectedAuction.slaughterFee || 0, currency)}</span>
                            </div>
                          )}
                          <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                            <span className="font-black text-slate-900">Jumla Kuu:</span>
                            <span className="text-xl font-black text-emerald-600">
                              {formatCurrency(
                                selectedAuction.currentBid + 
                                (deliveryMethod === 'city' ? (selectedAuction.deliveryCity || 0) : deliveryMethod === 'out' ? (selectedAuction.deliveryOut || 0) : 0) +
                                (slaughterRequested ? (selectedAuction.slaughterFee || 0) : 0),
                                currency
                              )}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-slate-500 font-bold mb-4">Chagua njia ya kulipa:</p>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'wallet', label: 'Wallet Balance', icon: <Wallet size={20} />, color: 'bg-amber-50 text-amber-600' },
                            { id: 'tigo', label: 'Mix by Yas (Tigo Pesa)', icon: <Smartphone size={20} />, color: 'bg-blue-50 text-blue-600' },
                            { id: 'mpesa', label: 'M-Pesa', icon: <Smartphone size={20} />, color: 'bg-red-50 text-red-600' },
                            { id: 'airtel', label: 'Airtel Money', icon: <Smartphone size={20} />, color: 'bg-red-50 text-red-600' },
                            { id: 'halopesa', label: 'HaloPesa', icon: <Smartphone size={20} />, color: 'bg-orange-50 text-orange-600' },
                            { id: 'cash', label: 'Pesa Taslimu (Cash)', icon: <CreditCard size={20} />, color: 'bg-emerald-50 text-emerald-600' }
                          ].map((m) => {
                            const total = selectedAuction.currentBid + 
                                         (deliveryMethod === 'city' ? (selectedAuction.deliveryCity || 0) : deliveryMethod === 'out' ? (selectedAuction.deliveryOut || 0) : 0) +
                                         (slaughterRequested ? (selectedAuction.slaughterFee || 0) : 0);
                            const hasEnough = m.id === 'wallet' ? (user?.walletBalance || 0) >= total : true;
                            
                            return (
                              <button
                                key={m.id}
                                onClick={() => {
                                  if (m.id === 'wallet' && !hasEnough) {
                                    toast.error('Salio la wallet halitoshi.');
                                    return;
                                  }
                                  setPaymentMethod(m.id as any);
                                  if (m.id === 'cash') {
                                    handleAuctionPayment();
                                  } else {
                                    setPaymentStep('details');
                                  }
                                }}
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left group",
                                  paymentMethod === m.id ? "border-amber-500 bg-amber-50" : 
                                  (!hasEnough && m.id === 'wallet' ? "opacity-50 cursor-not-allowed border-slate-100" : "border-slate-100 hover:border-slate-200")
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center", m.color)}>{m.icon}</span>
                                  <div>
                                    <p className="font-bold text-sm">{m.label}</p>
                                    <p className="text-[10px] text-slate-400">
                                      {m.id === 'wallet' ? `Salio: ${formatCurrency(user?.walletBalance || 0, currency)}` : m.id === 'cash' ? 'Lipa ukipokea mzigo' : 'Lipa sasa kwa usalama'}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {paymentStep === 'details' && (
                      <div className="space-y-6">
                        {paymentMethod !== 'wallet' ? (
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lipia kupitia: {paymentMethod.toUpperCase()}</p>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-slate-500">Namba ya Malipo:</p>
                                <p className="text-lg font-black text-slate-900">{systemSettings?.paymentNumber || '0687225353'}</p>
                              </div>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(systemSettings?.paymentNumber || '0687225353');
                                  toast.success('Namba imenakiliwa!');
                                }}
                                className="p-3 bg-white rounded-xl text-amber-600 shadow-sm"
                              >
                                <Copy size={18} />
                              </button>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Jina:</p>
                              <p className="text-sm font-black text-slate-900">{systemSettings?.paymentName || 'Amour'}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center">
                            <p className="text-sm font-bold text-emerald-800 mb-2">Salio lako la Wallet litatumika kulipia mnada huu.</p>
                            <p className="text-2xl font-black text-emerald-600">
                              {formatCurrency(
                                selectedAuction.currentBid + 
                                (deliveryMethod === 'city' ? (selectedAuction.deliveryCity || 0) : deliveryMethod === 'out' ? (selectedAuction.deliveryOut || 0) : 0) +
                                (slaughterRequested ? (selectedAuction.slaughterFee || 0) : 0), 
                                currency
                              )}
                            </p>
                            <p className="text-xs text-emerald-600 mt-2">Salio la sasa: {formatCurrency(user?.walletBalance || 0, currency)}</p>
                          </div>
                        )}

                        <div className="space-y-4">
                          {paymentMethod !== 'wallet' && (
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Transaction ID (Kutoka kwenye SMS)</label>
                              <input 
                                type="text" 
                                value={paymentForm.transactionId}
                                onChange={(e) => setPaymentForm({...paymentForm, transactionId: e.target.value})}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-amber-500 transition-all font-bold"
                                placeholder="Mf. 8G76H5J4K"
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Jina la Mtumaji</label>
                              <input 
                                type="text" 
                                value={paymentForm.senderName}
                                onChange={(e) => setPaymentForm({...paymentForm, senderName: e.target.value})}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-amber-500 transition-all font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Namba ya Mtumaji</label>
                              <input 
                                type="text" 
                                value={paymentForm.senderPhone}
                                onChange={(e) => setPaymentForm({...paymentForm, senderPhone: e.target.value})}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-amber-500 transition-all font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => setPaymentStep('options')}
                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase transition-all"
                          >
                            RUDI
                          </button>
                          <button 
                            onClick={handleAuctionPayment}
                            disabled={isPaying || (paymentMethod !== 'wallet' && paymentMethod !== 'cash' && !paymentForm.transactionId)}
                            className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-100 disabled:opacity-50"
                          >
                            {isPaying ? 'Inatuma...' : 'THIBITISHA MALIPO'}
                          </button>
                        </div>
                      </div>
                    )}

                    {paymentStep === 'success' && (
                      <div className="text-center py-6">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-4xl mx-auto mb-4">✅</div>
                        <h4 className="text-xl font-black text-slate-900 mb-2">Malipo Yametumwa!</h4>
                        <p className="text-sm text-slate-500 font-bold mb-6">Admin anahakiki malipo yako sasa hivi. Utapokea taarifa punde tu itakapokamilika.</p>
                        <button 
                          onClick={() => setSelectedAuction(null)}
                          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest"
                        >
                          FUNGA
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isPaid && (
                  <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[32px] mb-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-2xl">✅</div>
                    <div>
                      <h4 className="font-black text-emerald-900">Malipo Yamethibitishwa</h4>
                      <p className="text-xs font-bold text-emerald-600">Bidhaa hii imeshalipiwa kikamilifu.</p>
                    </div>
                  </div>
                )}

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

const Copy: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
