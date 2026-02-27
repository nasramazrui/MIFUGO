import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { User, Product, Order, Activity, Withdrawal, ProductUnit, WithdrawalStatus } from '../types';
import { IKContext, IKUpload } from 'imagekitio-react';
import { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT, IMAGEKIT_AUTH_ENDPOINT, isImageKitConfigured } from '../services/imageKitService';
import { Modal } from '../components/Modal';
import { CATEGORIES, DAYS, ADMIN_WA } from '../constants';
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
  Camera
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
  const { user, products, orders, withdrawals, statuses, logout, addActivity, systemSettings, theme, setTheme, language, setLanguage, setView, t } = useApp();
  const [activeTab, setActiveTab] = useState<'dash' | 'products' | 'orders' | 'wallet' | 'settings' | 'status'>('dash');
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    method: 'mobile' as 'mobile' | 'bank',
    network: 'M-Pesa' as any,
    phoneNumber: '',
    bankName: '',
    accountNumber: '',
    accountName: ''
  });
  const [shopSettings, setShopSettings] = useState({
    openTime: user.openTime || "08:00",
    closeTime: user.closeTime || "18:00",
    openDays: user.openDays || [],
    deliveryCity: user.deliveryCity || 3000,
    deliveryOut: user.deliveryOut || 7000,
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

  const handleWithdrawRequest = () => {
    if (availableBalance < 10000) {
      toast.error('Salio lazima liwe angalau TZS 10,000 ili kutoa');
      return;
    }
    setIsWithdrawModalOpen(true);
  };

  const confirmWithdrawal = async () => {
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
      await addDoc(collection(db, 'kuku_withdrawals'), {
        vendorId: user.id,
        vendorName: user.shopName || user.name,
        amount: availableBalance,
        status: 'pending',
        method: withdrawForm.method,
        network: withdrawForm.method === 'mobile' ? withdrawForm.network : null,
        phoneNumber: withdrawForm.method === 'mobile' ? withdrawForm.phoneNumber : null,
        bankName: withdrawForm.method === 'bank' ? withdrawForm.bankName : null,
        accountNumber: withdrawForm.method === 'bank' ? withdrawForm.accountNumber : null,
        accountName: withdrawForm.method === 'bank' ? withdrawForm.accountName : null,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      addActivity('💸', `Maombi ya kutoa ${formatCurrency(availableBalance)} kutoka kwa ${user.shopName}`);
      toast.success('Maombi ya kutoa fedha yametumwa kwa Admin!');
      setIsWithdrawModalOpen(false);
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kutuma maombi');
    } finally {
      setLoading(false);
    }
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
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 text-slate-600 dark:text-slate-400"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
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
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-600 dark:text-slate-400"
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </button>
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
            { id: 'orders', label: 'Maagizo', icon: ClipboardList },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
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
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">Habari, {user.name}! 👋</h2>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-100 dark:shadow-none transition-all active:scale-95"
              >
                <Plus size={20} /> Ongeza Bidhaa
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Bidhaa', value: myProducts.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Maagizo', value: myOrders.length, icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Mapato (TZS)', value: formatCurrency(totalRevenue).replace('TZS ', ''), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
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
                          <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(order.total)}</p>
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
                        <p className="text-sm font-black text-amber-700 dark:text-amber-500">{formatCurrency(product.price)}</p>
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
                        {formatCurrency(p.price)}
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
                      <p className="text-xl font-black text-emerald-700">{formatCurrency(order.total)}</p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.payMethod}</span>
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.deliveryMethod}</span>
                      </div>
                    </div>
                  </div>

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
                <h3 className="text-5xl font-black mb-6">{formatCurrency(availableBalance)}</h3>
                <div className="flex gap-4">
                  <button 
                    onClick={handleWithdrawRequest}
                    className="bg-white text-emerald-800 px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
                  >
                    💸 Omba Malipo (Withdraw)
                  </button>
                </div>
                <div className="mt-4 flex gap-6 text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest">
                  <p>Jumla ya Mapato: {formatCurrency(totalRevenue)}</p>
                  <p>Zilizotolewa: {formatCurrency(withdrawnAmount)}</p>
                </div>
              </div>
              <div className="absolute right-[-40px] top-[-40px] text-[240px] opacity-10 select-none pointer-events-none">💰</div>
            </div>

            <div className="grid lg:grid-cols-2 gap-10">
              <div>
                <h4 className="text-lg font-black text-slate-900 mb-6">Historia ya Mapato</h4>
                <div className="space-y-3">
                  {myOrders.filter(o => o.status === 'delivered').map(order => (
                    <div key={order.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{order.userName}</p>
                          <p className="text-[10px] text-slate-400">{order.date} · {order.items[0].name}</p>
                        </div>
                      </div>
                      <p className="font-black text-emerald-700">+{formatCurrency(order.vendorNet || (order.total - (order.deliveryFee || 0)) * 0.94)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900 mb-6">Maombi ya Withdraw</h4>
                <div className="space-y-3">
                  {myWithdrawals.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Bado hujaomba malipo yoyote.</p>
                  ) : (
                    myWithdrawals.map(w => (
                      <div key={w.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-lg">💸</div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{formatCurrency(w.amount)}</p>
                            <p className="text-[10px] text-slate-400">{w.date} · {w.method === 'mobile' ? w.network : 'Bank'}</p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                          w.status === 'paid' ? "bg-emerald-100 text-emerald-700" : 
                          w.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
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
                {CATEGORIES.filter(c => c.id !== 'all').map(c => (
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
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                {newProduct.image ? (
                  <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl opacity-20">📸</span>
                )}
              </div>
            <div className="flex-1">
              {isIKConfigured ? (
                <IKContext 
                  publicKey={systemSettings?.imagekit_public_key || IMAGEKIT_PUBLIC_KEY} 
                  urlEndpoint={systemSettings?.imagekit_url_endpoint || IMAGEKIT_URL_ENDPOINT} 
                  authenticator={async () => {
                    const res = await fetch(IMAGEKIT_AUTH_ENDPOINT);
                    return await res.json();
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
                      onError={(err) => {
                        console.error('Upload Error:', err);
                        toast.error('Imeshindwa kupakia picha. Hakikisha ImageKit Keys zipo kwenye Secrets.');
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
                  {CATEGORIES.filter(c => c.id !== 'all').map(c => (
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
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                  {editingProduct.image ? (
                    <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl opacity-20">📸</span>
                  )}
                </div>
                <div className="flex-1">
                  {isIKConfigured ? (
                    <IKContext 
                      publicKey={systemSettings?.imagekit_public_key || IMAGEKIT_PUBLIC_KEY} 
                      urlEndpoint={systemSettings?.imagekit_url_endpoint || IMAGEKIT_URL_ENDPOINT} 
                      authenticator={async () => {
                        const res = await fetch(IMAGEKIT_AUTH_ENDPOINT);
                        return await res.json();
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
                        onError={(err) => {
                          console.error('Upload Error:', err);
                          toast.error('Imeshindwa kupakia picha. Hakikisha ImageKit Keys zipo kwenye Secrets.');
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
        onClose={() => setIsWithdrawModalOpen(false)}
        title="Omba Malipo (Withdraw)"
      >
        <div className="space-y-6">
          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Salio Linaloweza Kutolewa</p>
            <p className="text-3xl font-black text-emerald-800">{formatCurrency(availableBalance)}</p>
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
                🏦 Benki
              </button>
            </div>
          </div>

          {withdrawForm.method === 'mobile' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chagua Mtandao</label>
                <div className="grid grid-cols-2 gap-2">
                  {['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'HaloPesa'].map(net => (
                    <button 
                      key={net}
                      onClick={() => setWithdrawForm({...withdrawForm, network: net as any})}
                      className={cn(
                        "py-3 rounded-xl text-[10px] font-black border transition-all",
                        withdrawForm.network === net ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-100"
                      )}
                    >
                      {net}
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jina la Benki</label>
                <input 
                  type="text" 
                  placeholder="Mf. CRDB, NMB"
                  className="input-field"
                  value={withdrawForm.bankName}
                  onChange={e => setWithdrawForm({...withdrawForm, bankName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Namba ya Akaunti</label>
                <input 
                  type="text" 
                  placeholder="01XXXXXXXX"
                  className="input-field"
                  value={withdrawForm.accountNumber}
                  onChange={e => setWithdrawForm({...withdrawForm, accountNumber: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jina la Akaunti</label>
                <input 
                  type="text" 
                  placeholder="Jina kamili"
                  className="input-field"
                  value={withdrawForm.accountName}
                  onChange={e => setWithdrawForm({...withdrawForm, accountName: e.target.value})}
                />
              </div>
            </div>
          )}

          <button 
            onClick={confirmWithdrawal}
            disabled={loading}
            className="w-full btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 py-5 text-lg"
          >
            {loading ? 'INATUMA...' : '💸 Omba Malipo (Withdraw)'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
