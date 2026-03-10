import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { User, Product, Order, Activity, Withdrawal, ProductUnit, WithdrawalStatus, Auction } from '../types';
import { IKContext, IKUpload } from 'imagekitio-react';
import { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT, IMAGEKIT_AUTH_ENDPOINT, isImageKitConfigured } from '../services/imageKitService';
import { Modal } from '../components/Modal';
import { DAYS, ADMIN_WA } from '../constants';
import { formatCurrency, generateId } from '../utils';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Package, 
  Plus, 
  ClipboardList, 
  Wallet, 
  LogOut,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit2,
  Save,
  Send,
  Moon,
  Sun,
  Globe,
  ArrowLeft,
  Camera,
  MessageSquare,
  Star,
  Gavel,
  Settings
} from 'lucide-react';
import { cn } from '../utils';

import { db } from '../services/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export const VendorPortal: React.FC = () => {
  const { user, products, orders, auctions, withdrawals, statuses, categories, reviews, logout, addActivity, systemSettings, theme, setTheme, language, setLanguage, setView, t } = useApp();
  const currency = systemSettings?.currency || 'TZS';
  const [activeTab, setActiveTab] = useState<'dash' | 'products' | 'orders' | 'wallet' | 'settings' | 'status' | 'reviews' | 'auctions'>('dash');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isAuctionModalOpen, setIsAuctionModalOpen] = useState(false);
  const [isAuctionEditModalOpen, setIsAuctionEditModalOpen] = useState(false);
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const [productImageSource, setProductImageSource] = useState<'upload' | 'link'>('link');
  const [auctionImageSource, setAuctionImageSource] = useState<'upload' | 'link'>('link');
  const [editProductImageSource, setEditProductImageSource] = useState<'upload' | 'link'>('link');
  const [withdrawStep, setWithdrawStep] = useState<'form' | 'summary' | 'whatsapp'>('form');
  const [lastWithdrawalId, setLastWithdrawalId] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<{ balance: number, transactions: any[] }>({ balance: 0, transactions: [] });
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    method: 'mobile' as 'mobile' | 'bank',
    amount: '',
    network: 'M-Pesa' as any,
    phoneNumber: user?.contact || '',
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  const [auctionForm, setAuctionForm] = useState({
    productName: '',
    description: '',
    startingPrice: '',
    minIncrement: '20000',
    durationHours: '24',
    location: user.location || '',
    image: ''
  });

  // Fetch Wallet Data
  const fetchWallet = async () => {
    if (!user) return;
    try {
      setIsWalletLoading(true);
      const res = await fetch(`/api/wallet/${user.id}`);
      
      if (!res.ok) {
        const text = await res.text();
        console.error('Wallet API Error Response:', text);
        throw new Error(`Server returned ${res.status}: ${text.substring(0, 100)}`);
      }
      
      const data = await res.json();
      setWalletData({
        balance: data.balance,
        transactions: data.transactions
      });
    } catch (err: any) {
      console.error('Fetch Wallet Error:', err);
      // Only show toast if it's a real error, not just a cancelation
      if (err.name !== 'AbortError') {
        toast.error(`Hitilafu ya Wallet: ${err.message}`);
      }
    } finally {
      setIsWalletLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'wallet') {
      fetchWallet();
    }
  }, [activeTab, user]);
  const [shopSettings, setShopSettings] = useState({
    openTime: user.openTime || "08:00",
    closeTime: user.closeTime || "18:00",
    openDays: user.openDays || [],
    deliveryCity: user.deliveryCity || 3000,
    deliveryOut: user.deliveryOut || 7000,
    shopIcon: user.shopIcon || '',
    shopBanner: user.shopBanner || '',
  });
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
    category: 'mayai',
    unit: 'Piece' as ProductUnit,
    emoji: '🥚',
    image: '',
    desc: '',
    location: ''
  });

  // Status State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusVideoUrl, setStatusVideoUrl] = useState('');
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      setShopSettings({
        openTime: user.openTime || "08:00",
        closeTime: user.closeTime || "18:00",
        openDays: user.openDays || [],
        deliveryCity: user.deliveryCity || 3000,
        deliveryOut: user.deliveryOut || 7000,
        shopIcon: user.shopIcon || '',
        shopBanner: user.shopBanner || '',
      });
    }
  }, [user]);

  if (!user || user.role !== 'vendor') return null;

  if (user.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#fafaf8] dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[40px] p-10 shadow-xl border border-amber-100 dark:border-slate-800 text-center">
          <div className="w-20 h-20 bg-amber-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">
            ⏳
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Ombi Lako Linahakikiwa</h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
            Asante kwa kujiunga na {systemSettings?.app_name || 'FarmConnect'}! Admin anahakiki maelezo yako. 
            Utapewa uwezo wa kuongeza bidhaa pindi tu utakapoidhinishwa.
          </p>
          <button 
            onClick={logout}
            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
          >
            ONDOKA
          </button>
        </div>
      </div>
    );
  }

  const myProducts = products.filter(p => p.vendorId === user.id);
  const myOrders = orders.filter(o => o.vendorId === user.id);
  const myWithdrawals = withdrawals.filter(w => w.vendorId === user.id);
  const myStatuses = statuses.filter(s => s.vendorId === user.id);
  const myAuctions = auctions.filter(a => a.vendorId === user.id);
  
  const totalRevenue = myOrders
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + (o.vendorNet || (o.total - (o.deliveryFee || 0)) * 0.94), 0);

  const withdrawnAmount = myWithdrawals
    .filter(w => w.status === 'paid' || w.status === 'pending')
    .reduce((s, w) => s + w.amount, 0);

  const availableBalance = totalRevenue - withdrawnAmount;

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    setLoading(true);

    const productData = {
      name: newProduct.name,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock) || 0,
      category: newProduct.category as any,
      unit: newProduct.unit,
      emoji: newProduct.emoji,
      image: newProduct.image,
      desc: newProduct.desc,
      location: newProduct.location || user.location || '',
      region: user.region || '',
      vendorId: user.id,
      vendorName: user.shopName || user.name,
      approved: true,
      deliveryCity: user.deliveryCity || 0,
      deliveryOut: user.deliveryOut || 0,
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'kuku_products'), productData);
      addActivity('📦', `Bidhaa mpya "${productData.name}" imeongezwa na ${user.shopName}`);
      setIsAddModalOpen(false);
      setNewProduct({ name: '', price: '', stock: '', category: 'mayai', unit: 'Piece', emoji: '🥚', image: '', desc: '', location: '' });
      toast.success('Bidhaa imeongezwa!');
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kuongeza bidhaa');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !editingProduct.name || !editingProduct.price) return;
    setLoading(true);
    try {
      const { id, ...data } = editingProduct;
      await updateDoc(doc(db, 'kuku_products', id), {
        ...data,
        price: Number(data.price),
        stock: Number(data.stock)
      });
      toast.success('Bidhaa imesasishwa!');
      setIsEditModalOpen(false);
      setEditingProduct(null);
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kusasisha');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAuction = async (id: string) => {
    if (!window.confirm('Je, una uhakika unataka kufuta mnada huu?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_auctions', id));
      toast.success('Mnada umefutwa!');
      addActivity('🗑️', 'Umefuta mnada');
    } catch (err) {
      toast.error('Imeshindwa kufuta mnada');
    }
  };

  const handleUpdateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAuction) return;
    setLoading(true);
    try {
      const auctionRef = doc(db, 'kuku_auctions', editingAuction.id);
      
      // Calculate new end time if duration is provided
      let endTime = editingAuction.endTime;
      if (auctionForm.durationHours) {
        const newEnd = new Date();
        newEnd.setHours(newEnd.getHours() + Number(auctionForm.durationHours));
        endTime = newEnd;
      }

      await updateDoc(auctionRef, {
        productName: auctionForm.productName,
        description: auctionForm.description,
        startingPrice: Number(auctionForm.startingPrice),
        minIncrement: Number(auctionForm.minIncrement),
        location: auctionForm.location,
        image: auctionForm.image,
        endTime: endTime
      });
      toast.success('Mnada umesasishwa!');
      setIsAuctionEditModalOpen(false);
      setEditingAuction(null);
    } catch (err: any) {
      toast.error('Imeshindwa kusasisha mnada');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAuction = async () => {
    if (!auctionForm.productName || !auctionForm.startingPrice) {
      toast.error('Tafadhali jaza taarifa zote muhimu');
      return;
    }
    setLoading(true);
    try {
      // Create auction directly on client-side to avoid server-side permission issues
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + Number(auctionForm.durationHours || 24));
      
      const auctionData = {
        vendorId: user.id,
        vendorName: user.shopName || user.name,
        productName: auctionForm.productName,
        description: auctionForm.description,
        startingPrice: Number(auctionForm.startingPrice),
        minIncrement: Number(auctionForm.minIncrement || 0),
        currentBid: Number(auctionForm.startingPrice),
        endTime: endTime,
        location: auctionForm.location,
        image: auctionForm.image,
        status: 'active' as const,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'kuku_auctions'), auctionData);
      
      toast.success('Mnada umeanza rasmi!');
      setIsAuctionModalOpen(false);
      setAuctionForm({
        productName: '',
        description: '',
        startingPrice: '',
        minIncrement: '20000',
        durationHours: '24',
        location: user.location || '',
        image: ''
      });
      addActivity('🐄', `Umeanzisha mnada wa ${auctionForm.productName}`);
    } catch (err: any) {
      console.error('Auction creation error:', err);
      toast.error(err.message || 'Imeshindwa kuanzisha mnada');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (order: Order, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'kuku_orders', order.id), { status });
      addActivity('📦', `Agizo #${order.id.substring(0,8)} limebadilishwa hali kuwa ${status}`);
      toast.success('Hali ya agizo imebadilishwa');

      // WhatsApp Template Logic
      let template = '';
      const orderId = order.id.substring(0,8);
      const itemName = order.items[0].name;
      const itemQty = order.items[0].qty;
      const shopName = user.shopName || user.name;

      if (status === 'processing') {
        template = `Habari *${order.userName}*, oda yako namba *#${orderId}* imeshapokelewa rasmi! 🐔\n\nHALI: Sasa hivi inaandaliwa.\nBIDHAA: *${itemName}* x ${itemQty}\nMUUZAJI: *${shopName}*\n\nTunafanya kazi kwa haraka ili mzigo wako uwe tayari. Utapata update mara tu itakapoanza safari. Asante kwa kutumia ${systemSettings?.app_name || 'FarmConnect'}!`;
      } else if (status === 'waiting') {
        template = `Habari *${order.userName}*, oda yako *#${orderId}* imeshakamilika kuandaliwa na *${shopName}*! 📦\n\nHALI: Inasubiri msafirishaji aichukue.\nBIDHAA: *${itemName}*\n\nMsafirishaji akishachukua mzigo, utatumiwa namba yake ya simu kwa ajili ya mawasiliano zaidi. Kaa karibu na simu yako!`;
      } else if (status === 'onway') {
        template = `Habari *${order.userName}*, habari njema! Oda yako *#${orderId}* imeshatoka kuelekea kwako sasa hivi! 🚚💨\n\nMUUZAJI: *${shopName}*\nBIDHAA: *${itemName}* (${itemQty})\nHALI: Iko njiani (On the Way).\n\nUnaweza kufuatilia safari ya mzigo wako kupitia App ya ${systemSettings?.app_name || 'FarmConnect'}. Mpokeaji awe tayari kupokea simu ya msafirishaji. Asante!`;
      } else if (status === 'delivered') {
        template = `Hongera *${order.userName}*! 🎊 Oda yako *#${orderId}* imeshawasilishwa kwako.\n\nMUHTASARI:\nBidhaa: *${itemName}*\nKutoka: *${shopName}*\n\nTunakuomba uingie kwenye App ya ${systemSettings?.app_name || 'FarmConnect'} kuthibitisha kuwa umepokea mzigo ili muuzaji aweze kulipwa. Karibu tena!`;
      }

      if (template) {
        const phone = order.userContact.replace(/\+/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(template)}`);
      }
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kubadilisha hali');
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Je, una uhakika unataka kufuta agizo hili?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_orders', orderId));
      toast.success('Agizo limefutwa');
    } catch (err) {
      toast.error('Imeshindwa kufuta agizo');
    }
  };

  const handleWithdrawRequest = () => {
    if (availableBalance < 10000) {
      toast.error('Salio lazima liwe angalau TZS 10,000 ili kutoa');
      return;
    }
    setIsWithdrawModalOpen(true);
  };

  const calculateFee = (amount: number) => {
    if (!systemSettings) return 5000;
    if (systemSettings.withdrawalFeeType === 'percentage') {
      return (amount * (systemSettings.withdrawalFeeValue || 0)) / 100;
    }
    return systemSettings.withdrawalFeeValue || 5000;
  };

  const confirmWithdrawal = async () => {
    if (!user) return;
    const amountNum = Number(withdrawForm.amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Weka kiasi sahihi');
      return;
    }

    if (amountNum > walletData.balance) {
      toast.error('Salio halitoshi');
      return;
    }

    if (withdrawForm.method === 'mobile' && !withdrawForm.phoneNumber) {
      toast.error('Tafadhali weka namba ya simu');
      return;
    }
    if (withdrawForm.method === 'bank' && (!withdrawForm.bankName || !withdrawForm.accountNumber)) {
      toast.error('Tafadhali jaza taarifa za benki');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: user.id,
          amount: amountNum,
          method: withdrawForm.method === 'mobile' ? withdrawForm.network : 'Visa / Mastercard',
          phone: withdrawForm.method === 'mobile' ? withdrawForm.phoneNumber : `${withdrawForm.bankName} - ${withdrawForm.accountNumber}`
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setLastWithdrawalId(data.id);
      setWithdrawStep('whatsapp');
      fetchWallet(); // Refresh
      addActivity('💸', `Umeomba kutoa ${formatCurrency(amountNum, currency)}`);
    } catch (error: any) {
      toast.error(error.message || 'Hitilafu wakati wa kutuma maombi');
    } finally {
      setLoading(false);
    }
  };

  const getWhatsAppLink = () => {
    if (!user) return '';
    const amountNum = Number(withdrawForm.amount);
    const fee = calculateFee(amountNum);
    const net = amountNum - fee;
    const method = withdrawForm.method === 'mobile' ? withdrawForm.network : 'Visa / Mastercard';
    const phone = withdrawForm.method === 'mobile' ? withdrawForm.phoneNumber : `${withdrawForm.bankName} - ${withdrawForm.accountNumber}`;
    
    const message = `HABARI ADMIN! NAOMBA KUTOA PESA (WITHDRAW) 💸\n\nVENDOR: *${user.shopName || user.name}*\nKIASI: *${formatCurrency(amountNum, currency)}*\nMAKATO (FEE): *${formatCurrency(fee, currency)}*\nUTAPOKEA (NET): *${formatCurrency(net, currency)}*\nNJIA: *${method}*\nNAMBA/ACC: *${phone}*\nID: *${lastWithdrawalId}*\n\nTafadhali hakiki na kunitumia pesa. Asante!`;
    
    return `https://wa.me/${systemSettings?.adminWhatsApp || '255764225358'}?text=${encodeURIComponent(message)}`;
  };

  const updateShopSettings = async (settings: any) => {
    try {
      await updateDoc(doc(db, 'kuku_users', user.id), settings);
      toast.success('Mipangilio imehifadhiwa!');
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kuhifadhi');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta bidhaa hii?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_products', id));
      toast.success('Bidhaa imefutwa');
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kufuta');
    }
  };

  const handlePostStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!statusText.trim()) return;

    setIsStatusLoading(true);
    try {
      await addDoc(collection(db, 'kuku_statuses'), {
        vendorId: user.id,
        vendorName: user.shopName || user.name,
        vendorAvatar: user.avatar || '',
        text: statusText,
        videoUrl: statusVideoUrl,
        likes: [],
        comments: [],
        createdAt: serverTimestamp()
      });
      toast.success('Status imewekwa!');
      setStatusText('');
      setStatusVideoUrl('');
      setIsStatusModalOpen(false);
    } catch (error) {
      toast.error('Hitilafu wakati wa kuweka status');
    } finally {
      setIsStatusLoading(false);
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm('Je, una uhakika unataka kufuta status hii?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_statuses', statusId));
      toast.success('Status imefutwa');
    } catch (error) {
      toast.error('Hitilafu wakati wa kufuta status');
    }
  };

  const isIKConfigured = isImageKitConfigured || (systemSettings?.imagekit_public_key && systemSettings?.imagekit_url_endpoint);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row pb-20 md:pb-0 transition-colors duration-300">
      {/* Mobile Header */}
      <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView('shop')}
            className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-emerald-600 dark:text-emerald-500"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-serif italic text-lg text-emerald-800 dark:text-emerald-500 font-bold">Vendor</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl">
            <div className="relative" ref={langRef}>
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="p-2 text-slate-600 dark:text-slate-400"
              >
                <Globe size={18} />
              </button>
              {isLangOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 rounded-xl p-1 z-50 min-w-[100px] animate-in fade-in zoom-in duration-200">
                  {['sw', 'en', 'ar', 'hi'].map(lang => (
                    <button 
                      key={lang}
                      onClick={() => {
                        setLanguage(lang as any);
                        setIsLangOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase",
                        language === lang ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={logout} className="text-red-400 p-2">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex-col sticky top-0 h-screen z-20">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏪</span>
              <h1 className="font-serif italic text-lg text-emerald-800 dark:text-emerald-500 font-bold">Vendor</h1>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
              <div className="relative" ref={langRef}>
                <button 
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-600 dark:text-slate-400"
                >
                  <Globe size={14} />
                </button>
                {isLangOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 rounded-xl p-1 z-50 min-w-[100px] animate-in fade-in zoom-in duration-200">
                    {['sw', 'en', 'ar', 'hi'].map(lang => (
                      <button 
                        key={lang}
                        onClick={() => {
                          setLanguage(lang as any);
                          setIsLangOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase",
                          language === lang ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setView('shop')}
            className="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-500 transition-all border border-slate-100 dark:border-slate-800"
          >
            <ArrowLeft size={14} />
            {t('go_to_market')}
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dash', label: 'Dashibodi', icon: LayoutDashboard },
            { id: 'products', label: 'Bidhaa Zangu', icon: Package },
            { id: 'auctions', label: 'Minada Yangu', icon: Gavel },
            { id: 'orders', label: 'Maagizo', icon: ClipboardList },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
            { id: 'reviews', label: 'Maoni (Reviews)', icon: MessageSquare },
            { id: 'status', label: t('status'), icon: Camera },
            { id: 'settings', label: 'Mipangilio', icon: Clock },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                activeTab === item.id 
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm" 
                  : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-50 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-4 mb-4 border border-slate-100 dark:border-slate-700/50 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-sm overflow-hidden border-2 border-white dark:border-slate-700 shadow-md">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.name[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user.shopName || user.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-bold">{user.email}</p>
              </div>
            </div>
            <div className={cn(
              "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5",
              user.status === 'approved' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", user.status === 'approved' ? "bg-emerald-500" : "bg-amber-500")} />
              {user.status === 'approved' ? "Approved" : "Pending Approval"}
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut size={18} />
            Toka
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {user.status === 'pending' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl p-6 mb-8 flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">⏳</div>
            <div>
              <h3 className="font-black text-amber-900 dark:text-amber-100 mb-1">Akaunti Yako Inasubiri Idhini</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                Admin bado hajahakiki duka lako. Huwezi kuuza bidhaa mpaka upate idhini. 
                Tafadhali hakikisha umetuma maelezo yako ya KYC kwa WhatsApp ya Admin.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'dash' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">Habari, {user.name}! 👋</h2>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-100 dark:shadow-none transition-all active:scale-95"
                >
                  <Plus size={20} /> Uza Kawaida
                </button>
                <button 
                  onClick={() => setIsAuctionModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-purple-100 dark:shadow-none transition-all active:scale-95"
                >
                  <TrendingUp size={20} /> Weka Mnada
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Bidhaa', value: myProducts.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Maagizo', value: myOrders.length, icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: `Mapato (${currency})`, value: formatCurrency(totalRevenue, currency).replace(`${currency} `, ''), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Hali', value: user.status === 'approved' ? 'Active' : 'Pending', icon: CheckCircle2, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.bg, stat.bg.includes('blue') && 'dark:bg-blue-900/20', stat.bg.includes('emerald') && 'dark:bg-emerald-900/20', stat.bg.includes('amber') && 'dark:bg-amber-900/20', stat.bg.includes('purple') && 'dark:bg-purple-900/20')}>
                    <stat.icon className={stat.color} size={24} />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                <h3 className="font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <Clock size={20} className="text-amber-500" /> Maagizo ya Hivi Karibuni
                </h3>
                <div className="space-y-4">
                  {myOrders.length === 0 ? (
                    <p className="text-center py-10 text-slate-400 text-sm">Hakuna maagizo bado.</p>
                  ) : (
                    myOrders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{order.items[0].emoji}</div>
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">{order.userName}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{order.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(order.total, currency)}</p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{order.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                <h3 className="font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <AlertCircle size={20} className="text-blue-500" /> Bidhaa Maarufu
                </h3>
                <div className="space-y-4">
                  {myProducts.length === 0 ? (
                    <p className="text-center py-10 text-slate-400 text-sm">Bado haujaongeza bidhaa.</p>
                  ) : (
                    myProducts.slice(0, 5).map(product => (
                      <div key={product.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{product.emoji}</div>
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">{product.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">Stock: {product.stock} pcs</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-amber-700 dark:text-amber-500">{formatCurrency(product.price, currency)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-slate-900">Bidhaa Zangu</h2>
              <button onClick={() => setIsAddModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Plus size={20} /> Ongeza
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myProducts.map(p => (
                <div key={p.id} className="bg-white rounded-[28px] border border-slate-100 overflow-hidden shadow-sm group">
                  <div className="aspect-video bg-slate-50 flex items-center justify-center text-5xl relative">
                    {p.emoji}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingProduct(p);
                          setIsEditModalOpen(true);
                        }}
                        className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(p.id)}
                        className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{p.category}</span>
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                        p.approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {p.approved ? "Active" : "Pending"}
                      </span>
                    </div>
                    <h4 className="font-black text-slate-900 mb-1">{p.name}</h4>
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{p.desc}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <p className="font-black text-emerald-700">
                        {formatCurrency(p.price, currency)}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">/ {p.unit}</span>
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">Stock: {p.stock}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-8">Maagizo ya Duka</h2>
            <div className="space-y-4">
              {myOrders.map(order => (
                <div key={order.id} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl overflow-hidden">
                        {order.items[0].image ? (
                          <img src={order.items[0].image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          order.items[0].emoji
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">{order.userName} — {order.items[0].name} × {order.qty} {order.items[0].unit || 'pcs'}</h4>
                        <p className="text-xs text-slate-400">#{order.id.substring(0,12)} · {order.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-emerald-700">{formatCurrency(order.total, currency)}</p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.payMethod}</span>
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.deliveryMethod}</span>
                      </div>
                    </div>
                  </div>

                  {order.payMethod !== 'cash' && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uthibitisho wa Malipo</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400">Mtumaji:</p>
                          <p className="text-xs font-bold">{order.senderName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Simu:</p>
                          <p className="text-xs font-bold">{order.payPhone}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Kiasi:</p>
                          <p className="text-xs font-bold">{formatCurrency(Number(order.sentAmount || 0), currency)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Trans ID:</p>
                          <p className="text-xs font-bold">{order.transactionId}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-slate-50">
                    <select 
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order, e.target.value as any)}
                      className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                    >
                      <option value="pending">📋 Oda Imepokelewa</option>
                      <option value="processing">🔪 Inaandaliwa</option>
                      <option value="waiting">📦 Inasubiri Msafirishaji</option>
                      <option value="onway">🚚 Iko Njiani</option>
                      <option value="pickup">🏪 Tayari Kuchukua</option>
                      <option value="delivered">✅ Imefika!</option>
                    </select>

                    <button 
                      onClick={() => {
                        const msg = `Habari *${order.userName}*, oda yako #${order.id.substring(0,8)} imebadilishwa hali kuwa *${order.status.toUpperCase()}*! 🐔\n\nAsante kwa kutumia ${systemSettings?.app_name || 'FarmConnect'}!`;
                        window.open(`https://wa.me/${order.userContact?.replace(/\+/,'')}?text=${encodeURIComponent(msg)}`);
                      }}
                      className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-200 transition-all"
                    >
                      <Send size={14} /> WhatsApp Mteja
                    </button>

                    {(order.status === 'delivered' || order.status === 'completed' || order.status === 'pickup') && (
                      <button 
                        onClick={() => deleteOrder(order.id)}
                        className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-100 transition-all ml-auto"
                      >
                        <Trash2 size={14} /> Futa Agizo
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'wallet' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-8">💰 Wallet Yangu</h2>
            
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-[40px] p-10 text-white shadow-2xl shadow-emerald-100 mb-10 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-emerald-200 text-xs font-black uppercase tracking-[0.2em] mb-2">Salio la Wallet (Available)</p>
                <h3 className="text-5xl font-black mb-6">{formatCurrency(walletData.balance, currency)}</h3>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="bg-white text-emerald-800 px-8 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg"
                  >
                    💸 Omba Malipo (Withdraw)
                  </button>
                </div>
              </div>
              <div className="absolute right-[-40px] top-[-40px] text-[240px] opacity-10 select-none pointer-events-none">💰</div>
            </div>

            <div className="grid lg:grid-cols-2 gap-10">
              <div>
                <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-500" /> Historia ya Miamala
                </h4>
                <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
                  {isWalletLoading ? (
                    <div className="p-20 text-center">
                      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">Inapakia miamala...</p>
                    </div>
                  ) : walletData.transactions.length === 0 ? (
                    <div className="p-20 text-center">
                      <Wallet size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400">Bado huna miamala yoyote.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {walletData.transactions.map((tx: any) => (
                        <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center text-xl",
                              tx.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                              {tx.amount > 0 ? '📈' : '📉'}
                            </div>
                            <div>
                              <p className="font-black text-slate-900">{tx.description || tx.type.toUpperCase()}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 
                                 tx.createdAt?._seconds ? new Date(tx.createdAt._seconds * 1000).toLocaleString() :
                                 tx.date || 'Sasa hivi'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "font-black",
                              tx.amount > 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                              {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, currency)}
                            </p>
                            <span className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                              tx.status === 'Completed' || tx.status === 'approved' ? "bg-emerald-100 text-emerald-700" : 
                              tx.status === 'Pending' || tx.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                            )}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  <Clock size={20} className="text-amber-500" /> Maombi ya Withdraw
                </h4>
                <div className="space-y-4">
                  {myWithdrawals.length === 0 ? (
                    <div className="bg-white rounded-[32px] border border-slate-100 p-10 text-center">
                      <p className="text-slate-400 text-sm italic">Bado hujaomba malipo yoyote.</p>
                    </div>
                  ) : (
                    myWithdrawals.map(w => (
                      <div key={w.id} className="bg-white rounded-3xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl">💸</div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{formatCurrency(w.amount, currency)}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {w.date} · {w.method === 'mobile' ? w.network : 'Bank'}
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider",
                          w.status === 'Completed' || w.status === 'paid' ? "bg-emerald-100 text-emerald-700" : 
                          w.status === 'Pending' || w.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>
                          {w.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'auctions' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-slate-900">Minada Yangu</h2>
              <button onClick={() => setIsAuctionModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Plus size={20} /> Anza Mnada
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAuctions.map(a => (
                <div key={a.id} className="bg-white rounded-[28px] border border-slate-100 overflow-hidden shadow-sm group">
                  <div className="aspect-video bg-slate-50 flex items-center justify-center text-5xl relative overflow-hidden">
                    {a.image ? (
                      <img src={a.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      '🐄'
                    )}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingAuction(a);
                          setAuctionForm({
                            productName: a.productName,
                            description: a.description,
                            startingPrice: a.startingPrice.toString(),
                            minIncrement: a.minIncrement.toString(),
                            durationHours: '24',
                            location: a.location,
                            image: a.image || ''
                          });
                          setIsAuctionEditModalOpen(true);
                        }}
                        className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteAuction(a.id)}
                        className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                      {a.status}
                    </div>
                  </div>
                  <div className="p-6">
                    <h4 className="font-black text-slate-900 mb-1">{a.productName}</h4>
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{a.description}</p>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Bid</p>
                        <p className="text-sm font-black text-emerald-700">{formatCurrency(a.currentBid, currency)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          {a.status === 'ended' ? 'Winner' : 'Highest Bidder'}
                        </p>
                        <p className="text-sm font-black text-slate-900">
                          {a.status === 'ended' ? (a.winnerName || 'No winner') : (a.highestBidderName || 'No bids')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'reviews' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-8">Maoni ya Wateja</h2>
            <div className="grid gap-6">
              {reviews.filter(r => r.vendorId === user.id).length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[40px] border border-slate-100">
                  <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400">Bado huna maoni kutoka kwa wateja.</p>
                </div>
              ) : (
                reviews.filter(r => r.vendorId === user.id).map(review => (
                  <div key={review.id} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl overflow-hidden">
                          {review.userAvatar ? (
                            <img src={review.userAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            '👤'
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900">{review.userName}</h4>
                          <p className="text-xs text-slate-400">{review.date}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star 
                            key={star} 
                            size={16} 
                            className={cn(star <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200")} 
                          />
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Bidhaa: {review.productName}</p>
                      <p className="text-slate-700 font-bold leading-relaxed italic">"{review.text || review.comment || 'Hakuna maoni ya maandishi.'}"</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
        {activeTab === 'status' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900">{t('status')}</h2>
                <p className="text-slate-500 font-bold">Manage your store updates and stories</p>
              </div>
              <button 
                onClick={() => setIsStatusModalOpen(true)}
                className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-amber-100 hover:scale-105 transition-transform active:scale-95"
              >
                {t('post_status')} +
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myStatuses.length === 0 ? (
                <div className="col-span-full text-center py-20 bg-white rounded-[32px] border border-slate-100">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera size={32} className="text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-bold">Hujaweka status yoyote bado.</p>
                </div>
              ) : (
                myStatuses.map(status => (
                  <div key={status.id} className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {status.createdAt?.toDate ? status.createdAt.toDate().toLocaleDateString() : 'Sasa hivi'}
                      </span>
                      <button 
                        onClick={() => handleDeleteStatus(status.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <p className="text-slate-600 text-sm mb-4 line-clamp-3">{status.text}</p>
                    {status.videoUrl && (
                      <div className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs p-2 text-center">
                        Video Link: {status.videoUrl}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                        <span>❤️ {status.likes.length}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                        <span>💬 {status.comments.length}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <h2 className="text-3xl font-black text-slate-900 mb-8">⚙️ Mipangilio ya Duka</h2>
            
            <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm space-y-8">
              {/* Open/Closed Logic */}
              <div>
                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-amber-500" /> Muda wa Kazi
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Saa ya Kufungua</label>
                    <input 
                      type="time" 
                      value={shopSettings.openTime}
                      onChange={(e) => setShopSettings({ ...shopSettings, openTime: e.target.value })}
                      className="input-field" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Saa ya Kufunga</label>
                    <input 
                      type="time" 
                      value={shopSettings.closeTime}
                      onChange={(e) => setShopSettings({ ...shopSettings, closeTime: e.target.value })}
                      className="input-field" 
                    />
                  </div>
                </div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Siku za Kazi</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button
                      key={day.key}
                      onClick={() => {
                        const current = shopSettings.openDays;
                        const next = current.includes(day.key) 
                          ? current.filter(d => d !== day.key)
                          : [...current, day.key];
                        setShopSettings({ ...shopSettings, openDays: next });
                      }}
                      className={cn(
                        "w-10 h-10 rounded-xl font-black text-xs transition-all",
                        shopSettings.openDays.includes(day.key)
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100"
                          : "bg-slate-50 text-slate-400 border border-slate-100"
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-slate-50" />

              {/* Delivery Fees */}
              <div>
                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-500" /> Gharama za Usafiri
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Ndani ya Mji (TZS)</label>
                    <input 
                      type="number" 
                      value={shopSettings.deliveryCity}
                      onChange={(e) => setShopSettings({ ...shopSettings, deliveryCity: Number(e.target.value) })}
                      className="input-field" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nje ya Mji (TZS)</label>
                    <input 
                      type="number" 
                      value={shopSettings.deliveryOut}
                      onChange={(e) => setShopSettings({ ...shopSettings, deliveryOut: Number(e.target.value) })}
                      className="input-field" 
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-50" />

              {/* Shop Branding */}
              <div>
                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Camera size={20} className="text-purple-500" /> Muonekano wa Duka
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Shop Icon (URL)</label>
                    <input 
                      type="text" 
                      value={shopSettings.shopIcon}
                      onChange={(e) => setShopSettings({ ...shopSettings, shopIcon: e.target.value })}
                      className="input-field" 
                      placeholder="https://link.to/icon.png"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Shop Banner (URL)</label>
                    <input 
                      type="text" 
                      value={shopSettings.shopBanner}
                      onChange={(e) => setShopSettings({ ...shopSettings, shopBanner: e.target.value })}
                      className="input-field" 
                      placeholder="https://link.to/banner.png"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={() => updateShopSettings(shopSettings)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                >
                  <Save size={20} /> HIFADHI MIPANGILIO
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 z-40 flex justify-between items-center">
        {[
          { id: 'dash', icon: LayoutDashboard, label: 'Dash' },
          { id: 'products', icon: Package, label: 'Bidhaa' },
          { id: 'orders', icon: ClipboardList, label: 'Oda' },
          { id: 'wallet', icon: Wallet, label: 'Wallet' },
          { id: 'settings', icon: Clock, label: 'Saa' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === item.id ? "text-emerald-600 scale-110" : "text-slate-400"
            )}
          >
            <item.icon size={20} />
            <span className="text-[9px] font-black uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Status Modal */}
      <Modal 
        isOpen={isStatusModalOpen} 
        onClose={() => setIsStatusModalOpen(false)}
        title={t('post_status')}
      >
        <form onSubmit={handlePostStatus} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('status_placeholder')}</label>
            <textarea 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm min-h-[120px] outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              placeholder="Andika hapa..."
              value={statusText}
              onChange={e => setStatusText(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('video_link')}</label>
            <input 
              type="url"
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              placeholder="https://youtube.com/..."
              value={statusVideoUrl}
              onChange={e => setStatusVideoUrl(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={isStatusLoading || !statusText.trim()}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-100 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isStatusLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={18} /> WEKA STATUS</>}
          </button>
        </form>
      </Modal>

      {/* Add Product Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Ongeza Bidhaa Mpya"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jina la Bidhaa *</label>
            <input 
              type="text" 
              className="input-field"
              placeholder="Mayai ya Kuku 30pcs"
              value={newProduct.name}
              onChange={e => setNewProduct({...newProduct, name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bei (TZS) *</label>
              <input 
                type="number" 
                className="input-field"
                placeholder="12000"
                value={newProduct.price}
                onChange={e => setNewProduct({...newProduct, price: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stock (pcs)</label>
              <input 
                type="number" 
                className="input-field"
                placeholder="100"
                value={newProduct.stock}
                onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Aina</label>
              <select 
                className="input-field"
                value={newProduct.category}
                onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vipimo (Unit)</label>
              <select 
                className="input-field"
                value={newProduct.unit}
                onChange={e => setNewProduct({...newProduct, unit: e.target.value as any})}
              >
                <option value="Piece">Piece (Mnyama mzima/Yai)</option>
                <option value="Kg">Kg (Nyama)</option>
                <option value="Tray">Tray (Trei ya mayai)</option>
                <option value="Half">Half (Nusu mzoga/trei)</option>
                <option value="Quarter">Quarter (Robo mzoga)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Eneo</label>
            <input 
              type="text" 
              className="input-field"
              placeholder="Dar es Salaam"
              value={newProduct.location}
              onChange={e => setNewProduct({...newProduct, location: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Maelezo</label>
            <textarea 
              className="input-field resize-none"
              rows={3}
              placeholder="Elezea bidhaa yako hapa..."
              value={newProduct.desc}
              onChange={e => setNewProduct({...newProduct, desc: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Picha ya Bidhaa (Hiari)</label>
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setProductImageSource('upload')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                  productImageSource === 'upload' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                Upload
              </button>
              <button 
                onClick={() => setProductImageSource('link')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                  productImageSource === 'link' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                Link ya Picha
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                {newProduct.image ? (
                  <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl opacity-20">📸</span>
                )}
              </div>
              <div className="flex-1">
                {productImageSource === 'upload' ? (
                  <>
                    {isIKConfigured ? (
                      <IKContext 
                        publicKey={systemSettings?.imagekit_public_key || IMAGEKIT_PUBLIC_KEY} 
                        urlEndpoint={systemSettings?.imagekit_url_endpoint || IMAGEKIT_URL_ENDPOINT} 
                        authenticator={async () => {
                          try {
                            const res = await fetch(IMAGEKIT_AUTH_ENDPOINT);
                            if (!res.ok) {
                              const errorData = await res.json();
                              throw new Error(errorData.error || `Server returned ${res.status}`);
                            }
                            return await res.json();
                          } catch (err: any) {
                            console.error('Authenticator Error:', err);
                            throw new Error(`Authentication failed: ${err.message}`);
                          }
                        }}
                      >
                          <IKUpload
                            fileName={`product_${Date.now()}.png`}
                            tags={["product"]}
                            useUniqueFileName={true}
                            onSuccess={(res) => {
                              setNewProduct({...newProduct, image: res.url});
                              toast.success('Picha imepakiwa!');
                            }}
                            onError={(err: any) => {
                              console.error('Upload Error:', err);
                              const msg = err.message || 'Imeshindwa kupakia picha. Hakikisha ImageKit Keys zipo kwenye Secrets.';
                              toast.error(msg);
                            }}
                            className="hidden"
                            id="product-image"
                          />
                      </IKContext>
                    ) : (
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewProduct({...newProduct, image: reader.result as string});
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="product-image"
                      />
                    )}
                    <label 
                      htmlFor="product-image"
                      className="inline-block px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black cursor-pointer hover:bg-slate-200 transition-all"
                    >
                      {isImageKitConfigured ? 'PAKIA PICHA' : 'CHAGUA PICHA'}
                    </label>
                  </>
                ) : (
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="Weka link yoyote ya picha hapa (mfano: https://...)"
                    value={newProduct.image}
                    onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                  />
                )}
                {newProduct.image && (
                  <button 
                    onClick={() => setNewProduct({...newProduct, image: ''})}
                    className="ml-2 text-[10px] font-black text-red-500 uppercase"
                  >
                    Futa
                  </button>
                )}
                <p className="text-[10px] text-slate-400 mt-1">Kama huna picha, emoji itatumika.</p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Emoji (Inatumika kama huna picha)</label>
            <div className="flex gap-2 flex-wrap">
              {['🥚', '🍖', '🍗', '🥩', '🥓', '🐣', '🐔', '🐓', '🐄', '🐐', '🐏', '🐑', '🐪', '🐫', '🐎', '🐖', '🦆', '🐦', '🐇', '🦃', '🌾'].map(e => (
                <button
                  key={e}
                  onClick={() => setNewProduct({...newProduct, emoji: e})}
                  className={cn(
                    "w-12 h-12 text-2xl rounded-2xl border-2 transition-all",
                    newProduct.emoji === e ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-white"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={handleAddProduct}
            className="w-full btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 mt-4"
          >
            💾 HIFADHI BIDHAA
          </button>
        </div>
      </Modal>

      {/* Edit Product Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        }}
        title="Hariri Bidhaa"
      >
        {editingProduct && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jina la Bidhaa</label>
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="Mf. Mayai ya Kienyeji"
                  value={editingProduct.name}
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bei (TZS)</label>
                <input 
                  type="number" 
                  className="input-field"
                  placeholder="15000"
                  value={editingProduct.price}
                  onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stock (Pcs)</label>
                <input 
                  type="number" 
                  className="input-field"
                  placeholder="100"
                  value={editingProduct.stock}
                  onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Aina</label>
                <select 
                  className="input-field"
                  value={editingProduct.category}
                  onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vipimo</label>
                <select 
                  className="input-field"
                  value={editingProduct.unit}
                  onChange={e => setEditingProduct({...editingProduct, unit: e.target.value as any})}
                >
                  <option value="Piece">Piece</option>
                  <option value="Kg">Kg</option>
                  <option value="Tray">Tray</option>
                  <option value="Half">Half</option>
                  <option value="Quarter">Quarter</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Maelezo</label>
              <textarea 
                className="input-field resize-none"
                rows={3}
                placeholder="Elezea bidhaa yako hapa..."
                value={editingProduct.desc}
                onChange={e => setEditingProduct({...editingProduct, desc: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Picha ya Bidhaa (Hiari)</label>
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => setEditProductImageSource('upload')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                    editProductImageSource === 'upload' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                  )}
                >
                  Upload
                </button>
                <button 
                  onClick={() => setEditProductImageSource('link')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                    editProductImageSource === 'link' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                  )}
                >
                  Link ya Picha
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                  {editingProduct.image ? (
                    <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl opacity-20">📸</span>
                  )}
                </div>
                <div className="flex-1">
                  {editProductImageSource === 'upload' ? (
                    <>
                      {isIKConfigured ? (
                        <IKContext 
                          publicKey={systemSettings?.imagekit_public_key || IMAGEKIT_PUBLIC_KEY} 
                          urlEndpoint={systemSettings?.imagekit_url_endpoint || IMAGEKIT_URL_ENDPOINT} 
                          authenticator={async () => {
                            try {
                              const res = await fetch(IMAGEKIT_AUTH_ENDPOINT);
                              if (!res.ok) {
                                const errorData = await res.json();
                                throw new Error(errorData.error || `Server returned ${res.status}`);
                              }
                              return await res.json();
                            } catch (err: any) {
                              console.error('Authenticator Error:', err);
                              throw new Error(`Authentication failed: ${err.message}`);
                            }
                          }}
                        >
                          <IKUpload
                            fileName={`edit_product_${Date.now()}.png`}
                            tags={["product"]}
                            useUniqueFileName={true}
                            onSuccess={(res) => {
                              setEditingProduct({...editingProduct, image: res.url});
                              toast.success('Picha imesasishwa!');
                            }}
                            onError={(err: any) => {
                              console.error('Upload Error:', err);
                              const msg = err.message || 'Imeshindwa kupakia picha. Hakikisha ImageKit Keys zipo kwenye Secrets.';
                              toast.error(msg);
                            }}
                            className="hidden"
                            id="edit-product-image"
                          />
                        </IKContext>
                      ) : (
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditingProduct({...editingProduct, image: reader.result as string});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                          id="edit-product-image"
                        />
                      )}
                      <label 
                        htmlFor="edit-product-image"
                        className="inline-block px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black cursor-pointer hover:bg-slate-200 transition-all"
                      >
                        {isImageKitConfigured ? 'BADILISHA PICHA' : 'BADILISHA PICHA'}
                      </label>
                    </>
                  ) : (
                    <input 
                      type="text"
                      className="input-field"
                      placeholder="Weka link yoyote ya picha hapa (mfano: https://...)"
                      value={editingProduct.image}
                      onChange={e => setEditingProduct({...editingProduct, image: e.target.value})}
                    />
                  )}
                  {editingProduct.image && (
                    <button 
                      onClick={() => setEditingProduct({...editingProduct, image: ''})}
                      className="ml-2 text-[10px] font-black text-red-500 uppercase"
                    >
                      Futa
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Emoji</label>
              <div className="flex gap-2 flex-wrap">
                {['🥚', '🍖', '🍗', '🥩', '🥓', '🐣', '🐔', '🐓', '🐄', '🐐', '🐏', '🐑', '🐪', '🐫', '🐎', '🐖', '🦆', '🐦', '🐇', '🦃', '🌾'].map(e => (
                  <button
                    key={e}
                    onClick={() => setEditingProduct({...editingProduct, emoji: e})}
                    className={cn(
                      "w-12 h-12 text-2xl rounded-2xl border-2 transition-all",
                      editingProduct.emoji === e ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-white"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={handleUpdateProduct}
              className="w-full btn-primary bg-blue-600 hover:bg-blue-700 shadow-blue-100 mt-4"
              disabled={loading}
            >
              {loading ? 'INASASISHA...' : '💾 SASISHA BIDHAA'}
            </button>
          </div>
        )}
      </Modal>
      {/* Withdraw Modal */}
      <Modal 
        isOpen={isWithdrawModalOpen} 
        onClose={() => {
          setIsWithdrawModalOpen(false);
          setWithdrawStep('form');
        }}
        title={withdrawStep === 'form' ? "Omba Malipo (Withdraw)" : withdrawStep === 'summary' ? "Thibitisha Malipo" : "Tuma Ombi WhatsApp"}
      >
        {withdrawStep === 'form' && (
          <div className="space-y-6">
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center">
              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Salio la Wallet</p>
              <p className="text-3xl font-black text-emerald-800">{formatCurrency(walletData.balance, currency)}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kiasi cha Kutoa (TZS)</label>
              <input 
                type="number" 
                placeholder="Mf. 50000"
                className="input-field"
                value={withdrawForm.amount}
                onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Njia ya Malipo</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setWithdrawForm({...withdrawForm, method: 'mobile'})}
                  className={cn(
                    "py-4 rounded-2xl font-black text-xs transition-all border-2",
                    withdrawForm.method === 'mobile' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-400"
                  )}
                >
                  📱 Mtandao wa Simu
                </button>
                <button 
                  onClick={() => setWithdrawForm({...withdrawForm, method: 'bank'})}
                  className={cn(
                    "py-4 rounded-2xl font-black text-xs transition-all border-2",
                    withdrawForm.method === 'bank' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-400"
                  )}
                >
                  💳 Visa / Mastercard
                </button>
              </div>
            </div>

            {withdrawForm.method === 'mobile' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chagua Mtandao</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'M-Pesa', label: 'Vodacom M-Pesa' },
                      { id: 'Airtel Money', label: 'Airtel Money' },
                      { id: 'Tigo Pesa', label: 'Tigo Pesa' },
                      { id: 'HaloPesa', label: 'HaloPesa' }
                    ].map(net => (
                      <button 
                        key={net.id}
                        onClick={() => setWithdrawForm({...withdrawForm, network: net.id as any})}
                        className={cn(
                          "py-3 rounded-xl text-[10px] font-black border transition-all",
                          withdrawForm.network === net.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-100"
                        )}
                      >
                        {net.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Namba ya Simu</label>
                  <input 
                    type="tel" 
                    placeholder="07XXXXXXXX"
                    className="input-field"
                    value={withdrawForm.phoneNumber}
                    onChange={e => setWithdrawForm({...withdrawForm, phoneNumber: e.target.value})}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Card Number / Account Number</label>
                  <input 
                    type="text" 
                    placeholder="Weka namba ya kadi au akaunti"
                    className="input-field"
                    value={withdrawForm.accountNumber}
                    onChange={e => setWithdrawForm({...withdrawForm, accountNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bank Name (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Mf. CRDB, NMB"
                    className="input-field"
                    value={withdrawForm.bankName}
                    onChange={e => setWithdrawForm({...withdrawForm, bankName: e.target.value})}
                  />
                </div>
              </div>
            )}

            <button 
              onClick={() => {
                if (!withdrawForm.amount || Number(withdrawForm.amount) <= 0) {
                  toast.error('Weka kiasi sahihi');
                  return;
                }
                setWithdrawStep('summary');
              }}
              className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl shadow-slate-100 transition-all active:scale-95"
            >
              SUBMIT WITHDRAW
            </button>
          </div>
        )}

        {withdrawStep === 'summary' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase">Vendor</span>
                <span className="font-black text-slate-900">{user.shopName || user.name}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase">Kiasi</span>
                <span className="font-black text-slate-900 text-xl">{formatCurrency(Number(withdrawForm.amount), currency)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase">Makato (Fee)</span>
                <span className="font-black text-red-500">-{formatCurrency(calculateFee(Number(withdrawForm.amount)), currency)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase">Utapokea (Net)</span>
                <span className="font-black text-emerald-600 text-xl">{formatCurrency(Number(withdrawForm.amount) - calculateFee(Number(withdrawForm.amount)), currency)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase">Njia</span>
                <span className="font-black text-slate-900">{withdrawForm.method === 'mobile' ? withdrawForm.network : 'Visa / Mastercard'}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase">Namba</span>
                <span className="font-black text-slate-900">{withdrawForm.method === 'mobile' ? withdrawForm.phoneNumber : withdrawForm.accountNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Hali</span>
                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Pending</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setWithdrawStep('form')}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black transition-all"
              >
                RUDI NYUMA
              </button>
              <button 
                onClick={confirmWithdrawal}
                disabled={loading}
                className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
              >
                {loading ? 'INAHIFADHI...' : 'CONFIRM WITHDRAW'}
              </button>
            </div>
          </div>
        )}

        {withdrawStep === 'whatsapp' && (
          <div className="space-y-8 text-center py-6">
            <div className="w-24 h-24 bg-emerald-50 rounded-[40px] flex items-center justify-center text-5xl mx-auto mb-4">
              ✅
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Ombi Limehifadhiwa!</h3>
              <p className="text-slate-500 text-sm leading-relaxed px-6">
                Sasa tuma ombi lako kwa Admin kupitia WhatsApp ili akutumie pesa haraka iwezekanavyo.
              </p>
            </div>

            <button 
              onClick={() => {
                window.open(getWhatsAppLink(), '_blank');
                setIsWithdrawModalOpen(false);
                setWithdrawStep('form');
              }}
              className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Send size={24} /> SEND WITHDRAW REQUEST
            </button>
          </div>
        )}
      </Modal>

      {/* Auction Modal */}
      <Modal 
        isOpen={isAuctionModalOpen} 
        onClose={() => setIsAuctionModalOpen(false)}
        title="Weka Mnada (Auction)"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jina la Mfugo</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="Mf. Ng'ombe wa maziwa"
                value={auctionForm.productName}
                onChange={e => setAuctionForm({...auctionForm, productName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bei ya Kuanzia (TZS)</label>
              <input 
                type="number" 
                className="input-field"
                placeholder="500000"
                value={auctionForm.startingPrice}
                onChange={e => setAuctionForm({...auctionForm, startingPrice: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ongezeko la chini (Bid)</label>
              <input 
                type="number" 
                className="input-field"
                placeholder="20000"
                value={auctionForm.minIncrement}
                onChange={e => setAuctionForm({...auctionForm, minIncrement: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Muda wa Mnada (Saa)</label>
              <select 
                className="input-field"
                value={auctionForm.durationHours}
                onChange={e => setAuctionForm({...auctionForm, durationHours: e.target.value})}
              >
                <option value="1">Saa 1</option>
                <option value="6">Saa 6</option>
                <option value="12">Saa 12</option>
                <option value="24">Saa 24</option>
                <option value="48">Saa 48</option>
                <option value="72">Saa 72</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location</label>
            <input 
              type="text" 
              className="input-field"
              placeholder="Mf. Morogoro"
              value={auctionForm.location}
              onChange={e => setAuctionForm({...auctionForm, location: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Maelezo</label>
            <textarea 
              className="input-field resize-none"
              rows={3}
              placeholder="Elezea mfugo wako hapa..."
              value={auctionForm.description}
              onChange={e => setAuctionForm({...auctionForm, description: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Picha ya Mfugo</label>
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setAuctionImageSource('upload')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                  auctionImageSource === 'upload' ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                Upload
              </button>
              <button 
                onClick={() => setAuctionImageSource('link')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                  auctionImageSource === 'link' ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                Link ya Picha
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                {auctionForm.image ? (
                  <img src={auctionForm.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl opacity-20">📸</span>
                )}
              </div>
              <div className="flex-1">
                {auctionImageSource === 'upload' ? (
                  <>
                    {isImageKitConfigured ? (
                      <IKContext 
                        publicKey={systemSettings?.imagekit_public_key || IMAGEKIT_PUBLIC_KEY} 
                        urlEndpoint={systemSettings?.imagekit_url_endpoint || IMAGEKIT_URL_ENDPOINT} 
                        authenticator={async () => {
                          try {
                            const res = await fetch(IMAGEKIT_AUTH_ENDPOINT);
                            if (!res.ok) {
                              const errorData = await res.json();
                              throw new Error(errorData.error || `Server returned ${res.status}`);
                            }
                            return await res.json();
                          } catch (err: any) {
                            console.error('Authenticator Error:', err);
                            throw new Error(`Authentication failed: ${err.message}`);
                          }
                        }}
                      >
                          <IKUpload
                            fileName={`auction_${Date.now()}.png`}
                            tags={["auction"]}
                            useUniqueFileName={true}
                            onSuccess={(res) => {
                              setAuctionForm({...auctionForm, image: res.url});
                              toast.success('Picha imepakiwa!');
                            }}
                            onError={(err: any) => {
                              console.error('Upload Error:', err);
                              const msg = err.message || 'Imeshindwa kupakia picha. Hakikisha ImageKit Keys zipo kwenye Secrets.';
                              toast.error(msg);
                            }}
                            className="hidden"
                            id="auction-image"
                          />
                      </IKContext>
                    ) : (
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setAuctionForm({...auctionForm, image: reader.result as string});
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="auction-image"
                      />
                    )}
                    <label 
                      htmlFor="auction-image"
                      className="inline-block px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black cursor-pointer hover:bg-slate-200 transition-all"
                    >
                      {isImageKitConfigured ? 'PAKIA PICHA' : 'CHAGUA PICHA'}
                    </label>
                  </>
                ) : (
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="Weka link yoyote ya picha hapa (mfano: https://...)"
                    value={auctionForm.image}
                    onChange={e => setAuctionForm({...auctionForm, image: e.target.value})}
                  />
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={handleStartAuction}
            disabled={loading}
            className="w-full py-5 bg-purple-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-purple-100 transition-all active:scale-95"
          >
            {loading ? 'INAHIFADHI...' : '🚀 ANZISHA MNADA'}
          </button>
        </div>
      </Modal>

      {/* Edit Auction Modal */}
      <Modal 
        isOpen={isAuctionEditModalOpen} 
        onClose={() => {
          setIsAuctionEditModalOpen(false);
          setEditingAuction(null);
        }}
        title="Hariri Mnada"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jina la Bidhaa *</label>
            <input 
              type="text" 
              className="input-field"
              value={auctionForm.productName}
              onChange={e => setAuctionForm({...auctionForm, productName: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bei ya Kuanzia (TZS) *</label>
              <input 
                type="number" 
                className="input-field"
                value={auctionForm.startingPrice}
                onChange={e => setAuctionForm({...auctionForm, startingPrice: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ongezeko la Chini (TZS)</label>
              <input 
                type="number" 
                className="input-field"
                value={auctionForm.minIncrement}
                onChange={e => setAuctionForm({...auctionForm, minIncrement: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Eneo</label>
            <input 
              type="text" 
              className="input-field"
              value={auctionForm.location}
              onChange={e => setAuctionForm({...auctionForm, location: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Maelezo</label>
            <textarea 
              className="input-field resize-none"
              rows={3}
              value={auctionForm.description}
              onChange={e => setAuctionForm({...auctionForm, description: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Picha ya Mnada (URL)</label>
            <input 
              type="text" 
              className="input-field"
              value={auctionForm.image}
              onChange={e => setAuctionForm({...auctionForm, image: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Muda wa Mnada (Saa kuanzia sasa)</label>
            <input 
              type="number" 
              className="input-field"
              placeholder="Mf: 24"
              value={auctionForm.durationHours}
              onChange={e => setAuctionForm({...auctionForm, durationHours: e.target.value})}
            />
            <p className="text-[10px] text-slate-400 mt-1 italic">* Acha wazi ikiwa hutaki kubadilisha muda wa mwisho uliopo.</p>
          </div>
          <button 
            onClick={handleUpdateAuction}
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-100 transition-all active:scale-95"
          >
            {loading ? 'INAHIFADHI...' : 'HIFADHI MABADILIKO'}
          </button>
        </div>
      </Modal>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between z-40">
        {[
          { id: 'over', icon: LayoutDashboard, label: 'Dash' },
          { id: 'orders', icon: ClipboardList, label: 'Oda' },
          { id: 'products', icon: Package, label: 'Bidhaa' },
          { id: 'wallet', icon: Wallet, label: 'Wallet' },
          { id: 'settings', icon: Settings, label: 'Seti' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === item.id ? "text-emerald-600" : "text-slate-400"
            )}
          >
            <item.icon size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
