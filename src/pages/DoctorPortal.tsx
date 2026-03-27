import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { User, Activity } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Wallet, 
  LogOut,
  TrendingUp,
  CheckCircle2,
  Clock,
  Star,
  Settings,
  ShieldCheck,
  Bell,
  Menu,
  X,
  Sparkles,
  ArrowLeft,
  Activity as ActivityIcon,
  User as UserIcon,
  Phone,
  MapPin,
  Award,
  Stethoscope
} from 'lucide-react';
import { cn } from '../utils';
import { db, auth, updateDoc, doc, serverTimestamp, handleFirestoreError, OperationType } from '../services/firebase';
import { toast } from 'react-hot-toast';
import { Chat } from '../components/Chat';

export const DoctorPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, systemSettings, theme, setTheme, t, walletTransactions, notifications, chatMessages } = useApp();
  const currency = systemSettings?.currency || 'TZS';
  
  const [activeTab, setActiveTab] = useState<'dash' | 'consultations' | 'wallet' | 'settings'>('dash');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<{ id: string, name: string } | null>(null);

  // Group messages by conversation (participants)
  const doctorChats = React.useMemo(() => {
    if (!chatMessages) return [];
    const conversations: Record<string, any> = {};
    chatMessages.forEach(msg => {
      const otherId = msg.participants?.find((p: string) => p !== user?.id);
      if (otherId) {
        // Keep the latest message for each conversation
        if (!conversations[otherId] || (msg.createdAt?.seconds > (conversations[otherId].createdAt?.seconds || 0))) {
          conversations[otherId] = msg;
        }
      }
    });
    return Object.values(conversations);
  }, [chatMessages, user?.id]);

  if (!user || user.role !== 'doctor') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-3xl flex items-center justify-center text-red-600 mb-6">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Ufikiaji Umekataliwa</h1>
        <p className="text-slate-500 dark:text-slate-400 text-center max-w-xs mb-8">
          Huna ruhusa ya kuingia kwenye jopo hili. Tafadhali ingia kama daktari aliyethibitishwa.
        </p>
        <button onClick={() => navigate('/')} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all">
          Rudi Nyumbani
        </button>
      </div>
    );
  }

  // Calculate Earnings
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let todayEarnings = 0;
  let weekEarnings = 0;
  let monthEarnings = 0;

  walletTransactions?.forEach(t => {
    if (t.userId === user?.id && t.type === 'consultation' && t.status === 'approved') {
      const tTime = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : new Date(t.date).getTime();
      if (tTime >= todayStart) todayEarnings += t.amount;
      if (tTime >= weekStart) weekEarnings += t.amount;
      if (tTime >= monthStart) monthEarnings += t.amount;
    }
  });

  const stats = [
    { label: 'Ushauri', value: doctorChats.length, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Rating', value: user?.rating || '5.0', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Mapato (Mwezi)', value: formatCurrency(monthEarnings, currency), icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  ];

  function formatCurrency(amount: number, curr: string) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(amount);
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col md:flex-row",
      theme === 'dark' ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
    )}>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Stethoscope size={20} />
          </div>
          <span className="font-black text-lg tracking-tighter">DOCTOR<span className="text-blue-600">PORTAL</span></span>
        </div>
        <button onClick={() => setIsDrawerOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar / Drawer */}
      <AnimatePresence>
        {(isDrawerOpen || window.innerWidth >= 768) && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={cn(
              "fixed md:sticky top-0 left-0 h-screen w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-50 flex flex-col",
              !isDrawerOpen && "hidden md:flex"
            )}
          >
            <div className="p-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Stethoscope size={20} />
                </div>
                <span className="font-black text-xl tracking-tighter">DOCTOR<span className="text-blue-600">PORTAL</span></span>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              {[
                { id: 'dash', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'consultations', label: 'Ushauri (Chats)', icon: MessageSquare },
                { id: 'wallet', label: 'Mkoba & Mapato', icon: Wallet },
                { id: 'settings', label: 'Mpangilio', icon: Settings },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id as any); setIsDrawerOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all group",
                    activeTab === item.id 
                      ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" 
                      : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <item.icon size={20} className={cn(activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-blue-600")} />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 font-black">
                  {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover rounded-xl" /> : user.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm truncate">{user.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{user.specialization}</p>
                </div>
              </div>
              <button 
                onClick={() => logout()}
                className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
              >
                <LogOut size={20} />
                Toka Nje
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dash' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                  <h1 className="text-4xl font-black tracking-tight mb-2">Karibu, Dr. {user.name.split(' ')[0]} 👋</h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Hapa kuna muhtasari wa shughuli zako za leo.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate('/')} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all">
                    <ArrowLeft size={18} /> Rudi Dukani
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", stat.bg)}>
                      <stat.icon className={stat.color} size={28} />
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-3xl font-black">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black">Ushauri wa Hivi Karibuni</h3>
                    <button onClick={() => setActiveTab('consultations')} className="text-blue-600 font-black text-sm hover:underline">Zote →</button>
                  </div>
                  <div className="space-y-4">
                    {doctorChats.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare size={40} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400">Bado huna mazungumzo yoyote.</p>
                      </div>
                    ) : (
                      doctorChats.slice(0, 5).map(chat => (
                        <div key={chat.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 font-black">
                              <UserIcon size={20} />
                            </div>
                            <div>
                              <p className="font-black text-sm">Mteja</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(chat.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setActiveChat({ id: chat.participants.find((p: string) => p !== user.id), name: 'Mteja' });
                              setActiveTab('consultations');
                            }}
                            className="p-2 bg-white dark:bg-slate-900 rounded-xl text-blue-600 shadow-sm"
                          >
                            <MessageSquare size={18} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[40px] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                        <Award className="text-white" size={24} />
                      </div>
                      <h3 className="text-2xl font-black mb-2">Daktari Aliyethibitishwa</h3>
                      <p className="text-blue-100 font-medium text-sm leading-relaxed">
                        Akaunti yako imethibitishwa. Unaweza kutoa huduma za ushauri kwa wafugaji kote nchini.
                      </p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-200">Hali ya Akaunti</span>
                        <span className="px-3 py-1 bg-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full">Active</span>
                      </div>
                    </div>
                  </div>
                  <Sparkles className="absolute -right-8 -bottom-8 text-white/10 w-48 h-48 rotate-12" />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'consultations' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black">Ushauri na Mazungumzo</h2>
                {activeChat && (
                  <button onClick={() => setActiveChat(null)} className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                    <ArrowLeft size={18} /> Rudi kwenye Orodha
                  </button>
                )}
              </div>

              {activeChat ? (
                <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden h-[600px]">
                  <Chat 
                    receiverId={activeChat.id} 
                    receiverName={activeChat.name} 
                    onClose={() => setActiveChat(null)} 
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctorChats.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800">
                      <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400">Bado huna mazungumzo yoyote.</p>
                    </div>
                  ) : (
                    doctorChats.map(chat => {
                      const otherId = chat.participants?.find((p: string) => p !== user.id);
                      return (
                        <div 
                          key={chat.id} 
                          onClick={() => setActiveChat({ id: otherId, name: 'Mteja' })}
                          className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 font-black group-hover:scale-110 transition-transform">
                              <UserIcon size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-black text-slate-900 dark:text-white">Mteja</h4>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {new Date(chat.createdAt?.seconds * 1000).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
                                {chat.text || 'Bofya kuanza mazungumzo...'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'wallet' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-3xl font-black mb-8">Mkoba & Mapato</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mapato ya Leo</p>
                  <p className="text-2xl font-black text-emerald-600">{formatCurrency(todayEarnings, currency)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mapato ya Wiki Hii</p>
                  <p className="text-2xl font-black text-blue-600">{formatCurrency(weekEarnings, currency)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mapato ya Mwezi Huu</p>
                  <p className="text-2xl font-black text-amber-600">{formatCurrency(monthEarnings, currency)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Salio Linaloweza Kutolewa</p>
                  <p className="text-5xl font-black text-emerald-600 mb-8">{formatCurrency(user?.walletBalance || 0, currency)}</p>
                  <button 
                    onClick={() => toast.error('Kipengele hiki kinakuja hivi karibuni!')}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Toa Pesa
                  </button>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-xl font-black mb-6">Miamala ya Hivi Karibuni</h3>
                  <div className="space-y-4">
                    {walletTransactions?.filter(t => t.userId === user?.id).length === 0 ? (
                      <p className="text-center py-8 text-slate-400">Hakuna miamala bado.</p>
                    ) : (
                      walletTransactions?.filter(t => t.userId === user?.id).slice(0, 5).map(tx => (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", (tx.type === 'credit' || tx.type === 'consultation' || tx.type === 'deposit') ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>
                              {(tx.type === 'credit' || tx.type === 'consultation' || tx.type === 'deposit') ? '↓' : '↑'}
                            </div>
                            <div>
                              <p className="text-xs font-black">{tx.description || tx.type}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(tx.createdAt?.seconds ? tx.createdAt.seconds * 1000 : tx.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <p className={cn("font-black text-sm", (tx.type === 'credit' || tx.type === 'consultation' || tx.type === 'deposit') ? "text-emerald-600" : "text-red-600")}>
                            {(tx.type === 'credit' || tx.type === 'consultation' || tx.type === 'deposit') ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-3xl font-black mb-8">Mpangilio wa Profaili</h2>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm max-w-2xl">
                <div className="space-y-6">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-[32px] flex items-center justify-center text-4xl font-black text-blue-600">
                      {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover rounded-[32px]" /> : user.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-black">{user.name}</h3>
                      <p className="text-slate-500 font-medium">{user.email}</p>
                      <button className="mt-2 text-blue-600 font-black text-xs hover:underline uppercase tracking-widest">Badilisha Picha</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Utaalamu</label>
                      <input 
                        type="text" 
                        defaultValue={user.specialization}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gharama ya Ushauri ({currency})</label>
                      <input 
                        type="number" 
                        defaultValue={user.consultationFee}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bio / Maelezo</label>
                    <textarea 
                      rows={4}
                      defaultValue={user.bio || 'Mimi ni daktari wa mifugo mwenye uzoefu...'}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    />
                  </div>

                  <button 
                    onClick={() => toast.success('Mabadiliko yamehifadhiwa!')}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                    Hifadhi Mabadiliko
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Notifications Overlay */}
      <AnimatePresence>
        {/* Add notifications logic if needed */}
      </AnimatePresence>
    </div>
  );
};
