import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { User, Product, Order, Activity, Withdrawal, ProductUnit, WithdrawalStatus, Auction } from '../types';
import { IKContext, IKUpload } from 'imagekitio-react';
import { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT, IMAGEKIT_AUTH_ENDPOINT, isImageKitConfigured } from '../services/imageKitService';
import { Modal } from '../components/Modal';
import { NotificationsModal } from '../components/NotificationsModal';
import LiveStreamModal from '../components/LiveStreamModal';
import { DAYS, ADMIN_WA } from '../constants';
import { formatCurrency, generateId } from '../utils';
import QRCode from 'react-qr-code';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
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
  Settings,
  ShieldCheck,
  Bell,
  Menu,
  X,
  Sparkles,
  Tag,
  FileText,
  ShoppingBag,
  QrCode,
  Syringe,
  Video,
  Trophy
} from 'lucide-react';
import { cn } from '../utils';

import { db, auth } from '../services/firebase';
import { updatePassword } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  increment,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export const VendorPortal: React.FC = () => {
  const { user, products, orders, auctions, withdrawals, statuses, categories, reviews, logout, addActivity, addNotification, systemSettings, theme, setTheme, language, setLanguage, setView, t, walletTransactions, notifications, offers, livestockHealthRecords } = useApp();
  const currency = systemSettings?.currency || 'TZS';
  const unreadNotifications = notifications.filter(n => (n.userId === 'all' || n.userId === user?.id) && !n.readBy?.includes(user?.id || '')).length;
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dash' | 'products' | 'orders' | 'wallet' | 'settings' | 'status' | 'reviews' | 'auctions' | 'offers'>('dash');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrAmount, setQrAmount] = useState<string>('');
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [selectedProductQR, setSelectedProductQR] = useState<Product | null>(null);
  const [isProductQRModalOpen, setIsProductQRModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [selectedProductHealth, setSelectedProductHealth] = useState<Product | null>(null);
  const [isAddHealthModalOpen, setIsAddHealthModalOpen] = useState(false);
  const [newHealthRecord, setNewHealthRecord] = useState({
    type: 'vaccination' as 'vaccination' | 'treatment' | 'checkup',
    title: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    performedBy: ''
  });
  const [isProcessingOfflinePayment, setIsProcessingOfflinePayment] = useState(false);
  const [offlinePaymentData, setOfflinePaymentData] = useState<{ userId: string, amount: number, timestamp: number } | null>(null);

  // Low Stock Alerts
  const lowStockProducts = products.filter(p => p.vendorId === user?.id && p.stock <= (p.lowStockThreshold || 5));

  useEffect(() => {
    if (lowStockProducts.length > 0 && user) {
      lowStockProducts.forEach(p => {
        // Only notify once per session or use a more robust logic
        const notifiedKey = `notified_low_stock_${p.id}`;
        if (!sessionStorage.getItem(notifiedKey)) {
          toast(`Bidhaa "${p.name}" inakaribia kuisha! (Zimebaki ${p.stock})`, {
            icon: '⚠️',
            duration: 5000
          });
          sessionStorage.setItem(notifiedKey, 'true');
        }
      });
    }
  }, [lowStockProducts.length]);
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
  const [liveStreamAuctionId, setLiveStreamAuctionId] = useState<string | null>(null);
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const [productImageSource, setProductImageSource] = useState<'upload' | 'link'>('link');
  const [auctionImageSource, setAuctionImageSource] = useState<'upload' | 'link'>('link');
  const [editProductImageSource, setEditProductImageSource] = useState<'upload' | 'link'>('link');
  const [withdrawStep, setWithdrawStep] = useState<'form' | 'summary' | 'whatsapp'>('form');
  const [lastWithdrawalId, setLastWithdrawalId] = useState<string | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
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

  // Compute wallet data directly from context
  const walletData = React.useMemo(() => {
    if (!user) return { balance: 0, pendingBalance: 0, transactions: [] };
    const vendorTransactions = walletTransactions
      .filter(t => t.userId === user.id)
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 50);
      
    const pendingBalance = orders
      .filter(o => o.vendorId === user.id && o.payMethod === 'wallet' && o.status !== 'completed')
      .reduce((sum, order) => sum + (order.vendorNet || (order.total - (order.deliveryFee || 0)) * 0.94), 0);

    return {
      balance: user.walletBalance || 0,
      pendingBalance,
      transactions: vendorTransactions
    };
  }, [user, walletTransactions, orders]);

  const fetchWallet = async () => {
    // No-op since we compute it directly
  };

  useEffect(() => {
    // No-op
  }, [activeTab, user]);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const [lastOrderCount, setLastOrderCount] = useState(0);

  useEffect(() => {
    const autoRestartRoomId = sessionStorage.getItem('autoRestartLive');
    if (autoRestartRoomId) {
      sessionStorage.removeItem('autoRestartLive');
      setLiveStreamAuctionId(autoRestartRoomId);
    }
  }, []);

  useEffect(() => {
    const vendorOrders = orders.filter(o => o.vendorId === user?.id);
    if (vendorOrders.length > lastOrderCount && lastOrderCount !== 0) {
      const latestOrder = vendorOrders[0];
      // If it's paid or pending payment confirmation
      if (latestOrder.paymentApproved || latestOrder.payMethod !== 'cash') {
        setNewOrderAlert(latestOrder);
        // Play a more urgent sound for new orders
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.8;
          audio.play().catch(e => console.log("Audio play blocked:", e));
        } catch (e) {
          console.error("Audio error:", e);
        }
      }
    }
    setLastOrderCount(vendorOrders.length);
  }, [orders, user?.id]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Nywila hazilingani!');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Nywila lazima iwe na angalau herufi 6!');
      return;
    }

    setIsPasswordLoading(true);
    try {
      const fbUser = auth.currentUser;
      if (fbUser) {
        await updatePassword(fbUser, passwordForm.newPassword);
        toast.success('Nywila imebadilishwa kikamilifu!');
        setIsPasswordModalOpen(false);
        setPasswordForm({ newPassword: '', confirmPassword: '' });
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Tafadhali toka na uingie tena ili kubadilisha nywila kwa usalama.');
      } else {
        toast.error(error.message || 'Imeshindwa kubadilisha nywila');
      }
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const [shopSettings, setShopSettings] = useState({
    openTime: user.openTime || "08:00",
    closeTime: user.closeTime || "18:00",
    openDays: user.openDays || [],
    deliveryCity: user.deliveryCity || 3000,
    deliveryOut: user.deliveryOut || 7000,
    shopIcon: user.shopIcon || '',
    shopBanner: user.shopBanner || '',
  });
  const [isSuggestingPrice, setIsSuggestingPrice] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ price: number, reason: string } | null>(null);

  const [offerForm, setOfferForm] = useState({
    title: '',
    message: '',
    image: '',
    link: '',
    expiryDate: '',
    productIds: [] as string[]
  });
  const [isSendingOffer, setIsSendingOffer] = useState(false);

  const suggestPrice = async (form: any, setForm: any) => {
    if (!form.name || !form.category) {
      toast.error('Tafadhali weka jina na kategoria ya bidhaa kwanza');
      return;
    }

    setIsSuggestingPrice(true);
    setAiSuggestion(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key haipatikani");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Wewe ni mtaalamu wa masoko ya kilimo Tanzania. Pendekeza bei ya wastani (kwa TZS) ya bidhaa hii: ${form.name} katika kategoria ya ${form.category}. Toa jibu katika mfumo wa JSON pekee wenye muundo huu: {"price": 5000, "reason": "Maelezo mafupi ya kwanini bei hii inafaa sokoni kwa sasa."}`,
        config: {
          responseMimeType: "application/json"
        }
      });

      try {
        const result = JSON.parse(response.text);
        if (result.price && result.reason) {
          setAiSuggestion(result);
          toast.success('Ushauri wa AI umepatikana!');
        } else {
          toast.error('AI imeshindwa kutoa bei kwa sasa');
        }
      } catch (e) {
        toast.error('AI imeshindwa kutoa bei kwa sasa');
      }
    } catch (error) {
      console.error('AI Error:', error);
      toast.error('Hitilafu katika AI');
    } finally {
      setIsSuggestingPrice(false);
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
        productIds: []
      });
    } catch (error) {
      console.error('Error sending offer:', error);
      toast.error('Imeshindwa kutuma ofa');
    } finally {
      setIsSendingOffer(false);
    }
  };

  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
    category: 'mayai',
    unit: 'Piece' as ProductUnit,
    emoji: '🥚',
    image: '',
    desc: '',
    location: '',
    isLivestock: false,
    age: '',
    weight: '',
    gender: 'male' as 'male' | 'female' | 'other',
    breed: '',
    healthStatus: 'healthy' as 'healthy' | 'sick' | 'recovered',
    birthDate: '',
    tagNumber: ''
  });

  // Status State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusVideoUrl, setStatusVideoUrl] = useState('');
  const [statusMediaUrl, setStatusMediaUrl] = useState('');
  const [statusMediaType, setStatusMediaType] = useState<'image' | 'video' | null>(null);
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
            Asante kwa kujiunga na {systemSettings?.app_name || 'Digital Livestock Market Live'}! Admin anahakiki maelezo yako. 
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
    .filter(o => o.status === 'delivered' || o.status === 'completed')
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
      serverCreatedAt: serverTimestamp(),
      // Livestock fields
      isLivestock: newProduct.isLivestock,
      age: newProduct.age,
      weight: Number(newProduct.weight) || 0,
      gender: newProduct.gender,
      breed: newProduct.breed,
      healthStatus: newProduct.healthStatus,
      tagNumber: newProduct.tagNumber
    };

    try {
      await addDoc(collection(db, 'kuku_products'), productData);
      addActivity('📦', `Bidhaa mpya "${productData.name}" imeongezwa na ${user.shopName}`);
      setIsAddModalOpen(false);
      setNewProduct({ 
        name: '', price: '', stock: '', category: 'mayai', unit: 'Piece', emoji: '🥚', image: '', desc: '', location: '',
        isLivestock: false, age: '', weight: '', gender: 'male', breed: '', healthStatus: 'healthy', birthDate: '', tagNumber: ''
      });
      toast.success('Bidhaa imeongezwa!');
    } catch (error: any) {
      toast.error('Hitilafu wakati wa kuongeza bidhaa');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHealthRecord = async () => {
    if (!selectedProductHealth || !newHealthRecord.title) return;
    setLoading(true);

    const recordData = {
      productId: selectedProductHealth.id,
      type: newHealthRecord.type,
      title: newHealthRecord.title,
      date: newHealthRecord.date,
      notes: newHealthRecord.notes,
      performedBy: newHealthRecord.performedBy,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'kuku_livestock_health'), recordData);
      addActivity('🏥', `Rekodi ya afya "${recordData.title}" imeongezwa kwa ${selectedProductHealth.name}`);
      setIsAddHealthModalOpen(false);
      setNewHealthRecord({
        type: 'vaccination',
        title: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        performedBy: ''
      });
      toast.success('Rekodi imehifadhiwa!');
    } catch (error: any) {
      toast.error('Imeshindwa kuhifadhi rekodi');
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
      
      // Notify User
      await addNotification(
        'Update ya Oda! 📦',
        `Agizo lako #${order.id.substring(0,8)} sasa lipo katika hali ya: ${status.toUpperCase()}`,
        order.userId,
        'orders'
      );

      toast.success('Hali ya agizo imebadilishwa');

      // WhatsApp Template Logic
      let template = '';
      const orderId = order.id.substring(0,8);
      const itemName = order.items[0].name;
      const itemQty = order.items[0].qty;
      const shopName = user.shopName || user.name;

      if (status === 'processing') {
        template = `Habari *${order.userName}*, oda yako namba *#${orderId}* imeshapokelewa rasmi! 🐔\n\nHALI: Sasa hivi inaandaliwa.\nBIDHAA: *${itemName}* x ${itemQty}\nMUUZAJI: *${shopName}*\n\nTunafanya kazi kwa haraka ili mzigo wako uwe tayari. Utapata update mara tu itakapoanza safari. Asante kwa kutumia ${systemSettings?.app_name || 'Digital Livestock Market Live'}!`;
      } else if (status === 'waiting') {
        template = `Habari *${order.userName}*, oda yako *#${orderId}* imeshakamilika kuandaliwa na *${shopName}*! 📦\n\nHALI: Inasubiri msafirishaji aichukue.\nBIDHAA: *${itemName}*\n\nMsafirishaji akishachukua mzigo, utatumiwa namba yake ya simu kwa ajili ya mawasiliano zaidi. Kaa karibu na simu yako!`;
      } else if (status === 'onway') {
        template = `Habari *${order.userName}*, habari njema! Oda yako *#${orderId}* imeshatoka kuelekea kwako sasa hivi! 🚚💨\n\nMUUZAJI: *${shopName}*\nBIDHAA: *${itemName}* (${itemQty})\nHALI: Iko njiani (On the Way).\n\nUnaweza kufuatilia safari ya mzigo wako kupitia App ya ${systemSettings?.app_name || 'Digital Livestock Market Live'}. Mpokeaji awe tayari kupokea simu ya msafirishaji. Asante!`;
      } else if (status === 'delivered') {
        template = `Hongera *${order.userName}*! 🎊 Oda yako *#${orderId}* imeshawasilishwa kwako.\n\nMUHTASARI:\nBidhaa: *${itemName}*\nKutoka: *${shopName}*\n\nTunakuomba uingie kwenye App ya ${systemSettings?.app_name || 'Digital Livestock Market Live'} kuthibitisha kuwa umepokea mzigo ili muuzaji aweze kulipwa. Karibu tena!`;
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
      const method = withdrawForm.method === 'mobile' ? withdrawForm.network : 'Visa / Mastercard';
      const phone = withdrawForm.method === 'mobile' ? withdrawForm.phoneNumber : `${withdrawForm.bankName} - ${withdrawForm.accountNumber}`;
      const fee = calculateFee(amountNum);
      const netAmount = amountNum - fee;
      const vendorName = user.shopName || user.name || 'Vendor';

      const withdrawRef = await addDoc(collection(db, 'kuku_withdrawals'), {
        vendorId: user.id,
        vendorName,
        amount: amountNum,
        fee,
        netAmount,
        method,
        phoneNumber: phone,
        status: 'Pending',
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'kuku_wallet'), {
        userId: user.id,
        userName: vendorName,
        type: 'withdrawal',
        amount: -amountNum,
        status: 'Pending',
        description: `Withdrawal to ${method} (${phone})`,
        createdAt: serverTimestamp(),
        withdrawalId: withdrawRef.id
      });

      await updateDoc(doc(db, 'kuku_users', user.id), {
        walletBalance: increment(-amountNum)
      });

      setLastWithdrawalId(withdrawRef.id);
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
        mediaUrl: statusMediaUrl,
        mediaType: statusMediaType,
        likes: [],
        comments: [],
        createdAt: serverTimestamp()
      });
      toast.success('Status imewekwa!');
      setStatusText('');
      setStatusVideoUrl('');
      setStatusMediaUrl('');
      setStatusMediaType(null);
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

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Volume
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1); // 100ms beep
    } catch (e) {
      console.error("Audio API not supported", e);
    }
  };

  const startQRScanner = () => {
    setIsQRScannerOpen(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("vendor-qr-reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.type === 'offline_pay' && data.userId && data.amount && data.timestamp) {
            // Check if QR is older than 10 minutes (600000 ms)
            if (Date.now() - data.timestamp > 600000) {
              toast.error('QR Code hii imeisha muda wake (Expired).');
              return;
            }
            
            // Success feedback
            playBeep();
            if (navigator.vibrate) {
              navigator.vibrate([200]);
            }
            
            setOfflinePaymentData({
              userId: data.userId,
              amount: data.amount,
              timestamp: data.timestamp
            });
            scanner.clear();
            setIsQRScannerOpen(false);
          } else {
            toast.error('QR Code isiyo sahihi kwa malipo haya');
          }
        } catch (e) {
          toast.error('QR Code isiyo sahihi');
        }
      }, (error) => {
        // console.warn(error);
      });
    }, 500);
  };

  const handleOfflinePayment = async () => {
    if (!user || !offlinePaymentData) return;
    
    setIsProcessingOfflinePayment(true);
    try {
      const customerDoc = await getDoc(doc(db, 'kuku_users', offlinePaymentData.userId));
      if (!customerDoc.exists()) {
        toast.error('Mteja hajapatikana');
        setIsProcessingOfflinePayment(false);
        return;
      }
      
      const customerData = customerDoc.data() as User;
      if ((customerData.walletBalance || 0) < offlinePaymentData.amount) {
        toast.error(`Salio la mteja halitoshi. Salio: ${formatCurrency(customerData.walletBalance || 0, systemSettings?.currency || 'TZS')}`);
        setIsProcessingOfflinePayment(false);
        setOfflinePaymentData(null);
        return;
      }

      const userRef = doc(db, 'kuku_users', offlinePaymentData.userId);
      const vendorRef = doc(db, 'kuku_users', user.id);
      
      // Deduct from customer
      await updateDoc(userRef, {
        walletBalance: increment(-offlinePaymentData.amount)
      });
      
      // Add to vendor
      await updateDoc(vendorRef, {
        walletBalance: increment(offlinePaymentData.amount)
      });

      // Record transaction
      const txRef = doc(collection(db, 'kuku_transactions'));
      await setDoc(txRef, {
        id: txRef.id,
        userId: offlinePaymentData.userId,
        type: 'payment',
        amount: offlinePaymentData.amount,
        status: 'completed',
        reference: `OFFLINE-QR-${Date.now()}`,
        description: `Malipo ya Offline QR kwa ${user.shopName}`,
        createdAt: serverTimestamp()
      });

      // Notify customer
      await addNotification(
        'Malipo ya Offline QR',
        `Umelipa TZS ${offlinePaymentData.amount.toLocaleString()} kwa ${user.shopName}`,
        offlinePaymentData.userId,
        'wallet'
      );

      toast.success(`Malipo ya ${formatCurrency(offlinePaymentData.amount, systemSettings?.currency || 'TZS')} yamefanikiwa!`);
      setOfflinePaymentData(null);
    } catch (error) {
      console.error('Offline Payment error:', error);
      toast.error('Hitilafu imetokea wakati wa malipo');
    } finally {
      setIsProcessingOfflinePayment(false);
    }
  };

  const isIKConfigured = isImageKitConfigured || (systemSettings?.imagekit_public_key && systemSettings?.imagekit_url_endpoint);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row pb-20 lg:pb-0 transition-colors duration-300">
      {/* QR Scanner Modal */}
      <Modal isOpen={isQRScannerOpen} onClose={() => setIsQRScannerOpen(false)} title="Scan QR Code ya Mteja (Offline)">
        <div id="vendor-qr-reader" className="w-full"></div>
        <p className="text-center text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest">Weka QR Code ya mteja ndani ya mraba</p>
      </Modal>

      {/* Offline Payment Confirmation Modal */}
      <Modal isOpen={!!offlinePaymentData} onClose={() => setOfflinePaymentData(null)} title="Thibitisha Malipo ya Offline">
        {offlinePaymentData && (
          <div className="flex flex-col items-center p-6">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
              <Wallet size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Pokea Malipo</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Kutoka kwenye Wallet ya Mteja</p>
            
            <div className="w-full space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Kiasi cha Kukatwa</label>
                <div className="text-4xl font-black text-emerald-600 dark:text-emerald-500">
                  {formatCurrency(offlinePaymentData.amount, systemSettings?.currency || 'TZS')}
                </div>
              </div>
            </div>

            <button 
              onClick={handleOfflinePayment}
              disabled={isProcessingOfflinePayment}
              className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isProcessingOfflinePayment ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  THIBITISHA NA POKEA
                </>
              )}
            </button>
          </div>
        )}
      </Modal>

      {/* QR Modal */}
      <Modal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} title="QR Code ya Malipo">
        <div className="flex flex-col items-center p-8">
          <div className="w-full mb-6">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Weka Kiasi Maalum (Si Lazima)</label>
            <input 
              type="number"
              value={qrAmount}
              onChange={(e) => setQrAmount(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-sm dark:text-white"
              placeholder={`Mfano: 5000`}
            />
            <p className="text-[10px] text-slate-400 font-bold px-2 italic mt-1">
              Ukiweka kiasi, mteja hatalazimika kuandika kiasi wakati wa kulipa.
            </p>
          </div>
          <div className="bg-white p-6 rounded-[40px] shadow-2xl mb-8 relative">
            <QRCode 
              value={JSON.stringify({ 
                type: 'payment', 
                vendorId: user?.id, 
                shopName: user?.shopName,
                amount: qrAmount ? Number(qrAmount) : undefined
              })} 
              size={200}
              level="H"
              fgColor={systemSettings?.qrColor || '#000000'}
            />
            {systemSettings?.qrLogo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white p-1 rounded-xl shadow-sm">
                  <img src={systemSettings.qrLogo} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
                </div>
              </div>
            )}
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{user?.shopName}</h3>
          <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
            Wateja wanaweza kuscan QR hii ili kukulipa moja kwa moja kupitia Wallet yao.
          </p>
          <button 
            onClick={() => window.print()}
            className="mt-8 w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black py-4 rounded-2xl transition-all active:scale-95"
          >
            PAKUA / CHAPISHA QR
          </button>
        </div>
      </Modal>

      {/* Product QR Modal */}
      <Modal 
        isOpen={isProductQRModalOpen} 
        onClose={() => setIsProductQRModalOpen(false)}
        title="QR Code ya Mfugo/Bidhaa"
      >
        <div className="p-8 flex flex-col items-center text-center">
          {selectedProductQR && (
            <>
              <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-emerald-500 mb-6">
                <QRCode 
                  value={`${window.location.origin}?productId=${selectedProductQR.id}`}
                  size={200}
                  level="H"
                />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{selectedProductQR.name}</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Scan code hii ili kuona maelezo ya mfugo huu au kununua moja kwa moja.
              </p>
              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => window.print()}
                  className="py-4 bg-slate-100 text-slate-900 rounded-2xl font-black flex items-center justify-center gap-2"
                >
                  <FileText size={20} /> PRINT
                </button>
                <button 
                  onClick={() => setIsProductQRModalOpen(false)}
                  className="py-4 bg-emerald-600 text-white rounded-2xl font-black"
                >
                  TAYARI
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Livestock Health History Modal */}
      <Modal 
        isOpen={isHealthModalOpen} 
        onClose={() => setIsHealthModalOpen(false)} 
        title="Historia ya Afya & Chanjo"
      >
        {selectedProductHealth && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-4xl">{selectedProductHealth.emoji}</div>
              <div>
                <h4 className="font-black text-slate-900">{selectedProductHealth.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tag: {selectedProductHealth.tagNumber || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest">Rekodi za Hivi Karibuni</h5>
                <button 
                  onClick={() => setIsAddHealthModalOpen(true)}
                  className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1"
                >
                  <Plus size={14} /> Ongeza Rekodi
                </button>
              </div>

              <div className="space-y-3">
                {livestockHealthRecords
                  .filter(r => r.productId === selectedProductHealth.id)
                  .length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Hakuna rekodi bado</p>
                    </div>
                  ) : (
                    livestockHealthRecords
                      .filter(r => r.productId === selectedProductHealth.id)
                      .map(record => (
                        <div key={record.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-start gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            record.type === 'vaccination' ? "bg-emerald-100 text-emerald-600" :
                            record.type === 'treatment' ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                          )}>
                            {record.type === 'vaccination' ? <Syringe size={18} /> : 
                             record.type === 'treatment' ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-black text-slate-900 truncate">{record.title}</p>
                              <span className="text-[9px] font-black text-slate-400 uppercase">{record.date}</span>
                            </div>
                            {record.notes && <p className="text-xs text-slate-500 line-clamp-2">{record.notes}</p>}
                            {record.performedBy && (
                              <p className="text-[9px] font-black text-emerald-600 uppercase mt-2">Daktari: {record.performedBy}</p>
                            )}
                          </div>
                        </div>
                      ))
                  )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Health Record Modal */}
      <Modal 
        isOpen={isAddHealthModalOpen} 
        onClose={() => setIsAddHealthModalOpen(false)} 
        title="Ongeza Rekodi ya Afya"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Aina ya Rekodi</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'vaccination', label: 'Chanjo', icon: Syringe },
                { id: 'treatment', label: 'Matibabu', icon: CheckCircle2 },
                { id: 'checkup', label: 'Uchunguzi', icon: FileText }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setNewHealthRecord({...newHealthRecord, type: t.id as any})}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                    newHealthRecord.type === t.id ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-100 bg-white text-slate-400"
                  )}
                >
                  <t.icon size={20} />
                  <span className="text-[10px] font-black uppercase">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Kichwa cha Habari</label>
            <input 
              type="text" 
              className="input-field"
              placeholder="Mf: Chanjo ya Gumboro"
              value={newHealthRecord.title}
              onChange={e => setNewHealthRecord({...newHealthRecord, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tarehe</label>
            <input 
              type="date" 
              className="input-field"
              value={newHealthRecord.date}
              onChange={e => setNewHealthRecord({...newHealthRecord, date: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Daktari / Mtaalamu (Hiari)</label>
            <input 
              type="text" 
              className="input-field"
              placeholder="Jina la daktari"
              value={newHealthRecord.performedBy}
              onChange={e => setNewHealthRecord({...newHealthRecord, performedBy: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Maelezo ya Ziada</label>
            <textarea 
              className="input-field resize-none"
              rows={3}
              placeholder="Weka maelezo zaidi hapa..."
              value={newHealthRecord.notes}
              onChange={e => setNewHealthRecord({...newHealthRecord, notes: e.target.value})}
            />
          </div>

          <button 
            onClick={handleAddHealthRecord}
            disabled={loading || !newHealthRecord.title}
            className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'HIFADHI REKODI'}
          </button>
        </div>
      </Modal>

      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      {/* Mobile Header */}
      <header className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-emerald-600 dark:text-emerald-500"
          >
            <Menu size={18} />
          </button>
          <h1 className="font-serif italic text-lg text-emerald-800 dark:text-emerald-500 font-bold">Vendor</h1>
        </div>
        <div className="flex items-center gap-2">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={unreadNotifications > 0 ? {
              rotate: [0, -10, 10, -10, 10, 0],
              transition: { repeat: Infinity, duration: 2, repeatDelay: 1 }
            } : {}}
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Bell size={18} />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
            )}
          </motion.button>
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

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={cn(
        "lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 z-[60] transition-transform duration-300 ease-out flex flex-col shadow-2xl border-r border-slate-100 dark:border-slate-800",
        isDrawerOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {systemSettings?.app_logo ? (
              <div className="w-8 h-8 rounded-xl overflow-hidden shadow-lg">
                <img src={systemSettings.app_logo} alt="Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <span className="text-2xl">🏪</span>
            )}
            <h1 className="font-serif italic text-lg text-emerald-800 dark:text-emerald-500 font-bold">Vendor Menu</h1>
          </div>
          <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: 'dash', label: 'Dashibodi', icon: LayoutDashboard },
            { id: 'products', label: 'Bidhaa Zangu', icon: Package },
            { id: 'auctions', label: 'Minada Live Yangu', icon: Gavel },
            { id: 'offers', label: 'Ofa & Coupons', icon: Tag },
            { id: 'orders', label: 'Maagizo', icon: ClipboardList },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
            { id: 'reviews', label: 'Maoni (Reviews)', icon: MessageSquare },
            { id: 'status', label: t('status'), icon: Camera },
            { id: 'settings', label: 'Mipangilio', icon: Clock },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setIsDrawerOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all",
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
          <button 
            onClick={() => setView('shop')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl text-sm font-black text-emerald-700 dark:text-emerald-500 transition-all border border-slate-100 dark:border-slate-800"
          >
            <ArrowLeft size={14} />
            {t('go_to_market')}
          </button>
        </div>
      </aside>

      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex-col sticky top-0 h-screen z-20">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {systemSettings?.app_logo ? (
                <div className="w-8 h-8 rounded-xl overflow-hidden shadow-lg">
                  <img src={systemSettings.app_logo} alt="Logo" className="w-full h-full object-cover" />
                </div>
              ) : (
                <span className="text-2xl">🏪</span>
              )}
              <h1 className="font-serif italic text-lg text-emerald-800 dark:text-emerald-500 font-bold">Vendor</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsNotificationsOpen(true)}
                className="relative p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-600 dark:text-slate-400"
              >
                <Bell size={16} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
                )}
              </button>
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
            { id: 'auctions', label: 'Minada Live Yangu', icon: Gavel },
            { id: 'offers', label: 'Ofa & Coupons', icon: Tag },
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
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
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
                <button 
                  onClick={() => setIsQRModalOpen(true)}
                  className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <Settings size={20} /> QR Yangu
                </button>
                <button 
                  onClick={startQRScanner}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-100 dark:shadow-none transition-all active:scale-95"
                >
                  <QrCode size={20} /> Scan Mteja
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

            {lowStockProducts.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="text-amber-600" />
                  <h3 className="font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest text-sm">Arifa za Akiba (Low Stock)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lowStockProducts.map(p => (
                    <div key={p.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-200 dark:border-amber-500/20 flex items-center justify-between">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white text-sm">{p.name}</p>
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Zimebaki {p.stock} {p.unit}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingProduct(p);
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 rounded-xl hover:bg-amber-200 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                <h3 className="font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-500" /> Uchambuzi wa Mauzo
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={myOrders.slice(-7).map(o => ({ date: o.date.split('-').slice(1).join('/'), amount: o.total }))}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: 900, marginBottom: '4px' }}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

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
                          setSelectedProductQR(p);
                          setIsProductQRModalOpen(true);
                        }}
                        className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-emerald-500 hover:bg-emerald-50 transition-colors"
                        title="Tengeneza QR Code"
                      >
                        <QrCode size={18} />
                      </button>
                      {p.isLivestock && (
                        <button 
                          onClick={() => {
                            setSelectedProductHealth(p);
                            setIsHealthModalOpen(true);
                          }}
                          className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Usimamizi wa Afya"
                        >
                          <Syringe size={18} />
                        </button>
                      )}
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
                        {myProducts.map(p => (
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
                  {offers.filter(o => o.vendorId === user?.id).length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold">Hakuna ofa kwa sasa</p>
                    </div>
                  ) : (
                    offers.filter(o => o.vendorId === user?.id).map(offer => (
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
                      disabled={order.status === 'completed'}
                      className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="pending">📋 Oda Imepokelewa</option>
                      <option value="processing">🔪 Inaandaliwa</option>
                      <option value="waiting">📦 Inasubiri Msafirishaji</option>
                      <option value="onway">🚚 Iko Njiani</option>
                      <option value="pickup">🏪 Tayari Kuchukua</option>
                      <option value="delivered">✅ Imefika!</option>
                      <option value="completed" disabled>🎉 Imekamilika</option>
                    </select>

                    <button 
                      onClick={() => {
                        const msg = `Habari *${order.userName}*, oda yako #${order.id.substring(0,8)} imebadilishwa hali kuwa *${order.status.toUpperCase()}*! 🐔\n\nAsante kwa kutumia ${systemSettings?.app_name || 'Digital Livestock Market Live'}!`;
                        window.open(`https://wa.me/${order.userContact?.replace(/\+/,'')}?text=${encodeURIComponent(msg)}`);
                      }}
                      className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-200 transition-all"
                    >
                      <Send size={14} /> WhatsApp Mteja
                    </button>

                    <button 
                      onClick={() => {
                        const date = new Date(order.createdAt).toLocaleString('sw-TZ');
                        const msg = `*RISITI YA MALIPO - KUKU APP* 🧾\n--------------------------------\n*Namba ya Agizo:* #${order.id.substring(0,8)}\n*Tarehe:* ${date}\n*Mteja:* ${order.userName}\n*Simu:* ${order.userContact}\n\n*BIDHAA:*\n${order.items.map((item: any) => `${item.qty}x ${item.name} @ ${formatCurrency(item.price, currency)}`).join('\n')}\n\n*Gharama ya Usafiri:* ${formatCurrency(order.deliveryFee, currency)}\n*Jumla Kuu:* *${formatCurrency(order.total, currency)}*\n*Njia ya Malipo:* ${order.payMethod.toUpperCase()}\n*Hali ya Malipo:* ${order.paymentApproved ? 'Imelipwa ✅' : 'Inasubiri ⏳'}\n\nAsante kwa kununua na Kuku App! 🐔`;
                        window.open(`https://wa.me/${order.userContact?.replace(/\+/,'')}?text=${encodeURIComponent(msg)}`);
                      }}
                      className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-900 transition-all"
                    >
                      <FileText size={14} /> Tuma Risiti
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
                {walletData.pendingBalance > 0 && (
                  <div className="mb-6 bg-emerald-700/50 rounded-xl p-4 inline-block">
                    <p className="text-emerald-200 text-[10px] font-black uppercase tracking-widest mb-1">Salio Linalosubiri (Pending)</p>
                    <p className="text-xl font-bold">{formatCurrency(walletData.pendingBalance, currency)}</p>
                  </div>
                )}
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
              <h2 className="text-3xl font-black text-slate-900">Minada Live Yangu</h2>
              <button onClick={() => setIsAuctionModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Plus size={20} /> Anza Mnada Live
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAuctions.map(a => (
                <div key={a.id} className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] border border-slate-100 dark:border-slate-800/50 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
                  <div className="aspect-square sm:aspect-[4/3] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-5xl relative overflow-hidden">
                    {a.image ? (
                      <img src={a.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      '🐄'
                    )}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {a.status === 'active' && (
                        <button 
                          onClick={() => setLiveStreamAuctionId(a.id)}
                          className="w-10 h-10 bg-emerald-500 shadow-lg rounded-xl flex items-center justify-center text-white hover:bg-emerald-600 transition-colors"
                          title="Nenda Live"
                        >
                          <Video size={18} />
                        </button>
                      )}
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
                        className="w-10 h-10 bg-white dark:bg-slate-800 shadow-lg rounded-xl flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteAuction(a.id)}
                        className="w-10 h-10 bg-white dark:bg-slate-800 shadow-lg rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="absolute top-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                      <Clock size={12} className="text-[#F59E0B]" />
                      <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                        {a.status === 'active' ? 'ACTIVE' : 'ENDED'}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    <h3 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white mb-1 line-clamp-1">{a.productName}</h3>
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-bold mb-6 line-clamp-1">{a.description}</p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-[#F8FAFC] dark:bg-slate-800/50 p-4 sm:p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">BEI YA KUANZIA</p>
                        <p className="text-xs font-black text-[#0F172A] dark:text-white uppercase mb-1">{currency}</p>
                        <p className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-white leading-none">{formatCurrency(a.startingPrice, currency).replace(currency, '').trim()}</p>
                      </div>
                      <div className="bg-[#FFFBEB] dark:bg-amber-900/10 p-4 sm:p-5 rounded-[24px] border border-amber-100 dark:border-amber-900/20 flex flex-col justify-center">
                        <p className="text-[9px] font-black text-[#D97706] uppercase tracking-widest mb-2">DAU LA SASA</p>
                        <p className="text-xs font-black text-[#92400E] dark:text-amber-500 uppercase mb-1">{currency}</p>
                        <p className="text-lg sm:text-xl font-black text-[#92400E] dark:text-amber-500 leading-none">{formatCurrency(a.currentBid, currency).replace(currency, '').trim()}</p>
                      </div>
                    </div>

                    {(a.highestBidderName || a.winnerName) && (
                      <div className="flex items-center gap-3 bg-[#E6F9F0] dark:bg-emerald-900/10 p-3 sm:p-4 rounded-[20px] sm:rounded-[24px] border border-emerald-100 dark:border-emerald-900/20 mt-auto">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#10B981] rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
                          <Trophy size={14} className="sm:w-5 sm:h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-[#059669] uppercase tracking-widest mb-0.5">
                            {a.status === 'ended' ? 'MSHINDI' : 'MWENYE DAU LA JUU'}
                          </p>
                          <p className="text-xs sm:text-sm font-black text-[#064E3B] dark:text-emerald-500 truncate">
                            {a.status === 'ended' ? (a.winnerName || 'No winner') : (a.highestBidderName || 'No bids')}
                          </p>
                        </div>
                      </div>
                    )}
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
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setLiveStreamAuctionId(`live_shopping_${user.id}`)}
                  className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-red-100 hover:scale-105 transition-transform active:scale-95 flex items-center gap-2 animate-pulse"
                >
                  <Video size={18} /> LIVE SHOPPING
                </button>
                <button 
                  onClick={() => setIsStatusModalOpen(true)}
                  className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-amber-100 hover:scale-105 transition-transform active:scale-95"
                >
                  {t('post_status')} +
                </button>
              </div>
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

              <div className="pt-6 space-y-4">
                <button 
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <ShieldCheck size={20} /> BADILISHA NYWILA (PASSWORD)
                </button>
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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pakia Picha au Video (Hiari)</label>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              {statusMediaUrl ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-black">
                  {statusMediaType === 'video' ? (
                    <video src={statusMediaUrl} className="w-full h-full object-cover" />
                  ) : (
                    <img src={statusMediaUrl} className="w-full h-full object-cover" />
                  )}
                  <button 
                    onClick={() => { setStatusMediaUrl(''); setStatusMediaType(null); }}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex-1">
                  <IKContext 
                    publicKey={systemSettings?.imagekit_public_key || IMAGEKIT_PUBLIC_KEY} 
                    urlEndpoint={systemSettings?.imagekit_url_endpoint || IMAGEKIT_URL_ENDPOINT} 
                    authenticator={async () => {
                      const res = await fetch(IMAGEKIT_AUTH_ENDPOINT);
                      return await res.json();
                    }}
                  >
                    <IKUpload
                      fileName={`status_${Date.now()}`}
                      onSuccess={(res) => {
                        setStatusMediaUrl(res.url);
                        setStatusMediaType(res.fileType === 'non-image' ? 'video' : 'image');
                        toast.success('File limepakiwa!');
                      }}
                      onError={(err) => toast.error('Imeshindwa kupakia file')}
                      className="hidden"
                      id="status-media-upload"
                    />
                  </IKContext>
                  <label 
                    htmlFor="status-media-upload"
                    className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 cursor-pointer hover:bg-slate-50 transition-all"
                  >
                    <Plus size={16} />
                    CHAGUA FILE (PICHA/VIDEO)
                  </label>
                </div>
              )}
            </div>
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
              <div className="flex gap-2">
                <input 
                  type="number" 
                  className="input-field flex-1"
                  placeholder="12000"
                  value={newProduct.price}
                  onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                />
                <button 
                  onClick={(e) => { e.preventDefault(); suggestPrice(newProduct, setNewProduct); }}
                  disabled={isSuggestingPrice}
                  className="p-3 bg-amber-100 text-amber-600 rounded-xl hover:bg-amber-200 transition-colors flex items-center justify-center"
                  title="AI Price Suggestion"
                >
                  {isSuggestingPrice ? <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={18} />}
                </button>
              </div>
              {aiSuggestion && (
                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-amber-600" />
                    <span className="text-xs font-black text-amber-900 uppercase tracking-widest">Ushauri wa AI</span>
                  </div>
                  <p className="text-sm font-bold text-amber-800 mb-1">Bei Inayopendekezwa: {aiSuggestion.price.toLocaleString()} TZS</p>
                  <p className="text-xs text-amber-700 mb-3">{aiSuggestion.reason}</p>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setNewProduct({...newProduct, price: aiSuggestion.price.toString()});
                      setAiSuggestion(null);
                    }}
                    className="w-full py-2 bg-amber-600 text-white text-xs font-black rounded-xl hover:bg-amber-700 transition-colors"
                  >
                    TUMIA BEI HII
                  </button>
                </div>
              )}
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

          {/* Livestock Specific Fields */}
          <div className="bg-slate-50 p-4 rounded-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                  <Tag size={16} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase">Ni Mfugo?</p>
                  <p className="text-[10px] text-slate-500 font-bold">Weka taarifa za ziada za mnyama</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setNewProduct({...newProduct, isLivestock: !newProduct.isLivestock})}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  newProduct.isLivestock ? "bg-emerald-500" : "bg-slate-300"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  newProduct.isLivestock ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            {newProduct.isLivestock && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-2 border-t border-slate-200"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Umri</label>
                    <input 
                      type="text" 
                      className="input-field py-3"
                      placeholder="Mf: Miezi 6"
                      value={newProduct.age}
                      onChange={e => setNewProduct({...newProduct, age: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Uzito (Kg)</label>
                    <input 
                      type="number" 
                      className="input-field py-3"
                      placeholder="Mf: 15"
                      value={newProduct.weight}
                      onChange={e => setNewProduct({...newProduct, weight: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Jinsia</label>
                    <select 
                      className="input-field py-3"
                      value={newProduct.gender}
                      onChange={e => setNewProduct({...newProduct, gender: e.target.value as any})}
                    >
                      <option value="male">Dume</option>
                      <option value="female">Jike</option>
                      <option value="other">Nyingine</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Uzao (Breed)</label>
                    <input 
                      type="text" 
                      className="input-field py-3"
                      placeholder="Mf: Friesian"
                      value={newProduct.breed}
                      onChange={e => setNewProduct({...newProduct, breed: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Hali ya Afya</label>
                    <select 
                      className="input-field py-3"
                      value={newProduct.healthStatus}
                      onChange={e => setNewProduct({...newProduct, healthStatus: e.target.value as any})}
                    >
                      <option value="healthy">Mzima</option>
                      <option value="sick">Mgonjwa</option>
                      <option value="recovered">Amepona</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Namba ya Tag</label>
                    <input 
                      type="text" 
                      className="input-field py-3"
                      placeholder="Mf: TZ-001"
                      value={newProduct.tagNumber}
                      onChange={e => setNewProduct({...newProduct, tagNumber: e.target.value})}
                    />
                  </div>
                </div>
              </motion.div>
            )}
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
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    className="input-field flex-1"
                    placeholder="15000"
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                  />
                  <button 
                    onClick={(e) => { e.preventDefault(); suggestPrice(editingProduct, setEditingProduct); }}
                    disabled={isSuggestingPrice}
                    className="p-3 bg-amber-100 text-amber-600 rounded-xl hover:bg-amber-200 transition-colors flex items-center justify-center"
                    title="AI Price Suggestion"
                  >
                    {isSuggestingPrice ? <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={18} />}
                  </button>
                </div>
                {aiSuggestion && (
                  <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-amber-600" />
                      <span className="text-xs font-black text-amber-900 uppercase tracking-widest">Ushauri wa AI</span>
                    </div>
                    <p className="text-sm font-bold text-amber-800 mb-1">Bei Inayopendekezwa: {aiSuggestion.price.toLocaleString()} TZS</p>
                    <p className="text-xs text-amber-700 mb-3">{aiSuggestion.reason}</p>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        setEditingProduct({...editingProduct, price: aiSuggestion.price});
                        setAiSuggestion(null);
                      }}
                      className="w-full py-2 bg-amber-600 text-white text-xs font-black rounded-xl hover:bg-amber-700 transition-colors"
                    >
                      TUMIA BEI HII
                    </button>
                  </div>
                )}
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

            <div className="flex flex-col justify-end pb-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={editingProduct.isLivestock}
                    onChange={e => setEditingProduct({...editingProduct, isLivestock: e.target.checked})}
                  />
                  <div className={cn(
                    "w-12 h-6 rounded-full transition-colors",
                    editingProduct.isLivestock ? "bg-emerald-500" : "bg-slate-200"
                  )} />
                  <div className={cn(
                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                    editingProduct.isLivestock ? "translate-x-6" : "translate-x-0"
                  )} />
                </div>
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Ni Mfugo?</span>
              </label>
            </div>

            {editingProduct.isLivestock && (
              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={18} className="text-emerald-600" />
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest">Taarifa za Mfugo</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 ml-1">Tag Number / ID</label>
                    <input 
                      type="text" 
                      className="w-full bg-white border-2 border-emerald-100 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                      placeholder="Mf: TZ-001"
                      value={editingProduct.tagNumber}
                      onChange={e => setEditingProduct({...editingProduct, tagNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 ml-1">Uzao / Breed</label>
                    <input 
                      type="text" 
                      className="w-full bg-white border-2 border-emerald-100 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                      placeholder="Mf: Boran"
                      value={editingProduct.breed}
                      onChange={e => setEditingProduct({...editingProduct, breed: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 ml-1">Umri</label>
                    <input 
                      type="text" 
                      className="w-full bg-white border-2 border-emerald-100 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                      placeholder="Mf: Miezi 6"
                      value={editingProduct.age}
                      onChange={e => setEditingProduct({...editingProduct, age: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 ml-1">Uzito (Kg)</label>
                    <input 
                      type="text" 
                      className="w-full bg-white border-2 border-emerald-100 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                      placeholder="Mf: 250"
                      value={editingProduct.weight}
                      onChange={e => setEditingProduct({...editingProduct, weight: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 ml-1">Jinsia</label>
                    <select 
                      className="w-full bg-white border-2 border-emerald-100 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                      value={editingProduct.gender}
                      onChange={e => setEditingProduct({...editingProduct, gender: e.target.value as 'male' | 'female'})}
                    >
                      <option value="male">Dume</option>
                      <option value="female">Jike</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 ml-1">Hali ya Afya</label>
                    <select 
                      className="w-full bg-white border-2 border-emerald-100 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                      value={editingProduct.healthStatus}
                      onChange={e => setEditingProduct({...editingProduct, healthStatus: e.target.value as any})}
                    >
                      <option value="healthy">Mzima (Healthy)</option>
                      <option value="sick">Mgonjwa (Sick)</option>
                      <option value="quarantine">Karantini (Quarantine)</option>
                      <option value="recovered">Amepona (Recovered)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 ml-1">Tarehe ya Kuzaliwa</label>
                    <input 
                      type="date" 
                      className="w-full bg-white border-2 border-emerald-100 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                      value={editingProduct.birthDate}
                      onChange={e => setEditingProduct({...editingProduct, birthDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}
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

      {/* Password Modal */}
      <Modal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)}
        title="Badilisha Nywila"
      >
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nywila Mpya</label>
            <input 
              type="password" 
              required
              className="input-field"
              placeholder="••••••••"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rudia Nywila Mpya</label>
            <input 
              type="password" 
              required
              className="input-field"
              placeholder="••••••••"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
            />
          </div>
          <button 
            type="submit"
            disabled={isPasswordLoading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isPasswordLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'HIFADHI NYWILA MPYA'}
          </button>
        </form>
      </Modal>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between z-40">
        {[
          { id: 'dash', icon: LayoutDashboard, label: 'Dash' },
          { id: 'orders', icon: ClipboardList, label: 'Oda' },
          { id: 'wallet', icon: Wallet, label: 'Wallet' },
          { id: 'more', icon: Menu, label: 'Zaidi' }
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
              activeTab === item.id ? "text-emerald-600" : "text-slate-400"
            )}
          >
            <item.icon size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* New Order Alert Modal */}
      <AnimatePresence>
        {newOrderAlert && (
          <Modal 
            isOpen={!!newOrderAlert} 
            onClose={() => setNewOrderAlert(null)}
            title="ODA MPYA IMEINGIA! 🔔"
          >
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <ShoppingBag size={40} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Hongera! Una Oda Mpya</h3>
              <p className="text-slate-500 mb-6">
                Mteja <b>{newOrderAlert.userName}</b> ameweka oda ya <b>{newOrderAlert.items[0].name}</b>.
                <br />
                Thamani: <b>{formatCurrency(newOrderAlert.total, currency)}</b>
              </p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    setNewOrderAlert(null);
                    setActiveTab('orders');
                  }}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-200"
                >
                  ANGALIA ODA SASA ✅
                </button>
                <button 
                  onClick={() => setNewOrderAlert(null)}
                  className="w-full bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold"
                >
                  BAADAE
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <LiveStreamModal 
        key={liveStreamAuctionId || 'no-room'}
        isOpen={!!liveStreamAuctionId} 
        onClose={() => setLiveStreamAuctionId(null)} 
        roomId={liveStreamAuctionId || ''} 
        isHost={true} 
        userId={user?.id || `vendor_${Math.floor(Math.random() * 10000)}`} 
        userName={user?.name || 'Muuzaji'} 
        vendorAvatar={user?.avatar}
      />
    </div>
  );
};
