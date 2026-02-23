import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Product, Order, Activity, Withdrawal } from '../types';
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
  Send
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
  const { user, products, orders, logout, addActivity } = useApp();
  const [activeTab, setActiveTab] = useState<'dash' | 'products' | 'orders' | 'wallet' | 'settings'>('dash');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
    category: 'mayai',
    emoji: '🥚',
    desc: '',
    location: ''
  });

  if (!user || user.role !== 'vendor') return null;

  if (user.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-xl border border-amber-100 text-center">
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">
            ⏳
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Ombi Lako Linahakikiwa</h2>
          <p className="text-slate-500 leading-relaxed mb-8">
            Asante kwa kujiunga na KukuMart! Admin anahakiki maelezo yako. 
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
  const totalRevenue = myOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    setLoading(true);

    const productData = {
      name: newProduct.name,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock) || 0,
      category: newProduct.category as any,
      emoji: newProduct.emoji,
      desc: newProduct.desc,
      location: newProduct.location || user.location || '',
      region: user.region || '',
      vendorId: user.id,
      vendorName: user.shopName || user.name,
      approved: user.status === 'approved',
      deliveryCity: user.deliveryCity || 0,
      deliveryOut: user.deliveryOut || 0,
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'kuku_products'), productData);
      addActivity('📦', `Bidhaa mpya "${productData.name}" imeongezwa na ${user.shopName}`);
      setIsAddModalOpen(false);
      setNewProduct({ name: '', price: '', stock: '', category: 'mayai', emoji: '🥚', desc: '', location: '' });
      toast.success('Bidhaa imeongezwa!');
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kuongeza bidhaa');
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
        template = `Habari *${order.userName}*, oda yako namba *#${orderId}* imeshapokelewa rasmi! 🐔\n\nHALI: Sasa hivi inaandaliwa.\nBIDHAA: *${itemName}* x ${itemQty}\nMUUZAJI: *${shopName}*\n\nTunafanya kazi kwa haraka ili mzigo wako uwe tayari. Utapata update mara tu itakapoanza safari. Asante kwa kutumia KukuMart!`;
      } else if (status === 'waiting') {
        template = `Habari *${order.userName}*, oda yako *#${orderId}* imeshakamilika kuandaliwa na *${shopName}*! 📦\n\nHALI: Inasubiri msafirishaji aichukue.\nBIDHAA: *${itemName}*\n\nMsafirishaji akishachukua mzigo, utatumiwa namba yake ya simu kwa ajili ya mawasiliano zaidi. Kaa karibu na simu yako!`;
      } else if (status === 'onway') {
        template = `Habari *${order.userName}*, habari njema! Oda yako *#${orderId}* imeshatoka kuelekea kwako sasa hivi! 🚚💨\n\nMUUZAJI: *${shopName}*\nBIDHAA: *${itemName}* (${itemQty})\nHALI: Iko njiani (On the Way).\n\nUnaweza kufuatilia safari ya mzigo wako kupitia App ya KukuMart. Mpokeaji awe tayari kupokea simu ya msafirishaji. Asante!`;
      } else if (status === 'delivered') {
        template = `Hongera *${order.userName}*! 🎊 Oda yako *#${orderId}* imeshawasilishwa kwako.\n\nMUHTASARI:\nBidhaa: *${itemName}*\nKutoka: *${shopName}*\n\nTunakuomba uingie kwenye App ya KukuMart kuthibitisha kuwa umepokea mzigo ili muuzaji aweze kulipwa. Karibu tena!`;
      }

      if (template) {
        const phone = order.userContact.replace(/\+/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(template)}`);
      }
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kubadilisha hali');
    }
  };

  const handleWithdrawRequest = async () => {
    if (totalRevenue < 10000) {
      toast.error('Salio lazima liwe angalau TZS 10,000 ili kutoa');
      return;
    }
    try {
      await addDoc(collection(db, 'kuku_withdrawals'), {
        vendorId: user.id,
        vendorName: user.shopName || user.name,
        amount: totalRevenue,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      addActivity('💸', `Maombi ya kutoa ${formatCurrency(totalRevenue)} kutoka kwa ${user.shopName}`);
      toast.success('Maombi ya kutoa fedha yametumwa kwa Admin!');
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kutuma maombi');
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-100 flex flex-col sticky top-0 md:h-screen z-20">
        <div className="p-6 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏪</span>
            <h1 className="font-serif italic text-xl text-emerald-800 font-bold">Vendor Portal</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dash', label: 'Dashibodi', icon: LayoutDashboard },
            { id: 'products', label: 'Bidhaa Zangu', icon: Package },
            { id: 'orders', label: 'Maagizo', icon: ClipboardList },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
            { id: 'settings', label: 'Mipangilio', icon: Clock },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                activeTab === item.id 
                  ? "bg-emerald-50 text-emerald-700 shadow-sm" 
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-50">
          <div className="bg-slate-50 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-black text-xs">
                {user.name[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">{user.shopName || user.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <div className={cn(
              "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full inline-block",
              user.status === 'approved' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            )}>
              {user.status === 'approved' ? "✓ Approved" : "⏳ Pending"}
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-400 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} />
            Toka
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {user.status === 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 mb-8 flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">⏳</div>
            <div>
              <h3 className="font-black text-amber-900 mb-1">Akaunti Yako Inasubiri Idhini</h3>
              <p className="text-sm text-amber-700 leading-relaxed">
                Admin bado hajahakiki duka lako. Huwezi kuuza bidhaa mpaka upate idhini. 
                Tafadhali hakikisha umetuma maelezo yako ya KYC kwa WhatsApp ya Admin.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'dash' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-900">Habari, {user.name}! 👋</h2>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95"
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
                <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.bg)}>
                    <stat.icon className={stat.color} size={24} />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2">
                  <Clock size={20} className="text-amber-500" /> Maagizo ya Hivi Karibuni
                </h3>
                <div className="space-y-4">
                  {myOrders.length === 0 ? (
                    <p className="text-center py-10 text-slate-400 text-sm">Hakuna maagizo bado.</p>
                  ) : (
                    myOrders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{order.items[0].emoji}</div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{order.userName}</p>
                            <p className="text-[10px] text-slate-400">{order.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-700">{formatCurrency(order.total)}</p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{order.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2">
                  <AlertCircle size={20} className="text-blue-500" /> Bidhaa Maarufu
                </h3>
                <div className="space-y-4">
                  {myProducts.length === 0 ? (
                    <p className="text-center py-10 text-slate-400 text-sm">Bado haujaongeza bidhaa.</p>
                  ) : (
                    myProducts.slice(0, 5).map(product => (
                      <div key={product.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{product.emoji}</div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{product.name}</p>
                            <p className="text-[10px] text-slate-400">Stock: {product.stock} pcs</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-amber-700">{formatCurrency(product.price)}</p>
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
                      <p className="font-black text-emerald-700">{formatCurrency(p.price)}</p>
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
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl">
                        {order.items[0].emoji}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">{order.userName}</h4>
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
                        const msg = `Habari *${order.userName}*, oda yako #${order.id.substring(0,8)} imebadilishwa hali kuwa *${order.status.toUpperCase()}*! 🐔\n\nAsante kwa kutumia KukuMart!`;
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
                <p className="text-emerald-200 text-xs font-black uppercase tracking-[0.2em] mb-2">Salio la Wallet</p>
                <h3 className="text-5xl font-black mb-6">{formatCurrency(totalRevenue)}</h3>
                <div className="flex gap-4">
                  <button 
                    onClick={handleWithdrawRequest}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
                  >
                    💸 Omba Malipo (Withdraw)
                  </button>
                  <button className="bg-white text-emerald-800 px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95">
                    📊 Historia
                  </button>
                </div>
              </div>
              <div className="absolute right-[-40px] top-[-40px] text-[240px] opacity-10 select-none pointer-events-none">💰</div>
            </div>

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
                  <p className="font-black text-emerald-700">+{formatCurrency(order.total)}</p>
                </div>
              ))}
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
                      defaultValue={user.openTime || "08:00"}
                      onBlur={(e) => updateShopSettings({ openTime: e.target.value })}
                      className="input-field" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Saa ya Kufunga</label>
                    <input 
                      type="time" 
                      defaultValue={user.closeTime || "18:00"}
                      onBlur={(e) => updateShopSettings({ closeTime: e.target.value })}
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
                        const current = user.openDays || [];
                        const next = current.includes(day.key) 
                          ? current.filter(d => d !== day.key)
                          : [...current, day.key];
                        updateShopSettings({ openDays: next });
                      }}
                      className={cn(
                        "w-10 h-10 rounded-xl font-black text-xs transition-all",
                        (user.openDays || []).includes(day.key)
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
                      defaultValue={user.deliveryCity || 3000}
                      onBlur={(e) => updateShopSettings({ deliveryCity: Number(e.target.value) })}
                      className="input-field" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nje ya Mji (TZS)</label>
                    <input 
                      type="number" 
                      defaultValue={user.deliveryOut || 7000}
                      onBlur={(e) => updateShopSettings({ deliveryOut: Number(e.target.value) })}
                      className="input-field" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Eneo</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="Dar es Salaam"
                value={newProduct.location}
                onChange={e => setNewProduct({...newProduct, location: e.target.value})}
              />
            </div>
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Emoji</label>
            <div className="flex gap-2 flex-wrap">
              {['🥚', '🍖', '🐣', '🐔', '🌾', '🥩'].map(e => (
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
    </div>
  );
};
