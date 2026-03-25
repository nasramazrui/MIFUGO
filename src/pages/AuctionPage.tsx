import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Auction, Bid } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Gavel, Clock, Trophy, TrendingUp, AlertCircle, CheckCircle2, Wallet, Send, CreditCard, Smartphone, Search, Globe, Trash2, Video } from 'lucide-react';
import { formatCurrency, cn } from '../utils';
import { db, collection, addDoc, updateDoc, doc, serverTimestamp, query, where, orderBy, onSnapshot, increment, getDoc, deleteDoc, handleFirestoreError, OperationType } from '../services/firebase';
import { toast } from 'react-hot-toast';
import LiveStreamModal from '../components/LiveStreamModal';
import { ManualPaymentModal } from '../components/ManualPaymentModal';

export const AuctionPage: React.FC = () => {
  const { user, auctions, systemSettings, t, language, liveSessions } = useApp();
  const currency = systemSettings?.currency || 'TZS';
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [liveStreamAuctionId, setLiveStreamAuctionId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isBidding, setIsBidding] = useState(false);
  const [auctionBids, setAuctionBids] = useState<Bid[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'options' | 'details' | 'success'>('options');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{ amount: number; reason: string; actionType: string; extraData?: any } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'tigo' | 'mpesa' | 'airtel' | 'halopesa' | 'cash'>('tigo');
  const [paymentForm, setPaymentForm] = useState({
    transactionId: '',
    senderPhone: user?.contact || '',
    senderName: user?.name || ''
  });

  const isLive = selectedAuction && liveSessions.some(s => s.roomId === selectedAuction.id);

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
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'kuku_bids');
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
    if (!endTime) return 'N/A';
    try {
      const end = endTime.toDate ? endTime.toDate() : new Date(endTime);
      const now = new Date();
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) return 'Ended';

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } catch (e) {
      console.error("Error calculating time remaining:", e);
      return 'N/A';
    }
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

  const handleManualPaymentSubmit = async (details: { network: string; senderPhone: string; senderName: string; amount: number; sms: string }) => {
    if (!paymentDetails || !user || !selectedAuction) return;

    const { amount, reason, actionType, extraData } = paymentDetails;
    
    try {
      // Save to Firestore manual payments
      await addDoc(collection(db, 'kuku_manual_payments'), {
        userId: user.id,
        userName: user.name,
        userPhone: user.phone || user.contact || '',
        amount,
        reason,
        actionType,
        extraData: extraData || null,
        network: details.network,
        senderPhone: details.senderPhone,
        senderName: details.senderName,
        sms: details.sms,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Update auction payment status to pending
      await updateDoc(doc(db, 'kuku_auctions', selectedAuction.id), {
        paymentStatus: 'pending',
        paymentMethod: details.network,
        transactionId: details.sms.substring(0, 15), // Use part of SMS as transaction ID
        senderPhone: details.senderPhone,
        senderName: details.senderName,
        totalAmount: amount,
        paidAt: serverTimestamp()
      });

      // Construct WhatsApp message for Admin
      const msg = `*MALIPO MAPYA (MANUAL) KUTOKA KWA MSHINDI WA MNADA* 🏆💰
------------------------
*Sababu:* ${reason}
*Kiasi:* ${amount.toLocaleString()} TZS
*Mtandao:* ${details.network}
*Namba Iliyotuma:* ${details.senderPhone}
*Jina la Aliyetuma:* ${details.senderName}
*Mshindi:* ${user.name} (${user.phone || user.contact || 'No Contact'})
*Aina ya Action:* ${actionType}
*SMS ya Uthibitisho:*
"${details.sms}"
------------------------
Tafadhali hakiki malipo haya na uidhinishe kwenye mfumo.`;

      const adminPhone = systemSettings?.adminWhatsApp || '255764225358';
      const waUrl = `https://wa.me/${adminPhone.replace(/\+/g, '')}?text=${encodeURIComponent(msg)}`;
      
      window.open(waUrl, '_blank');
      
      setPaymentModalOpen(false);
      setPaymentDetails(null);
      setPaymentStep('success');
      toast.success('Taarifa za malipo zimetumwa kwa Admin kikamilifu. Tafadhali subiri uhakiki.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'kuku_manual_payments');
      toast.error('Imeshindwa kutuma taarifa za malipo. Tafadhali jaribu tena.');
    }
  };

  const handleAuctionPayment = async () => {
    if (!selectedAuction || !user) return;
    setIsPaying(true);
    
    const totalAmount = selectedAuction.currentBid;

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
        total: totalAmount,
        payMethod: paymentMethod,
        senderName: paymentForm.senderName,
        transactionId: paymentForm.transactionId || (paymentMethod === 'wallet' ? `WALLET-${Date.now()}` : `CASH-${Date.now()}`),
        sentAmount: totalAmount.toString(),
        status: 'pending',
        items: [{
          name: `MNADA: ${selectedAuction.productName}`,
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

  const handleDeleteAuction = async (e: React.MouseEvent, auctionId: string) => {
    e.stopPropagation();
    if (!window.confirm('Je, una uhakika unataka kufuta mnada huu?')) return;

    try {
      await deleteDoc(doc(db, 'kuku_auctions', auctionId));
      toast.success('Mnada umefutwa kikamilifu!');
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error('Imeshindwa kufuta mnada');
    }
  };

  return (
    <div className="pb-20">
      <div className="w-full">
        {/* Section Title */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-[24px] sm:rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-[#F59E0B] to-red-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 dark:shadow-none relative">
            <Gavel size={20} className="sm:w-7 sm:h-7" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-slate-900"></span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-[#0F172A] dark:text-white tracking-tight">Minada Live ya Mifugo</h2>
        </div>

        {auctions.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Gavel size={40} className="text-slate-200 dark:text-slate-700" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{t('no_auctions')}</h2>
            <p className="text-slate-400 font-bold">Angalia tena baadae kwa minada mipya ya mifugo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 items-start">
            {auctions.map((auction) => (
              <motion.div 
                key={auction.id}
                layoutId={auction.id}
                onClick={() => setSelectedAuction(auction)}
                className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] border border-slate-100 dark:border-slate-800/50 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col"
              >
                <div className="aspect-square sm:aspect-[4/3] relative overflow-hidden">
                  <img 
                    src={auction.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800'} 
                    alt={auction.productName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <Clock size={12} className="text-[#F59E0B]" />
                    <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                      {timers[auction.id] || 'ENDED'}
                    </span>
                  </div>
                  <div className="absolute bottom-4 right-4 bg-[#F59E0B] text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                    {auction.vendorName || 'MIKUDE'}
                  </div>

                  {(user?.role === 'admin' || user?.id === auction.vendorId) && (timers[auction.id] === 'ENDED' || auction.status === 'ended') && (
                    <button 
                      onClick={(e) => handleDeleteAuction(e, auction.id)}
                      className="absolute top-4 right-4 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all z-10"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="p-5 sm:p-6 flex flex-col flex-1">
                  <h3 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white mb-1 line-clamp-1">{auction.productName}</h3>
                  <p className="text-slate-400 dark:text-slate-500 text-xs font-bold mb-6 line-clamp-1">{auction.description || 'Ninyamabomba kinoma noma'}</p>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-[#F8FAFC] dark:bg-slate-800/50 p-4 sm:p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">BEI YA KUANZIA</p>
                      <p className="text-xs font-black text-[#0F172A] dark:text-white uppercase mb-1">{currency}</p>
                      <p className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-white leading-none">{formatCurrency(auction.startingPrice, currency).replace(currency, '').trim()}</p>
                    </div>
                    <div className="bg-[#FFFBEB] dark:bg-amber-900/10 p-4 sm:p-5 rounded-[24px] border border-amber-100 dark:border-amber-900/20 flex flex-col justify-center">
                      <p className="text-[9px] font-black text-[#D97706] uppercase tracking-widest mb-2">DAU LA SASA</p>
                      <p className="text-xs font-black text-[#92400E] dark:text-amber-500 uppercase mb-1">{currency}</p>
                      <p className="text-lg sm:text-xl font-black text-[#92400E] dark:text-amber-500 leading-none">{formatCurrency(auction.currentBid, currency).replace(currency, '').trim()}</p>
                    </div>
                  </div>

                  {auction.highestBidderName && (
                    <div className="flex items-center gap-3 bg-[#E6F9F0] dark:bg-emerald-900/10 p-3 sm:p-4 rounded-[20px] sm:rounded-[24px] border border-emerald-100 dark:border-emerald-900/20 mb-6">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#10B981] rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
                        <Trophy size={14} className="sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-[#059669] uppercase tracking-widest mb-0.5">MWENYE DAU LA JUU</p>
                        <p className="text-xs sm:text-sm font-black text-[#064E3B] dark:text-emerald-500 truncate">{auction.highestBidderName}</p>
                      </div>
                    </div>
                  )}

                  <button className="w-full bg-[#0F172A] dark:bg-slate-800 text-white py-4 sm:py-5 rounded-[24px] font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-amber-600 transition-all shadow-md active:scale-95 mt-auto">
                    WEKA DAU
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
              className="relative w-full max-w-4xl bg-white dark:bg-slate-950 rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[95vh] sm:max-h-[90vh]"
            >
              <div className="md:w-1/2 relative h-64 md:h-auto">
                <img 
                  src={selectedAuction.image || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=800'} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
                <button 
                  onClick={() => setSelectedAuction(null)}
                  className="absolute top-4 left-4 w-10 h-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl flex items-center justify-center text-slate-900 dark:text-white shadow-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="md:w-1/2 p-6 sm:p-10 overflow-y-auto scrollbar-hide">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-amber-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                    {selectedAuction.vendorName}
                  </div>
                  <div className="flex items-center gap-2 text-amber-500">
                    <Clock size={14} className="animate-pulse sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm font-black uppercase tracking-widest">{timers[selectedAuction.id]}</span>
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-4">{selectedAuction.productName}</h2>
                
                {/* Livestock Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  {selectedAuction.tagNumber && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tag ID</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{selectedAuction.tagNumber}</p>
                    </div>
                  )}
                  {selectedAuction.breed && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Uzao</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{selectedAuction.breed}</p>
                    </div>
                  )}
                  {selectedAuction.age && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Umri</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{selectedAuction.age}</p>
                    </div>
                  )}
                  {selectedAuction.weight && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Uzito</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{selectedAuction.weight} Kg</p>
                    </div>
                  )}
                  {selectedAuction.gender && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jinsia</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white capitalize">{selectedAuction.gender === 'male' ? 'Dume' : selectedAuction.gender === 'female' ? 'Jike' : 'Nyingine'}</p>
                    </div>
                  )}
                  {selectedAuction.healthStatus && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Afya</p>
                      <p className={cn(
                        "text-xs font-black",
                        selectedAuction.healthStatus === 'healthy' ? "text-emerald-500" : "text-amber-500"
                      )}>
                        {selectedAuction.healthStatus === 'healthy' ? 'Mzima' : selectedAuction.healthStatus === 'sick' ? 'Mgonjwa' : 'Amepona'}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed mb-6 sm:mb-8 text-sm sm:text-base">{selectedAuction.description}</p>

                {selectedAuction.status === 'active' && isLive && (
                  <button
                    onClick={() => setLiveStreamAuctionId(selectedAuction.id)}
                    className="w-full bg-red-500 text-white py-3 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all shadow-md active:scale-95 mb-6 flex items-center justify-center gap-2 animate-pulse"
                  >
                    <Video size={18} /> TAZAMA LIVE
                  </button>
                )}

                {/* Winner Status */}
                {selectedAuction.status === 'ended' && (
                  <div className={cn(
                    "p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4",
                    isWinner ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20" : "bg-slate-50 border-slate-100 dark:bg-slate-900 dark:border-slate-800"
                  )}>
                    <div className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl",
                      isWinner ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                    )}>
                      {isWinner ? '🏆' : '🏁'}
                    </div>
                    <div>
                      <h4 className={cn("font-black text-sm sm:text-base", isWinner ? "text-emerald-900 dark:text-emerald-500" : "text-slate-900 dark:text-white")}>
                        {isWinner ? 'Hongera! Wewe ndiye mshindi!' : 'Mnada Umekwisha'}
                      </h4>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-500">
                        {isWinner ? 'Tafadhali kamilisha malipo ili kupata bidhaa yako.' : `Mshindi ni ${selectedAuction.winnerName || 'hakuna'}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Payment Section for Winner */}
                {isWinner && !isPaid && (
                  <div className="bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[32px] border-2 border-amber-400 p-5 sm:p-8 mb-6 sm:mb-10 shadow-xl shadow-amber-100 dark:shadow-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
                      <CreditCard className="text-amber-500" /> Kamilisha Malipo
                    </h3>
                    
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-[20px] sm:rounded-[32px] border border-slate-100 dark:border-slate-800 space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs sm:text-base text-slate-900 dark:text-white">Jumla ya Malipo:</span>
                        <span className="text-lg sm:text-xl font-black text-emerald-600">
                          {formatCurrency(selectedAuction.currentBid, currency)}
                        </span>
                      </div>
                    </div>

                    {selectedAuction.paymentStatus === 'pending' ? (
                      <div className="text-center py-6">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 text-3xl mx-auto mb-4 animate-pulse">⏳</div>
                        <h4 className="text-lg font-black text-slate-900 mb-2">Malipo Yanahakikiwa</h4>
                        <p className="text-sm text-slate-500 font-bold">Admin anahakiki malipo yako sasa hivi. Utapokea taarifa punde tu itakapokamilika.</p>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setPaymentDetails({
                            amount: selectedAuction.currentBid,
                            reason: `Malipo ya Mnada: ${selectedAuction.title}`,
                            actionType: 'auction_payment',
                            extraData: {
                              auctionId: selectedAuction.id,
                              vendorId: selectedAuction.vendorId,
                              vendorName: selectedAuction.vendorName,
                              productName: selectedAuction.title,
                              image: selectedAuction.images?.[0] || ''
                            }
                          });
                          setPaymentModalOpen(true);
                        }}
                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                      >
                        LIPA SASA (MITANDAO YA SIMU)
                      </button>
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

      <LiveStreamModal 
        key={liveStreamAuctionId || 'no-room'}
        isOpen={!!liveStreamAuctionId} 
        onClose={() => setLiveStreamAuctionId(null)} 
        roomId={liveStreamAuctionId || ''} 
        isHost={false} 
        userId={user?.id || `guest_${Math.floor(Math.random() * 10000)}`} 
        userName={user?.name || 'Mteja'} 
      />

      {paymentDetails && (
        <ManualPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setPaymentDetails(null);
          }}
          amount={paymentDetails.amount}
          reason={paymentDetails.reason}
          onSubmit={handleManualPaymentSubmit}
        />
      )}
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
