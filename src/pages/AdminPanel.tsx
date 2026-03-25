import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';
import { generateInvoicePDF } from '../utils/invoice';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils';
import { Modal } from '../components/Modal';
import { motion, AnimatePresence } from 'motion/react';
import { db, 
  collection, 
  addDoc,
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp,
  increment,
  getDocs,
  getDoc,
  query,
  where,
  limit,
  onSnapshot,
  handleFirestoreError,
  OperationType
} from '../services/firebase';
import { WalletTransaction } from '../types';
import { QRScanner } from '../components/QRScanner';
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
  Activity,
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
  MessageSquare,
  RefreshCw,
  Send,
  Tag,
  Menu,
  BookOpen,
  FileText,
  Award,
  Sparkles,
  QrCode,
  Video
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
  const navigate = useNavigate();
  const { 
    user,
    users, 
    vendors, 
    doctors,
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
    offers,
    academyPosts,
    notifications,
    updateSystemSettings,
    logout, 
    addActivity,
    addNotification,
    theme,
    setTheme,
    language,
    setLanguage,
    setView,
    t
  } = useApp();
  const currency = systemSettings?.currency || 'TZS';
  const [activeTab, setActiveTab] = useState<'over' | 'analytics' | 'vendors' | 'doctors' | 'prods' | 'orders' | 'users' | 'admins' | 'wallet' | 'settings' | 'status' | 'cats' | 'reviews' | 'announcements' | 'offers' | 'academy' | 'manual_payments'>('over');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const [manualPayments, setManualPayments] = useState<any[]>([]);
  const [isManualPaymentsLoading, setIsManualPaymentsLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    setIsManualPaymentsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'kuku_manual_payments'), (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setManualPayments(paymentsData.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
      setIsManualPaymentsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'kuku_manual_payments');
      setIsManualPaymentsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

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
      handleFirestoreError(error, OperationType.DELETE, `kuku_statuses/${statusId}`);
      toast.error('Hitilafu wakati wa kufuta status');
    }
  };

  const [editingItem, setEditingItem] = useState<{ type: string, data: any } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    image: '',
    link: '',
    target: 'all', // 'all' or specific user ID
    type: 'in-app' // 'in-app' or 'whatsapp'
  });
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
  const [offerForm, setOfferForm] = useState({
    title: '',
    message: '',
    image: '',
    link: '',
    expiryDate: '',
    productIds: [] as string[],
    target: 'all' as 'all' | string
  });
  const [isSendingOffer, setIsSendingOffer] = useState(false);

  const [academyForm, setAcademyForm] = useState({
    title: '',
    content: '',
    image: '',
    category: 'livestock' as 'livestock' | 'crops' | 'marketing' | 'general'
  });
  const [isSendingAcademy, setIsSendingAcademy] = useState(false);
  const [isAcademyModalOpen, setIsAcademyModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [isSuggestingPrice, setIsSuggestingPrice] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Generate Invoice
  const handleScan = async (decodedText: string) => {
    setIsScannerOpen(false);
    toast.success(`Scanned: ${decodedText}`);
    
    // Logic to handle scanned text (e.g., find order or product)
    if (decodedText.startsWith('ORDER:')) {
      const orderId = decodedText.replace('ORDER:', '');
      const order = Array.isArray(orders) ? orders.find(o => o.id === orderId) : undefined;
      if (order) {
        setActiveTab('orders');
        // You could also open a modal for this order here
        toast.success(`Oda imepatikana: ${orderId}`);
      } else {
        toast.error('Oda haijapatikana');
      }
    }
  };
  const generateInvoice = async (order: any) => {
    setIsGeneratingInvoice(true);
    try {
      const doc = await generateInvoicePDF(order, systemSettings);
      doc.save(`Risiti-${order.id.slice(-6).toUpperCase()}.pdf`);
      toast.success('Risiti imepakuliwa');
    } catch (error) {
      console.error('Invoice Error:', error);
      toast.error('Imeshindwa kutengeneza risiti');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

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
      handleFirestoreError(error, isEditingCat ? OperationType.UPDATE : OperationType.CREATE, 'kuku_categories');
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
        }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'kuku_categories'));
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
      handleFirestoreError(error, OperationType.DELETE, `kuku_categories/${id}`);
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
    pointsPerOrder: 10, // 10 points per 1000 TZS
    pointsValue: 1, // 1 point = 1 TZS
    firebase_service_account: '',
    maintenanceMode: false,
    themeColor: 'amber',
    qrColor: '#000000',
    qrLogo: '',
    zego_app_id: '',
    zego_server_secret: ''
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
        pointsPerOrder: systemSettings.pointsPerOrder || 10,
        pointsValue: systemSettings.pointsValue || 1,
        firebase_service_account: systemSettings.firebase_service_account || '',
        maintenanceMode: systemSettings.maintenanceMode || false,
        themeColor: systemSettings.themeColor || 'amber',
        qrColor: systemSettings.qrColor || '#000000',
        qrLogo: systemSettings.qrLogo || '',
        zego_app_id: systemSettings.zego_app_id || '',
        zego_server_secret: systemSettings.zego_server_secret || ''
      });
    }
  }, [systemSettings]);

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.message) {
      toast.error('Tafadhali andika ujumbe');
      return;
    }

    setIsSendingAnnouncement(true);
    try {
      if (announcementForm.type === 'whatsapp') {
        if (announcementForm.target === 'all') {
          toast.error('WhatsApp haiwezi kutuma kwa wote kwa pamoja bila API. Chagua mtumiaji mmoja.');
          setIsSendingAnnouncement(false);
          return;
        }
        const targetUser = (Array.isArray(users) ? users.find(u => u.id === announcementForm.target) : undefined) || 
                          (Array.isArray(vendors) ? vendors.find(v => v.id === announcementForm.target) : undefined);
        if (targetUser && targetUser.contact) {
          let phone = targetUser.contact.replace(/\D/g, '');
          if (phone.startsWith('0')) phone = '255' + phone.substring(1);
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(announcementForm.message)}`);
          toast.success('WhatsApp imefunguliwa');
        } else {
          toast.error('Mtumiaji huyu hana namba ya simu');
        }
      } else {
        // In-App Notification
        const payload: any = {
          title: announcementForm.title,
          message: announcementForm.message,
          userId: announcementForm.target,
          readBy: [],
          date: new Date().toISOString(),
          icon: '📢',
          text: `Tangazo: ${announcementForm.title}`,
          time: new Date().toISOString(),
          createdAt: serverTimestamp()
        };
        if (announcementForm.image) payload.image = announcementForm.image;
        if (announcementForm.link) payload.link = announcementForm.link;

        await addDoc(collection(db, 'kuku_notifications'), payload);
        toast.success('Tangazo limetumwa kikamilifu!');
        setAnnouncementForm({ ...announcementForm, title: '', message: '', image: '', link: '' });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'kuku_notifications');
      console.error(error);
      toast.error('Kosa: ' + (error as Error).message);
    } finally {
      setIsSendingAnnouncement(false);
    }
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerForm.title || !offerForm.message) {
      toast.error('Tafadhali jaza kichwa na ujumbe');
      return;
    }

    setIsSendingOffer(true);
    try {
      const payload: any = {
        vendorId: user?.id || 'admin',
        title: offerForm.title,
        message: offerForm.message,
        image: offerForm.image || '',
        link: offerForm.link || '',
        expiryDate: offerForm.expiryDate || null,
        productIds: offerForm.productIds,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'kuku_offers'), payload);
      
      // Also send a notification to everyone
      await addDoc(collection(db, 'kuku_notifications'), {
        title: `OFA MPYA: ${offerForm.title}`,
        message: offerForm.message,
        userId: 'all',
        readBy: [],
        date: new Date().toISOString(),
        icon: '🎁',
        text: `Ofa Mpya: ${offerForm.title}`,
        time: new Date().toISOString(),
        createdAt: serverTimestamp()
      });

      toast.success('Ofa imetumwa kikamilifu!');
      setOfferForm({
        title: '',
        message: '',
        image: '',
        link: '',
        expiryDate: '',
        productIds: [],
        target: 'all'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'kuku_offers');
      console.error(error);
      toast.error('Kosa: ' + (error as Error).message);
    } finally {
      setIsSendingOffer(false);
    }
  };

  const handleSaveAcademy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academyForm.title || !academyForm.content) {
      toast.error('Tafadhali jaza kichwa na maelezo');
      return;
    }
    setIsSendingAcademy(true);
    try {
      if (editingPost) {
        await updateDoc(doc(db, 'kuku_academy', editingPost.id), {
          ...academyForm,
          updatedAt: serverTimestamp()
        });
        toast.success('Makala imesasishwa');
      } else {
        await addDoc(collection(db, 'kuku_academy'), {
          ...academyForm,
          authorId: user?.id || 'admin',
          authorName: user?.name || 'Admin',
          createdAt: serverTimestamp()
        });
        toast.success('Makala imeongezwa');
      }
      setIsAcademyModalOpen(false);
      setEditingPost(null);
      setAcademyForm({ title: '', content: '', image: '', category: 'livestock' });
    } catch (error) {
      handleFirestoreError(error, editingPost ? OperationType.UPDATE : OperationType.CREATE, 'kuku_academy');
      toast.error('Hitilafu imetokea');
    } finally {
      setIsSendingAcademy(false);
    }
  };

  const deleteAcademyPost = async (id: string) => {
    if (!confirm('Futa makala hii?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_academy', id));
      toast.success('Makala imefutwa');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `kuku_academy/${id}`);
      toast.error('Hitilafu imetokea');
    }
  };

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

  const pendingVendors = (Array.isArray(vendors) ? vendors : []).filter(v => v.status === 'pending');
  const COLORS = ['#d97706', '#059669', '#2563eb', '#7c3aed', '#db2777'];

  // Dynamic Analytics
  const totalRevenue = (Array.isArray(orders) ? orders : []).filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  const totalAdminEarnings = (Array.isArray(orders) ? orders : [])
    .filter(o => o.status === 'delivered' || o.status === 'completed')
    .reduce((s, o) => s + (o.adminCommission || (o.total - (o.deliveryFee || 0)) * ((systemSettings?.commissionRate || 6) / 100)), 0);
  
  const regionStats = (Array.isArray(vendors) ? vendors : []).reduce((acc: any, v) => {
    const reg = v.region || 'Unknown';
    acc[reg] = (acc[reg] || 0) + 1;
    return acc;
  }, {});

  const dynamicRegionData = Object.entries(regionStats).map(([name, value]) => ({ name, value }));

  const topSellers = (Array.isArray(vendors) ? vendors : [])
    .map(v => ({
      name: v.shopName || v.name,
      sales: (Array.isArray(orders) ? orders : []).filter(o => o.vendorId === v.id && o.status === 'delivered').reduce((s, o) => s + o.total, 0)
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  const salesByDate = (Array.isArray(orders) ? orders : [])
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

  const popularProductsData = (Array.isArray(products) ? products : [])
    .map(p => ({
      name: p.name,
      sales: (Array.isArray(orders) ? orders : []).filter(o => o.productId === p.id && o.status === 'delivered').length,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 4);

  const approveWithdrawal = async (id: string) => {
    try {
      const withdrawDoc = await getDoc(doc(db, 'kuku_withdrawals', id));
      if (!withdrawDoc.exists()) throw new Error('Request not found');
      const data = withdrawDoc.data();

      await updateDoc(doc(db, 'kuku_withdrawals', id), {
        status: 'Completed',
        updatedAt: serverTimestamp()
      });

      const transSnapshot = await getDocs(query(collection(db, 'kuku_wallet'), where('withdrawalId', '==', id), limit(1)));
      if (!transSnapshot.empty) {
        await updateDoc(doc(db, 'kuku_wallet', transSnapshot.docs[0].id), { status: 'Completed' });
      }

      addActivity('💸', `Malipo yameidhinishwa (Completed)`);
      
      // Notify User
      await addNotification(
        'Malipo Yameidhinishwa! ✅',
        `Ombi lako la kutoa kiasi ${formatCurrency(data.amount, currency)} limeidhinishwa. Pesa imetumwa kwenye namba yako.`,
        data.userId || data.vendorId,
        'wallet'
      );

      toast.success('Malipo yameidhinishwa');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `kuku_withdrawals/${id}`);
      toast.error(error.message || 'Hitilafu wakati wa kuidhinisha');
    }
  };

  const rejectWithdrawal = async (id: string) => {
    try {
      const withdrawDoc = await getDoc(doc(db, 'kuku_withdrawals', id));
      if (!withdrawDoc.exists()) throw new Error('Request not found');
      const data = withdrawDoc.data();

      await updateDoc(doc(db, 'kuku_withdrawals', id), {
        status: 'Rejected',
        updatedAt: serverTimestamp()
      });

      const transSnapshot = await getDocs(query(collection(db, 'kuku_wallet'), where('withdrawalId', '==', id), limit(1)));
      if (!transSnapshot.empty) {
        await updateDoc(doc(db, 'kuku_wallet', transSnapshot.docs[0].id), { status: 'Rejected' });
      }

      await updateDoc(doc(db, 'kuku_users', data.userId || data.vendorId), {
        walletBalance: increment(data.amount)
      });

      // Notify User
      await addNotification(
        'Ombi la Malipo Limekataliwa ❌',
        `Ombi lako la kutoa kiasi ${formatCurrency(data.amount, currency)} limekataliwa. Salio limerudishwa kwenye wallet yako.`,
        data.userId || data.vendorId,
        'wallet'
      );

      addActivity('✕', `Maombi ya malipo yamekataliwa (Rejected)`);
      toast.success('Maombi yamekataliwa');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `kuku_withdrawals/${id}`);
      toast.error(error.message || 'Hitilafu wakati wa kukataa');
    }
  };

  const approveDeposit = async (tx: WalletTransaction) => {
    try {
      await updateDoc(doc(db, 'kuku_wallet', tx.id), { status: 'approved' });
      await updateDoc(doc(db, 'kuku_users', tx.userId), { 
        walletBalance: increment(tx.amount) 
      });

      // Notify User
      await addNotification(
        'Deposit Imeidhinishwa! 💰',
        `Deposit yako ya kiasi ${formatCurrency(tx.amount, currency)} imeshapokelewa na kuongezwa kwenye pochi yako.`,
        tx.userId,
        'wallet'
      );

      toast.success('Deposit imethibitishwa na salio limeongezwa!');
      addActivity('💰', `Deposit ya ${formatCurrency(tx.amount, currency)} ya ${tx.userName} imethibitishwa`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `kuku_wallet/${tx.id}`);
      console.error(err);
      toast.error('Imeshindwa kuthibitisha deposit');
    }
  };

  const rejectDeposit = async (id: string) => {
    try {
      await updateDoc(doc(db, 'kuku_wallet', id), { status: 'rejected' });
      toast.success('Deposit imekataliwa');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `kuku_wallet/${id}`);
      toast.error('Imeshindwa kukataa deposit');
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const syncWallets = async () => {
    if (!confirm('Je, unataka kusawazisha (Sync) Wallet za wauzaji? Hii itahakikisha miamala yote ya mauzo iliyokamilika imeingizwa kwenye Wallet zao.')) return;
    
    setIsSyncing(true);
    try {
      let fixedCount = 0;
      
      // 1. Get all completed orders
      const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered');
      
      for (const order of completedOrders) {
        // Check if this order already has a 'sale' transaction in kuku_wallet
        const existingTx = Array.isArray(walletTransactions) ? walletTransactions.find(t => t.orderId === order.id && t.type === 'sale') : undefined;
        
        if (!existingTx) {
          // Missing sale transaction!
          const amountToRelease = order.vendorNet || (order.total - (order.deliveryFee || 0)) * 0.94;
          
          // Add transaction
          await addDoc(collection(db, 'kuku_wallet'), {
            userId: order.vendorId,
            userName: order.vendorName,
            amount: amountToRelease,
            type: 'sale',
            status: 'approved',
            orderId: order.id,
            description: `Mauzo ya #${order.id.substring(0,8)} (Sync Fix)`,
            date: order.date || new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp()
          }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'kuku_wallet'));
          
          // Update vendor balance
          await updateDoc(doc(db, 'kuku_users', order.vendorId), {
            walletBalance: increment(amountToRelease)
          }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `kuku_users/${order.vendorId}`));
          
          fixedCount++;
        }
      }
      
      if (fixedCount > 0) {
        toast.success(`Usawazishaji umekamilika! Miamala ${fixedCount} imerekebishwa.`);
      } else {
        toast.success('Wallet zote ziko sawa. Hakuna miamala iliyokosekana.');
      }
    } catch (err: any) {
      console.error("Sync Error:", err);
      toast.error('Hitilafu wakati wa kusawazisha: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const approveDoctor = async (id: string) => {
    try {
      await updateDoc(doc(db, 'kuku_users', id), { status: 'approved' });
      addActivity('🩺', `Daktari ameidhinishwa`);
      // Notify User
      await addNotification(
        'Ombi la Daktari Limeidhinishwa! 🩺',
        `Hongera! Ombi lako la kuwa daktari wa mifugo limeidhinishwa. Sasa unaweza kuonekana kwa wafugaji na kutoa huduma.`,
        id,
        'profile'
      );

      toast.success('Daktari ameidhinishwa');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `kuku_users/${id}`);
      toast.error('Hitilafu wakati wa kuidhinisha');
    }
  };

  const rejectDoctor = async (id: string) => {
    try {
      await updateDoc(doc(db, 'kuku_users', id), { status: 'rejected' });
      addActivity('✕', `Maombi ya daktari yamekataliwa`);
      toast.success('Maombi yamekataliwa');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `kuku_users/${id}`);
      toast.error('Hitilafu wakati wa kukataa');
    }
  };

  const approveVendor = async (id: string) => {
    try {
      await updateDoc(doc(db, 'kuku_users', id), { status: 'approved' });
      addActivity('✅', `Muuzaji ameidhinishwa`);
      // Notify User
      await addNotification(
        'Ombi la Muuzaji Limeidhinishwa! 🏪',
        `Hongera! Ombi lako la kuwa muuzaji limeidhinishwa. Sasa unaweza kuanza kuuza bidhaa zako.`,
        id,
        'profile'
      );

      toast.success('Muuzaji ameidhinishwa');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `kuku_users/${id}`);
      toast.error('Hitilafu wakati wa kuidhinisha');
    }
  };

  const rejectVendor = async (id: string) => {
    try {
      await updateDoc(doc(db, 'kuku_users', id), { status: 'rejected' });
      addActivity('✕', `Maombi ya muuzaji yamekataliwa`);
      toast.success('Maombi yamekataliwa');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `kuku_users/${id}`);
      toast.error('Hitilafu wakati wa kukataa');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta mtumiaji huyu?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_users', id));
      toast.success('Mtumiaji amefutwa');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `kuku_users/${id}`);
      toast.error('Hitilafu wakati wa kufuta');
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta agizo hili?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_orders', id));
      toast.success('Agizo limefutwa');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `kuku_orders/${id}`);
      toast.error('Hitilafu wakati wa kufuta');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row pb-20 lg:pb-0 transition-colors duration-300">
      {/* Mobile Header */}
      <header className="lg:hidden bg-amber-950 text-amber-100 px-4 py-3 sticky top-0 z-30 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-amber-950 shadow-lg">
            <BarChart3 size={16} />
          </div>
          <h1 className="font-serif italic text-base font-bold">Admin</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={langRef}>
            <button 
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="p-2 text-amber-400 bg-white/5 rounded-xl"
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
          <button onClick={logout} className="text-amber-400/60 p-2 bg-white/5 rounded-xl">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={cn(
        "lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-amber-950 text-amber-100 z-[60] transition-transform duration-300 ease-out flex flex-col shadow-2xl",
        isDrawerOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-amber-950 shadow-lg overflow-hidden">
              {systemSettings?.app_logo ? (
                <img src={systemSettings.app_logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <BarChart3 size={18} />
              )}
            </div>
            <h1 className="font-serif italic text-lg font-bold">Admin Menu</h1>
          </div>
          <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-white/5 rounded-xl text-amber-400">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: 'over', label: 'Muhtasari', icon: LayoutDashboard },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'manual_payments', label: 'Malipo (Manual)', icon: Wallet },
            { id: 'vendors', label: 'Wauuzaji', icon: Store, badge: pendingVendors.length },
            { id: 'doctors', label: 'Madaktari', icon: Activity, badge: (Array.isArray(users) ? users : []).filter(u => u.role === 'doctor' && u.status === 'pending').length },
            { id: 'prods', label: 'Bidhaa', icon: Package },
            { id: 'orders', label: 'Maagizo', icon: ClipboardList },
            { id: 'users', label: 'Watumiaji', icon: Users },
            { id: 'admins', label: 'Admins', icon: ShieldCheck },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
            { id: 'reviews', label: 'Maoni', icon: MessageSquare },
            { id: 'cats', label: 'Kategoria', icon: Grid },
            { id: 'status', label: t('status'), icon: Camera },
            { id: 'announcements', label: 'Matangazo', icon: Bell },
            { id: 'offers', label: 'Ofa & Coupons', icon: Tag },
            { id: 'academy', label: 'Academy', icon: BookOpen },
            { id: 'settings', label: 'Mipangilio', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setIsDrawerOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-bold transition-all",
                activeTab === item.id 
                  ? "bg-amber-500 text-amber-950 shadow-lg" 
                  : "text-amber-100/60 hover:bg-white/5 hover:text-amber-400"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} />
                {item.label}
              </div>
              {item.badge ? (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black",
                  activeTab === item.id ? "bg-amber-950 text-amber-500" : "bg-red-500 text-white"
                )}>{item.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-black text-amber-400 transition-all border border-white/5"
          >
            <ArrowLeft size={16} />
            {t('go_to_market')}
          </button>
        </div>
      </aside>

      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-72 bg-amber-950 text-amber-100 flex-col sticky top-0 h-screen z-20">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-amber-950 shadow-lg overflow-hidden">
                {systemSettings?.app_logo ? (
                  <img src={systemSettings.app_logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <BarChart3 size={18} />
                )}
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
            onClick={() => navigate('/')}
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
            { id: 'manual_payments', label: 'Malipo (Manual)', icon: Wallet },
            { id: 'vendors', label: 'Wauuzaji', icon: Store, badge: pendingVendors.length },
            { id: 'doctors', label: 'Madaktari', icon: Activity, badge: (Array.isArray(users) ? users : []).filter(u => u.role === 'doctor' && u.status === 'pending').length },
            { id: 'prods', label: 'Bidhaa', icon: Package },
            { id: 'orders', label: 'Maagizo', icon: ClipboardList },
            { id: 'users', label: 'Watumiaji', icon: Users },
            { id: 'admins', label: 'Admins', icon: ShieldCheck },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
            { id: 'reviews', label: 'Maoni (Reviews)', icon: MessageSquare },
            { id: 'cats', label: 'Kategoria', icon: Grid },
            { id: 'status', label: t('status'), icon: Camera },
            { id: 'announcements', label: 'Matangazo', icon: Bell },
            { id: 'offers', label: 'Ofa & Coupons', icon: Tag },
            { id: 'academy', label: 'Academy', icon: BookOpen },
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
          
          <button
            onClick={() => setIsScannerOpen(true)}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition-all border border-amber-500/20 mt-4"
          >
            <QrCode size={18} />
            Skani QR Code
          </button>
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
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        {activeTab === 'over' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 md:space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Muhtasari wa Mfumo</h2>
                <p className="text-sm text-slate-500">Hali ya sasa ya {systemSettings?.app_name || 'Digital Livestock Market Live'} Tanzania</p>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm self-start">
                <motion.div
                  animate={notifications.filter(n => !n.readBy?.includes(user?.id || '')).length > 0 ? {
                    scale: [1, 1.2, 1],
                    rotate: [0, -10, 10, -10, 0]
                  } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Bell size={18} className="text-amber-500" />
                </motion.div>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {notifications.filter(n => !n.readBy?.includes(user?.id || '')).length} Unread
                </span>
              </div>
              <button 
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-amber-950 px-5 py-2.5 rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 font-black text-xs"
              >
                <QrCode size={18} />
                Skani QR
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
              {[
                { label: 'Watumiaji', value: users.filter(u => u.role === 'user').length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Wauuzaji', value: vendors.length, icon: Store, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: `${pendingVendors.length} wanasubiri` },
                { label: 'Madaktari', value: users.filter(u => u.role === 'doctor' && u.status === 'approved').length, icon: Activity, color: 'text-cyan-600', bg: 'bg-cyan-50', sub: `${users.filter(u => u.role === 'doctor' && u.status === 'pending').length} wanasubiri` },
                { label: 'Bidhaa', value: products.length, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Maagizo', value: orders.length, icon: ClipboardList, color: 'text-red-600', bg: 'bg-red-50' },
                { label: `Mapato Admin`, value: formatCurrency(totalAdminEarnings, currency), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
                  <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-[16px] md:rounded-[20px] flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform", stat.bg, stat.bg.includes('blue') && 'dark:bg-blue-900/20', stat.bg.includes('emerald') && 'dark:bg-emerald-900/20', stat.bg.includes('cyan') && 'dark:bg-cyan-900/20', stat.bg.includes('amber') && 'dark:bg-amber-900/20', stat.bg.includes('red') && 'dark:bg-red-900/20', stat.bg.includes('purple') && 'dark:bg-purple-900/20')}>
                    <stat.icon className={stat.color} size={24} />
                  </div>
                  <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-1">{stat.value}</p>
                  {stat.sub && <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500">{stat.sub}</p>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
              <div className="bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 md:p-10 shadow-sm">
                <h3 className="font-black text-slate-900 dark:text-white mb-6 md:mb-8 flex items-center gap-3">
                  <Bell size={24} className="text-amber-500" /> Shughuli za Hivi Karibuni
                </h3>
                <div className="space-y-5 md:space-y-6">
                  {activities.slice(0, 6).map(act => (
                    <div key={act.id} className="flex items-start gap-3 md:gap-4">
                      <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-base md:text-lg flex-shrink-0">
                        {act.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">{act.text}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{act.time}</p>
                      </div>
                      <button 
                        onClick={async () => {
                          if (confirm('Futa shughuli hii?')) {
                            await deleteDoc(doc(db, 'kuku_activity', act.id)).catch(e => handleFirestoreError(e, OperationType.DELETE, `kuku_activity/${act.id}`));
                            toast.success('Imefutwa');
                          }
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 md:p-10 shadow-sm">
                <h3 className="font-black text-slate-900 dark:text-white mb-6 md:mb-8 flex items-center gap-3">
                  <Store size={24} className="text-emerald-500" /> Wauuzaji Wanasubiri
                </h3>
                <div className="space-y-4">
                  {pendingVendors.length === 0 ? (
                    <p className="text-center py-10 text-slate-400 text-sm">Hakuna maombi mapya.</p>
                  ) : (
                    pendingVendors.map(v => (
                      <div key={v.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-[20px] md:rounded-[24px] p-4 md:p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-slate-900 dark:text-white shadow-sm">
                            {(v.shopName || v.name)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs md:text-sm font-black text-slate-900 dark:text-white">{v.shopName || v.name}</p>
                            <p className="text-[10px] text-slate-400">📍 {v.location}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => approveVendor(v.id)}
                            className="w-9 h-9 md:w-10 md:h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors"
                          >
                            <Check size={18} />
                          </button>
                          <button 
                            onClick={() => rejectVendor(v.id)}
                            className="w-9 h-9 md:w-10 md:h-10 bg-red-500 text-white rounded-xl flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <X size={18} />
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
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                  <div key={v.id} className="bg-white dark:bg-slate-900 rounded-[24px] md:rounded-[28px] border border-slate-100 dark:border-slate-800 p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
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
                        onClick={() => setEditingItem({ type: 'vendor', data: v })}
                        className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-all"
                        title="Wallet"
                      >
                        <Wallet size={18} />
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

        {activeTab === 'doctors' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-8">Madaktari wa Mifugo</h2>
            <div className="space-y-4">
              {users.filter(u => u.role === 'doctor').length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800">
                  <Activity size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                  <p className="text-slate-400">Hakuna madaktari bado.</p>
                </div>
              ) : (
                users.filter(u => u.role === 'doctor').map(d => (
                  <div key={d.id} className="bg-white dark:bg-slate-900 rounded-[24px] md:rounded-[28px] border border-slate-100 dark:border-slate-800 p-5 md:p-6 flex flex-col shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-3xl font-black text-blue-800 dark:text-blue-500 overflow-hidden">
                          {d.avatar ? <img src={d.avatar} className="w-full h-full object-cover" /> : d.name[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 dark:text-white">{d.name}</h4>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{d.qualification} · {d.specialization}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                              d.status === 'approved' ? "bg-emerald-100 text-emerald-700" : 
                              d.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                            )}>
                              {d.status}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              📍 {d.region}, {d.district}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {d.status === 'pending' && (
                          <button 
                            onClick={() => approveDoctor(d.id)}
                            className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors"
                            title="Approve"
                          >
                            <Check size={20} />
                          </button>
                        )}
                        <button 
                          onClick={() => rejectDoctor(d.id)}
                          className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                          title="Reject / Deactivate"
                        >
                          <X size={20} />
                        </button>
                        <button 
                          onClick={() => deleteUser(d.id)}
                          className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">License No</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{d.licenseNumber}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Experience</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{d.experienceYears} Years</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Consultation</p>
                        <p className="text-xs font-bold text-emerald-600">{formatCurrency(d.consultationFee || 0, currency)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Emergency</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{d.offersEmergency ? 'YES' : 'NO'}</p>
                      </div>
                    </div>

                    {d.licenseImage && (
                      <div className="mt-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">License Image</p>
                        <a 
                          href={d.licenseImage} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-all"
                        >
                          <FileText size={14} /> View Document
                        </a>
                      </div>
                    )}
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
              {products.filter(p => user?.role === 'admin' || p.vendorId === user?.id).length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800">
                  <Package size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400">Hakuna bidhaa bado.</p>
                </div>
              ) : (
                products.filter(p => user?.role === 'admin' || p.vendorId === user?.id).map(p => (
                  <div key={p.id} className="bg-white dark:bg-slate-900 rounded-[24px] md:rounded-[28px] border border-slate-100 dark:border-slate-800 p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
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
              {orders.filter(o => user?.role === 'admin' || o.vendorId === user?.id).length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800">
                  <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400">Hakuna maagizo bado.</p>
                </div>
              ) : (
                orders.filter(o => user?.role === 'admin' || o.vendorId === user?.id).map(o => (
                  <div key={o.id} className="bg-white dark:bg-slate-900 rounded-[24px] md:rounded-[28px] border border-slate-100 dark:border-slate-800 p-5 md:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl">
                          {o.items[0].emoji}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900">{o.userName}</h4>
                          <p className="text-xs text-slate-400">#{o.id.substring(0,8)} · {o.date}</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-black text-amber-700">{formatCurrency(o.total, currency)}</p>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1 mt-1">
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
                          onClick={() => generateInvoice({
                            id: o.id,
                            createdAt: o.createdAt,
                            userName: o.userName,
                            userPhone: o.userContact,
                            vendorName: o.vendorName,
                            productName: o.items[0].name,
                            quantity: o.items[0].quantity,
                            productPrice: o.items[0].price,
                            totalPrice: o.total
                          })}
                          disabled={isGeneratingInvoice}
                          className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-slate-200 transition-all flex items-center gap-1"
                        >
                          {isGeneratingInvoice ? <div className="w-3 h-3 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" /> : <FileText size={12} />}
                          RISITI
                        </button>
                        <button 
                          onClick={() => window.open(`https://wa.me/${o.userContact.replace(/\+/g,'')}?text=Habari ${o.userName}, kuhusu agizo lako #${o.id.substring(0,8)}...`)}
                          className="bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-green-200 transition-all"
                        >
                          WA MTEJA
                        </button>
                        <button 
                          onClick={() => {
                            const date = new Date(o.createdAt).toLocaleString('sw-TZ');
                            const msg = `*RISITI YA MALIPO - KUKU APP* 🧾\n--------------------------------\n*Namba ya Agizo:* #${o.id.substring(0,8)}\n*Tarehe:* ${date}\n*Mteja:* ${o.userName}\n*Simu:* ${o.userContact}\n\n*BIDHAA:*\n${o.items.map((item: any) => `${item.qty}x ${item.name} @ ${formatCurrency(item.price, currency)}`).join('\n')}\n\n*Gharama ya Usafiri:* ${formatCurrency(o.deliveryFee, currency)}\n*Jumla Kuu:* *${formatCurrency(o.total, currency)}*\n*Njia ya Malipo:* ${o.payMethod.toUpperCase()}\n*Hali ya Malipo:* ${o.paymentApproved ? 'Imelipwa ✅' : 'Inasubiri ⏳'}\n\nAsante kwa kununua na Kuku App! 🐔`;
                            window.open(`https://wa.me/${o.userContact.replace(/\+/g,'')}?text=${encodeURIComponent(msg)}`);
                          }}
                          className="bg-slate-800 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-slate-900 transition-all flex items-center gap-1"
                        >
                          <FileText size={12} /> TUMA RISITI
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-3xl font-black text-slate-900">Watumiaji Wote</h2>
              <button
                onClick={() => {
                  setAnnouncementForm(prev => ({ ...prev, target: 'all' }));
                  setActiveTab('announcements');
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-sm"
              >
                <MessageSquare size={18} />
                Tuma Ujumbe kwa Wote
              </button>
            </div>
            <div className="grid gap-4">
              {users.filter(u => u.role === 'user').map(u => (
                <div key={u.id} className="bg-white rounded-[28px] border border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
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
                      onClick={() => {
                        setAnnouncementForm(prev => ({ ...prev, target: u.id }));
                        setActiveTab('announcements');
                      }}
                      className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center hover:bg-amber-100 transition-all"
                      title="Tuma Ujumbe"
                    >
                      <MessageSquare size={18} />
                    </button>
                    <button 
                      onClick={() => setEditingItem({ type: 'user', data: u })}
                      className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-500 transition-all"
                      title="Edit User"
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => setEditingItem({ type: 'user', data: u })}
                      className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-all"
                      title="Wallet"
                    >
                      <Wallet size={18} />
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
                <div key={a.id} className="bg-white rounded-[28px] border border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
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

        {activeTab === 'manual_payments' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h2 className="text-3xl font-black text-slate-900">Malipo (Manual)</h2>
            </div>
            
            {isManualPaymentsLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : manualPayments.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                <Wallet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">Hakuna malipo ya manual yaliyopatikana.</p>
              </div>
            ) : (
              <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarehe</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mtumiaji</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kiasi</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sababu</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mtandao & SMS</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Vitendo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {manualPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-sm font-bold text-slate-600">
                            {payment.createdAt?.toDate().toLocaleDateString('sw-TZ')}
                          </td>
                          <td className="p-4">
                            <div className="font-black text-slate-900">{payment.userName}</div>
                            <div className="text-xs text-slate-500">{payment.userPhone}</div>
                          </td>
                          <td className="p-4 font-black text-emerald-600">
                            {formatCurrency(payment.amount, currency)}
                          </td>
                          <td className="p-4">
                            <div className="text-sm font-bold text-slate-700">{payment.reason}</div>
                            <div className="text-[10px] text-slate-400 uppercase">{payment.actionType}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-xs font-bold text-slate-700 uppercase">{payment.network}</div>
                            <div className="text-xs text-slate-500">{payment.senderName} ({payment.senderPhone})</div>
                            <div className="text-[10px] text-slate-400 mt-1 italic max-w-[200px] truncate" title={payment.sms}>"{payment.sms}"</div>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                              payment.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                              payment.status === 'rejected' ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            )}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {payment.status === 'pending' && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={async () => {
                                    if (!confirm('Je, una uhakika unataka kuidhinisha malipo haya?')) return;
                                    try {
                                      await updateDoc(doc(db, 'kuku_manual_payments', payment.id), { status: 'approved' });
                                      
                                      // Handle specific actions based on actionType
                                      if (payment.actionType === 'vendor_subscription') {
                                        await updateDoc(doc(db, 'kuku_users', payment.userId), {
                                          subscriptionStatus: 'active',
                                          subscriptionPlan: payment.extraData?.plan || 'monthly',
                                          subscriptionExpiry: new Date(Date.now() + (payment.extraData?.plan === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()
                                        });
                                      } else if (payment.actionType === 'doctor_consultation') {
                                        // Maybe add to doctor's wallet or create an appointment record
                                        if (payment.targetId) {
                                          await updateDoc(doc(db, 'kuku_users', payment.targetId), {
                                            walletBalance: increment(payment.amount * (1 - ((systemSettings?.commissionRate || 0) / 100)))
                                          });
                                          await addDoc(collection(db, 'kuku_wallet'), {
                                            userId: payment.targetId,
                                            userName: 'Doctor',
                                            amount: payment.amount * (1 - ((systemSettings?.commissionRate || 0) / 100)),
                                            type: 'consultation',
                                            status: 'approved',
                                            description: `Malipo ya ushauri kutoka kwa ${payment.userName}`,
                                            date: new Date().toISOString().split('T')[0],
                                            createdAt: serverTimestamp()
                                          });
                                        }
                                      } else if (payment.actionType === 'top_doctor_subscription') {
                                        if (payment.targetId) {
                                          await updateDoc(doc(db, 'kuku_users', payment.targetId), {
                                            isTopDoctor: true,
                                            topDoctorExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                                          });
                                        }
                                      } else if (payment.actionType === 'auction_payment') {
                                        if (payment.extraData?.auctionId) {
                                          // Update auction payment status
                                          await updateDoc(doc(db, 'kuku_auctions', payment.extraData.auctionId), {
                                            paymentStatus: 'paid',
                                            paidAt: serverTimestamp()
                                          });

                                          // Create order
                                          const orderData = {
                                            userId: payment.userId,
                                            userName: payment.userName,
                                            userContact: payment.userPhone,
                                            userWA: payment.userPhone,
                                            payPhone: payment.senderPhone,
                                            vendorId: payment.extraData.vendorId,
                                            vendorName: payment.extraData.vendorName,
                                            productId: payment.extraData.auctionId,
                                            productPrice: payment.amount,
                                            qty: 1,
                                            total: payment.amount,
                                            payMethod: payment.network,
                                            senderName: payment.senderName,
                                            transactionId: payment.id,
                                            sentAmount: payment.amount.toString(),
                                            status: 'pending',
                                            items: [{
                                              name: `MNADA: ${payment.extraData.productName}`,
                                              qty: 1,
                                              price: payment.amount,
                                              emoji: '🏆',
                                              image: payment.extraData.image || ''
                                            }],
                                            date: new Date().toLocaleString(),
                                            createdAt: new Date().toISOString(),
                                            serverCreatedAt: serverTimestamp()
                                          };

                                          await addDoc(collection(db, 'kuku_orders'), orderData);
                                        }
                                      }
                                      
                                      toast.success('Malipo yameidhinishwa kikamilifu.');
                                    } catch (error) {
                                      handleFirestoreError(error, OperationType.UPDATE, `kuku_manual_payments/${payment.id}`);
                                      toast.error('Hitilafu imetokea.');
                                    }
                                  }}
                                  className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
                                  title="Idhinisha"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm('Je, una uhakika unataka kukataa malipo haya?')) return;
                                    try {
                                      await updateDoc(doc(db, 'kuku_manual_payments', payment.id), { status: 'rejected' });
                                      toast.success('Malipo yamekataliwa.');
                                    } catch (error) {
                                      handleFirestoreError(error, OperationType.UPDATE, `kuku_manual_payments/${payment.id}`);
                                      toast.error('Hitilafu imetokea.');
                                    }
                                  }}
                                  className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                                  title="Kataa"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'wallet' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h2 className="text-3xl font-black text-slate-900">Usimamizi wa Wallet</h2>
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={syncWallets}
                  disabled={isSyncing}
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> {isSyncing ? 'SYNCING...' : 'SYNC WALLETS'}
                </button>
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
                    <div key={tx.id} className="bg-white dark:bg-slate-900 rounded-[24px] md:rounded-[32px] border border-slate-100 dark:border-slate-800 p-5 md:p-8 shadow-sm">
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
                    <div key={w.id} className="bg-white dark:bg-slate-900 rounded-[24px] md:rounded-[32px] border border-slate-100 dark:border-slate-800 p-5 md:p-8 shadow-sm">
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

            <div className="bg-white rounded-[32px] border border-slate-100 overflow-x-auto scrollbar-hide">
              <table className="w-full text-left min-w-[600px]">
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
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
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
                <div key={cat.id} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
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

        {activeTab === 'announcements' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Matangazo & Ujumbe</h2>
            <p className="text-slate-500 mb-10">Tuma ujumbe, promo codes, au taarifa muhimu kwa watumiaji wako.</p>

            <div className="bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 md:p-10 shadow-sm">
              <form onSubmit={handleSendAnnouncement} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Aina ya Ujumbe</label>
                    <select
                      value={announcementForm.type}
                      onChange={(e) => setAnnouncementForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                    >
                      <option value="in-app">Ndani ya App (In-App Notification)</option>
                      {user?.role === 'admin' && <option value="whatsapp">WhatsApp (Mtu Mmoja Tu)</option>}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mpokeaji</label>
                    <select
                      value={announcementForm.target}
                      onChange={(e) => setAnnouncementForm(prev => ({ ...prev, target: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                    >
                      <option value="all">Watumiaji Wote</option>
                      {user?.role === 'admin' && (
                        <>
                          <optgroup label="Wauzaji">
                            {vendors.map(v => (
                              <option key={v.id} value={v.id}>{v.shopName || v.name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Wateja">
                            {users.filter(u => u.role !== 'vendor' && u.role !== 'admin').map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </optgroup>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {announcementForm.type === 'in-app' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Kichwa cha Habari</label>
                      <input 
                        type="text"
                        value={announcementForm.title}
                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                        placeholder="Mfn: Punguzo la 20% Leo!"
                        required={announcementForm.type === 'in-app'}
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Picha (Link) - Sio Lazima</label>
                        <input 
                          type="url"
                          value={announcementForm.image}
                          onChange={(e) => setAnnouncementForm(prev => ({ ...prev, image: e.target.value }))}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                          placeholder="Mfn: https://example.com/picha.jpg"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Link (URL) - Sio Lazima</label>
                        <input 
                          type="url"
                          value={announcementForm.link}
                          onChange={(e) => setAnnouncementForm(prev => ({ ...prev, link: e.target.value }))}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                          placeholder="Mfn: https://example.com"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ujumbe</label>
                  <textarea 
                    value={announcementForm.message}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm min-h-[150px] resize-none"
                    placeholder="Andika ujumbe wako hapa..."
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSendingAnnouncement}
                  className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-amber-700"
                >
                  {isSendingAnnouncement ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={20} />
                      TUMA UJUMBE
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'offers' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Ofa & Coupons</h2>
            <p className="text-slate-500 mb-10">Tengeneza ofa maalum kwa ajili ya bidhaa zako.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                <div className="bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 md:p-10 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 md:mb-8">Tengeneza Ofa Mpya</h3>
                  <form onSubmit={handleSendOffer} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Kichwa cha Ofa</label>
                      <input 
                        type="text"
                        value={offerForm.title}
                        onChange={(e) => setOfferForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                        placeholder="Mfn: Punguzo la Sikukuu!"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ujumbe wa Ofa</label>
                      <textarea 
                        value={offerForm.message}
                        onChange={(e) => setOfferForm(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm min-h-[120px] resize-none"
                        placeholder="Elezea ofa yako hapa..."
                        required
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Picha (URL)</label>
                        <input 
                          type="url"
                          value={offerForm.image}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, image: e.target.value }))}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tarehe ya Kuisha (Sio Lazima)</label>
                        <input 
                          type="datetime-local"
                          value={offerForm.expiryDate}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Chagua Bidhaa (Zote kama hujaweka)</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[200px] overflow-y-auto p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                        {products.filter(p => user?.role === 'admin' || p.vendorId === user?.id).map(p => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox"
                              checked={offerForm.productIds.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setOfferForm(prev => ({ ...prev, productIds: [...prev.productIds, p.id] }));
                                } else {
                                  setOfferForm(prev => ({ ...prev, productIds: prev.productIds.filter(id => id !== p.id) }));
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 truncate">{p.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSendingOffer}
                      className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-amber-700"
                    >
                      {isSendingOffer ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Tag size={20} />
                          TUMA OFA
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-900">Ofa Zinazoendelea</h3>
                <div className="space-y-4">
                  {offers.filter(o => user?.role === 'admin' || o.vendorId === user?.id).length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold">Hakuna ofa kwa sasa</p>
                    </div>
                  ) : (
                    offers.filter(o => user?.role === 'admin' || o.vendorId === user?.id).map(offer => (
                      <div key={offer.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm relative group overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                              <Tag size={16} />
                            </div>
                            <h4 className="font-black text-slate-900">{offer.title}</h4>
                          </div>
                          <button 
                            onClick={async () => {
                              if (confirm('Futa ofa hii?')) {
                                await deleteDoc(doc(db, 'kuku_offers', offer.id));
                                toast.success('Ofa imefutwa');
                              }
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{offer.message}</p>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-400">Bidhaa: {offer.productIds.length === 0 ? 'Zote' : offer.productIds.length}</span>
                          {offer.expiryDate && (
                            <span className={cn(
                              "px-2 py-1 rounded-lg",
                              new Date(offer.expiryDate) < new Date() ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
                            )}>
                              {new Date(offer.expiryDate) < new Date() ? 'Imeisha' : `Mwisho: ${new Date(offer.expiryDate).toLocaleDateString()}`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'academy' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white">Farm Academy</h2>
                <p className="text-sm text-slate-500">Elimu ya Kilimo na Masoko kwa Wakulima.</p>
              </div>
              <button 
                onClick={() => {
                  setEditingPost(null);
                  setAcademyForm({ title: '', content: '', image: '', category: 'livestock' });
                  setIsAcademyModalOpen(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <BookOpen size={20} />
                ANDIKA MAKALA MPYA
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {academyPosts.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-[40px] p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">📚</div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Hakuna Makala Bado</h3>
                    <p className="text-slate-500 max-w-xs mx-auto">Anza kwa kuandika makala ya kwanza ya elimu ya kilimo hapa.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {academyPosts.map(post => (
                      <div key={post.id} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm group">
                        {post.image && (
                          <div className="h-48 overflow-hidden">
                            <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                        )}
                        <div className="p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                              {post.category}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(post.createdAt?.seconds * 1000).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2 line-clamp-2">{post.title}</h4>
                          <p className="text-sm text-slate-500 line-clamp-3 mb-6">{post.content}</p>
                          <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                            <button 
                              onClick={() => {
                                setEditingPost(post);
                                setAcademyForm({
                                  title: post.title,
                                  content: post.content,
                                  image: post.image || '',
                                  category: post.category
                                });
                                setIsAcademyModalOpen(true);
                              }}
                              className="text-xs font-black text-amber-600 hover:text-amber-700 flex items-center gap-1"
                            >
                              <FileText size={14} />
                              HARIRI
                            </button>
                            <button 
                              onClick={() => deleteAcademyPost(post.id)}
                              className="text-xs font-black text-red-500 hover:text-red-600 flex items-center gap-1"
                            >
                              <Trash2 size={14} />
                              FUTA
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="bg-amber-600 rounded-[40px] p-10 text-white shadow-xl shadow-amber-600/20">
                  <h3 className="text-xl font-black mb-4">Takwimu za Academy</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-100 font-bold">Jumla ya Makala</span>
                      <span className="text-3xl font-black">{academyPosts.length}</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="space-y-4">
                      {['livestock', 'crops', 'marketing', 'general'].map(cat => (
                        <div key={cat} className="flex items-center justify-between text-sm">
                          <span className="text-amber-100 font-bold capitalize">{cat}</span>
                          <span className="font-black">{academyPosts.filter(p => p.category === cat).length}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2">Mipangilio ya Mfumo</h2>
            <p className="text-sm text-slate-500 mb-6 md:mb-10">Weka funguo za ImageKit na Firebase hapa. Mabadiliko yataathiri mfumo mzima.</p>

            <div className="space-y-6 md:space-y-8">
              {/* Branding Section */}
              <div className="bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 md:p-10 shadow-sm">
                <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
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
                      placeholder="Digital Livestock Market Live"
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
                  <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="font-black text-slate-900">Theme Color</h4>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { id: 'amber', class: 'bg-amber-500' },
                        { id: 'blue', class: 'bg-blue-500' },
                        { id: 'emerald', class: 'bg-emerald-500' },
                        { id: 'purple', class: 'bg-purple-500' },
                        { id: 'rose', class: 'bg-rose-500' },
                        { id: 'slate', class: 'bg-slate-500' }
                      ].map(color => (
                        <button
                          key={color.id}
                          onClick={() => setLocalSettings(prev => ({ ...prev, themeColor: color.id }))}
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                            localSettings.themeColor === color.id ? "ring-4 ring-offset-2 ring-slate-900 scale-110" : "hover:scale-105",
                            color.class
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* QR Code Settings */}
                  <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="font-black text-slate-900 flex items-center gap-2">
                      <QrCode size={20} className="text-amber-500" />
                      Muonekano wa QR Code
                    </h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rangi ya QR Code (Hex)</label>
                        <div className="flex gap-2">
                          <input 
                            type="color"
                            value={localSettings.qrColor || '#000000'}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, qrColor: e.target.value }))}
                            className="w-14 h-14 rounded-xl cursor-pointer border-0 p-0"
                          />
                          <input 
                            type="text"
                            value={localSettings.qrColor || '#000000'}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, qrColor: e.target.value }))}
                            className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Logo ya QR Code (URL)</label>
                        <input 
                          type="text"
                          value={localSettings.qrLogo || ''}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, qrLogo: e.target.value }))}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                          placeholder="https://link.to/logo.png"
                        />
                        <p className="text-[10px] text-slate-400 font-bold px-2 italic">
                          * Picha itawekwa katikati ya QR Code
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <div>
                        <h4 className="font-black text-slate-900">Maintenance Mode</h4>
                        <p className="text-sm text-slate-500 mt-1">Washa hii kuzuia watumiaji na wauzaji kuingia kwenye mfumo (Admin pekee ndio wataweza kuingia).</p>
                      </div>
                      <button
                        onClick={() => setLocalSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                        className={cn(
                          "relative w-16 h-8 rounded-full transition-colors",
                          localSettings.maintenanceMode ? "bg-red-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform",
                          localSettings.maintenanceMode ? "translate-x-8" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Streaming & Shopping Settings */}
              <div className="bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 md:p-10 shadow-sm">
                <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                    <Video size={18} />
                  </div>
                  Live Streaming & Shopping (ZegoCloud)
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ZegoCloud App ID</label>
                    <input 
                      type="text"
                      value={localSettings.zego_app_id}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, zego_app_id: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="e.g. 123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ZegoCloud Server Secret</label>
                    <input 
                      type="password"
                      value={localSettings.zego_server_secret}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, zego_server_secret: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="Weka Server Secret hapa"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-slate-400 italic">
                      * Funguo hizi zinahitajika kwa ajili ya Live Shopping na Live Auction Streaming. Unaweza kuzipata kwenye ZegoCloud Console.
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial & Withdrawal Settings */}
              <div className="bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 md:p-10 shadow-sm">
                <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                    <DollarSign size={18} />
                  </div>
                  Malipo na Kamisheni (Payments & Commissions)
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Kamisheni ya Mauzo (%)</label>
                    <input 
                      type="number"
                      value={localSettings.commissionRate || 0}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="Mf. 5 kwa 5%"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ada ya Top Doctor kwa Mwezi ({currency})</label>
                    <input 
                      type="number"
                      value={localSettings.topDoctorFee || 0}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, topDoctorFee: Number(e.target.value) }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="Mf. 15000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ada ya Muuzaji (Mwezi) ({currency})</label>
                    <input 
                      type="number"
                      value={localSettings.vendorSubscriptionMonthly || 0}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, vendorSubscriptionMonthly: Number(e.target.value) }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="Mf. 10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ada ya Muuzaji (Mwaka) ({currency})</label>
                    <input 
                      type="number"
                      value={localSettings.vendorSubscriptionYearly || 0}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, vendorSubscriptionYearly: Number(e.target.value) }))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="Mf. 100000"
                    />
                  </div>

                  <div className="md:col-span-2 pt-4 border-t border-slate-100">
                    <h4 className="font-black text-slate-900 mb-4">Namba za Malipo (Mitandao ya Simu)</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="text-[10px] font-black text-green-600 uppercase tracking-widest">M-Pesa</label>
                        <input 
                          type="text" placeholder="Namba (Mf. 075...)"
                          value={localSettings.paymentMethods?.mpesa?.number || ''}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, paymentMethods: { ...prev.paymentMethods, mpesa: { ...prev.paymentMethods?.mpesa, number: e.target.value, name: prev.paymentMethods?.mpesa?.name || '' } } }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-amber-500 text-sm mb-2"
                        />
                        <input 
                          type="text" placeholder="Jina la Akaunti"
                          value={localSettings.paymentMethods?.mpesa?.name || ''}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, paymentMethods: { ...prev.paymentMethods, mpesa: { ...prev.paymentMethods?.mpesa, name: e.target.value, number: prev.paymentMethods?.mpesa?.number || '' } } }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-amber-500 text-sm"
                        />
                      </div>
                      <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Tigo Pesa</label>
                        <input 
                          type="text" placeholder="Namba (Mf. 065...)"
                          value={localSettings.paymentMethods?.tigopesa?.number || ''}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, paymentMethods: { ...prev.paymentMethods, tigopesa: { ...prev.paymentMethods?.tigopesa, number: e.target.value, name: prev.paymentMethods?.tigopesa?.name || '' } } }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-amber-500 text-sm mb-2"
                        />
                        <input 
                          type="text" placeholder="Jina la Akaunti"
                          value={localSettings.paymentMethods?.tigopesa?.name || ''}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, paymentMethods: { ...prev.paymentMethods, tigopesa: { ...prev.paymentMethods?.tigopesa, name: e.target.value, number: prev.paymentMethods?.tigopesa?.number || '' } } }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-amber-500 text-sm"
                        />
                      </div>
                      <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="text-[10px] font-black text-red-600 uppercase tracking-widest">Airtel Money</label>
                        <input 
                          type="text" placeholder="Namba (Mf. 068...)"
                          value={localSettings.paymentMethods?.airtel?.number || ''}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, paymentMethods: { ...prev.paymentMethods, airtel: { ...prev.paymentMethods?.airtel, number: e.target.value, name: prev.paymentMethods?.airtel?.name || '' } } }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-amber-500 text-sm mb-2"
                        />
                        <input 
                          type="text" placeholder="Jina la Akaunti"
                          value={localSettings.paymentMethods?.airtel?.name || ''}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, paymentMethods: { ...prev.paymentMethods, airtel: { ...prev.paymentMethods?.airtel, name: e.target.value, number: prev.paymentMethods?.airtel?.number || '' } } }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-amber-500 text-sm"
                        />
                      </div>
                      <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest">HaloPesa</label>
                        <input 
                          type="text" placeholder="Namba (Mf. 062...)"
                          value={localSettings.paymentMethods?.halopesa?.number || ''}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, paymentMethods: { ...prev.paymentMethods, halopesa: { ...prev.paymentMethods?.halopesa, number: e.target.value, name: prev.paymentMethods?.halopesa?.name || '' } } }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-amber-500 text-sm mb-2"
                        />
                        <input 
                          type="text" placeholder="Jina la Akaunti"
                          value={localSettings.paymentMethods?.halopesa?.name || ''}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, paymentMethods: { ...prev.paymentMethods, halopesa: { ...prev.paymentMethods?.halopesa, name: e.target.value, number: prev.paymentMethods?.halopesa?.number || '' } } }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-amber-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-4 border-t border-slate-100 grid md:grid-cols-2 gap-6">
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
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Points Per 1000 TZS Spent</label>
                      <input 
                        type="number"
                        value={localSettings.pointsPerOrder}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, pointsPerOrder: Number(e.target.value) }))}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Value of 1 Point (in TZS)</label>
                      <input 
                        type="number"
                        value={localSettings.pointsValue}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, pointsValue: Number(e.target.value) }))}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      />
                    </div>
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
                <div className="mt-6 flex justify-start">
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/test-firebase');
                        const data = await res.json();
                        if (res.ok) {
                          toast.success(`Imeunganishwa! Project: ${data.projectId}`);
                        } else {
                          toast.error(`Hitilafu: ${data.message || 'Unknown error'}`);
                        }
                      } catch (err: any) {
                        toast.error(`Imeshindwa kuunganisha: ${err.message}`);
                      }
                    }}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-slate-800 transition-all flex items-center gap-2"
                  >
                    <Globe size={16} /> JARIBU MUUNGANISHO WA FIREBASE
                  </button>
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
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Wallet Balance ({currency})</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                    defaultValue={editingItem.data.walletBalance || 0}
                    onBlur={async (e) => {
                      const newBalance = Number(e.target.value);
                      if (newBalance !== editingItem.data.walletBalance) {
                        await updateDoc(doc(db, 'kuku_users', editingItem.data.id), { walletBalance: newBalance });
                        
                        // Record transaction
                        await addDoc(collection(db, 'kuku_wallet'), {
                          userId: editingItem.data.id,
                          userName: editingItem.data.name,
                          amount: newBalance - (editingItem.data.walletBalance || 0),
                          type: 'adjustment',
                          status: 'approved',
                          description: 'Admin balance adjustment',
                          date: new Date().toISOString().split('T')[0],
                          createdAt: serverTimestamp()
                        });
                        
                        toast.success('Salio limesasishwa');
                      }
                    }}
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
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      defaultValue={editingItem.data.price}
                      onBlur={async (e) => {
                        await updateDoc(doc(db, 'kuku_products', editingItem.data.id), { price: Number(e.target.value) });
                        toast.success('Bei imebadilishwa');
                      }}
                      className="input-field flex-1" 
                    />
                    <button 
                      onClick={async () => {
                        setIsSuggestingPrice(true);
                        try {
                          const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
                          if (!apiKey) throw new Error("API Key haipatikani");
                          const ai = new GoogleGenAI({ apiKey });
                          const response = await ai.models.generateContent({
                            model: "gemini-3-flash-preview",
                            contents: `Wewe ni mtaalamu wa masoko ya kilimo Tanzania. Pendekeza bei ya wastani (kwa TZS) ya bidhaa hii: ${editingItem.data.name} katika kategoria ya ${editingItem.data.category}. Toa namba pekee (kama 5000), bila maelezo mengine.`,
                          });

                          const suggestedPrice = parseInt(response.text.replace(/[^0-9]/g, ''));
                          if (suggestedPrice) {
                            await updateDoc(doc(db, 'kuku_products', editingItem.data.id), { price: suggestedPrice });
                            toast.success(`AI Imependekeza bei ya ${suggestedPrice.toLocaleString()} TZS`);
                            // We need to refresh the UI, since we're using defaultValue
                            setEditingItem(prev => prev ? { ...prev, data: { ...prev.data, price: suggestedPrice } } : null);
                          } else {
                            toast.error('AI imeshindwa kutoa bei kwa sasa');
                          }
                        } catch (error) {
                          console.error('AI Error:', error);
                          toast.error('Hitilafu katika AI');
                        } finally {
                          setIsSuggestingPrice(false);
                        }
                      }}
                      disabled={isSuggestingPrice}
                      className="p-3 bg-amber-100 text-amber-600 rounded-xl hover:bg-amber-200 transition-colors flex items-center justify-center"
                      title="AI Price Suggestion"
                    >
                      {isSuggestingPrice ? <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={18} />}
                    </button>
                  </div>
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

      {/* Academy Modal */}
      <Modal isOpen={isAcademyModalOpen} onClose={() => setIsAcademyModalOpen(false)} title={editingPost ? "Hariri Makala" : "Andika Makala Mpya"}>
        <form onSubmit={handleSaveAcademy} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kichwa cha Habari (Title)</label>
            <input 
              type="text"
              value={academyForm.title}
              onChange={e => setAcademyForm({...academyForm, title: e.target.value})}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-amber-500 transition-all"
              placeholder="Mf: Jinsi ya Kufuga Kuku wa Kienyeji"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kategoria</label>
            <select 
              value={academyForm.category}
              onChange={e => setAcademyForm({...academyForm, category: e.target.value as any})}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-amber-500 transition-all"
            >
              <option value="livestock">Ufugaji (Livestock)</option>
              <option value="crops">Kilimo (Crops)</option>
              <option value="marketing">Masoko (Marketing)</option>
              <option value="general">Mengineyo (General)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Picha ya Makala (URL)</label>
            <input 
              type="text"
              value={academyForm.image}
              onChange={e => setAcademyForm({...academyForm, image: e.target.value})}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-amber-500 transition-all"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Maelezo (Content)</label>
            <textarea 
              value={academyForm.content}
              onChange={e => setAcademyForm({...academyForm, content: e.target.value})}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-amber-500 transition-all min-h-[200px]"
              placeholder="Andika maelezo ya kina hapa..."
            />
          </div>
          <button 
            type="submit"
            disabled={isSendingAcademy}
            className="w-full py-4 bg-amber-500 text-amber-950 rounded-2xl font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isSendingAcademy ? (
              <div className="w-5 h-5 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} />
                {editingPost ? "HIFADHI MABADILIKO" : "CHAPISHA MAKALA"}
              </>
            )}
          </button>
        </form>
      </Modal>

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
          { id: 'over', label: 'Dash', icon: LayoutDashboard },
          { id: 'orders', label: 'Oda', icon: ClipboardList },
          { id: 'wallet', label: 'Wallet', icon: Wallet },
          { id: 'more', label: 'Zaidi', icon: Menu },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'more') {
                setIsDrawerOpen(true);
              } else {
                setActiveTab(item.id as any);
              }
            }}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === item.id ? "text-amber-400 scale-110" : "text-amber-100/40"
            )}
          >
            <div className="relative">
              <item.icon size={22} />
              {item.id === 'orders' && orders.filter(o => o.status === 'pending').length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
      {/* QR Scanner */}
      <AnimatePresence>
        {isScannerOpen && (
          <QRScanner 
            onScan={handleScan} 
            onClose={() => setIsScannerOpen(false)} 
            title="Skani Risiti au Bidhaa"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

