import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils';
import { Modal } from '../components/Modal';
import { motion } from 'motion/react';
import { db } from '../services/firebase';
import { 
  collection, 
  addDoc,
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { WalletTransaction } from '../types';
import { 
  LayoutDashboard,
  BarChart3, 
  Users, 
  Store, 
  Package, 
  ClipboardList, 
  Wallet, 
  LogOut,
  Check,
  X,
  TrendingUp,
  MapPin,
  ShoppingBag,
  Bell,
  Settings,
  Camera,
  Save,
  Star,
  Trash2,
  DollarSign,
  ShieldCheck,
  Moon,
  Sun,
  Globe,
  ArrowLeft,
  Grid,
  MessageSquare
} from 'lucide-react';
import { cn } from '../utils';
import { CATEGORIES } from '../constants';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { toast } from 'react-hot-toast';

export const AdminPanel: React.FC = () => {
  const { 
    user,
    users, 
    vendors, 
    admins,
    products, 
    orders, 
    activities, 
    withdrawals,
    walletTransactions,
    statuses,
    categories,
    reviews,
    systemSettings,
    updateSystemSettings,
    logout, 
    addActivity,
    theme,
    setTheme,
    language,
    setLanguage,
    setView,
    t
  } = useApp();
  const currency = systemSettings?.currency || 'TZS';
  const [activeTab, setActiveTab] = useState<'over' | 'analytics' | 'vendors' | 'prods' | 'orders' | 'users' | 'admins' | 'wallet' | 'settings' | 'status' | 'cats' | 'reviews'>('over');
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

  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm('Je, una uhakika unataka kufuta status hii?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_statuses', statusId));
      toast.success('Status imefutwa');
    } catch (error) {
      toast.error('Hitilafu wakati wa kufuta status');
    }
  };

  const [editingItem, setEditingItem] = useState<{ type: string, data: any } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({
    id: '',
    label: '',
    emoji: '',
    image: ''
  });
  const [isEditingCat, setIsEditingCat] = useState(false);
  const [walletSubTab, setWalletSubTab] = useState<'deposits' | 'withdrawals'>('deposits');

  const handleSaveCategory = async () => {
    if (!catForm.label) return;
    try {
      if (isEditingCat) {
        await updateDoc(doc(db, 'kuku_categories', catForm.id), {
          label: catForm.label,
          emoji: catForm.emoji,
          image: catForm.image
        });
        toast.success('Category imesasishwa');
      } else {
        await addDoc(collection(db, 'kuku_categories'), {
          label: catForm.label,
          emoji: catForm.emoji,
          image: catForm.image,
          createdAt: serverTimestamp()
        });
        toast.success('Category imeongezwa');
      }
      setIsCatModalOpen(false);
      setCatForm({ id: '', label: '', emoji: '', image: '' });
    } catch (error) {
      toast.error('Hitilafu imetokea');
    }
  };

  const handleImportDefaults = async () => {
    if (!confirm('Hii itaongeza kategoria zote za msingi. Je, uendelee?')) return;
    try {
      for (const cat of CATEGORIES) {
        if (cat.id === 'all') continue;
        await addDoc(collection(db, 'kuku_categories'), {
          label: cat.label,
          emoji: cat.emoji,
          image: cat.image || '',
          createdAt: serverTimestamp()
        });
      }
      toast.success('Kategoria zimeingizwa!');
    } catch (error) {
      toast.error('Hitilafu imetokea');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Futa category hii?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_categories', id));
      toast.success('Category imefutwa');
    } catch (error) {
      toast.error('Hitilafu imetokea');
    }
  };

  const [localSettings, setLocalSettings] = useState({
    imagekit_public_key: '',
    imagekit_private_key: '',
    imagekit_url_endpoint: '',
    firebase_api_key: '',
    firebase_auth_domain: '',
    firebase_project_id: '',
    banners: [] as { image: string, link: string }[],
    app_logo: '',
    app_name: '',
    currency: 'TZS',
    loading_icon: '',
    loading_url: '',
    withdrawalFeeType: 'fixed' as 'fixed' | 'percentage',
    withdrawalFeeValue: 0,
    adminWhatsApp: '255764225358',
    paymentNumber: '0687225353',
    paymentName: 'Amour',
    firebase_service_account: ''
  });

  useEffect(() => {
    if (systemSettings) {
      setLocalSettings({
        imagekit_public_key: systemSettings.imagekit_public_key || '',
        imagekit_private_key: systemSettings.imagekit_private_key || '',
        imagekit_url_endpoint: systemSettings.imagekit_url_endpoint || '',
        firebase_api_key: systemSettings.firebase_api_key || '',
        firebase_auth_domain: systemSettings.firebase_auth_domain || '',
        firebase_project_id: systemSettings.firebase_project_id || '',
        banners: systemSettings.banners || [],
        app_logo: systemSettings.app_logo || '',
        app_name: systemSettings.app_name || '',
        currency: systemSettings.currency || 'TZS',
        loading_icon: systemSettings.loading_icon || '',
        loading_url: systemSettings.loading_url || '',
        withdrawalFeeType: systemSettings.withdrawalFeeType || 'fixed',
        withdrawalFeeValue: systemSettings.withdrawalFeeValue || 0,
        adminWhatsApp: systemSettings.adminWhatsApp || '255764225358',
        paymentNumber: systemSettings.paymentNumber || '0687225353',
        paymentName: systemSettings.paymentName || 'Amour',
        firebase_service_account: systemSettings.firebase_service_account || ''
      });
    }
  }, [systemSettings]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateSystemSettings(localSettings);
      toast.success('Mipangilio imehifadhiwa!');
    } catch (error) {
      toast.error('Imeshindwa kuhifadhi mipangilio');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const pendingVendors = vendors.filter(v => v.status === 'pending');
  const COLORS = ['#d97706', '#059669', '#2563eb', '#7c3aed', '#db2777'];

  // Dynamic Analytics
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  const totalAdminEarnings = orders
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + (o.adminCommission || (o.total - (o.deliveryFee || 0)) * 0.06), 0);
  
  const regionStats = vendors.reduce((acc: any, v) => {
    const reg = v.region || 'Unknown';
    acc[reg] = (acc[reg] || 0) + 1;
    return acc;
  }, {});

  const dynamicRegionData = Object.entries(regionStats).map(([name, value]) => ({ name, value }));

  const topSellers = vendors
    .map(v => ({
      name: v.shopName || v.name,
      sales: orders.filter(o => o.vendorId === v.id && o.status === 'delivered').reduce((s, o) => s + o.total, 0)
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  const salesByDate = orders
    .filter(o => o.status === 'delivered')
    .reduce((acc: any, o) => {
      const date = o.date || 'Unknown';
      acc[date] = (acc[date] || 0) + o.total;
      return acc;
    }, {});

  const salesHistoryData = Object.entries(salesByDate)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  const popularProductsData = products
    .map(p => ({
      name: p.name,
      sales: orders.filter(o => o.productId === p.id && o.status === 'delivered').length,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 4);

  const approveWithdrawal = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      addActivity('💸', `Malipo yameidhinishwa (Completed)`);
      toast.success('Malipo yameidhinishwa');
    } catch (error: any) {
      toast.error(error.message || 'Hitilafu wakati wa kuidhinisha');
    }
  };

  const rejectWithdrawal = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected' })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      addActivity('✕', `Maombi ya malipo yamekataliwa (Rejected)`);
      toast.success('Maombi yamekataliwa');
    } catch (error: any) {
      toast.error(error.message || 'Hitilafu wakati wa kukataa');
    }
  };

  const approveDeposit = async (tx: WalletTransaction) => {
    try {
      await updateDoc(doc(db, 'kuku_wallet', tx.id), { status: 'approved' });
      await updateDoc(doc(db, 'kuku_users', tx.userId), { 
        walletBalance: increment(tx.amount) 
      });
      toast.success('Deposit imethibitishwa na salio limeongezwa!');
      addActivity('💰', `Deposit ya ${formatCurrency(tx.amount, currency)} ya ${tx.userName} imethibitishwa`);
    } catch (err) {
      console.error(err);
      toast.error('Imeshindwa kuthibitisha deposit');
    }
  };

  const rejectDeposit = async (id: string) => {
    try {
      await updateDoc(doc(db, 'kuku_wallet', id), { status: 'rejected' });
      toast.success('Deposit imekataliwa');
    } catch (err) {
      toast.error('Imeshindwa kukataa deposit');
    }
  };

  const approveVendor = async (id: string) => {
    try {
      await updateDoc(doc(db, 'kuku_users', id), { status: 'approved' });
      addActivity('✅', `Muuzaji ameidhinishwa`);
      toast.success('Muuzaji ameidhinishwa');
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kuidhinisha');
    }
  };

  const rejectVendor = async (id: string) => {
    try {
      await updateDoc(doc(db, 'kuku_users', id), { status: 'rejected' });
      addActivity('✕', `Maombi ya muuzaji yamekataliwa`);
      toast.success('Maombi yamekataliwa');
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kukataa');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta mtumiaji huyu?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_users', id));
      toast.success('Mtumiaji amefutwa');
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kufuta');
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta agizo hili?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_orders', id));
      toast.success('Agizo limefutwa');
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kufuta');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row pb-20 lg:pb-0 transition-colors duration-300">
      {/* Mobile Header */}
      <header className="lg:hidden bg-amber-950 text-amber-100 px-6 py-4 sticky top-0 z-30 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView('shop')}
            className="p-2 bg-white/5 rounded-xl text-amber-400"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-serif italic text-lg font-bold">Admin</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
            <div className="relative" ref={langRef}>
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="p-1.5 text-amber-400"
              >
                <Globe size={16} />
              </button>
              {isLangOpen && (
                <div className="absolute top-full right-0 mt-2 bg-slate-900 shadow-2xl border border-white/10 rounded-xl p-1 z-50 min-w-[100px] animate-in fade-in zoom-in duration-200">
                  {['sw', 'en', 'ar', 'hi'].map(lang => (
                    <button 
                      key={lang}
                      onClick={() => {
                        setLanguage(lang as any);
                        setIsLangOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase",
                        language === lang ? "bg-amber-500 text-amber-950" : "text-amber-400/60 hover:bg-white/5"
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={logout} className="text-amber-400/60 p-2">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-72 bg-amber-950 text-amber-100 flex-col sticky top-0 h-screen z-20">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-amber-950 shadow-lg">
                <BarChart3 size={18} />
              </div>
              <h1 className="font-serif italic text-lg font-bold">Admin</h1>
            </div>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
              <div className="relative" ref={langRef}>
                <button 
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-amber-400"
                >
                  <Globe size={14} />
                </button>
                {isLangOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-slate-900 shadow-2xl border border-white/10 rounded-xl p-1 z-50 min-w-[100px] animate-in fade-in zoom-in duration-200">
                    {['sw', 'en', 'ar', 'hi'].map(lang => (
                      <button 
                        key={lang}
                        onClick={() => {
                          setLanguage(lang as any);
                          setIsLangOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase",
                          language === lang ? "bg-amber-500 text-amber-950" : "text-amber-400/60 hover:bg-white/5"
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
            className="w-full flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-amber-400 transition-all border border-white/5"
          >
            <ArrowLeft size={14} />
            {t('go_to_market')}
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto scrollbar-hide">
          {[
            { id: 'over', label: 'Muhtasari', icon: LayoutDashboard },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'vendors', label: 'Wauuzaji', icon: Store, badge: pendingVendors.length },
            { id: 'prods', label: 'Bidhaa', icon: Package },
            { id: 'orders', label: 'Maagizo', icon: ClipboardList },
            { id: 'users', label: 'Watumiaji', icon: Users },
            { id: 'admins', label: 'Admins', icon: ShieldCheck },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
            { id: 'reviews', label: 'Maoni (Reviews)', icon: MessageSquare },
            { id: 'cats', label: 'Kategoria', icon: Grid },
            { id: 'status', label: t('status'), icon: Camera },
            { id: 'settings', label: 'Mipangilio', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-bold transition-all",
                activeTab === item.id 
                  ? "bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/10" 
                  : "text-amber-400/60 hover:bg-white/5 hover:text-amber-200"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} />
                {item.label}
              </div>
              {item.badge ? (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{item.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          {user && (
            <div className="flex items-center gap-4 mb-8 px-2 group cursor-pointer">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-amber-950 font-black overflow-hidden shadow-lg group-hover:scale-105 transition-transform border-2 border-white/10">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.name[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white truncate">{user.name}</p>
                <p className="text-[10px] text-amber-400/60 truncate uppercase tracking-widest font-bold">Administrator</p>
              </div>
            </div>
          )}
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold text-amber-400/60 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut size={18} />
            Toka
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        {activeTab === 'over' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900">Muhtasari wa Mfumo</h2>
                <p className="text-slate-500">Hali ya sasa ya {systemSettings?.app_name || 'FarmConnect'} Tanzania</p>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <Bell size={18} className="text-amber-500" />
                <span className="text-xs font-black text-slate-900 dark:text-white">{activities.length} Notifications</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {[
                { label: 'Watumiaji', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Wauuzaji', value: vendors.length, icon: Store, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: `${pendingVendors.length} wanasubiri` },
                { label: 'Bidhaa', value: products.length, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Maagizo', value: orders.length, icon: ClipboardList, color: 'text-red-600', bg: 'bg-red-50' },
                { label: `Mapato Admin (6% - ${currency})`, value: formatCurrency(totalAdminEarnings, currency), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
                  <div className={cn("w-14 h-14 rounded-[20px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", stat.bg, stat.bg.includes('blue') && 'dark:bg-blue-900/20', stat.bg.includes('emerald') && 'dark:bg-emerald-900/20', stat.bg.includes('amber') && 'dark:bg-amber-900/20', stat.bg.includes('red') && 'dark:bg-red-900/20', stat.bg.includes('purple') && 'dark:bg-purple-900/20')}>
                    <stat.icon className={stat.color} size={28} />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-4xl font-black text-slate-900 dark:text-white mb-1">{stat.value}</p>
                  {stat.sub && <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500">{stat.sub}</p>}
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-10">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 shadow-sm">
                <h3 className="font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                  <Bell size={24} className="text-amber-500" /> Shughuli za Hivi Karibuni
                </h3>
                <div className="space-y-6">
                  {activities.slice(0, 6).map(act => (
                    <div key={act.id} className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                        {act.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">{act.text}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{act.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 shadow-sm">
                <h3 className="font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                  <Store size={24} className="text-emerald-500" /> Wauuzaji Wanasubiri
                </h3>
                <div className="space-y-4">
                  {pendingVendors.length === 0 ? (
                    <p className="text-center py-10 text-slate-400 text-sm">Hakuna maombi mapya.</p>
                  ) : (
                    pendingVendors.map(v => (
                      <div key={v.id} className="bg-slate-50 rounded-[24px] p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-slate-900 shadow-sm">
                            {(v.shopName || v.name)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{v.shopName || v.name}</p>
                            <p className="text-[10px] text-slate-400">📍 {v.location}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => approveVendor(v.id)}
                            className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors"
                          >
                            <Check size={20} />
                          </button>
                          <button 
                            onClick={() => rejectVendor(v.id)}
                            className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <h2 className="text-3xl font-black text-slate-900">Analytics ya Biashara</h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp size={20} className="text-amber-500" /> Mauzo ya Siku 7 (TZS)
                  </h3>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesHistoryData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="amount" fill="#d97706" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Store size={20} className="text-emerald-500" /> Wauuzaji Bora (Sales)
                  </h3>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSellers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                        width={100}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="sales" fill="#059669" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 shadow-sm">
                <h3 className="font-black text-slate-900 dark:text-white mb-8 flex items-center gap-2">
                  <MapPin size={20} className="text-blue-500" /> Mikoa Inayoongoza
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-10">
                  <div className="h-[200px] w-[200px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dynamicRegionData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {dynamicRegionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-4">
                    {dynamicRegionData.map((reg, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-bold text-slate-600">{reg.name}</span>
                        </div>
                        <span className="text-sm font-black text-slate-900">{reg.value} shops</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 shadow-sm">
                <h3 className="font-black text-slate-900 dark:text-white mb-8 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-emerald-500" /> Bidhaa Maarufu
                </h3>
                <div className="space-y-6">
                  {popularProductsData.length === 0 ? (
                    <p className="text-center py-10 text-slate-400 text-sm">Hakuna data ya bidhaa bado.</p>
                  ) : (
                    popularProductsData.map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-bold text-slate-700">{item.name}</span>
                          <span className="text-sm font-black text-slate-900">{item.sales} sold</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.sales / (popularProductsData[0].sales || 1)) * 100}%` }}
                            className={cn("h-full rounded-full", item.color)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'vendors' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-8">Wauuzaji Wote</h2>
            <div className="space-y-4">
              {vendors.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800">
                  <Store size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                  <p className="text-slate-400">Hakuna wauzaji bado.</p>
                </div>
              ) : (
                vendors.map(v => (
                  <div key={v.id} className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-2xl font-black text-amber-800 dark:text-amber-500">
                        {(v.shopName || v.name)[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white">{v.shopName || v.name}</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{v.email} · 📍 {v.location}</p>
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-full uppercase mt-1 inline-block",
                          v.status === 'approved' ? "bg-emerald-100 text-emerald-700" : 
                          v.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>
                          {v.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {v.status === 'pending' && (
                        <button 
                          onClick={() => approveVendor(v.id)}
                          className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors"
                        >
                          <Check size={20} />
                        </button>
                      )}
                      <button 
                        onClick={() => setEditingItem({ type: 'vendor', data: v })}
                        className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors"
                      >
                        <TrendingUp size={18} />
                      </button>
                      <button 
                        onClick={() => deleteUser(v.id)}
                        className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'prods' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-8">Bidhaa Zote</h2>
            <div className="grid gap-4">
              {products.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[40px] border border-slate-100">
                  <Package size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400">Hakuna bidhaa bado.</p>
                </div>
              ) : (
                products.map(p => (
                  <div key={p.id} className="bg-white rounded-[28px] border border-slate-100 p-6 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl">
                        {p.emoji}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">{p.name}</h4>
                        <p className="text-xs text-slate-400">{p.vendorName} · {formatCurrency(p.price, currency)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "badge px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        p.approved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      )}>
                        {p.approved ? "Active" : "Pending"}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingItem({ type: 'product', data: p })}
                          className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors"
                          title="Hariri"
                        >
                          <Settings size={18} />
                        </button>
                        <button 
                          onClick={async () => {
                            await updateDoc(doc(db, 'kuku_products', p.id), { approved: !p.approved });
                            toast.success(p.approved ? 'Bidhaa imefichwa' : 'Bidhaa inaonekana sasa');
                          }}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            p.approved ? "bg-amber-50 text-amber-500 hover:bg-amber-100" : "bg-emerald-500 text-white hover:bg-emerald-600"
                          )}
                          title={p.approved ? "Ficha" : "Onyesha"}
                        >
                          {p.approved ? <X size={20} /> : <Check size={20} />}
                        </button>
                        <button 
                          onClick={async () => {
                            if(confirm('Futa bidhaa hii?')) {
                              await deleteDoc(doc(db, 'kuku_products', p.id));
                              toast.success('Bidhaa imefutwa');
                            }
                          }}
                          className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                          title="Futa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-8">Maagizo Yote</h2>
            <div className="grid gap-4">
              {orders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[40px] border border-slate-100">
                  <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400">Hakuna maagizo bado.</p>
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl">
                          {o.items[0].emoji}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900">{o.userName}</h4>
                          <p className="text-xs text-slate-400">#{o.id.substring(0,8)} · {o.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-amber-700">{formatCurrency(o.total, currency)}</p>
                        <div className="flex flex-col items-end gap-1 mt-1">
                          <span className={cn(
                            "badge px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                            o.status === 'delivered' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {o.status}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            {o.deliveryMethod || 'city'}
                          </span>
                          {o.paymentProof && (
                            <span className={cn(
                              "text-[8px] font-black px-2 py-0.5 rounded-full uppercase",
                              o.paymentApproved ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
                            )}>
                              {o.paymentApproved ? "💰 Paid & Verified" : "⚠️ Unverified Payment"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-50 gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-xs text-slate-400 mb-1">Muuzaji: <span className="font-bold text-slate-600">{o.vendorName}</span></p>
                        {o.paymentProof && (
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Uthibitisho wa Malipo</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[8px] text-slate-400 uppercase">Mtumaji</p>
                                <p className="text-[10px] font-bold text-slate-900">{o.senderName || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-[8px] text-slate-400 uppercase">Simu</p>
                                <p className="text-[10px] font-bold text-slate-900">{o.payPhone || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-[8px] text-slate-400 uppercase">Kiasi</p>
                                <p className="text-[10px] font-bold text-emerald-700">{formatCurrency(Number(o.sentAmount || 0), currency)}</p>
                              </div>
                              <div>
                                <p className="text-[8px] text-slate-400 uppercase">Trans ID</p>
                                <p className="text-[10px] font-bold text-blue-700">{o.transactionId || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-slate-200">
                              <p className="text-[8px] text-slate-400 uppercase mb-1">Raw Proof</p>
                              <p className="text-[10px] text-slate-600 italic break-all">{o.paymentProof}</p>
                            </div>
                            {!o.paymentApproved && (
                              <button 
                                onClick={async (e) => {
                                  e.preventDefault();
                                  try {
                                    await updateDoc(doc(db, 'kuku_orders', o.id), { paymentApproved: true });
                                    toast.success('Malipo yamethibitishwa!');
                                    addActivity('💰', `Malipo ya agizo #${o.id.substring(0,8)} yamethibitishwa na Admin`);
                                  } catch (err) {
                                    console.error(err);
                                    toast.error('Imeshindwa kuthibitisha malipo');
                                  }
                                }}
                                className="w-full mt-2 bg-blue-500 text-white py-2 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-blue-500/20"
                              >
                                THIBITISHA MALIPO HAPA ✅
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => window.open(`https://wa.me/${o.userContact.replace(/\+/g,'')}?text=Habari ${o.userName}, kuhusu agizo lako #${o.id.substring(0,8)}...`)}
                          className="bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-green-200 transition-all"
                        >
                          WA MTEJA
                        </button>
                        <button 
                          onClick={async () => {
                            if(confirm('Futa agizo hili?')) {
                              await deleteDoc(doc(db, 'kuku_orders', o.id));
                              toast.success('Agizo limefutwa');
                            }
                          }}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-8">Watumiaji Wote</h2>
            <div className="grid gap-4">
              {users.map(u => (
                <div key={u.id} className="bg-white rounded-[28px] border border-slate-100 p-6 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl font-black text-blue-800">
                      {u.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900">{u.name}</h4>
                      <p className="text-xs text-slate-400">{u.email} · {u.contact || 'No contact'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingItem({ type: 'user', data: u })}
                      className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-500 transition-all"
                      title="Edit User"
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => deleteUser(u.id)}
                      className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
                      title="Delete User"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'admins' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-8">Admins Wote</h2>
            <div className="grid gap-4">
              {admins.map(a => (
                <div key={a.id} className="bg-white rounded-[28px] border border-slate-100 p-6 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-2xl font-black text-purple-800">
                      {a.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900">{a.name}</h4>
                      <p className="text-xs text-slate-400">{a.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {a.email !== user?.email && (
                      <button 
                        onClick={() => deleteUser(a.id)}
                        className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={20} />
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h2 className="text-3xl font-black text-slate-900">Usimamizi wa Wallet</h2>
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button 
                  onClick={() => setWalletSubTab('deposits')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-black transition-all",
                    walletSubTab === 'deposits' ? "bg-white text-amber-600 shadow-sm" : "text-slate-400"
                  )}
                >
                  DEPOSITS ({walletTransactions.filter(t => t.type === 'deposit' && t.status === 'pending').length})
                </button>
                <button 
                  onClick={() => setWalletSubTab('withdrawals')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-black transition-all",
                    walletSubTab === 'withdrawals' ? "bg-white text-amber-600 shadow-sm" : "text-slate-400"
                  )}
                >
                  WITHDRAWALS ({withdrawals.filter(w => w.status === 'pending').length})
                </button>
              </div>
            </div>

            {walletSubTab === 'deposits' ? (
              <div className="space-y-6">
                {walletTransactions.filter(t => t.type === 'deposit').length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[40px] border border-slate-100">
                    <Wallet size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400">Hakuna miamala ya deposit bado.</p>
                  </div>
                ) : (
                  walletTransactions.filter(t => t.type === 'deposit').map(tx => (
                    <div key={tx.id} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">💰</div>
                          <div>
                            <h4 className="font-black text-slate-900 text-lg">{tx.userName}</h4>
                            <p className="text-sm font-black text-blue-700">{formatCurrency(tx.amount, currency)}</p>
                            <p className="text-xs text-slate-400 mt-1">{tx.date}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={cn(
                            "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider",
                            tx.status === 'approved' ? "bg-emerald-100 text-emerald-800" : 
                            tx.status === 'pending' ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                          )}>
                            {tx.status}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Taarifa za Malipo</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">Njia</p>
                            <p className="text-sm font-black text-slate-900 uppercase">{tx.method}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">Mtumaji</p>
                            <p className="text-sm font-black text-slate-900">{tx.senderName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">Simu</p>
                            <p className="text-sm font-black text-slate-900">{tx.senderPhone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">Trans ID</p>
                            <p className="text-sm font-black text-blue-700">{tx.transactionId || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {tx.status === 'pending' && (
                        <div className="flex gap-3">
                          <button 
                            onClick={() => approveDeposit(tx)}
                            className="flex-1 bg-blue-600 text-white py-4 rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                          >
                            THIBITISHA DEPOSIT ✅
                          </button>
                          <button 
                            onClick={() => rejectDeposit(tx.id)}
                            className="bg-red-50 text-red-500 px-6 py-4 rounded-xl text-xs font-black hover:bg-red-100 transition-all"
                          >
                            KATAA
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {withdrawals.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[40px] border border-slate-100">
                    <Wallet size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400">Hakuna maombi ya malipo kwa sasa.</p>
                  </div>
                ) : (
                  withdrawals.map(w => (
                    <div key={w.id} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl">💸</div>
                          <div>
                            <h4 className="font-black text-slate-900 text-lg">{w.vendorName}</h4>
                            <p className="text-sm font-black text-emerald-700">{formatCurrency(w.amount, currency)}</p>
                            <p className="text-xs text-slate-400 mt-1">{w.date}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={cn(
                            "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider",
                            w.status === 'Completed' || w.status === 'paid' ? "bg-emerald-100 text-emerald-800" : 
                            w.status === 'Pending' || w.status === 'pending' ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                          )}>
                            {w.status}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Taarifa za Malipo</p>
                        {w.method === 'mobile' ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase">Mtandao</p>
                              <p className="text-sm font-black text-slate-900">{w.network}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase">Namba ya Simu</p>
                              <p className="text-sm font-black text-slate-900">{w.phoneNumber}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase">Benki</p>
                              <p className="text-sm font-black text-slate-900">{w.bankName}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase">Akaunti</p>
                              <p className="text-sm font-black text-slate-900">{w.accountNumber}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase">Jina</p>
                              <p className="text-sm font-black text-slate-900">{w.accountName}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      { (w.status === 'Pending' || w.status === 'pending') && (
                        <div className="flex gap-3">
                          <button 
                            onClick={() => approveWithdrawal(w.id)}
                            className="flex-1 bg-emerald-600 text-white py-4 rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                          >
                            THIBITISHA MALIPO (PAID)
                          </button>
                          <button 
                            onClick={() => rejectWithdrawal(w.id)}
                            className="bg-red-50 text-red-500 px-6 py-4 rounded-xl text-xs font-black hover:bg-red-100 transition-all"
                          >
                            KATAA
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'status' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900">{t('status')}</h2>
                <p className="text-slate-500 font-bold">Manage all vendor statuses and updates</p>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Content</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stats</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {statuses.map(status => (
                    <tr key={status.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-xs overflow-hidden">
                            {status.vendorAvatar ? <img src={status.vendorAvatar} alt="" className="w-full h-full object-cover" /> : "🏪"}
                          </div>
                          <span className="text-sm font-bold text-slate-900">{status.vendorName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-500 line-clamp-2 max-w-xs">{status.text}</p>
                        {status.videoUrl && <span className="text-[10px] text-amber-600 font-bold">Video Included</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                          <span>❤️ {status.likes.length}</span>
                          <span>💬 {status.comments.length}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {status.createdAt?.toDate ? status.createdAt.toDate().toLocaleDateString() : 'Sasa hivi'}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleDeleteStatus(status.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'reviews' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-8">Maoni ya Wateja (System Wide)</h2>
            <div className="grid gap-6">
              {reviews.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[40px] border border-slate-100">
                  <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400">Hakuna maoni yoyote kwenye mfumo bado.</p>
                </div>
              ) : (
                reviews.map(review => (
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
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-4">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Muuzaji: {review.vendorName || 'N/A'}</p>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Bidhaa: {review.productName}</p>
                      <p className="text-slate-700 font-bold leading-relaxed italic">"{review.text || review.comment || 'Hakuna maoni ya maandishi.'}"</p>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          if (confirm('Je, una uhakika unataka kufuta maoni haya?')) {
                            deleteDoc(doc(db, 'kuku_reviews', review.id));
                            toast.success('Maoni yamefutwa');
                          }
                        }}
                        className="text-red-500 text-xs font-black hover:underline"
                      >
                        FUTA MAONI (DELETE)
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
        {activeTab === 'cats' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-slate-900">Kategoria za Bidhaa</h2>
              <div className="flex gap-3">
                {categories.length === 0 && (
                  <button 
                    onClick={handleImportDefaults}
                    className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black flex items-center gap-2"
                  >
                    Import Defaults
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsEditingCat(false);
                    setCatForm({ id: '', label: '', emoji: '', image: '' });
                    setIsCatModalOpen(true);
                  }}
                  className="bg-amber-500 text-amber-950 px-6 py-3 rounded-2xl font-black flex items-center gap-2"
                >
                  <Package size={20} /> Ongeza Kategoria
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl overflow-hidden">
                      {cat.image ? (
                        <img src={cat.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        cat.emoji || '📦'
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white">{cat.label}</h4>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">{cat.id.substring(0,8)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setIsEditingCat(true);
                        setCatForm({ id: cat.id, label: cat.label, emoji: cat.emoji || '', image: cat.image || '' });
                        setIsCatModalOpen(true);
                      }}
                      className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors"
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => deleteCategory(cat.id)}
                      className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Mipangilio ya Mfumo</h2>
            <p className="text-slate-500 mb-10">Weka funguo za ImageKit na Firebase hapa. Mabadiliko yataathiri mfumo mzima.</p>

            <div className="space-y-8">
              {/* Branding Section */}
              <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                    <Star size={18} />
                  </div>
                  Branding & Identity
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">App Name</label>
                    <input 
                      type="text"
                      value={localSettings.app_name}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, app_name: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="FarmConnect"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Currency (e.g. TZS, $, KES)</label>
                    <input 
                      type="text"
                      value={localSettings.currency}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="TZS"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">App Logo (URL)</label>
                    <input 
                      type="text"
                      value={localSettings.app_logo}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, app_logo: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="https://link.to/logo.png"
                    />
                    {localSettings.app_logo && (
                      <div className="mt-2 w-12 h-12 rounded-xl border border-slate-100 overflow-hidden bg-white flex items-center justify-center">
                        <img src={localSettings.app_logo} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Loading Icon (Emoji/Icon)</label>
                    <input 
                      type="text"
                      value={localSettings.loading_icon}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, loading_icon: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="🚜 au 🐔"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Loading Animation/Image (URL)</label>
                    <input 
                      type="text"
                      value={localSettings.loading_url}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, loading_url: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="https://link.to/animation.gif"
                    />
                    {localSettings.loading_url && (
                      <div className="mt-2 w-32 h-32 rounded-2xl border border-slate-100 overflow-hidden bg-white flex items-center justify-center">
                        <img src={localSettings.loading_url} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial & Withdrawal Settings */}
              <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                    <DollarSign size={18} />
                  </div>
                  Financial & Withdrawal Settings
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Withdrawal Fee Type</label>
                    <select 
                      value={localSettings.withdrawalFeeType}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, withdrawalFeeType: e.target.value as any }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                    >
                      <option value="fixed">Fixed Amount (Kiasi Maalum)</option>
                      <option value="percentage">Percentage (Asilimia %)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      Withdrawal Fee Value ({localSettings.withdrawalFeeType === 'fixed' ? currency : '%'})
                    </label>
                    <input 
                      type="number"
                      value={localSettings.withdrawalFeeValue}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, withdrawalFeeValue: Number(e.target.value) }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="Mf. 5000 au 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Admin WhatsApp (for notifications)</label>
                    <input 
                      type="text"
                      value={localSettings.adminWhatsApp}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, adminWhatsApp: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="255764225358"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Payment Number (for Auction Winners)</label>
                    <input 
                      type="text"
                      value={localSettings.paymentNumber}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, paymentNumber: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="0687225353"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Payment Name (Account Name)</label>
                    <input 
                      type="text"
                      value={localSettings.paymentName}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, paymentName: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="Amour"
                    />
                  </div>
                </div>
              </div>

              {/* ImageKit Section */}
              <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                    <Camera size={18} />
                  </div>
                  ImageKit Configuration
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Public Key</label>
                    <input 
                      type="text"
                      value={localSettings.imagekit_public_key}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, imagekit_public_key: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="Weka Public Key..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">URL Endpoint</label>
                    <input 
                      type="text"
                      value={localSettings.imagekit_url_endpoint}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, imagekit_url_endpoint: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="https://ik.imagekit.io/your_id/"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Private Key (Sensitive)</label>
                    <input 
                      type="password"
                      value={localSettings.imagekit_private_key}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, imagekit_private_key: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="Weka Private Key..."
                    />
                  </div>
                </div>
              </div>

              {/* Banners Section */}
              <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <LayoutDashboard size={18} />
                  </div>
                  Slide Banners
                </h3>
                <div className="space-y-4">
                  {localSettings.banners.map((banner, idx) => (
                    <div key={idx} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex-1 space-y-4">
                        <input 
                          type="text"
                          value={banner.image}
                          onChange={(e) => {
                            const newBanners = [...localSettings.banners];
                            newBanners[idx].image = e.target.value;
                            setLocalSettings(prev => ({ ...prev, banners: newBanners }));
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold"
                          placeholder="Image URL..."
                        />
                        <input 
                          type="text"
                          value={banner.link}
                          onChange={(e) => {
                            const newBanners = [...localSettings.banners];
                            newBanners[idx].link = e.target.value;
                            setLocalSettings(prev => ({ ...prev, banners: newBanners }));
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold"
                          placeholder="Link (Optional)..."
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newBanners = localSettings.banners.filter((_, i) => i !== idx);
                          setLocalSettings(prev => ({ ...prev, banners: newBanners }));
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setLocalSettings(prev => ({ ...prev, banners: [...prev.banners, { image: '', link: '' }] }))}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-xs hover:border-amber-500 hover:text-amber-500 transition-all"
                  >
                    + ONGEZA BANNER MPYA
                  </button>
                </div>
              </div>

              {/* Firebase Section */}
              <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                    <Settings size={18} />
                  </div>
                  Firebase Configuration
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">API Key</label>
                    <input 
                      type="text"
                      value={localSettings.firebase_api_key}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, firebase_api_key: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Project ID</label>
                    <input 
                      type="text"
                      value={localSettings.firebase_project_id}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, firebase_project_id: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Service Account JSON (Sensitive)</label>
                    <textarea 
                      value={localSettings.firebase_service_account}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, firebase_service_account: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm min-h-[200px] font-mono"
                      placeholder='{"type": "service_account", ...}'
                    />
                    <p className="text-[10px] text-amber-600 font-bold px-2 italic">
                      * Kumbuka: Hii ni siri kubwa. Inatumika kwa ajili ya Admin SDK upande wa server.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button 
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black px-12 py-5 rounded-3xl shadow-xl shadow-amber-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                >
                  {isSavingSettings ? (
                    'INAHIFADHI...'
                  ) : (
                    <>
                      <Save size={20} /> HIFADHI MIPANGILIO YOTE
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-amber-950 border-t border-white/5 px-4 py-3 z-40 flex justify-between items-center overflow-x-auto scrollbar-hide">
        {[
          { id: 'over', icon: LayoutDashboard, label: 'Dash' },
          { id: 'analytics', icon: TrendingUp, label: 'Stats' },
          { id: 'vendors', icon: Store, label: 'Wauzaji', badge: pendingVendors.length },
          { id: 'prods', icon: Package, label: 'Bidhaa' },
          { id: 'orders', icon: ClipboardList, label: 'Oda' },
          { id: 'users', icon: Users, label: 'Watu' },
          { id: 'admins', icon: ShieldCheck, label: 'Admin' },
          { id: 'wallet', icon: Wallet, label: 'Pesa' },
          { id: 'settings', icon: Settings, label: 'Setti' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all flex-shrink-0 min-w-[50px]",
              activeTab === item.id ? "text-amber-500 scale-110" : "text-amber-400/40"
            )}
          >
            <div className="relative">
              <item.icon size={18} />
              {item.badge ? (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-3 h-3 flex items-center justify-center rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[8px] font-black uppercase">{item.label}</span>
          </button>
        ))}
      </nav>
      {/* Edit Modal */}
      {editingItem && (
        <Modal 
          isOpen={!!editingItem} 
          onClose={() => setEditingItem(null)}
          title={`Hariri ${editingItem.type === 'user' ? 'Mtumiaji' : editingItem.type === 'vendor' ? 'Muuzaji' : 'Bidhaa'}`}
        >
          <div className="space-y-4">
            {editingItem.type === 'user' || editingItem.type === 'vendor' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role</label>
                  <select 
                    defaultValue={editingItem.data.role}
                    onChange={async (e) => {
                      await updateDoc(doc(db, 'kuku_users', editingItem.data.id), { role: e.target.value });
                      toast.success('Role imesasishwa');
                    }}
                    className="input-field"
                  >
                    <option value="user">User</option>
                    <option value="vendor">Vendor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Jina</label>
                  <input 
                    type="text" 
                    defaultValue={editingItem.data.name}
                    onBlur={async (e) => {
                      await updateDoc(doc(db, 'kuku_users', editingItem.data.id), { name: e.target.value });
                      toast.success('Jina limebadilishwa');
                    }}
                    className="input-field" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Simu</label>
                  <input 
                    type="text" 
                    defaultValue={editingItem.data.phone}
                    onBlur={async (e) => {
                      await updateDoc(doc(db, 'kuku_users', editingItem.data.id), { phone: e.target.value });
                      toast.success('Namba ya simu imebadilishwa');
                    }}
                    className="input-field" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Eneo</label>
                  <input 
                    type="text" 
                    defaultValue={editingItem.data.location}
                    onBlur={async (e) => {
                      await updateDoc(doc(db, 'kuku_users', editingItem.data.id), { location: e.target.value });
                      toast.success('Eneo limebadilishwa');
                    }}
                    className="input-field" 
                  />
                </div>
                {editingItem.type === 'vendor' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Jina la Duka</label>
                      <input 
                        type="text" 
                        defaultValue={editingItem.data.shopName}
                        onBlur={async (e) => {
                          await updateDoc(doc(db, 'kuku_users', editingItem.data.id), { shopName: e.target.value });
                          toast.success('Jina la duka limebadilishwa');
                        }}
                        className="input-field" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mkoa</label>
                      <input 
                        type="text" 
                        defaultValue={editingItem.data.region}
                        onBlur={async (e) => {
                          await updateDoc(doc(db, 'kuku_users', editingItem.data.id), { region: e.target.value });
                          toast.success('Mkoa umebadilishwa');
                        }}
                        className="input-field" 
                      />
                    </div>
                  </>
                )}
              </>
            ) : editingItem.type === 'product' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Jina la Bidhaa</label>
                  <input 
                    type="text" 
                    defaultValue={editingItem.data.name}
                    onBlur={async (e) => {
                      await updateDoc(doc(db, 'kuku_products', editingItem.data.id), { name: e.target.value });
                      toast.success('Jina limebadilishwa');
                    }}
                    className="input-field" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bei</label>
                  <input 
                    type="number" 
                    defaultValue={editingItem.data.price}
                    onBlur={async (e) => {
                      await updateDoc(doc(db, 'kuku_products', editingItem.data.id), { price: Number(e.target.value) });
                      toast.success('Bei imebadilishwa');
                    }}
                    className="input-field" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Stock</label>
                  <input 
                    type="number" 
                    defaultValue={editingItem.data.stock}
                    onBlur={async (e) => {
                      await updateDoc(doc(db, 'kuku_products', editingItem.data.id), { stock: Number(e.target.value) });
                      toast.success('Stock imebadilishwa');
                    }}
                    className="input-field" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kategoria</label>
                  <select 
                    defaultValue={editingItem.data.category}
                    onChange={async (e) => {
                      await updateDoc(doc(db, 'kuku_products', editingItem.data.id), { category: e.target.value });
                      toast.success('Kategoria imebadilishwa');
                    }}
                    className="input-field"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Unit</label>
                  <select 
                    defaultValue={editingItem.data.unit}
                    onChange={async (e) => {
                      await updateDoc(doc(db, 'kuku_products', editingItem.data.id), { unit: e.target.value });
                      toast.success('Unit imebadilishwa');
                    }}
                    className="input-field"
                  >
                    {['Piece', 'Kg', 'Tray', 'Half', 'Quarter'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Maelezo (Description)</label>
                  <textarea 
                    defaultValue={editingItem.data.desc}
                    onBlur={async (e) => {
                      await updateDoc(doc(db, 'kuku_products', editingItem.data.id), { desc: e.target.value });
                      toast.success('Maelezo yamebadilishwa');
                    }}
                    className="input-field min-h-[100px]" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Emoji</label>
                  <input 
                    type="text" 
                    defaultValue={editingItem.data.emoji}
                    onBlur={async (e) => {
                      await updateDoc(doc(db, 'kuku_products', editingItem.data.id), { emoji: e.target.value });
                      toast.success('Emoji imebadilishwa');
                    }}
                    className="input-field" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Picha (URL)</label>
                  <input 
                    type="text" 
                    defaultValue={editingItem.data.image}
                    onBlur={async (e) => {
                      await updateDoc(doc(db, 'kuku_products', editingItem.data.id), { image: e.target.value });
                      toast.success('Picha imebadilishwa');
                    }}
                    className="input-field" 
                  />
                </div>
              </div>
            ) : null}
            <button 
              onClick={() => setEditingItem(null)}
              className="w-full btn-primary mt-4"
            >
              Kamilisha
            </button>
          </div>
        </Modal>
      )}

      {/* Category Modal */}
      <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title={isEditingCat ? "Hariri Kategoria" : "Ongeza Kategoria"}>
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Jina la Kategoria</label>
            <input 
              type="text"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-amber-500 transition-all"
              value={catForm.label}
              onChange={e => setCatForm({...catForm, label: e.target.value})}
              placeholder="Mf: Mayai ya Kienyeji"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Emoji (Hiari)</label>
              <input 
                type="text"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-amber-500 transition-all"
                value={catForm.emoji}
                onChange={e => setCatForm({...catForm, emoji: e.target.value})}
                placeholder="🥚"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Link ya Picha (Hiari)</label>
              <input 
                type="text"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-amber-500 transition-all"
                value={catForm.image}
                onChange={e => setCatForm({...catForm, image: e.target.value})}
                placeholder="https://..."
              />
            </div>
          </div>
          <button 
            onClick={handleSaveCategory}
            className="w-full py-4 bg-amber-500 text-amber-950 rounded-2xl font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            {isEditingCat ? "HIFADHI MABADILIKO" : "ONGEZA KATEGORIA"}
          </button>
        </div>
      </Modal>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-amber-950 border-t border-white/5 px-6 py-3 flex items-center justify-between z-40">
        {[
          { id: 'over', icon: BarChart3, label: 'Dash' },
          { id: 'orders', icon: ClipboardList, label: 'Oda' },
          { id: 'vendors', icon: Store, label: 'Wauuzaji' },
          { id: 'users', icon: Users, label: 'Watu' },
          { id: 'settings', icon: Settings, label: 'Seti' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === item.id ? "text-amber-400" : "text-amber-100/40"
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

