import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';
import { CATEGORIES, DAYS, ADMIN_WA } from '../constants';
import { Modal } from '../components/Modal';
import { formatCurrency, generateId, cn } from '../utils';
import { AuthModal } from '../components/AuthModal';
import { motion } from 'motion/react';
import { Search, ShoppingBag, Store, Package, Star, Plus, Minus, Send, MapPin, LogOut, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db, auth } from '../services/firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export const ShopPage: React.FC = () => {
  const { products, user, vendors, orders, setOrders, addActivity, reviews, logout } = useApp();
  const [activeTab, setActiveTab] = useState<'browse' | 'stores' | 'orders'>('browse');
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isVendorRegModalOpen, setIsVendorRegModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [vendorFormData, setVendorFormData] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    password: '',
    location: '',
    phone: '',
    tin: '',
    nida: '',
    license: '',
    openTime: '08:00',
    closeTime: '18:00',
    openDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as string[]
  });
  const [isVendorLoading, setIsVendorLoading] = useState(false);

  const handleVendorRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVendorLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, vendorFormData.email, vendorFormData.password);
      const fbUser = userCredential.user;
      
      await updateProfile(fbUser, { displayName: vendorFormData.ownerName });
      
        const vendorData = {
          name: vendorFormData.ownerName,
          shopName: vendorFormData.shopName,
          email: vendorFormData.email,
          role: 'vendor',
          status: 'pending',
          location: vendorFormData.location,
          phone: vendorFormData.phone,
          tin: vendorFormData.tin,
          nida: vendorFormData.nida,
          license: vendorFormData.license,
          openTime: vendorFormData.openTime,
          closeTime: vendorFormData.closeTime,
          openDays: vendorFormData.openDays,
          createdAt: new Date().toISOString(),
          serverCreatedAt: serverTimestamp()
        };
      
      await setDoc(doc(db, 'kuku_users', fbUser.uid), vendorData);
      
      addActivity('🏪', `Muuzaji mpya "${vendorFormData.shopName}" amejisajili`);
      toast.success('Usajili umekamilika! Subiri idhini ya Admin.');
      
      const msg = `*Maombi Mapya ya Muuzaji — KukuMart*\n\nJina la Duka: ${vendorFormData.shopName}\nMmiliki: ${vendorFormData.ownerName}\nSimu: ${vendorFormData.phone}\n\nTafadhali nihakikie.`;
      window.open(`https://wa.me/${ADMIN_WA.replace(/\+/g,'')}?text=${encodeURIComponent(msg)}`);
      
      setIsVendorRegModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Hitilafu wakati wa kusajili');
    } finally {
      setIsVendorLoading(false);
    }
  };
  const [deliveryMethod, setDeliveryMethod] = useState<'city' | 'out' | 'pickup'>('city');
  const [payMethod, setPayMethod] = useState<'mpesa' | 'bank' | 'cash'>('mpesa');
  const [payPhone, setPayPhone] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  const productReviews = reviews.filter(r => r.productId === selectedProduct?.id);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProduct || !reviewText.trim()) return;

    setIsReviewLoading(true);
    try {
      await addDoc(collection(db, 'kuku_reviews'), {
        productId: selectedProduct.id,
        userId: user.id,
        userName: user.name,
        rating: reviewRating,
        text: reviewText,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      setReviewText('');
      setReviewRating(5);
      toast.success('Asante kwa maoni yako!');
    } catch (error) {
      toast.error('Imeshindwa kutuma maoni');
    } finally {
      setIsReviewLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCat === 'all' || p.category === selectedCat;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch && p.approved;
  });

  const isStoreOpen = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    // If vendor doesn't exist or hasn't set any settings, assume open
    if (!vendor) return true;
    if (!vendor.openTime || !vendor.closeTime) return true;
    
    // If openDays is missing or empty, assume open every day
    if (!vendor.openDays || vendor.openDays.length === 0) return true;
    
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = dayNames[now.getDay()];
    
    // Check if today is a working day
    if (!vendor.openDays.includes(today)) return false;
    
    try {
      const [openH, openM] = vendor.openTime.split(':').map(Number);
      const [closeH, closeM] = vendor.closeTime.split(':').map(Number);
      
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;
      
      // Handle overnight shifts (e.g., 22:00 to 06:00)
      if (closeMinutes < openMinutes) {
        return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
      }
      
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    } catch (e) {
      return true; // Fallback to open on error
    }
  };

  const handleBuyClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      setIsPaymentModalOpen(true);
    }
  };

  const [isOrderLoading, setIsOrderLoading] = useState(false);

  const confirmOrder = async () => {
    const p = selectedProduct || products.find(x => x.id === selectedProduct?.id);
    if (!p || !user) return;

    if (payMethod !== 'cash' && (!payPhone || !paymentProof)) {
      toast.error('Tafadhali jaza namba ya simu na uthibitisho wa malipo');
      return;
    }

    if (p.stock < qty) {
      toast.error('Samahani, mzigo hautoshi kwa sasa');
      return;
    }

    setIsOrderLoading(true);
    const deliveryFee = deliveryMethod === 'city' ? p.deliveryCity : 
                       deliveryMethod === 'out' ? p.deliveryOut : 0;
    
    const subtotal = p.price * qty;
    const adminCommission = subtotal * 0.06;
    const vendorNet = subtotal - adminCommission;
    const total = subtotal + deliveryFee;

    const orderData = {
      userId: user.id,
      userName: user.name,
      userContact: user.contact || user.email,
      userWA: payPhone,
      payPhone,
      items: [{ name: p.name, qty, price: p.price, unit: p.unit, emoji: p.emoji, image: p.image }],
      productId: p.id,
      vendorId: p.vendorId,
      vendorName: p.vendorName,
      productPrice: p.price,
      qty,
      deliveryFee,
      deliveryMethod,
      adminCommission,
      vendorNet,
      total,
      payMethod,
      paymentProof,
      paymentApproved: false,
      status: 'pending' as const,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp()
    };

    try {
      // Update Stock
      await updateDoc(doc(db, 'kuku_products', p.id), {
        stock: increment(-qty)
      });

      const docRef = await addDoc(collection(db, 'kuku_orders'), orderData);
      addActivity('🛒', `${user.name} amenunua ${p.name} × ${qty} — ${formatCurrency(total)}`);
      setIsPaymentModalOpen(false);
      setSelectedProduct(null);
      setActiveTab('orders');
      toast.success('Agizo limekamilika!');
      
      // WhatsApp redirect
      const msg = `*Uthibitisho wa Agizo — KukuMart* 🐔\n\nHabari, agizo langu #${docRef.id.substring(0,8)} limepokewa!\n\nBidhaa: *${p.name}* × ${qty}\nJumla: *${formatCurrency(total)}*\nNjia: *${payMethod}*\n\nAsante!`;
      window.open(`https://wa.me/${ADMIN_WA.replace(/\+/g,'')}?text=${encodeURIComponent(msg)}`);
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kutuma agizo');
    } finally {
      setIsOrderLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🐔</span>
            <h1 className="font-serif italic text-2xl text-amber-900 font-bold">KukuMart</h1>
          </div>
          <div className="flex-1 max-w-md relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Tafuta kuku, mayai, chakula..."
              className="w-full bg-slate-100 border-none rounded-2xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-amber-500 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-amber-600 rounded-full flex items-center justify-center text-white font-black text-sm">
                    {user.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-slate-700 hidden md:block">{user.name}</span>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Toka"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-amber-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-amber-100 active:scale-95 transition-all"
              >
                Ingia
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'browse' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Hero */}
            <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-[32px] p-8 text-white mb-8 relative overflow-hidden shadow-2xl shadow-amber-200">
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200 mb-2 block">Premium Marketplace</span>
                <h2 className="font-serif italic text-4xl mb-4 leading-tight">Soko la Kuku Bora<br />Tanzania Kiganjani Mwako</h2>
                <p className="text-amber-100 text-sm max-w-md mb-6">Pata bidhaa bora za kuku moja kwa moja kutoka kwa wafugaji waliohakikiwa nchi nzima.</p>
                <div className="flex flex-wrap gap-3">
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-bold border border-white/10">✓ Verified Vendors</div>
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-bold border border-white/10">✓ Real-time Tracking</div>
                  <button 
                    onClick={() => setIsVendorRegModalOpen(true)}
                    className="bg-amber-400 text-amber-950 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-amber-300 transition-all shadow-lg shadow-amber-900/20"
                  >
                    SAJILI DUKA LAKO
                  </button>
                </div>
              </div>
              <div className="absolute right-[-20px] bottom-[-40px] text-[200px] opacity-10 select-none pointer-events-none">🐔</div>
            </div>

            {/* Categories */}
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide mb-6">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={cn(
                    "flex-shrink-0 px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2",
                    selectedCat === cat.id 
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-100" 
                      : "bg-white text-slate-600 border border-slate-100 hover:border-amber-200"
                  )}
                >
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map(p => (
                <ProductCard 
                  key={p.id} 
                  product={p} 
                  isOpen={isStoreOpen(p.vendorId)}
                  onClick={() => {
                    setSelectedProduct(p);
                    setQty(1);
                  }} 
                />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'stores' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-2xl font-black text-slate-900 mb-6">🏪 Maduka Yote</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.filter(v => v.status === 'approved').map(v => (
                <div 
                  key={v.id}
                  className="bg-white rounded-[28px] border border-amber-100 p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                  onClick={() => setSelectedVendor(v)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl font-black text-amber-800 group-hover:scale-110 transition-transform">
                      {(v.shopName || v.name)[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900">{v.shopName || v.name}</h3>
                      <p className="text-xs text-slate-400">📍 {v.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", isStoreOpen(v.id) ? "bg-emerald-500" : "bg-red-500")} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {isStoreOpen(v.id) ? "Wazi Sasa" : "Limefungwa"}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-amber-600">ANGALIA BIDHAA →</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
             <h2 className="text-2xl font-black text-slate-900 mb-6">📦 Maagizo Yangu</h2>
             {!user ? (
               <div className="text-center py-20 bg-white rounded-[32px] border border-slate-100">
                 <div className="text-6xl mb-4">🔒</div>
                 <p className="text-slate-500 mb-6">Ingia kuona maagizo yako</p>
                 <button onClick={() => setIsAuthModalOpen(true)} className="btn-primary">Ingia Sasa</button>
               </div>
             ) : (
               <div className="space-y-4">
                 {orders.filter(o => o.userId === user.id).length === 0 ? (
                   <div className="text-center py-20 bg-white rounded-[32px] border border-slate-100">
                     <div className="text-6xl mb-4">📭</div>
                     <p className="text-slate-500 mb-6">Bado huna maagizo. Anza kununua sasa!</p>
                     <button onClick={() => setActiveTab('browse')} className="btn-primary">Nenda Dukani</button>
                   </div>
                 ) : (
                   orders.filter(o => o.userId === user.id).map(order => (
                     <div key={order.id} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
                       <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl overflow-hidden">
                             {order.items[0].image ? (
                               <img src={order.items[0].image} alt="" className="w-full h-full object-cover" />
                             ) : (
                               order.items[0].emoji
                             )}
                           </div>
                           <div>
                             <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Agizo #{order.id.substring(0,8)}</p>
                             <h4 className="font-black text-slate-900">{order.items[0].name} × {order.qty} {order.items[0].unit || 'pcs'}</h4>
                           </div>
                         </div>
                         <span className={cn(
                           "badge px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                           order.status === 'delivered' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                         )}>
                           {order.status}
                         </span>
                       </div>
                       <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                         <p className="font-black text-amber-700">{formatCurrency(order.total)}</p>
                         <button 
                           onClick={() => {
                             setSelectedOrder(order);
                             setIsTrackingModalOpen(true);
                           }}
                           className="text-xs font-black text-blue-600 hover:underline"
                         >
                           FUATILIA →
                         </button>
                       </div>
                     </div>
                   ))
                 )}
               </div>
             )}
          </motion.div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-3 z-40">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <button 
            onClick={() => setActiveTab('browse')}
            className={cn("flex flex-col items-center gap-1 transition-all", activeTab === 'browse' ? "text-amber-600 scale-110" : "text-slate-400")}
          >
            <ShoppingBag size={20} />
            <span className="text-[10px] font-black">Soko</span>
          </button>
          <button 
            onClick={() => setActiveTab('stores')}
            className={cn("flex flex-col items-center gap-1 transition-all", activeTab === 'stores' ? "text-amber-600 scale-110" : "text-slate-400")}
          >
            <Store size={20} />
            <span className="text-[10px] font-black">Maduka</span>
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={cn("flex flex-col items-center gap-1 transition-all", activeTab === 'orders' ? "text-amber-600 scale-110" : "text-slate-400")}
          >
            <Package size={20} />
            <span className="text-[10px] font-black">Oda</span>
          </button>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="flex flex-col items-center gap-1 text-slate-300"
          >
            <Info size={20} />
            <span className="text-[10px] font-black">Hali</span>
          </button>
        </div>
      </nav>

      {/* Debug Info */}
      {showDebug && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] w-full max-w-md p-8 overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Hali ya Mfumo</h3>
              <button onClick={() => setShowDebug(false)} className="text-slate-400">✕</button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Muunganisho wa Data</p>
                <p className="font-bold text-slate-700">Wauuzaji: {vendors.length}</p>
                <p className="font-bold text-slate-700">Bidhaa: {products.length}</p>
                <p className="font-bold text-slate-700">Maagizo: {orders.length}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Mtumiaji wa Sasa</p>
                <p className="font-bold text-slate-700">{user ? `${user.name} (${user.role})` : 'Hujaingia'}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl text-amber-900">
                <p className="text-[10px] font-black text-amber-400 uppercase mb-1">Kidokezo cha Msaada</p>
                <p className="text-xs leading-relaxed">
                  Ikiwa huoni bidhaa, hakikisha kuwa:
                  <br/>1. Umeunganishwa na Internet.
                  <br/>2. Firebase Security Rules zinaruhusu kusoma.
                  <br/>3. Kuna data kwenye Firestore collection 'kuku_products'.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowDebug(false)}
              className="w-full mt-6 bg-slate-900 text-white font-black py-4 rounded-2xl"
            >
              FUNGA
            </button>
          </div>
        </div>
      )}

      {/* Vendor KYC Modal */}
      <Modal 
        isOpen={isVendorRegModalOpen} 
        onClose={() => setIsVendorRegModalOpen(false)}
        title="Sajili Duka Lako (KYC)"
      >
        <form onSubmit={handleVendorRegister} className="space-y-4">
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-start gap-3 mb-4">
            <span className="text-2xl">🏪</span>
            <p className="text-xs text-green-800 leading-relaxed">
              Karibu KukuMart! Ili kuanza kuuza, tunahitaji maelezo ya biashara yako. 
              Admin atahakiki maelezo haya kabla ya duka lako kuwa hewani.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jina la Duka *</label>
              <input 
                type="text" required className="input-field" placeholder="Hassan Poultry Farm" 
                value={vendorFormData.shopName} onChange={e => setVendorFormData({...vendorFormData, shopName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jina la Mmiliki *</label>
              <input 
                type="text" required className="input-field" placeholder="Hassan Ali" 
                value={vendorFormData.ownerName} onChange={e => setVendorFormData({...vendorFormData, ownerName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mkoa *</label>
              <input 
                type="text" required className="input-field" placeholder="Dar es Salaam" 
                value={vendorFormData.location} onChange={e => setVendorFormData({...vendorFormData, location: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email ya Biashara *</label>
              <input 
                type="email" required className="input-field" placeholder="duka@email.com" 
                value={vendorFormData.email} onChange={e => setVendorFormData({...vendorFormData, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nywila *</label>
              <input 
                type="password" required className="input-field" placeholder="••••••••" 
                value={vendorFormData.password} onChange={e => setVendorFormData({...vendorFormData, password: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Simu ya Duka *</label>
              <input 
                type="tel" required className="input-field" placeholder="0712345678" 
                value={vendorFormData.phone} onChange={e => setVendorFormData({...vendorFormData, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Namba ya TIN</label>
              <input 
                type="text" className="input-field" placeholder="100-123-456" 
                value={vendorFormData.tin} onChange={e => setVendorFormData({...vendorFormData, tin: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Namba ya NIDA</label>
              <input 
                type="text" className="input-field" placeholder="1990..." 
                value={vendorFormData.nida} onChange={e => setVendorFormData({...vendorFormData, nida: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Leseni ya Biashara</label>
              <input 
                type="text" className="input-field" placeholder="BL/2024/..." 
                value={vendorFormData.license} onChange={e => setVendorFormData({...vendorFormData, license: e.target.value})}
              />
            </div>

            <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
              <p className="text-sm font-black text-slate-900 mb-4">Masaa ya Kazi</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Muda wa Kufungua *</label>
                  <input 
                    type="time" required className="input-field"
                    value={vendorFormData.openTime} onChange={e => setVendorFormData({...vendorFormData, openTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Muda wa Kufunga *</label>
                  <input 
                    type="time" required className="input-field"
                    value={vendorFormData.closeTime} onChange={e => setVendorFormData({...vendorFormData, closeTime: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Siku za Kazi *</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => {
                        const days = vendorFormData.openDays.includes(day.key)
                          ? vendorFormData.openDays.filter(d => d !== day.key)
                          : [...vendorFormData.openDays, day.key];
                        setVendorFormData({...vendorFormData, openDays: days});
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                        vendorFormData.openDays.includes(day.key)
                          ? "bg-amber-600 text-white shadow-md shadow-amber-100"
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button 
            type="submit"
            disabled={isVendorLoading}
            className="w-full btn-primary bg-green-600 hover:bg-green-700 shadow-green-100 mt-4 flex items-center justify-center gap-2"
          >
            {isVendorLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'WASILISHA MAOMBI →'}
          </button>
        </form>
      </Modal>

      {/* Order Tracking Modal */}
      <Modal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        title="Fuatilia Agizo"
      >
        {selectedOrder && (
          <div className="space-y-8">
            <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 text-center">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Namba ya Agizo</p>
              <p className="text-sm font-black text-blue-900">#{selectedOrder.id.substring(0,12)}</p>
            </div>

            <div className="space-y-6">
              {[
                { key: 'pending', label: 'Oda Imepokelewa', icon: '📋' },
                { key: 'processing', label: 'Inaandaliwa', icon: '🔪' },
                { key: 'waiting', label: 'Inasubiri Msafirishaji', icon: '📦' },
                { key: 'onway', label: 'Iko Njiani', icon: '🚚' },
                { key: 'delivered', label: 'Imefika!', icon: '✅' },
              ].map((s, i) => {
                const statuses = ['pending', 'processing', 'waiting', 'onway', 'delivered'];
                const currentIdx = statuses.indexOf(selectedOrder.status);
                const isDone = i < currentIdx;
                const isActive = i === currentIdx;

                return (
                  <div key={s.key} className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 transition-all",
                      isActive ? "bg-amber-600 text-white shadow-lg shadow-amber-100 scale-110" : 
                      isDone ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300"
                    )}>
                      {isDone ? '✓' : s.icon}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={cn(
                        "text-sm font-black",
                        isActive ? "text-amber-900" : isDone ? "text-emerald-700" : "text-slate-300"
                      )}>
                        {s.label}
                      </p>
                      {isActive && (
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Sasa hivi</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => {
                const msg = `Habari, naomba kujua hali ya agizo langu #${selectedOrder.id.substring(0,8)}.`;
                window.open(`https://wa.me/${ADMIN_WA.replace(/\+/g,'')}?text=${encodeURIComponent(msg)}`);
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              <Send size={18} /> WhatsApp Admin
            </button>
          </div>
        )}
      </Modal>

      {/* Vendor Detail Modal */}
      <Modal 
        isOpen={!!selectedVendor} 
        onClose={() => setSelectedVendor(null)}
      >
        {selectedVendor && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center text-4xl font-black text-amber-800">
                {(selectedVendor.shopName || selectedVendor.name)[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900">{selectedVendor.shopName || selectedVendor.name}</h2>
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <MapPin size={14} /> {selectedVendor.location}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    "badge px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    isStoreOpen(selectedVendor.id) ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  )}>
                    {isStoreOpen(selectedVendor.id) ? "🟢 Wazi Sasa" : "🔴 Imefungwa"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Masaa ya Kazi</p>
              <p className="text-xs text-slate-600 font-bold">
                {selectedVendor.openTime} - {selectedVendor.closeTime}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {DAYS.map(day => (
                  <span 
                    key={day.key} 
                    className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase",
                      selectedVendor.openDays?.includes(day.key) ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-400"
                    )}
                  >
                    {day.label}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                <Package size={18} className="text-amber-600" /> Bidhaa za Duka Hili
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {products.filter(p => p.vendorId === selectedVendor.id && p.approved).length === 0 ? (
                  <p className="col-span-2 text-center py-10 text-slate-400 text-xs italic">Hakuna bidhaa kwa sasa.</p>
                ) : (
                  products.filter(p => p.vendorId === selectedVendor.id && p.approved).map(p => (
                    <div 
                      key={p.id}
                      className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedProduct(p);
                        setQty(1);
                        setSelectedVendor(null);
                      }}
                    >
                      <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center text-3xl mb-2">
                        {p.emoji}
                      </div>
                      <h4 className="text-[11px] font-black text-slate-900 truncate">{p.name}</h4>
                      <p className="text-[10px] font-bold text-amber-600">{formatCurrency(p.price)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button 
              onClick={() => {
                const msg = `Habari ${selectedVendor.shopName || selectedVendor.name}, nimeona duka lenu KukuMart na ningependa kuuliza kuhusu bidhaa zenu.`;
                window.open(`https://wa.me/${(selectedVendor.phone || '').replace(/\+/g,'')}?text=${encodeURIComponent(msg)}`);
              }}
              className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              WAWASILIANA NA DUKA (WHATSAPP)
            </button>
          </div>
        )}
      </Modal>

      {/* Product Detail Modal */}
      <Modal 
        isOpen={!!selectedProduct && !isPaymentModalOpen} 
        onClose={() => setSelectedProduct(null)}
      >
        {selectedProduct && (
          <div className="space-y-6">
            <div className="aspect-square bg-amber-50 rounded-[28px] flex items-center justify-center text-8xl relative overflow-hidden">
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
              ) : (
                selectedProduct.emoji
              )}
              <div className="absolute bottom-4 left-4">
                <span className={cn(
                  "badge px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                  isStoreOpen(selectedProduct.vendorId) ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                )}>
                  {isStoreOpen(selectedProduct.vendorId) ? "🟢 Wazi" : "🔴 Imefungwa"}
                </span>
              </div>
            </div>
            
            <div>
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedProduct.name}</h2>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  {selectedProduct.category}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-amber-400">
                  {[1,2,3,4,5].map(s => {
                    const avgRating = productReviews.length > 0 
                      ? productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length 
                      : 5;
                    return <Star key={s} size={14} fill={s <= Math.round(avgRating) ? "currentColor" : "none"} />;
                  })}
                </div>
                <span className="text-xs text-slate-400 font-bold">
                  {productReviews.length > 0 
                    ? (productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length).toFixed(1) 
                    : "5.0"} 
                  ({productReviews.length} maoni)
                </span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">{selectedProduct.desc}</p>
            </div>

            {/* Reviews Section */}
            <div className="border-t border-slate-50 pt-6">
              <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                <Star size={18} className="text-amber-500" /> Maoni ya Wateja
              </h4>
              <div className="space-y-4 mb-6 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                {productReviews.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Hakuna maoni bado kwa bidhaa hii.</p>
                ) : (
                  productReviews.map((rev) => (
                    <div key={rev.id} className="bg-slate-50 p-4 rounded-2xl">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-black text-slate-900">{rev.userName}</span>
                        <div className="flex text-amber-400">
                          {[1,2,3,4,5].map(s => <Star key={s} size={10} fill={s <= rev.rating ? "currentColor" : "none"} />)}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">{rev.text}</p>
                      <p className="text-[8px] text-slate-300 mt-1">{rev.date}</p>
                    </div>
                  ))
                )}
              </div>
              
              {user && (
                <form onSubmit={handleReviewSubmit} className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Acha Maoni Yako</p>
                  <div className="flex gap-2 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <button type="button" key={s} onClick={() => setReviewRating(s)}>
                        <Star size={18} className={cn(s <= reviewRating ? "text-amber-500" : "text-slate-300")} fill={s <= reviewRating ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Andika maoni..." 
                      className="flex-1 bg-white border-none rounded-xl px-3 py-2 text-xs outline-none"
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      disabled={isReviewLoading}
                    />
                    <button 
                      type="submit"
                      disabled={isReviewLoading || !reviewText.trim()}
                      className="bg-amber-600 text-white p-2 rounded-xl disabled:opacity-50"
                    >
                      {isReviewLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Bei</p>
                <p className="text-xl font-black text-amber-700">
                  {formatCurrency(selectedProduct.price)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ {selectedProduct.unit}</span>
                </p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Stock</p>
                <p className="text-xl font-black text-slate-700">{selectedProduct.stock} {selectedProduct.unit === 'Kg' ? 'Kg' : 'pcs'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4">
              <span className="font-bold text-slate-700">Idadi:</span>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors"
                >
                  <Minus size={18} />
                </button>
                <span className="text-xl font-black w-6 text-center">{qty}</span>
                <button 
                  onClick={() => setQty(Math.min(selectedProduct.stock, qty + 1))}
                  className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-emerald-50 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <button 
              disabled={!isStoreOpen(selectedProduct.vendorId)}
              onClick={handleBuyClick}
              className={cn(
                "w-full py-5 rounded-[24px] font-black text-lg transition-all shadow-xl",
                isStoreOpen(selectedProduct.vendorId) 
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100 active:scale-95" 
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              {isStoreOpen(selectedProduct.vendorId) ? "NUNUA SASA 🛒" : "DUKA LIMEFUNGA 🔒"}
            </button>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)}
        title="Fanya Malipo"
      >
        <div className="space-y-6">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-500">Bidhaa:</span>
              <span className="text-sm font-bold">{selectedProduct?.name} × {qty}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-500">Bei:</span>
              <span className="text-sm font-bold">{formatCurrency(selectedProduct?.price * qty)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-amber-200">
              <span className="font-black text-slate-900">Jumla:</span>
              <span className="font-black text-amber-700">{formatCurrency(selectedProduct?.price * qty)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Njia ya Malipo</label>
            <div className="grid grid-cols-1 gap-2">
              {['mpesa', 'bank', 'cash'].map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m as any)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                    payMethod === m ? "border-amber-500 bg-amber-50" : "border-slate-100 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{m === 'mpesa' ? '📱' : m === 'bank' ? '🏦' : '💵'}</span>
                    <div>
                      <p className="font-bold text-sm capitalize">{m === 'mpesa' ? 'M-Pesa / Tigo / Airtel' : m === 'bank' ? 'Benki' : 'Pesa Taslimu'}</p>
                      <p className="text-[10px] text-slate-400">{m === 'cash' ? 'Lipa ukipokea mzigo' : 'Lipa sasa kwa usalama'}</p>
                    </div>
                  </div>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", payMethod === m ? "border-amber-500" : "border-slate-200")}>
                    {payMethod === m && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {payMethod !== 'cash' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Namba ya Simu ya Malipo</label>
                <input 
                  type="tel"
                  className="input-field"
                  placeholder="0712 345 678"
                  value={payPhone}
                  onChange={e => setPayPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Uthibitisho wa Malipo (SMS/Screenshot Text)</label>
                <textarea 
                  className="input-field resize-none"
                  rows={2}
                  placeholder="Nakili ujumbe wa muamala hapa..."
                  value={paymentProof}
                  onChange={e => setPaymentProof(e.target.value)}
                />
              </div>
            </div>
          )}

          <button 
            onClick={confirmOrder}
            disabled={isOrderLoading}
            className="w-full btn-primary py-5 text-lg flex items-center justify-center gap-2"
          >
            {isOrderLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'THIBITISHA AGIZO ✅'
            )}
          </button>
        </div>
      </Modal>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={() => {
          if (user?.role === 'admin') {
            // Admin panel handled by parent App.tsx
          }
        }}
      />
    </div>
  );
};
