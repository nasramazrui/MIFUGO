import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils';
import { Modal } from '../components/Modal';
import { motion } from 'motion/react';
import { db } from '../services/firebase';
import { 
  collection, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
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
  Trash2
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
    products, 
    orders, 
    activities, 
    withdrawals,
    systemSettings,
    updateSystemSettings,
    logout, 
    addActivity 
  } = useApp();
  const [activeTab, setActiveTab] = useState<'over' | 'analytics' | 'vendors' | 'prods' | 'orders' | 'users' | 'wallet' | 'settings'>('over');
  const [editingItem, setEditingItem] = useState<{ type: string, data: any } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
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
    loading_icon: '',
    loading_url: ''
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
        loading_icon: systemSettings.loading_icon || '',
        loading_url: systemSettings.loading_url || ''
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
      await updateDoc(doc(db, 'kuku_withdrawals', id), { status: 'paid' });
      addActivity('💸', `Malipo yameidhinishwa`);
      toast.success('Malipo yameidhinishwa');
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kuidhinisha');
    }
  };

  const rejectWithdrawal = async (id: string) => {
    try {
      await updateDoc(doc(db, 'kuku_withdrawals', id), { status: 'rejected' });
      addActivity('✕', `Maombi ya malipo yamekataliwa`);
      toast.success('Maombi yamekataliwa');
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kukataa');
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row pb-20 lg:pb-0 transition-colors duration-300">
      {/* Mobile Header */}
      <header className="lg:hidden bg-amber-950 text-amber-100 px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-amber-500" />
          <h1 className="font-serif italic text-lg font-bold">Admin Panel</h1>
        </div>
        <button onClick={logout} className="text-amber-400/60 p-2">
          <LogOut size={20} />
        </button>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-72 bg-amber-950 text-amber-100 flex-col sticky top-0 h-screen z-20">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-amber-950 shadow-lg shadow-amber-500/20">
              <BarChart3 size={24} />
            </div>
            <h1 className="font-serif italic text-2xl font-bold">Admin Panel</h1>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto scrollbar-hide">
          {[
            { id: 'over', label: 'Muhtasari', icon: LayoutDashboard },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'vendors', label: 'Wauuzaji', icon: Store, badge: pendingVendors.length },
            { id: 'prods', label: 'Bidhaa', icon: Package },
            { id: 'orders', label: 'Maagizo', icon: ClipboardList },
            { id: 'users', label: 'Watumiaji', icon: Users },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
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
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-amber-950 font-black overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.name[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">{user.name}</p>
                <p className="text-[10px] text-amber-400/60 truncate">Administrator</p>
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
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                <Bell size={18} className="text-amber-500" />
                <span className="text-xs font-black text-slate-900">{activities.length} Notifications</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {[
                { label: 'Watumiaji', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Wauuzaji', value: vendors.length, icon: Store, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: `${pendingVendors.length} wanasubiri` },
                { label: 'Bidhaa', value: products.length, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Maagizo', value: orders.length, icon: ClipboardList, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Mapato Admin (6%)', value: formatCurrency(totalAdminEarnings), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                  <div className={cn("w-14 h-14 rounded-[20px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", stat.bg)}>
                    <stat.icon className={stat.color} size={28} />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-4xl font-black text-slate-900 mb-1">{stat.value}</p>
                  {stat.sub && <p className="text-[10px] font-bold text-amber-600">{stat.sub}</p>}
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-10">
              <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm">
                <h3 className="font-black text-slate-900 mb-8 flex items-center gap-3">
                  <Bell size={24} className="text-amber-500" /> Shughuli za Hivi Karibuni
                </h3>
                <div className="space-y-6">
                  {activities.slice(0, 6).map(act => (
                    <div key={act.id} className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                        {act.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700 leading-snug">{act.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{act.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm">
                <h3 className="font-black text-slate-900 mb-8 flex items-center gap-3">
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
              <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="font-black text-slate-900 flex items-center gap-2">
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

              <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="font-black text-slate-900 flex items-center gap-2">
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
              <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm">
                <h3 className="font-black text-slate-900 mb-8 flex items-center gap-2">
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

              <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm">
                <h3 className="font-black text-slate-900 mb-8 flex items-center gap-2">
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
                <div className="text-center py-20 bg-white rounded-[40px] border border-slate-100">
                  <Store size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400">Hakuna wauzaji bado.</p>
                </div>
              ) : (
                vendors.map(v => (
                  <div key={v.id} className="bg-white rounded-[28px] border border-slate-100 p-6 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl font-black text-amber-800">
                        {(v.shopName || v.name)[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">{v.shopName || v.name}</h4>
                        <p className="text-xs text-slate-400">{v.email} · 📍 {v.location}</p>
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
                        <p className="text-xs text-slate-400">{p.vendorName} · {formatCurrency(p.price)}</p>
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
                        <p className="font-black text-amber-700">{formatCurrency(o.total)}</p>
                        <div className="flex flex-col items-end gap-1 mt-1">
                          <span className={cn(
                            "badge px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                            o.status === 'delivered' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {o.status}
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
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Proof of Payment</p>
                            <p className="text-[10px] text-slate-600 italic break-all">{o.paymentProof}</p>
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
                                className="mt-2 text-[9px] font-black text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded-lg"
                              >
                                THIBITISHA MALIPO HAPA
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
                    >
                      <TrendingUp size={18} />
                    </button>
                    <button 
                      onClick={() => deleteUser(u.id)}
                      className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'wallet' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-8">Maombi ya Malipo (Withdraw)</h2>
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
                          <p className="text-sm font-black text-emerald-700">{formatCurrency(w.amount)}</p>
                          <p className="text-xs text-slate-400 mt-1">{w.date}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={cn(
                          "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider",
                          w.status === 'paid' ? "bg-emerald-100 text-emerald-800" : 
                          w.status === 'pending' ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
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

                    {w.status === 'pending' && (
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
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
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
    </div>
  );
};

