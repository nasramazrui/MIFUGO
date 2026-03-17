import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Status, User } from '../types';
import { ProductCard } from '../components/ProductCard';
import { CartFloatingBar } from '../components/CartFloatingBar';
import { CATEGORIES, DAYS, ADMIN_WA } from '../constants';
import { Modal } from '../components/Modal';
import { formatCurrency, generateId, cn } from '../utils';
import { AuthModal } from '../components/AuthModal';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShoppingBag, ShoppingCart, Store, Package, Star, Plus, Minus, Send, MapPin, LogOut, Info, User as UserIcon, Settings, Trash2, Camera, X, ThumbsUp, MessageSquare, Smile, Moon, Sun, Globe, LayoutDashboard, ChevronRight, Copy, Wallet, ArrowRight, Check, Gavel, ShieldCheck, Home, Menu, Bell, BookOpen, Tag, FileText, Syringe, QrCode, CheckCircle2, MessageCircle, Video } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db, auth } from '../services/firebase';
import { getAuthEmail, isEmail } from '../utils/authUtils';
import { collection, addDoc, serverTimestamp, setDoc, doc, updateDoc, increment, deleteDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile, deleteUser, updatePassword } from 'firebase/auth';
import { AuctionPage } from './AuctionPage';
import { Forum } from './Forum';
import { VaccinationCalendar } from './VaccinationCalendar';
import { Chat } from '../components/Chat';
import { generateInvoicePDF } from '../utils/invoice';
import { QRScanner } from '../components/QRScanner';
import QRCode from 'react-qr-code';
import { IKContext, IKUpload } from 'imagekitio-react';
import { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT, IMAGEKIT_AUTH_ENDPOINT, isImageKitConfigured } from '../services/imageKitService';
import LiveStreamModal from '../components/LiveStreamModal';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { RecentPurchases } from '../components/RecentPurchases';
import { NotificationsModal } from '../components/NotificationsModal';
import { AcademyPage } from './AcademyPage';

export const ShopPage: React.FC = () => {
  const { products, user, vendors, orders, setOrders, addActivity, addNotification, reviews, statuses, categories, auctions, walletTransactions, logout, systemSettings, t, theme, setTheme, language, setLanguage, setView, cart, addToCart, removeFromCart, updateCartQty, notifications, academyPosts, offers, livestockHealthRecords, liveSessions } = useApp();
  const currency = systemSettings?.currency || 'TZS';
  const unreadNotifications = notifications.filter(n => (n.userId === 'all' || n.userId === user?.id) && !n.readBy?.includes(user?.id || '')).length;
  const [activeTab, setActiveTab] = useState<'browse' | 'stores' | 'orders' | 'auctions' | 'academy' | 'forum' | 'vaccination' | 'chat'>('browse');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<{ id: string, name: string } | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isQRPaymentModalOpen, setIsQRPaymentModalOpen] = useState(false);
  const [qrPaymentData, setQrPaymentData] = useState<{ vendor: User | null, amount: string }>({ vendor: null, amount: '' });
  const [isProcessingQRPayment, setIsProcessingQRPayment] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [activeLiveRoomId, setActiveLiveRoomId] = useState<string | null>(null);
  const [viewedStatuses, setViewedStatuses] = useState<string[]>(() => {
    const saved = localStorage.getItem('viewed_statuses');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWalletHistoryOpen, setIsWalletHistoryOpen] = useState(false);
  const [isOfflineQRModalOpen, setIsOfflineQRModalOpen] = useState(false);
  const [offlineQRAmount, setOfflineQRAmount] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletStep, setWalletStep] = useState<'method' | 'details' | 'whatsapp'>('method');
  const [walletPayMethod, setWalletPayMethod] = useState<'mpesa' | 'tigo' | 'airtel' | 'halopesa'>('tigo');
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [lastWalletTxId, setLastWalletTxId] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const handleDownloadInvoice = async (order: any) => {
    try {
      const doc = await generateInvoicePDF(order, systemSettings);
      doc.save(`Invoice-${order.id.substring(0, 8)}.pdf`);
      toast.success('Risiti inapakuliwa...');
    } catch (error) {
      toast.error('Imeshindwa kupakua risiti');
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

  const handleQRScan = async (decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      if (data.type === 'payment' && data.vendorId) {
        const vendor = vendors.find(v => v.id === data.vendorId);
        if (vendor) {
          // Success feedback
          playBeep();
          if (navigator.vibrate) {
            navigator.vibrate([200]);
          }
          
          setQrPaymentData({ 
            vendor, 
            amount: data.amount ? data.amount.toString() : '' 
          });
          setIsQRScannerOpen(false);
          setIsQRPaymentModalOpen(true);
        }
      } else if (data.type === 'product' && data.productId) {
        let product = products.find(p => p.id === data.productId);
        
        if (!product) {
          // Fallback: Try to fetch directly from Firestore if not in local state
          try {
            const productDoc = await getDoc(doc(db, 'kuku_products', data.productId));
            if (productDoc.exists()) {
              product = { id: productDoc.id, ...productDoc.data() } as any;
            }
          } catch (err) {
            console.error("Error fetching product manually:", err);
          }
        }

        if (product) {
          playBeep();
          if (navigator.vibrate) {
            navigator.vibrate([200]);
          }
          setSelectedProduct(product);
          setIsQRScannerOpen(false);
          toast.success(`Mfugo umepatikana: ${product.name}`);
        } else {
          toast.error('Bidhaa haijapatikana');
        }
      } else {
        toast.success(`Scanned: ${decodedText}`);
        setIsQRScannerOpen(false);
      }
    } catch (e) {
      // Try to parse as URL if JSON parse fails
      try {
        const url = new URL(decodedText);
        const productId = url.searchParams.get('productId');
        if (productId) {
          let product = products.find(p => p.id === productId);
          if (!product) {
            const productDoc = await getDoc(doc(db, 'kuku_products', productId));
            if (productDoc.exists()) {
              product = { id: productDoc.id, ...productDoc.data() } as any;
            }
          }
          if (product) {
            playBeep();
            if (navigator.vibrate) navigator.vibrate([200]);
            setSelectedProduct(product);
            setIsQRScannerOpen(false);
            toast.success(`Mfugo umepatikana: ${product.name}`);
            return;
          } else {
            toast.error('Bidhaa haijapatikana');
            setIsQRScannerOpen(false);
            return;
          }
        }
      } catch (urlError) {
        // Not a valid URL, just show the text
      }
      
      toast.success(`Scanned: ${decodedText}`);
      setIsQRScannerOpen(false);
    }
  };

  const handleQRPayment = async () => {
    if (!user) {
      toast.error('Tafadhali ingia kwenye akaunti kwanza');
      return;
    }
    if (!qrPaymentData.vendor) return;
    
    const amount = Number(qrPaymentData.amount);
    if (!amount || amount <= 0) {
      toast.error('Tafadhali weka kiasi sahihi');
      return;
    }

    if (user.walletBalance < amount) {
      toast.error('Salio halitoshi kwenye Wallet yako');
      return;
    }

    setIsProcessingQRPayment(true);
    try {
      const userRef = doc(db, 'kuku_users', user.id);
      const vendorRef = doc(db, 'kuku_users', qrPaymentData.vendor.id);
      
      // Deduct from user
      await updateDoc(userRef, {
        walletBalance: increment(-amount)
      });
      
      // Add to vendor
      await updateDoc(vendorRef, {
        walletBalance: increment(amount)
      });

      const vendorName = qrPaymentData.vendor.shopName || qrPaymentData.vendor.name;

      // Record transaction for sender (user)
      const senderTxRef = doc(collection(db, 'kuku_wallet'));
      await setDoc(senderTxRef, {
        id: senderTxRef.id,
        userId: user.id,
        userName: user.name,
        type: 'payment',
        amount: -amount,
        status: 'approved',
        description: `Malipo ya QR kwa ${vendorName}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });

      // Record transaction for recipient (vendor)
      const recipientTxRef = doc(collection(db, 'kuku_wallet'));
      await setDoc(recipientTxRef, {
        id: recipientTxRef.id,
        userId: qrPaymentData.vendor.id,
        userName: vendorName,
        type: 'sale',
        amount: amount,
        status: 'approved',
        description: `Malipo ya QR kutoka kwa ${user.name}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });

      // Notify vendor
      await addNotification(
        'Malipo Mapya ya QR 💰',
        `Umepokea TZS ${amount.toLocaleString()} kutoka kwa ${user.name}`,
        qrPaymentData.vendor.id,
        'wallet'
      );

      // Notify user
      await addNotification(
        'Malipo Yamekamilika ✅',
        `Umelipa TZS ${amount.toLocaleString()} kwa ${vendorName}`,
        user.id,
        'wallet'
      );

      toast.success('Malipo yamefanikiwa!');
      setIsQRPaymentModalOpen(false);
      setQrPaymentData({ vendor: null, amount: '' });
    } catch (error) {
      console.error('QR Payment error:', error);
      toast.error('Hitilafu imetokea wakati wa malipo');
    } finally {
      setIsProcessingQRPayment(false);
    }
  };

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
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Status State
  const activeLiveSessions = liveSessions.filter(s => s.status === 'live');
  const endedLiveSessions = liveSessions.filter(s => s.status === 'ended');

  // Filter out ended sessions that are older than 24 hours
  const filteredEndedSessions = endedLiveSessions.filter(s => {
    if (!s.endedAt) return true;
    const endedTime = s.endedAt.seconds * 1000;
    const now = Date.now();
    return now - endedTime < 24 * 60 * 60 * 1000;
  });
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusVideoUrl, setStatusVideoUrl] = useState('');
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [isOrderReviewModalOpen, setIsOrderReviewModalOpen] = useState(false);
  const [orderReviewRating, setOrderReviewRating] = useState(0);
  const [orderReviewComment, setOrderReviewComment] = useState('');
  const [isOrderReviewLoading, setIsOrderReviewLoading] = useState(false);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [statusProgress, setStatusProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Handle URL parameters for QR scans
  useEffect(() => {
    const checkUrlParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const productId = params.get('productId');
      if (productId) {
        let product = products.find(p => p.id === productId);
        if (!product) {
          try {
            const productDoc = await getDoc(doc(db, 'kuku_products', productId));
            if (productDoc.exists()) {
              product = { id: productDoc.id, ...productDoc.data() } as any;
            }
          } catch (err) {
            console.error("Error fetching product from URL:", err);
          }
        }
        if (product) {
          setSelectedProduct(product);
          // Clean up URL without reloading
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    
    // Only run if products are loaded or if it's the first render
    if (products.length > 0) {
      checkUrlParams();
    }
  }, [products]);

  // Auto-expiry for Statuses (24 hours)
  useEffect(() => {
    const cleanup = async () => {
      const now = Date.now();
      const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const status of statuses) {
        if (status.createdAt) {
          const createdAt = status.createdAt.toMillis ? status.createdAt.toMillis() : new Date(status.createdAt).getTime();
          if (now - createdAt > expiryTime) {
            try {
              await deleteDoc(doc(db, 'kuku_statuses', status.id));
            } catch (e) {
              console.error("Error deleting expired status:", e);
            }
          }
        }
      }
    };
    
    // Run cleanup every hour
    const interval = setInterval(cleanup, 60 * 60 * 1000);
    cleanup(); // Run initially
    
    return () => clearInterval(interval);
  }, [statuses]);

  // Progress bar for status viewer
  useEffect(() => {
    let interval: any;
    if (selectedStatus && !isPaused) {
      interval = setInterval(() => {
        setStatusProgress(prev => {
          if (prev >= 100) {
            setSelectedStatus(null);
            return 0;
          }
          return prev + 0.4; // Slightly slower for better reading
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [selectedStatus, isPaused]);

  // Reset progress when status changes
  useEffect(() => {
    if (selectedStatus) {
      setStatusProgress(0);
      setIsPaused(false);
      
      // Mark as viewed
      if (!viewedStatuses.includes(selectedStatus.id)) {
        const newViewed = [...viewedStatuses, selectedStatus.id];
        setViewedStatuses(newViewed);
        localStorage.setItem('viewed_statuses', JSON.stringify(newViewed));
      }
    }
  }, [selectedStatus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    contact: user?.contact || '',
    avatar: user?.avatar || ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        contact: user.contact || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsProfileLoading(true);
    try {
      await updateDoc(doc(db, 'kuku_users', user.id), {
        name: profileData.name,
        contact: profileData.contact,
        avatar: profileData.avatar,
        language,
        theme
      });
      toast.success('Wasifu umesasishwa!');
    } catch (error) {
      toast.error('Hitilafu wakati wa kusasisha wasifu');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const [isRedeeming, setIsRedeeming] = useState(false);
  const handleRedeemPoints = async () => {
    if (!user || !user.loyaltyPoints || user.loyaltyPoints < 100) {
      toast.error('Unahitaji angalau pointi 100 ili kubadilisha.');
      return;
    }
    
    const value = user.loyaltyPoints * (systemSettings?.pointsValue || 10);
    if (!confirm(`Je, unataka kubadilisha pointi ${user.loyaltyPoints} kuwa ${formatCurrency(value, currency)} kwenye Wallet yako?`)) return;

    setIsRedeeming(true);
    try {
      await updateDoc(doc(db, 'kuku_users', user.id), {
        loyaltyPoints: 0,
        walletBalance: increment(value)
      });
      
      await addDoc(collection(db, 'kuku_wallet'), {
        userId: user.id,
        userName: user.name,
        amount: value,
        type: 'deposit',
        status: 'approved',
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      
      toast.success(`Umefanikiwa kupata ${formatCurrency(value, currency)}!`);
    } catch (error) {
      toast.error('Hitilafu imetokea. Jaribu tena.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!confirm('Je, una uhakika unataka kufuta akaunti yako? Hatua hii haiwezi kurudishwa.')) return;
    
    try {
      const userId = user.id;
      // 1. Delete Auth user first (it might fail due to recent login)
      const currentUser = auth.currentUser;
      if (currentUser) {
        await deleteUser(currentUser);
      }
      
      // 2. Delete Firestore doc
      await deleteDoc(doc(db, 'kuku_users', userId));
      
      toast.success('Akaunti imefutwa kwa mafanikio');
      logout();
      setIsProfileModalOpen(false);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Tafadhali toka na uingie tena ili kufuta akaunti yako kwa usalama.');
      } else {
        toast.error('Hitilafu wakati wa kufuta akaunti');
      }
    }
  };

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isVendorRegModalOpen, setIsVendorRegModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [vendorRating, setVendorRating] = useState(0);
  const [vendorReviewText, setVendorReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [qty, setQty] = useState(1);
  const [vendorFormData, setVendorFormData] = useState({
    shopName: '',
    ownerName: '',
    identifier: '', // Combined email or phone
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
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isVendorLoading, setIsVendorLoading] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    method: 'mobile' as 'mobile' | 'bank',
    network: 'mpesa',
    phoneNumber: '',
    bankName: '',
    accountNumber: ''
  });
  const [withdrawStep, setWithdrawStep] = useState<'form' | 'summary' | 'whatsapp'>('form');
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [lastWithdrawalId, setLastWithdrawalId] = useState('');

  const calculateWithdrawFee = (amount: number) => {
    if (!systemSettings) return 0;
    if (systemSettings.withdrawalFeeType === 'fixed') return systemSettings.withdrawalFeeValue || 0;
    return (amount * (systemSettings.withdrawalFeeValue || 0)) / 100;
  };

  const handleWithdraw = async () => {
    if (!user) return;
    const amountNum = Number(withdrawForm.amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Weka kiasi sahihi');
      return;
    }

    if (amountNum > (user.walletBalance || 0)) {
      toast.error('Salio halitoshi');
      return;
    }

    if (withdrawForm.method === 'mobile' && !withdrawForm.phoneNumber) {
      toast.error('Tafadhali weka namba ya simu');
      return;
    }

    setIsWithdrawLoading(true);
    try {
      const method = withdrawForm.method === 'mobile' ? withdrawForm.network : 'Visa / Mastercard';
      const phone = withdrawForm.method === 'mobile' ? withdrawForm.phoneNumber : `${withdrawForm.bankName} - ${withdrawForm.accountNumber}`;
      const fee = calculateWithdrawFee(amountNum);
      const netAmount = amountNum - fee;

      const withdrawRef = await addDoc(collection(db, 'kuku_withdrawals'), {
        userId: user.id,
        userName: user.name,
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
        userName: user.name,
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
      toast.success('Ombi la kutoa pesa limetumwa!');
      addActivity('💸', `Umeomba kutoa ${formatCurrency(amountNum, currency)}`);
    } catch (error: any) {
      toast.error(error.message || 'Hitilafu wakati wa kutuma maombi');
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const handleVendorRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVendorLoading(true);
    try {
      if (user) {
        // Upgrade existing user
        const vendorData = {
          shopName: vendorFormData.shopName,
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
          updatedAt: serverTimestamp()
        };
        
        await updateDoc(doc(db, 'kuku_users', user.id), vendorData);
        addActivity('🏪', `Mtumiaji "${user.name}" ameomba kuwa muuzaji ("${vendorFormData.shopName}")`);
        toast.success('Ombi lako limetumwa! Subiri idhini ya Admin.');
      } else {
        // Create new account
        const email = getAuthEmail(vendorFormData.identifier);
        const userCredential = await createUserWithEmailAndPassword(auth, email, vendorFormData.password);
        const fbUser = userCredential.user;
        
        await updateProfile(fbUser, { displayName: vendorFormData.ownerName });
        
        const vendorData = {
          name: vendorFormData.ownerName,
          shopName: vendorFormData.shopName,
          email: isEmail(vendorFormData.identifier) ? vendorFormData.identifier : '',
          role: 'vendor',
          status: 'pending',
          location: vendorFormData.location,
          phone: isEmail(vendorFormData.identifier) ? vendorFormData.phone : vendorFormData.identifier,
          tin: vendorFormData.tin,
          nida: vendorFormData.nida,
          license: vendorFormData.license,
          openTime: vendorFormData.openTime,
          closeTime: vendorFormData.closeTime,
          openDays: vendorFormData.openDays,
          theme,
          language,
          createdAt: new Date().toISOString(),
          serverCreatedAt: serverTimestamp()
        };
        
        await setDoc(doc(db, 'kuku_users', fbUser.uid), vendorData);
        addActivity('🏪', `Muuzaji mpya "${vendorFormData.shopName}" amejisajili`);
        toast.success('Usajili umekamilika! Subiri idhini ya Admin.');
      }
      
      const phoneForMsg = user ? vendorFormData.phone : (isEmail(vendorFormData.identifier) ? vendorFormData.phone : vendorFormData.identifier);
      const msg = `*Maombi ya Muuzaji — ${systemSettings?.app_name || 'Digital Livestock Market Live'}*\n\nJina la Duka: ${vendorFormData.shopName}\nMmiliki: ${user?.name || vendorFormData.ownerName}\nSimu: ${phoneForMsg}\n\nTafadhali nihakikie.`;
      window.open(`https://wa.me/${ADMIN_WA.replace(/\+/g,'')}?text=${encodeURIComponent(msg)}`);
      
      setIsVendorRegModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Hitilafu wakati wa kusajili');
    } finally {
      setIsVendorLoading(false);
    }
  };
  const [deliveryMethod, setDeliveryMethod] = useState<'city' | 'out' | 'pickup'>('city');
  const [payMethod, setPayMethod] = useState<'mpesa' | 'tigo' | 'airtel' | 'halopesa' | 'cash' | 'wallet'>('mpesa');
  const [paymentStep, setPaymentStep] = useState<'method' | 'details' | 'confirm' | 'whatsapp'>('method');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [sentAmount, setSentAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [payPhone, setPayPhone] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [lastOrderId, setLastOrderId] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  const currentDeliveryFee = deliveryMethod === 'city' ? (selectedProduct?.deliveryCity || 0) : 
                            deliveryMethod === 'out' ? (selectedProduct?.deliveryOut || 0) : 0;
  const currentTotalCost = (selectedProduct?.price || 0) * qty + currentDeliveryFee;
  const hasEnoughWallet = (user?.walletBalance || 0) >= currentTotalCost;

  const productReviews = reviews.filter(r => r.productId === selectedProduct?.id);

  const handleVendorReview = async () => {
    if (!user) {
      toast.error('Tafadhali ingia kwanza');
      return;
    }
    if (vendorRating === 0) {
      toast.error('Tafadhali chagua nyota');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'kuku_reviews'), {
        vendorId: selectedVendor.id,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || '',
        rating: vendorRating,
        text: vendorReviewText,
        date: new Date().toLocaleDateString(),
        createdAt: serverTimestamp()
      });
      toast.success('Asante kwa maoni yako!');
      setVendorRating(0);
      setVendorReviewText('');
    } catch (error) {
      toast.error('Imeshindwa kutuma maoni');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getVendorRating = (vendorId: string) => {
    const vendorReviews = reviews.filter(r => r.vendorId === vendorId);
    if (vendorReviews.length === 0) return 0;
    const sum = vendorReviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / vendorReviews.length;
  };

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

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Una uhakika unataka kufuta maoni haya?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_reviews', reviewId));
      toast.success('Maoni yamefutwa');
    } catch (error) {
      toast.error('Imeshindwa kufuta maoni');
    }
  };

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleReplySubmit = async (reviewId: string) => {
    if (!user || !replyText.trim()) return;
    try {
      const reviewRef = doc(db, 'kuku_reviews', reviewId);
      const review = reviews.find(r => r.id === reviewId);
      const newReply = {
        id: generateId(),
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || '',
        text: replyText,
        date: new Date().toISOString().split('T')[0]
      };
      await updateDoc(reviewRef, {
        replies: [...(review?.replies || []), newReply]
      });

      // Notify the review author if it's not the same person
      if (review && review.userId !== user.id) {
        await addNotification(
          'Jibu Jipya la Maoni! 💬',
          `${user.name} amejibu maoni yako: "${replyText.substring(0, 30)}..."`,
          review.userId,
          'profile'
        );
      }

      setReplyText('');
      setReplyingTo(null);
      toast.success('Jibu limetumwa');
    } catch (error) {
      toast.error('Imeshindwa kutuma jibu');
    }
  };

  const handleLikeReview = async (reviewId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const reviewRef = doc(db, 'kuku_reviews', reviewId);
      const review = reviews.find(r => r.id === reviewId);
      const likes = review?.likes || [];
      const newLikes = likes.includes(user.id) 
        ? likes.filter(id => id !== user.id)
        : [...likes, user.id];
      await updateDoc(reviewRef, { likes: newLikes });

      // Notify the review author if it's a new like and not the same person
      if (!likes.includes(user.id) && review && review.userId !== user.id) {
        await addNotification(
          'Pongezi! Maoni Yako Yamependwa! ❤️',
          `${user.name} amependa maoni yako.`,
          review.userId,
          'profile'
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReactReview = async (reviewId: string, emoji: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const reviewRef = doc(db, 'kuku_reviews', reviewId);
      const review = reviews.find(r => r.id === reviewId);
      const reactions = review?.reactions || [];
      const existingReactionIndex = reactions.findIndex(r => r.userId === user.id && r.emoji === emoji);
      
      let newReactions;
      if (existingReactionIndex > -1) {
        newReactions = reactions.filter((_, i) => i !== existingReactionIndex);
      } else {
        newReactions = [...reactions, { userId: user.id, emoji }];
      }
      
      await updateDoc(reviewRef, { reactions: newReactions });
    } catch (error) {
      console.error(error);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCat === 'all' || p.category === selectedCat;
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = !searchLower || 
                         p.name.toLowerCase().includes(searchLower) || 
                         p.vendorName.toLowerCase().includes(searchLower) ||
                         (p.desc && p.desc.toLowerCase().includes(searchLower)) ||
                         (p.location && p.location.toLowerCase().includes(searchLower));
    return matchesCat && matchesSearch && p.approved;
  });

  const filteredVendors = vendors.filter(v => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = !searchLower || 
                         (v.shopName && v.shopName.toLowerCase().includes(searchLower)) || 
                         (v.name && v.name.toLowerCase().includes(searchLower)) ||
                         (v.location && v.location.toLowerCase().includes(searchLower));
    return v.status === 'approved' && matchesSearch;
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

    if (payMethod === 'wallet') {
      const deliveryFee = deliveryMethod === 'city' ? (p.deliveryCity || 0) : 
                         deliveryMethod === 'out' ? (p.deliveryOut || 0) : 0;
      const actualDeliveryFee = deliveryMethod === 'pickup' ? 0 : deliveryFee;
      const total = (p.price || 0) * qty + actualDeliveryFee;
      if ((user.walletBalance || 0) < total) {
        toast.error('Salio la Wallet halitoshi. Tafadhali ongeza pesa.');
        return;
      }
    } else if (payMethod !== 'cash') {
      if (!senderName || !senderPhone || !sentAmount || !transactionId) {
        toast.error('Tafadhali jaza taarifa zote za malipo');
        return;
      }
    }

    if (p.stock < qty) {
      toast.error('Samahani, mzigo hautoshi kwa sasa');
      return;
    }

    setIsOrderLoading(true);
    const deliveryFee = deliveryMethod === 'city' ? (p.deliveryCity || 0) : 
                       deliveryMethod === 'out' ? (p.deliveryOut || 0) : 0;
    const actualDeliveryFee = deliveryMethod === 'pickup' ? 0 : deliveryFee;
    
    const subtotal = (p.price || 0) * qty;
    const adminCommission = subtotal * 0.06;
    const vendorNet = subtotal - adminCommission;
    const total = subtotal + actualDeliveryFee;

    const orderData = {
      userId: user.id || '',
      userName: user.name || '',
      userContact: user.contact || user.email || '',
      userWA: senderPhone || user.contact || '',
      payPhone: senderPhone || '',
      senderName: senderName || '',
      sentAmount: sentAmount || '',
      transactionId: transactionId || '',
      items: [{ 
        name: p.name || '', 
        qty: Number(qty), 
        price: Number(p.price || 0), 
        unit: p.unit || '', 
        emoji: p.emoji || '', 
        image: p.image || '' 
      }],
      productId: p.id || '',
      vendorId: p.vendorId || '',
      vendorName: p.vendorName || '',
      productPrice: Number(p.price || 0),
      qty: Number(qty),
      deliveryFee: Number(actualDeliveryFee),
      deliveryMethod,
      adminCommission: Number(adminCommission),
      vendorNet: Number(vendorNet),
      total: Number(total),
      payMethod,
      paymentProof: payMethod === 'wallet' ? 'Paid via Wallet' : `Sender: ${senderName}, Phone: ${senderPhone}, Amount: ${sentAmount}, ID: ${transactionId}`,
      paymentApproved: payMethod === 'wallet',
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

      if (payMethod === 'wallet') {
        await updateDoc(doc(db, 'kuku_users', user.id), {
          walletBalance: increment(-total)
        });
        
        await addDoc(collection(db, 'kuku_wallet'), {
          userId: user.id,
          userName: user.name,
          amount: total,
          type: 'purchase',
          status: 'approved',
          date: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp()
        });
      }

      const docRef = await addDoc(collection(db, 'kuku_orders'), orderData);
      setLastOrderId(docRef.id);
      addActivity('🛒', `${user.name} amenunua ${p.name} × ${qty} — ${formatCurrency(total, currency)}`);
      
      // Notify Vendor
      await addNotification(
        'Oda Mpya! 🛒',
        `${user.name} ameagiza ${p.name} × ${qty}. Tafadhali kagua oda yako.`,
        p.vendorId,
        'dashboard'
      );

      // Notify User
      await addNotification(
        'Oda Imepokelewa ✅',
        `Agizo lako la ${p.name} limepokelewa na linashughulikiwa.`,
        user.id,
        'orders'
      );
      
      // Award Loyalty Points
      if (systemSettings?.pointsPerOrder && systemSettings.pointsPerOrder > 0) {
        const pointsToAward = Math.floor((total / 1000) * systemSettings.pointsPerOrder);
        if (pointsToAward > 0) {
          await updateDoc(doc(db, 'kuku_users', user.id), {
            loyaltyPoints: increment(pointsToAward)
          });
          
          await addDoc(collection(db, 'kuku_loyalty'), {
            userId: user.id,
            userName: user.name,
            points: pointsToAward,
            type: 'earn',
            orderId: docRef.id,
            description: `Points earned from order #${docRef.id.substring(0,6)}`,
            createdAt: serverTimestamp()
          });
          
          toast.success(`Hongera! Umejipatia pointi ${pointsToAward} za uaminifu! 🎁`);
        }
      }
      
      if (payMethod === 'cash' || payMethod === 'wallet') {
        setIsPaymentModalOpen(false);
        setSelectedProduct(null);
        setActiveTab('orders');
        toast.success('Agizo limekamilika!');
      } else {
        setPaymentStep('whatsapp');
        toast.success('Malipo yamethibitishwa! Tafadhali tuma WhatsApp.');
      }
    } catch (error: any) {
      console.error("Order Error:", error);
      toast.error('Hitilafu wakati wa kutuma agizo. Jaribu tena.');
    } finally {
      setIsOrderLoading(false);
    }
  };

  const confirmDeposit = async () => {
    if (!user || !walletAmount || !senderName || !senderPhone || !transactionId) {
      toast.error('Tafadhali jaza taarifa zote');
      return;
    }

    setIsWalletLoading(true);
    try {
      const txData = {
        userId: user.id,
        userName: user.name,
        amount: Number(walletAmount),
        type: 'deposit',
        status: 'pending',
        method: walletPayMethod,
        senderName,
        senderPhone,
        transactionId,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'kuku_wallet'), txData);
      setLastWalletTxId(docRef.id);
      setWalletStep('whatsapp');
      toast.success('Ombi la kuongeza pesa limetumwa!');
    } catch (error) {
      toast.error('Hitilafu imetokea');
    } finally {
      setIsWalletLoading(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!selectedProduct || !selectedProduct.isLivestock) return;
    
    const certElement = document.getElementById('livestock-certificate');
    if (!certElement) return;

    try {
      toast.loading('Inatengeneza cheti...', { id: 'cert-toast' });
      
      // Temporarily make it visible for capture
      certElement.style.display = 'block';
      
      const canvas = await html2canvas(certElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      certElement.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Pasipoti_${selectedProduct.tagNumber || selectedProduct.name}.pdf`);
      
      toast.success('Cheti kimepakuliwa kikamilifu!', { id: 'cert-toast' });
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Imeshindwa kutengeneza cheti', { id: 'cert-toast' });
      certElement.style.display = 'none';
    }
  };

  const confirmReceipt = async () => {
    if (!selectedOrder) return;
    
    try {
      const orderRef = doc(db, 'kuku_orders', selectedOrder.id);
      const vendorRef = doc(db, 'kuku_users', selectedOrder.vendorId);
      
      // 1. Update order status
      await updateDoc(orderRef, { 
        status: 'completed',
        receivedAt: serverTimestamp()
      });

      // 2. Release funds to vendor wallet
      // vendorNet is the amount after 6% commission
      const amountToRelease = selectedOrder.vendorNet || (selectedOrder.total - (selectedOrder.deliveryFee || 0)) * 0.94;
      
      await updateDoc(vendorRef, {
        walletBalance: increment(amountToRelease)
      });

      // 3. Record transaction in kuku_wallet for the vendor
      await addDoc(collection(db, 'kuku_wallet'), {
        userId: selectedOrder.vendorId,
        userName: selectedOrder.vendorName,
        amount: amountToRelease,
        type: 'sale',
        status: 'approved',
        orderId: selectedOrder.id,
        description: `Mauzo ya #${selectedOrder.id.substring(0,8)} - ${selectedOrder.items[0].name}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });

      setIsTrackingModalOpen(false);
      setIsOrderReviewModalOpen(true);
      toast.success('Asante kwa kuthibitisha! Malipo yameingizwa kwenye Wallet ya Muuzaji.');
      addActivity('✅', `Mteja amethibitisha kupokea agizo #${selectedOrder.id.substring(0,8)}. Pesa imetumwa kwa muuzaji.`);
    } catch (error) {
      console.error("Confirm Receipt Error:", error);
      toast.error('Hitilafu imetokea wakati wa kuthibitisha.');
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Je, una uhakika unataka kufuta agizo hili kutoka kwenye historia yako?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_orders', orderId));
      toast.success('Agizo limefutwa');
    } catch (err) {
      toast.error('Imeshindwa kufuta agizo');
    }
  };

  const submitReview = async () => {
    if (!selectedOrder) return;
    
    setIsOrderReviewLoading(true);
    try {
      await addDoc(collection(db, 'kuku_reviews'), {
        userId: user?.id,
        userName: user?.name,
        productId: selectedOrder.productId,
        productName: selectedOrder.items?.[0]?.name || 'Product',
        vendorId: selectedOrder.vendorId,
        rating: orderReviewRating || 0,
        text: orderReviewComment || '',
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      
      setIsOrderReviewModalOpen(false);
      setOrderReviewRating(0);
      setOrderReviewComment('');
      toast.success('Asante kwa maoni yako!');
    } catch (error) {
      console.error("Submit Review Error:", error);
      toast.error('Hitilafu imetokea wakati wa kutuma maoni.');
    } finally {
      setIsOrderReviewLoading(false);
    }
  };

  const handlePostStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (user.role !== 'vendor' && user.role !== 'admin')) return;
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

  const handleLikeStatus = async (statusId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const status = statuses.find(s => s.id === statusId);
    if (!status) return;

    const newLikes = status.likes.includes(user.id)
      ? status.likes.filter(id => id !== user.id)
      : [...status.likes, user.id];

    try {
      await updateDoc(doc(db, 'kuku_statuses', statusId), { likes: newLikes });
    } catch (error) {
      toast.error('Hitilafu wakati wa kulike');
    }
  };

  const handleCommentStatus = async (statusId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const text = commentText[statusId];
    if (!text?.trim()) return;

    const status = statuses.find(s => s.id === statusId);
    if (!status) return;

    const newComment = {
      id: generateId(),
      userId: user.id,
      userName: user.name,
      text,
      createdAt: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'kuku_statuses', statusId), {
        comments: [...status.comments, newComment]
      });
      setCommentText(prev => ({ ...prev, [statusId]: '' }));
    } catch (error) {
      toast.error('Hitilafu wakati wa kucomment');
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    if (!user) return;
    if (!confirm('Je, una uhakika unataka kufuta status hii?')) return;

    try {
      await deleteDoc(doc(db, 'kuku_statuses', statusId));
      toast.success('Status imefutwa');
    } catch (error) {
      toast.error('Hitilafu wakati wa kufuta status');
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const id = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('tiktok.com')) {
      const id = url.split('/video/')[1]?.split('?')[0];
      if (id) return `https://www.tiktok.com/embed/v2/${id}`;
    }
    return null;
  };

  const isIKConfigured = isImageKitConfigured || (systemSettings?.imagekit_public_key && systemSettings?.imagekit_url_endpoint);

  return (
    <div className="min-h-screen bg-[#fafaf8] dark:bg-slate-950 transition-colors duration-300">
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-950 z-[70] lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-amber-600/20 overflow-hidden">
                      {systemSettings?.app_logo ? (
                        <img src={systemSettings.app_logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        systemSettings?.app_name?.[0] || 'K'
                      )}
                    </div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {systemSettings?.app_name || 'Digital Livestock Market Live'}
                    </h1>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 flex items-center justify-center text-slate-400">
                    <X size={24} />
                  </button>
                </div>

                <nav className="space-y-2">
                  {[
                    { id: 'browse', label: t('market'), icon: ShoppingBag },
                    { id: 'auctions', label: t('auctions'), icon: Gavel },
                    { id: 'stores', label: t('stores'), icon: Store },
                    { id: 'orders', label: t('orders'), icon: Package },
                    { id: 'chat', label: t('chat'), icon: Send },
                    { id: 'vaccination', label: t('vaccination'), icon: Syringe },
                    { id: 'forum', label: t('forum'), icon: MessageSquare },
                    { id: 'cart', label: t('cart_title'), icon: ShoppingCart },
                    { id: 'profile', label: t('profile'), icon: UserIcon },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        if (item.id === 'cart') {
                          setIsCartModalOpen(true);
                        } else if (item.id === 'profile') {
                          setIsProfileModalOpen(true);
                        } else {
                          setActiveTab(item.id as any);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-sm transition-all group",
                        activeTab === item.id 
                          ? "bg-amber-600 text-white shadow-xl shadow-amber-600/20" 
                          : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-600 dark:hover:text-slate-200"
                      )}
                    >
                      <item.icon size={20} className={cn("transition-transform group-hover:scale-110", activeTab === item.id ? "text-white" : "text-slate-300")} />
                      {item.label}
                      {item.id === 'auctions' && (
                        <span className="ml-auto bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse">
                          Live
                        </span>
                      )}
                      {item.id === 'cart' && cart.length > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                          {cart.reduce((sum, i) => sum + i.qty, 0)}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>

                <div className="mt-8">
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsVendorRegModalOpen(true);
                    }}
                    className="w-full bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-600/20 hover:shadow-amber-600/40 transition-all active:scale-95 group flex items-center justify-center gap-3"
                  >
                    <Store size={18} className="group-hover:rotate-12 transition-transform" />
                    {t('register_store')}
                  </button>
                </div>
              </div>

              <div className="mt-auto p-8 border-t border-slate-50 dark:border-slate-900">
                {user ? (
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-amber-200 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-100 overflow-hidden border-2 border-white dark:border-slate-800">
                      {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">👤</div>}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px]">{user.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user.role}</p>
                    </div>
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full btn-primary py-4"
                  >
                    {t('login')}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800/50 flex-col z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-amber-600/20 overflow-hidden">
              {systemSettings?.app_logo ? (
                <img src={systemSettings.app_logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                systemSettings?.app_name?.[0] || 'K'
              )}
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {systemSettings?.app_name || 'Digital Livestock Market Live'}
            </h1>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'browse', label: t('market'), icon: ShoppingBag },
              { id: 'auctions', label: t('auctions'), icon: Gavel },
              { id: 'stores', label: t('stores'), icon: Store },
              { id: 'orders', label: t('orders'), icon: Package },
              { id: 'chat', label: t('chat'), icon: Send },
              { id: 'vaccination', label: t('vaccination'), icon: Syringe },
              { id: 'forum', label: t('forum'), icon: MessageSquare },
              { id: 'cart', label: t('cart_title'), icon: ShoppingCart },
              { id: 'profile', label: t('profile'), icon: UserIcon },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'cart') {
                    setIsCartModalOpen(true);
                  } else if (item.id === 'profile') {
                    setIsProfileModalOpen(true);
                  } else {
                    setActiveTab(item.id as any);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-sm transition-all group",
                  activeTab === item.id 
                    ? "bg-amber-600 text-white shadow-xl shadow-amber-600/20" 
                    : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                <item.icon size={20} className={cn("transition-transform group-hover:scale-110", activeTab === item.id ? "text-white" : "text-slate-300")} />
                {item.label}
                {item.id === 'auctions' && (
                  <span className="ml-auto bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse">
                    Live
                  </span>
                )}
                {item.id === 'cart' && cart.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                    {cart.reduce((sum, i) => sum + i.qty, 0)}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-8">
            <button 
              onClick={() => setIsVendorRegModalOpen(true)}
              className="w-full bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-600/20 hover:shadow-amber-600/40 transition-all active:scale-95 group flex items-center justify-center gap-3"
            >
              <Store size={18} className="group-hover:rotate-12 transition-transform" />
              {t('register_store')}
            </button>
          </div>
        </div>

        <div className="mt-auto p-8 border-t border-slate-50 dark:border-slate-900">
          {user ? (
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-amber-200 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 overflow-hidden border-2 border-white dark:border-slate-800">
                {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">👤</div>}
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px]">{user.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user.role}</p>
              </div>
            </button>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full btn-primary py-4"
            >
              {t('login')}
            </button>
          )}
        </div>
      </aside>

      <div className="lg:pl-72 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all"
              >
                <Menu size={20} className="sm:w-6 sm:h-6" />
              </button>
              <button 
                onClick={() => setIsQRScannerOpen(true)}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-all"
                title="Scan QR Code"
              >
                <QrCode size={20} className="sm:w-6 sm:h-6" />
              </button>
              <button className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all">
                <Search size={20} className="sm:w-6 sm:h-6" />
              </button>
              <div className="relative" ref={langRef}>
                <button 
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 hover:bg-slate-200 transition-all"
                >
                  <Globe size={16} className="text-slate-400 sm:w-[18px] sm:h-[18px]" />
                  <span className="text-[10px] sm:text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{language === 'sw' ? 'SW' : 'EN'}</span>
                </button>
                <AnimatePresence>
                  {isLangOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full mt-2 right-0 w-32 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50"
                    >
                      <button
                        onClick={() => { setLanguage('sw'); setIsLangOpen(false); }}
                        className={cn("w-full px-4 py-3 text-left text-sm font-bold transition-colors", language === 'sw' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300")}
                      >
                        Swahili
                      </button>
                      <button
                        onClick={() => { setLanguage('en'); setIsLangOpen(false); }}
                        className={cn("w-full px-4 py-3 text-left text-sm font-bold transition-colors", language === 'en' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300")}
                      >
                        English
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {user && (
                <>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsQRScannerOpen(true)}
                    className="relative w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all"
                  >
                    <QrCode size={20} className="sm:w-6 sm:h-6" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    animate={unreadNotifications > 0 ? {
                      rotate: [0, -10, 10, -10, 10, 0],
                      transition: { repeat: Infinity, duration: 2, repeatDelay: 1 }
                    } : {}}
                    onClick={() => setIsNotificationsOpen(true)}
                    className="relative w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all"
                  >
                    <Bell size={20} className="sm:w-6 sm:h-6" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-950"></span>
                    )}
                  </motion.button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {!user ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button 
                    onClick={() => setIsVendorRegModalOpen(true)}
                    className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-5 py-2 sm:py-3 bg-[#FEF3C7] text-[#92400E] rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest border border-amber-200 shadow-sm"
                  >
                    <Home size={12} className="sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">SAJILI</span>
                    <span className="xs:hidden">JOIN</span>
                  </button>
                  <button 
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-3 sm:px-8 py-2 sm:py-3 bg-[#D97706] text-white rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-200 hover:bg-amber-700 transition-all active:scale-95"
                  >
                    INGIA
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button 
                    onClick={() => setIsProfileModalOpen(true)}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm active:scale-95 transition-all"
                  >
                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">👤</div>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 sm:py-8 pb-32">
        {/* Banner Slider */}
        {(systemSettings?.banners?.length > 0 ? systemSettings.banners : [{ image: 'https://img.freepik.com/free-vector/diwali-sale-banner-with-realistic-diya-lamps_1017-21157.jpg', link: '#' }]).map((banner: any, idx: number, arr: any[]) => (
          idx === (Math.floor(Date.now() / 5000) % arr.length) && (
            <div key={idx} className="mb-8 relative group overflow-hidden rounded-[40px] aspect-[21/10] sm:aspect-[21/8] shadow-xl shadow-slate-200 dark:shadow-none">
              <a href={banner.link || '#'} className="w-full h-full block relative overflow-hidden">
                <img src={banner.image} alt="" className="w-full h-full object-cover transition-transform duration-[5000ms] group-hover:scale-105" />
              </a>
              {arr.length > 1 && (
                <div className="absolute bottom-6 left-6 flex gap-2">
                  {arr.map((_: any, i: number) => (
                    <div key={i} className={cn("h-1.5 rounded-full transition-all duration-500", (Math.floor(Date.now() / 5000) % arr.length) === i ? "bg-white w-8" : "bg-white/30 w-1.5")} />
                  ))}
                </div>
              )}
            </div>
          )
        ))}
        {activeTab === 'forum' && <Forum />}
        {activeTab === 'vaccination' && <VaccinationCalendar />}
        {activeTab === 'chat' && (
          <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 h-[600px] overflow-hidden shadow-xl">
            {activeChat ? (
              <Chat 
                receiverId={activeChat.id} 
                receiverName={activeChat.name} 
                onClose={() => setActiveChat(null)} 
              />
            ) : (
              <div className="p-8 h-full flex flex-col">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Mazungumzo</h2>
                <div className="flex-1 overflow-y-auto space-y-4">
                  {vendors.filter(v => v.status === 'approved').map(v => (
                    <button 
                      key={v.id}
                      onClick={() => setActiveChat({ id: v.id, name: v.shopName })}
                      className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center text-amber-600">
                        <UserIcon size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white">{v.shopName}</h4>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Muuzaji</p>
                      </div>
                      <ChevronRight size={20} className="ml-auto text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'browse' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Offers Section */}
            {offers.filter(o => !o.expiryDate || new Date(o.expiryDate) >= new Date()).length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <Tag className="text-amber-500" size={24} />
                      Ofa Maalum
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">Punguzo na ofa zinazoendelea sasa</p>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                  {offers.filter(o => !o.expiryDate || new Date(o.expiryDate) >= new Date()).map(offer => {
                    const vendor = vendors.find(v => v.id === offer.vendorId);
                    return (
                      <div key={offer.id} className="flex-shrink-0 w-[280px] sm:w-[320px] bg-gradient-to-br from-amber-500 to-orange-600 rounded-[32px] p-6 text-white shadow-lg shadow-amber-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/20 transition-all" />
                        {offer.image && (
                          <div className="absolute top-0 right-0 w-24 h-24 opacity-20 group-hover:opacity-30 transition-opacity">
                            <img src={offer.image} alt="" className="w-full h-full object-cover rounded-bl-full" />
                          </div>
                        )}
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                              <Tag size={16} className="text-white" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">
                              {vendor?.shopName || 'Admin'}
                            </span>
                          </div>
                          <h3 className="text-xl font-black mb-2 leading-tight">{offer.title}</h3>
                          <p className="text-sm text-white/80 mb-4 line-clamp-2">{offer.message}</p>
                          {offer.expiryDate && (
                            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                              <span>Mwisho:</span>
                              <span className="text-amber-200">{new Date(offer.expiryDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Explore Categories Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Explore Categories</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">Based on what is popular around you</p>
              </div>
              <button className="w-12 h-10 bg-amber-400 rounded-full flex items-center justify-center text-slate-900 shadow-lg shadow-amber-400/20">
                <ArrowRight size={24} />
              </button>
            </div>

            {/* Categories List */}
            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                onClick={() => setSelectedCat('all')}
                className={cn(
                  "flex-shrink-0 flex items-center gap-3 px-2 py-2 rounded-full font-black transition-all border-2",
                  selectedCat === 'all' 
                    ? "bg-amber-100 border-amber-400 text-amber-900" 
                    : "bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800"
                )}
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xl overflow-hidden">🏪</div>
                <span className="pr-6 text-sm font-black">{t('all')}</span>
              </button>
              {categories.map((cat, idx) => {
                const colors = [
                  'bg-emerald-100 border-emerald-200 text-emerald-900',
                  'bg-orange-100 border-orange-200 text-orange-900',
                  'bg-blue-100 border-blue-200 text-blue-900',
                  'bg-purple-100 border-purple-200 text-purple-900',
                  'bg-rose-100 border-rose-200 text-rose-900'
                ];
                const colorClass = colors[idx % colors.length];
                
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCat(cat.id)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-3 px-2 py-2 rounded-full font-black transition-all border-2",
                      selectedCat === cat.id 
                        ? colorClass 
                        : "bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800"
                    )}
                  >
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center overflow-hidden shadow-sm border border-slate-100">
                      {cat.image ? (
                        <img src={cat.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-xl">
                          {cat.emoji || '📦'}
                        </div>
                      )}
                    </div>
                    <span className="pr-6 text-sm font-black">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* WhatsApp Style Status Feed */}
            <div className="mb-8 bg-slate-950/5 dark:bg-slate-900/20 py-3 -mx-4 px-4 sm:mx-0 sm:rounded-[24px] border-y sm:border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3 px-2">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Status</h2>
                {(user?.role === 'vendor' || user?.role === 'admin') && (
                  <button 
                    onClick={() => setIsStatusModalOpen(true)}
                    className="bg-amber-600/10 text-amber-600 px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all"
                  >
                    {t('post_status')}
                  </button>
                )}
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {/* Live Sessions */}
                {activeLiveSessions.map(session => (
                  <button 
                    key={session.id}
                    onClick={() => setActiveLiveRoomId(session.roomId)}
                    className="flex-shrink-0 w-32 h-52 rounded-[24px] overflow-hidden relative group shadow-lg transition-all hover:scale-[1.02] active:scale-95 border-2 border-red-500"
                  >
                    <div className="absolute inset-0 bg-slate-800">
                      {session.hostAvatar ? (
                        <img src={session.hostAvatar} alt="" className="w-full h-full object-cover blur-[2px] opacity-60" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-900" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute top-3 left-3 z-10">
                      <div className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" /> LIVE
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                        <Video size={24} />
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-3 right-3 z-10">
                      <p className="text-[11px] font-black text-white leading-tight line-clamp-2">{session.hostName}</p>
                      <p className="text-[9px] font-bold text-red-200 uppercase tracking-widest mt-0.5">
                        {session.type === 'shopping' ? 'Live Shopping' : 'Mnada Live'}
                      </p>
                    </div>
                  </button>
                ))}

                {/* Add Status Card */}
                {(user?.role === 'vendor' || user?.role === 'admin') && (
                  <button 
                    onClick={() => setIsStatusModalOpen(true)}
                    className="flex-shrink-0 w-32 h-52 bg-slate-900 rounded-[24px] flex flex-col items-center justify-center gap-4 group transition-all hover:scale-[1.02] active:scale-95 relative overflow-hidden"
                  >
                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center text-4xl shadow-lg group-hover:rotate-12 transition-transform">
                        🤩
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1.5 border-4 border-slate-900">
                        <Plus size={16} strokeWidth={4} />
                      </div>
                    </div>
                    <div className="text-center z-10">
                      <p className="text-xs font-black text-white leading-tight">Add</p>
                      <p className="text-xs font-black text-white leading-tight">status</p>
                    </div>
                    {/* Subtle background pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent" />
                    </div>
                  </button>
                )}

                {statuses.length === 0 && filteredEndedSessions.length === 0 && !(user?.role === 'vendor' || user?.role === 'admin') ? (
                  <div className="flex-shrink-0 w-full py-12 text-center">
                    <p className="text-slate-400 font-bold text-sm">Hakuna status kwa sasa.</p>
                  </div>
                ) : (
                  <>
                    {/* Ended Live Sessions as Stories */}
                    {filteredEndedSessions.map(session => (
                      <button 
                        key={session.id}
                        onClick={() => {
                          // When clicking an ended live, we show it as a "status"
                          // We can reuse the status viewer or show the live modal in "ended" mode
                          // For now, let's just show the live modal, it will handle the 'ended' status
                          setActiveLiveRoomId(session.roomId);
                        }}
                        className="flex-shrink-0 w-32 h-52 rounded-[24px] overflow-hidden relative group shadow-lg transition-all hover:scale-[1.02] active:scale-95 border-2 border-slate-200 dark:border-slate-800"
                      >
                        <div className="absolute inset-0 bg-slate-800">
                          {session.hostAvatar ? (
                            <img src={session.hostAvatar} alt="" className="w-full h-full object-cover opacity-60" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-3 left-3 z-10">
                          <div className="bg-slate-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            REPLAY
                          </div>
                        </div>
                        <div className="absolute bottom-4 left-3 right-3 z-10">
                          <p className="text-[11px] font-black text-white leading-tight line-clamp-2">{session.hostName}</p>
                          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">Live Ended</p>
                        </div>
                      </button>
                    ))}

                    {statuses.map(status => (
                      <button 
                        key={status.id}
                        onClick={() => setSelectedStatus(status)}
                        className="flex-shrink-0 w-32 h-52 rounded-[24px] overflow-hidden relative group shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                      >
                      {/* Background Content */}
                      <div className="absolute inset-0 bg-slate-800">
                        {status.videoUrl ? (
                          <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                            <Camera size={24} className="text-white/20" />
                            {/* If we had thumbnails we'd use them here */}
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-700 p-4 flex items-center justify-center text-center">
                            <p className="text-[10px] text-white font-black line-clamp-6 leading-tight uppercase tracking-tighter opacity-90">{status.text}</p>
                          </div>
                        )}
                      </div>

                      {/* Overlay Gradient for readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />

                      {/* Vendor Avatar with WhatsApp-style Ring */}
                      <div className="absolute top-3 left-3 z-10">
                        <div className={cn("w-11 h-11 rounded-full p-[2px] shadow-lg", viewedStatuses.includes(status.id) ? "bg-slate-300 dark:bg-slate-700" : "bg-green-500")}>
                          <div className="w-full h-full rounded-full border-2 border-slate-900 overflow-hidden bg-slate-100">
                            {status.vendorAvatar ? (
                              <img src={status.vendorAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">🏪</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Vendor Name at bottom */}
                      <div className="absolute bottom-4 left-3 right-3 z-10">
                        <p className="text-[11px] font-black text-white leading-tight line-clamp-2 drop-shadow-md">{status.vendorName}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {filteredProducts.map((p, idx) => {
                const productReviews = reviews.filter(r => r.productId === p.id);
                const avgRating = productReviews.length > 0 
                  ? productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length 
                  : 0;
                
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <ProductCard 
                      product={p} 
                      rating={avgRating}
                      isOpen={isStoreOpen(p.vendorId)}
                      onClick={() => {
                        setSelectedProduct(p);
                        setQty(1);
                      }} 
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'auctions' && <AuctionPage />}
        {activeTab === 'academy' && <AcademyPage />}

        {activeTab === 'stores' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">🏪 {t('stores')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredVendors.length === 0 ? (
                <div className="col-span-full py-20 text-center">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">🏪</div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Hakuna duka lililopatikana</h3>
                  <p className="text-slate-500 dark:text-slate-400">Jaribu kutafuta kwa jina lingine au eneo lingine.</p>
                </div>
              ) : (
                filteredVendors.map(v => (
                  <div 
                    key={v.id}
                    className="bg-white dark:bg-slate-900 rounded-[28px] border border-amber-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    onClick={() => setSelectedVendor(v)}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-3xl font-black text-amber-800 dark:text-amber-500 group-hover:scale-110 transition-transform overflow-hidden">
                        {v.shopIcon ? (
                          <img src={v.shopIcon} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          (v.shopName || v.name)[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white">{v.shopName || v.name}</h3>
                        <p className="text-xs text-slate-400">📍 {v.location}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star size={10} className="fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-black text-amber-600 dark:text-amber-500">{getVendorRating(v.id).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", isStoreOpen(v.id) ? "bg-emerald-500" : "bg-red-500")} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {isStoreOpen(v.id) ? t('open') : t('closed')}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-500">{t('view_products')} →</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
             <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">📦 {t('orders')}</h2>
             {!user ? (
               <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800">
                 <div className="text-6xl mb-4">🔒</div>
                 <p className="text-slate-500 dark:text-slate-400 mb-6">{t('login')} kuona maagizo yako</p>
                 <button onClick={() => setIsAuthModalOpen(true)} className="btn-primary">{t('login')} Sasa</button>
               </div>
             ) : (
               <div className="space-y-4">
                 {orders.filter(o => o.userId === user.id).length === 0 ? (
                   <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800">
                     <div className="text-6xl mb-4">📭</div>
                     <p className="text-slate-500 dark:text-slate-400 mb-6">Bado huna maagizo. Anza kununua sasa!</p>
                     <button onClick={() => setActiveTab('browse')} className="btn-primary">Nenda Dukani</button>
                   </div>
                 ) : (
                   orders.filter(o => o.userId === user.id).map(order => (
                     <div key={order.id} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
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
                           order.status === 'completed' ? "bg-indigo-100 text-indigo-800" :
                           order.status === 'delivered' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                         )}>
                           {order.status === 'completed' ? 'Imekamilika' : order.status}
                         </span>
                       </div>
                       <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                         <p className="font-black text-amber-700">{formatCurrency(order.total, currency)}</p>
                         <div className="flex items-center gap-2">
                           {(order.status === 'delivered' || order.status === 'completed' || order.status === 'pickup') && (
                             <button 
                               onClick={() => deleteOrder(order.id)}
                               className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                               title="Futa Agizo"
                             >
                               <Trash2 size={16} />
                             </button>
                           )}
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
                     </div>
                   ))
                 )}
               </div>
             )}
          </motion.div>
        )}
      </main>

      </div> {/* End of lg:pl-72 */}

      {/* Bottom Nav (Mobile Only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#050A18] border-t border-white/5 px-4 py-4 z-40 pb-safe">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <button 
            onClick={() => setActiveTab('browse')}
            className={cn("flex flex-col items-center gap-1.5 transition-all flex-1", activeTab === 'browse' ? "text-amber-500" : "text-slate-500")}
          >
            <ShoppingBag size={22} strokeWidth={2.5} />
            <span className="text-[9px] font-black uppercase tracking-[0.15em]">SOKO</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('auctions')}
            className={cn("flex flex-col items-center gap-1.5 transition-all flex-1 relative", activeTab === 'auctions' ? "text-amber-500" : "text-slate-500")}
          >
            <div className="relative">
              <Gavel size={22} strokeWidth={2.5} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-[#050A18]"></span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.15em]">LIVE</span>
          </button>

          <button 
            onClick={() => setActiveTab('stores')}
            className={cn("flex flex-col items-center gap-1.5 transition-all flex-1", activeTab === 'stores' ? "text-amber-500" : "text-slate-500")}
          >
            <Store size={22} strokeWidth={2.5} />
            <span className="text-[9px] font-black uppercase tracking-[0.15em]">MADUKA</span>
          </button>

          <button 
            onClick={() => setActiveTab('orders')}
            className={cn("flex flex-col items-center gap-1.5 transition-all flex-1", activeTab === 'orders' ? "text-amber-500" : "text-slate-500")}
          >
            <Package size={22} strokeWidth={2.5} />
            <span className="text-[9px] font-black uppercase tracking-[0.15em]">ODA</span>
          </button>

          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className={cn("flex flex-col items-center gap-1.5 transition-all flex-1 text-slate-500")}
          >
            <UserIcon size={22} strokeWidth={2.5} />
            <span className="text-[9px] font-black uppercase tracking-[0.15em]">WASIFU</span>
          </button>
        </div>
      </nav>

      {/* Profile Modal */}
      {isProfileModalOpen && user && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{t('my_profile')}</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all">✕</button>
            </div>

            <div className="space-y-6">
              {/* Avatar Selection */}
              <div className="flex flex-col items-center gap-6 py-6">
                <div className="relative group">
                  <div className="w-32 h-32 bg-amber-50 dark:bg-slate-800 rounded-[40px] overflow-hidden border-4 border-white dark:border-slate-700 shadow-2xl flex items-center justify-center text-5xl">
                    {profileData.avatar?.startsWith('http') ? (
                      <img src={profileData.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="dark:text-white">{profileData.avatar || '👤'}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-amber-600 text-white p-3 rounded-2xl shadow-lg border-4 border-white dark:border-slate-900">
                    <Camera size={20} />
                  </div>
                </div>
                
                <div className="w-full space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Chagua Emoji</label>
                    <div className="flex flex-wrap gap-2 justify-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                      {['👨‍🌾', '👩‍🌾', '🤠', '😎', '🤩', '🦁', '🐯', '🦊', '🐻', '🐼', '🐮', '🐷', '🐸', '🐔', '🐧'].map(emoji => (
                        <button 
                          key={emoji}
                          onClick={() => setProfileData(prev => ({ ...prev, avatar: emoji }))}
                          className={cn(
                            "w-10 h-10 flex items-center justify-center text-xl rounded-xl transition-all hover:scale-110",
                            profileData.avatar === emoji ? "bg-amber-600 shadow-lg scale-110" : "bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600"
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Au Weka Link ya Picha (URL)</label>
                    <input 
                      type="text"
                      value={profileData.avatar?.startsWith('http') ? profileData.avatar : ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, avatar: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm dark:text-white"
                      placeholder="https://picha.com/yangu.jpg"
                    />
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">{t('name')}</label>
                  <input 
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">{t('whatsapp')}</label>
                  <input 
                    type="tel"
                    placeholder="255..."
                    value={profileData.contact}
                    onChange={(e) => setProfileData(prev => ({ ...prev, contact: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/50 flex flex-col items-center justify-center text-center relative group">
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Pointi za Uaminifu</p>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-500">{user?.loyaltyPoints || 0}</p>
                    <p className="text-[8px] font-bold text-amber-500/70 mt-1 uppercase">Thamani: {formatCurrency((user?.loyaltyPoints || 0) * (systemSettings?.pointsValue || 0), currency)}</p>
                    {user?.loyaltyPoints && user.loyaltyPoints >= 100 ? (
                      <button
                        onClick={handleRedeemPoints}
                        disabled={isRedeeming}
                        className="absolute inset-0 bg-amber-500 text-white font-black text-xs rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center disabled:bg-amber-300"
                      >
                        {isRedeeming ? 'INABADILISHA...' : 'BADILISHA KUWA PESA'}
                      </button>
                    ) : null}
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">{t('language')}</label>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm dark:text-white"
                    >
                      <option value="sw">Kiswahili</option>
                      <option value="en">English</option>
                      <option value="ar">العربية (Arabic)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Barua Pepe (Email)</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300">{user.email}</p>
                </div>

                <button 
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                >
                  <ShieldCheck size={18} />
                  BADILISHA NYWILA (PASSWORD)
                </button>

                {/* Management Section */}
                {(user.role === 'admin' || user.role === 'vendor') && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-3 block">Usimamizi (Management)</label>
                    <div className="grid grid-cols-1 gap-3">
                      {user.role === 'admin' && (
                        <button 
                          onClick={() => { setView('dashboard'); setIsProfileModalOpen(false); }}
                          className="w-full flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <LayoutDashboard size={18} />
                            <span>PANELI YA ADMIN</span>
                          </div>
                          <ChevronRight size={16} />
                        </button>
                      )}
                      {user.role === 'vendor' && (
                        <button 
                          onClick={() => { setView('dashboard'); setIsProfileModalOpen(false); }}
                          className="w-full flex items-center justify-between p-4 bg-amber-600 text-white rounded-2xl font-black text-sm hover:bg-amber-700 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <Store size={18} />
                            <span>PORTAL YA MUUZAJI</span>
                          </div>
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {user.role === 'user' && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => { setIsVendorRegModalOpen(true); setIsProfileModalOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-2xl font-black text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all border border-emerald-100 dark:border-emerald-800"
                    >
                      <Store size={18} />
                      KUWA MUUZAJI (BECOME VENDOR)
                    </button>
                  </div>
                )}

                {/* Wallet Section */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-[32px] border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Wallet Balance</p>
                      <h4 className="text-2xl font-black text-amber-900 dark:text-amber-400">
                        {formatCurrency(user.walletBalance || 0, currency)}
                      </h4>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-2xl flex items-center justify-center text-amber-600">
                      <Wallet size={24} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        setWalletStep('method');
                        setIsWalletModalOpen(true);
                      }}
                      className="bg-amber-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-amber-600/20"
                    >
                      + Add Money
                    </button>
                    <button 
                      onClick={() => setIsWithdrawModalOpen(true)}
                      className="bg-emerald-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-emerald-600/20"
                    >
                      Withdraw
                    </button>
                    <button 
                      onClick={() => setIsWalletHistoryOpen(true)}
                      className="bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-400 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider border border-amber-200 dark:border-amber-900/50"
                    >
                      History
                    </button>
                    <button 
                      onClick={() => setIsOfflineQRModalOpen(true)}
                      className="col-span-2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <QrCode size={14} /> Tengeza QR (Offline Pay)
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 space-y-3">
                <button 
                  onClick={handleUpdateProfile}
                  disabled={isProfileLoading}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-amber-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProfileLoading ? '...' : t('save_changes')}
                </button>
                
                <div className="flex gap-3">
                  <button 
                    onClick={logout}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} /> {t('logout')}
                  </button>
                  <button 
                    onClick={handleDeleteAccount}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} /> FUTA AKAUNTI
                  </button>
                </div>
              </div>

              {/* System Info (Moved here from Hali) */}
              <button 
                onClick={() => {
                  alert(`Hali ya Mfumo:\nWauuzaji: ${vendors.length}\nBidhaa: ${products.length}\nOda: ${orders.length}`);
                }}
                className="w-full text-[10px] font-black text-slate-300 uppercase tracking-widest pt-4 hover:text-slate-400 transition-all"
              >
                Angalia Hali ya Mfumo
              </button>
            </div>
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
              {t('welcome')} {systemSettings?.app_name || 'Digital Livestock Market Live'}! Ili kuanza kuuza, tunahitaji maelezo ya biashara yako. 
              Admin atahakiki maelezo haya kabla ya duka lako kuwa hewani.
            </p>
          </div>
          {!user && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Barua Pepe au Namba ya Simu *</label>
                <input 
                  type="text" required className="input-field" placeholder="duka@email.com au 0712..." 
                  value={vendorFormData.identifier} onChange={e => setVendorFormData({...vendorFormData, identifier: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nywila *</label>
                <input 
                  type="password" required className="input-field" placeholder="••••••••" 
                  value={vendorFormData.password} onChange={e => setVendorFormData({...vendorFormData, password: e.target.value})}
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jina la Duka *</label>
              <input 
                type="text" required className="input-field" placeholder="Hassan Poultry Farm" 
                value={vendorFormData.shopName} onChange={e => setVendorFormData({...vendorFormData, shopName: e.target.value})}
              />
            </div>
            {!user && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jina la Mmiliki *</label>
                <input 
                  type="text" required className="input-field" placeholder="Hassan Ali" 
                  value={vendorFormData.ownerName} onChange={e => setVendorFormData({...vendorFormData, ownerName: e.target.value})}
                />
              </div>
            )}
            <div className={cn(!user ? "col-span-1" : "col-span-2")}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mkoa/Eneo la Duka *</label>
              <input 
                type="text" required className="input-field" placeholder="Dar es Salaam" 
                value={vendorFormData.location} onChange={e => setVendorFormData({...vendorFormData, location: e.target.value})}
              />
            </div>
            {(!user && isEmail(vendorFormData.identifier)) || user ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Simu ya Duka *</label>
                <input 
                  type="tel" required className="input-field" placeholder="0712345678" 
                  value={vendorFormData.phone} onChange={e => setVendorFormData({...vendorFormData, phone: e.target.value})}
                />
              </div>
            ) : null}
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

      {/* User Withdraw Modal */}
      <Modal 
        isOpen={isWithdrawModalOpen} 
        onClose={() => setIsWithdrawModalOpen(false)}
        title={withdrawStep === 'form' ? "Omba Malipo (Withdraw)" : withdrawStep === 'summary' ? "Thibitisha Malipo" : "Tuma Ombi WhatsApp"}
      >
        {withdrawStep === 'form' && (
          <div className="space-y-6">
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center">
              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Salio la Wallet</p>
              <p className="text-3xl font-black text-emerald-800">{formatCurrency(user?.walletBalance || 0, currency)}</p>
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
                    withdrawForm.method === 'mobile' ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-100 text-slate-400"
                  )}
                >
                  📱 Mtandao wa Simu
                </button>
                <button 
                  onClick={() => setWithdrawForm({...withdrawForm, method: 'bank'})}
                  className={cn(
                    "py-4 rounded-2xl font-black text-xs transition-all border-2",
                    withdrawForm.method === 'bank' ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-100 text-slate-400"
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
                    {['mpesa', 'tigo', 'airtel', 'halopesa'].map(net => (
                      <button 
                        key={net}
                        onClick={() => setWithdrawForm({...withdrawForm, network: net})}
                        className={cn(
                          "py-3 rounded-xl font-bold text-[10px] uppercase transition-all border",
                          withdrawForm.network === net ? "border-amber-500 bg-amber-50 text-amber-600" : "border-slate-100 text-slate-500"
                        )}
                      >
                        {net}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Namba ya Simu ya Malipo</label>
                  <input 
                    type="tel" 
                    placeholder="0xxx xxx xxx"
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
                    placeholder="0123456789"
                    className="input-field"
                    value={withdrawForm.accountNumber}
                    onChange={e => setWithdrawForm({...withdrawForm, accountNumber: e.target.value})}
                  />
                </div>
              </div>
            )}

            <button 
              onClick={() => setWithdrawStep('summary')}
              disabled={!withdrawForm.amount || Number(withdrawForm.amount) <= 0}
              className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl transition-all active:scale-95 shadow-xl shadow-amber-100 flex items-center justify-center gap-2"
            >
              ENDELEA <ArrowRight size={18} />
            </button>
          </div>
        )}

        {withdrawStep === 'summary' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Kiasi unachotoa</span>
                <span className="font-black text-slate-900">{formatCurrency(Number(withdrawForm.amount), currency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Makato (Fee)</span>
                <span className="font-black text-red-500">-{formatCurrency(calculateWithdrawFee(Number(withdrawForm.amount)), currency)}</span>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs font-black text-slate-900 uppercase">Utapokea (Net)</span>
                <span className="text-xl font-black text-emerald-600">{formatCurrency(Number(withdrawForm.amount) - calculateWithdrawFee(Number(withdrawForm.amount)), currency)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Njia ya Malipo</p>
                <p className="text-sm font-bold text-blue-900">
                  {withdrawForm.method === 'mobile' ? `${withdrawForm.network.toUpperCase()} (${withdrawForm.phoneNumber})` : `${withdrawForm.bankName} (${withdrawForm.accountNumber})`}
                </p>
              </div>
              <p className="text-[10px] text-center text-slate-400 font-bold uppercase leading-relaxed">
                Ombi lako litahakikiwa na Admin ndani ya saa 24. Pesa itatumwa kwenye njia uliyochagua.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setWithdrawStep('form')}
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl"
              >
                RUDI
              </button>
              <button 
                onClick={handleWithdraw}
                disabled={isWithdrawLoading}
                className="flex-2 py-4 bg-amber-600 text-white font-black rounded-2xl flex items-center justify-center gap-2"
              >
                {isWithdrawLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'THIBITISHA NA TUMA'}
              </button>
            </div>
          </div>
        )}

        {withdrawStep === 'whatsapp' && (
          <div className="text-center space-y-6 py-4">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Ombi Limetumwa!</h3>
              <p className="text-sm text-slate-500 font-medium">Tafadhali tuma ujumbe WhatsApp kwa Admin ili kuharakisha mchakato wa malipo.</p>
            </div>
            
            <button 
              onClick={() => {
                const amountNum = Number(withdrawForm.amount);
                const fee = calculateWithdrawFee(amountNum);
                const net = amountNum - fee;
                const method = withdrawForm.method === 'mobile' ? withdrawForm.network.toUpperCase() : 'BANK';
                const phone = withdrawForm.method === 'mobile' ? withdrawForm.phoneNumber : `${withdrawForm.bankName} - ${withdrawForm.accountNumber}`;
                
                const msg = `Habari Admin,\n\nNaomba kutoa pesa kutoka kwenye Wallet yangu.\n\n👤 Jina: *${user?.name}*\n💰 Kiasi: *${formatCurrency(amountNum, currency)}*\n📉 Makato: *${formatCurrency(fee, currency)}*\n💵 Net: *${formatCurrency(net, currency)}*\n💳 Njia: *${method}*\n📱 Maelezo: *${phone}*\n🆔 ID: *${lastWithdrawalId}*\n\nTafadhali nihakikie.`;
                window.open(`https://wa.me/${ADMIN_WA.replace(/\+/g,'')}?text=${encodeURIComponent(msg)}`);
              }}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl shadow-xl shadow-green-100 flex items-center justify-center gap-2"
            >
              <MessageCircle size={20} /> TUMA WHATSAPP
            </button>
            
            <button 
              onClick={() => setIsWithdrawModalOpen(false)}
              className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl"
            >
              FUNGA
            </button>
          </div>
        )}
      </Modal>
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
                { key: 'completed', label: 'Imekamilika', icon: '🌟' },
              ].map((s, i) => {
                const statuses = ['pending', 'processing', 'waiting', 'onway', 'delivered', 'completed'];
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

            {selectedOrder.status === 'delivered' && (
              <button 
                onClick={confirmReceipt}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-100"
              >
                <Check size={18} /> NIMEPOKEA MZIGO ✅
              </button>
            )}

            {selectedOrder.status !== 'completed' && (
              <button 
                onClick={() => {
                  const msg = `Habari, naomba kujua hali ya agizo langu #${selectedOrder.id.substring(0,8)}.`;
                  window.open(`https://wa.me/${ADMIN_WA.replace(/\+/g,'')}?text=${encodeURIComponent(msg)}`);
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
              >
                <Send size={18} /> WhatsApp Admin
              </button>
            )}

            <button 
              onClick={() => {
                const date = new Date(selectedOrder.createdAt).toLocaleString('sw-TZ');
                const msg = `*RISITI YA MALIPO - KUKU APP* 🧾\n--------------------------------\n*Namba ya Agizo:* #${selectedOrder.id.substring(0,8)}\n*Tarehe:* ${date}\n*Mteja:* ${selectedOrder.userName}\n*Simu:* ${selectedOrder.userContact}\n\n*BIDHAA:*\n${selectedOrder.items.map((item: any) => `${item.qty}x ${item.name} @ ${formatCurrency(item.price, currency)}`).join('\n')}\n\n*Gharama ya Usafiri:* ${formatCurrency(selectedOrder.deliveryFee, currency)}\n*Jumla Kuu:* *${formatCurrency(selectedOrder.total, currency)}*\n*Njia ya Malipo:* ${selectedOrder.payMethod.toUpperCase()}\n*Hali ya Malipo:* ${selectedOrder.paymentApproved ? 'Imelipwa ✅' : 'Inasubiri ⏳'}\n\nAsante kwa kununua na Kuku App! 🐔`;
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
              }}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              <FileText size={18} /> Tuma Risiti WhatsApp
            </button>
          </div>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={isOrderReviewModalOpen}
        onClose={() => setIsOrderReviewModalOpen(false)}
        title="Acha Maoni Yako"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">⭐</div>
              <h3 className="text-xl font-black text-slate-900">Je, umeridhika na bidhaa?</h3>
              <p className="text-slate-500 text-sm">Maoni yako yanatusaidia kuboresha huduma zetu.</p>
            </div>

            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setOrderReviewRating(star)}
                  className="transition-transform active:scale-90"
                >
                  <Star 
                    size={32} 
                    className={cn(
                      "transition-colors",
                      star <= orderReviewRating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                    )} 
                  />
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maoni (Hiyari)</label>
              <textarea
                value={orderReviewComment}
                onChange={(e) => setOrderReviewComment(e.target.value)}
                placeholder="Andika maoni yako hapa..."
                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-amber-500 min-h-[120px]"
              />
            </div>

            <button
              onClick={submitReview}
              disabled={isOrderReviewLoading}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {isOrderReviewLoading ? 'INATUMA...' : 'WASILISHA MAONI →'}
            </button>
            
            <button
              onClick={() => setIsOrderReviewModalOpen(false)}
              className="w-full text-slate-400 font-black text-xs py-2"
            >
              Sio sasa
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
            {/* Shop Banner */}
            <div className="relative h-40 -mx-6 -mt-6 mb-12">
              {selectedVendor.shopBanner ? (
                <img src={selectedVendor.shopBanner} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-600" />
              )}
              {/* Shop Icon */}
              <div className="absolute -bottom-10 left-6">
                <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[32px] p-1 shadow-2xl">
                  <div className="w-full h-full bg-amber-100 dark:bg-amber-900/30 rounded-[28px] flex items-center justify-center text-4xl font-black text-amber-800 dark:text-amber-500 overflow-hidden">
                    {selectedVendor.shopIcon ? (
                      <img src={selectedVendor.shopIcon} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      (selectedVendor.shopName || selectedVendor.name)[0].toUpperCase()
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedVendor.shopName || selectedVendor.name}</h2>
              <p className="text-sm text-slate-400 flex items-center gap-1">
                <MapPin size={14} /> {selectedVendor.location}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn(
                  "badge px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                  isStoreOpen(selectedVendor.id) ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                )}>
                  {isStoreOpen(selectedVendor.id) ? `🟢 ${t('open')}` : `🔴 ${t('closed')}`}
                </span>
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
                  <Star size={10} className="fill-amber-400 text-amber-400" />
                  <span className="text-[10px] font-black text-amber-800">{getVendorRating(selectedVendor.id).toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toa Rating kwa Duka hili</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star}
                    onClick={() => setVendorRating(star)}
                    className="transition-transform active:scale-90"
                  >
                    <Star 
                      size={24} 
                      className={cn(
                        star <= vendorRating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                      )} 
                    />
                  </button>
                ))}
              </div>
              <textarea 
                value={vendorReviewText}
                onChange={(e) => setVendorReviewText(e.target.value)}
                placeholder="Andika maoni yako hapa..."
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-amber-500"
                rows={2}
              />
              <button 
                onClick={handleVendorReview}
                disabled={isSubmittingReview}
                className="w-full bg-amber-500 text-amber-950 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider disabled:opacity-50"
              >
                {isSubmittingReview ? 'Inatuma...' : 'Tuma Rating'}
              </button>
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
                      <p className="text-[10px] font-bold text-amber-600">{formatCurrency(p.price, currency)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Minada ya Duka Hili */}
            {auctions.filter(a => a.vendorId === selectedVendor.id).length > 0 && (
              <div>
                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Gavel size={18} className="text-amber-600" /> Minada ya Duka Hili
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {auctions.filter(a => a.vendorId === selectedVendor.id).map(auction => {
                    const isEnded = auction.status === 'ended' || (auction.endTime && (auction.endTime.toDate ? auction.endTime.toDate().getTime() : new Date(auction.endTime).getTime()) <= new Date().getTime());
                    return (
                      <div 
                        key={auction.id}
                        className="bg-white border border-slate-100 rounded-[24px] p-2 shadow-sm hover:shadow-md transition-all cursor-pointer flex gap-3 items-center group"
                        onClick={() => {
                          setActiveTab('auctions');
                          setSelectedVendor(null);
                        }}
                      >
                        <div className="w-24 h-24 rounded-[20px] overflow-hidden flex-shrink-0 bg-slate-50 relative">
                          <img 
                            src={auction.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800'} 
                            alt={auction.productName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className={cn(
                            "absolute top-2 left-2 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm backdrop-blur-md",
                            isEnded ? "bg-red-500/90 text-white" : "bg-white/90 text-amber-600"
                          )}>
                            {isEnded ? 'ENDED' : 'ACTIVE'}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 py-1 pr-2">
                          <h4 className="text-sm font-black text-slate-900 truncate mb-1">{auction.productName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold line-clamp-1 mb-2">{auction.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="bg-amber-50 px-2 py-1 rounded-lg">
                              <p className="text-[8px] font-black text-amber-600 uppercase">DAU LA SASA</p>
                              <p className="text-[11px] font-black text-amber-700">{formatCurrency(auction.currentBid, currency)}</p>
                            </div>
                            {auction.highestBidderName && (
                              <div className="bg-emerald-50 px-2 py-1 rounded-lg text-right">
                                <p className="text-[8px] font-black text-emerald-600 uppercase">MSHINDI</p>
                                <p className="text-[10px] font-black text-emerald-700 truncate max-w-[60px]">{auction.highestBidderName}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button 
              onClick={() => {
                const msg = `Habari ${selectedVendor.shopName || selectedVendor.name}, nimeona duka lenu ${systemSettings?.app_name || 'Digital Livestock Market Live'} na ningependa kuuliza kuhusu bidhaa zenu.`;
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
                  {isStoreOpen(selectedProduct.vendorId) ? `🟢 ${t('open')}` : `🔴 ${t('closed')}`}
                </span>
              </div>
            </div>
            
            <div>
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{selectedProduct.name}</h2>
                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  {t(selectedProduct.category)}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-amber-400">
                  {[1,2,3,4,5].map(s => {
                    const avgRating = productReviews.length > 0 
                      ? productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length 
                      : 0;
                    return <Star key={s} size={14} className={cn(s <= Math.round(avgRating) ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-700 fill-none")} />;
                  })}
                </div>
                <span className="text-xs text-slate-400 font-bold">
                  {productReviews.length > 0 
                    ? (productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length).toFixed(1) 
                    : "0"} 
                  ({productReviews.length} {t('maoni') || 'maoni'})
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{selectedProduct.desc}</p>
            </div>

            {selectedProduct.isLivestock && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={18} className="text-emerald-600" />
                  <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest">Pasipoti ya Mfugo (Livestock Passport)</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tag Number</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{selectedProduct.tagNumber || 'N/A'}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Breed / Uzao</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{selectedProduct.breed || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Umri</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white">{selectedProduct.age || 'N/A'}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Uzito</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white">{selectedProduct.weight ? `${selectedProduct.weight} Kg` : 'N/A'}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jinsia</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{selectedProduct.gender === 'male' ? 'Dume' : 'Jike'}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hali ya Afya</p>
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                      selectedProduct.healthStatus === 'healthy' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    )}>
                      {selectedProduct.healthStatus}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2">Historia ya Chanjo & Matibabu</p>
                    {livestockHealthRecords.filter(r => r.productId === selectedProduct.id).length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-2">Hakuna rekodi za afya zilizopatikana.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                        {livestockHealthRecords
                          .filter(r => r.productId === selectedProduct.id)
                          .map(record => (
                            <div key={record.id} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                record.type === 'vaccination' ? "bg-emerald-100 text-emerald-600" :
                                record.type === 'treatment' ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                              )}>
                                {record.type === 'vaccination' ? <Syringe size={14} /> : 
                                 record.type === 'treatment' ? <CheckCircle2 size={14} /> : <FileText size={14} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                  <p className="text-[10px] font-black text-slate-900 dark:text-white truncate">{record.title}</p>
                                  <span className="text-[8px] font-bold text-slate-400">{record.date}</span>
                                </div>
                                {record.performedBy && <p className="text-[8px] text-emerald-600 font-bold uppercase">Daktari: {record.performedBy}</p>}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleDownloadCertificate}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20"
                >
                  <FileText size={16} /> Pakua Cheti (PDF)
                </button>
              </div>
            )}

            {/* Hidden Certificate Layout for PDF Generation */}
            {selectedProduct.isLivestock && (
              <div 
                id="livestock-certificate" 
                className="hidden absolute top-0 left-0 w-[800px] bg-white p-10 text-slate-900 z-[-100]"
                style={{ fontFamily: 'sans-serif' }}
              >
                <div className="border-8 border-emerald-600 p-8 rounded-3xl relative overflow-hidden">
                  {/* Watermark */}
                  <div className="absolute inset-0 opacity-5 flex items-center justify-center pointer-events-none">
                    <QrCode size={400} />
                  </div>

                  <div className="flex justify-between items-start mb-10 border-b-2 border-slate-100 pb-6 relative z-10">
                    <div>
                      <h1 className="text-4xl font-black text-emerald-800 uppercase tracking-tighter mb-2">Digital Livestock Passport</h1>
                      <p className="text-slate-500 font-bold uppercase tracking-widest">Cheti cha Mfugo & Afya</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Tarehe</p>
                      <p className="text-lg font-black">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex gap-8 mb-10 relative z-10">
                    <div className="w-64 h-64 bg-slate-50 rounded-3xl border-4 border-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
                      {selectedProduct.image ? (
                        <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                      ) : (
                        <span className="text-8xl">{selectedProduct.emoji}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-6">
                      <div>
                        <h2 className="text-3xl font-black text-slate-900 mb-1">{selectedProduct.name}</h2>
                        <p className="text-emerald-600 font-black text-xl">{formatCurrency(selectedProduct.price, currency)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tag Number</p>
                          <p className="text-lg font-black text-slate-900">{selectedProduct.tagNumber || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Breed / Uzao</p>
                          <p className="text-lg font-black text-slate-900">{selectedProduct.breed || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Umri</p>
                          <p className="text-lg font-black text-slate-900">{selectedProduct.age || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Uzito</p>
                          <p className="text-lg font-black text-slate-900">{selectedProduct.weight ? `${selectedProduct.weight} Kg` : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-10 relative z-10">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-4 border-b-2 border-slate-100 pb-2">Historia ya Afya & Chanjo</h3>
                    {livestockHealthRecords.filter(r => r.productId === selectedProduct.id).length === 0 ? (
                      <p className="text-slate-500 italic">Hakuna rekodi za afya zilizopatikana.</p>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b-2 border-slate-200">
                            <th className="py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Tarehe</th>
                            <th className="py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Aina</th>
                            <th className="py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Maelezo</th>
                            <th className="py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Daktari</th>
                          </tr>
                        </thead>
                        <tbody>
                          {livestockHealthRecords
                            .filter(r => r.productId === selectedProduct.id)
                            .map(record => (
                              <tr key={record.id} className="border-b border-slate-100">
                                <td className="py-3 font-bold text-slate-900">{record.date}</td>
                                <td className="py-3">
                                  <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-black uppercase",
                                    record.type === 'vaccination' ? "bg-emerald-100 text-emerald-700" :
                                    record.type === 'treatment' ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                                  )}>
                                    {record.type}
                                  </span>
                                </td>
                                <td className="py-3 text-sm text-slate-600">{record.title}</td>
                                <td className="py-3 text-sm font-bold text-slate-900">{record.performedBy || '-'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="flex justify-between items-end pt-6 border-t-2 border-slate-100 relative z-10">
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Mmiliki / Muuzaji</p>
                      <p className="text-xl font-black text-slate-900">{selectedProduct.vendorName}</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-white p-2 rounded-xl border-2 border-slate-200 inline-block mb-2">
                        <QRCode 
                          value={`${window.location.origin}?productId=${selectedProduct.id}`}
                          size={100}
                          level="M"
                        />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scan for Verification</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="border-t border-slate-50 dark:border-slate-800 pt-6">
              <h4 className="font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Star size={18} className="text-amber-500" /> {t('customer_reviews')}
              </h4>
              <div className="space-y-4 mb-6 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                {productReviews.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">{t('no_reviews')}</p>
                ) : (
                  productReviews.map((rev) => (
                    <div key={rev.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white">{rev.userName}</span>
                          {(user?.id === rev.userId || user?.role === 'admin' || user?.id === selectedProduct?.vendorId) && (
                            <button 
                              onClick={() => handleDeleteReview(rev.id)}
                              className="text-red-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <div className="flex text-amber-400">
                          {rev.rating > 0 && [1,2,3,4,5].map(s => <Star key={s} size={10} fill={s <= rev.rating ? "currentColor" : "none"} />)}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{rev.text}</p>
                      
                      {/* Reactions & Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleLikeReview(rev.id)}
                            className={cn(
                              "flex items-center gap-1 text-[10px] font-bold transition-colors",
                              rev.likes?.includes(user?.id || '') ? "text-amber-600" : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            <ThumbsUp size={12} />
                            {rev.likes?.length || 0}
                          </button>
                          
                          <div className="relative group">
                            <button className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600">
                              <Smile size={12} />
                              {rev.reactions?.length || 0}
                            </button>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 rounded-full p-1 gap-1 z-50">
                              {['❤️', '🔥', '👏', '🙌', '😮'].map(emoji => (
                                <button 
                                  key={emoji}
                                  onClick={() => handleReactReview(rev.id, emoji)}
                                  className="hover:scale-125 transition-transform p-1"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button 
                            onClick={() => setReplyingTo(replyingTo === rev.id ? null : rev.id)}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                          >
                            <MessageSquare size={12} />
                            {rev.replies?.length || 0}
                          </button>
                        </div>
                        <span className="text-[8px] text-slate-300 dark:text-slate-600">{rev.date}</span>
                      </div>

                      {/* Reactions Display */}
                      {rev.reactions && rev.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Array.from(new Set(rev.reactions.map(r => r.emoji))).map(emoji => (
                            <span key={emoji} className="text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">
                              {emoji} {rev.reactions?.filter(r => r.emoji === emoji).length}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Replies Display */}
                      {rev.replies && rev.replies.length > 0 && (
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                          {rev.replies.map(reply => (
                            <div key={reply.id} className="text-[10px]">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-black text-slate-900 dark:text-white">{reply.userName}</span>
                                <span className="text-[8px] text-slate-300 dark:text-slate-600">{reply.date}</span>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400">{reply.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input */}
                      {replyingTo === rev.id && (
                        <div className="mt-3 flex gap-2">
                          <input 
                            type="text"
                            placeholder="Andika jibu..."
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[10px] outline-none"
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            autoFocus
                          />
                          <button 
                            onClick={() => handleReplySubmit(rev.id)}
                            disabled={!replyText.trim()}
                            className="bg-amber-600 text-white p-1.5 rounded-lg disabled:opacity-50"
                          >
                            <Send size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              {user && (
                <form onSubmit={handleReviewSubmit} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{t('write_review')}</p>
                  <div className="flex gap-2 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <button type="button" key={s} onClick={() => setReviewRating(s)}>
                        <Star size={18} className={cn(s <= reviewRating ? "text-amber-500" : "text-slate-300 dark:text-slate-700")} fill={s <= reviewRating ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={t('write_review_placeholder')} 
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none dark:text-white"
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
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('price')}</p>
                <p className="text-xl font-black text-amber-700 dark:text-amber-500">
                  {formatCurrency(selectedProduct.price, currency)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ {selectedProduct.unit}</span>
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('stock')}</p>
                <p className="text-xl font-black text-slate-700 dark:text-slate-200">{selectedProduct.stock} {selectedProduct.unit === 'Kg' ? 'Kg' : 'pcs'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-200">{t('quantity')}:</span>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-600 dark:text-slate-400"
                >
                  <Minus size={18} />
                </button>
                <span className="text-xl font-black w-6 text-center dark:text-white">{qty}</span>
                <button 
                  onClick={() => setQty(Math.min(selectedProduct.stock, qty + 1))}
                  className="w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-slate-600 dark:text-slate-400"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                disabled={!isStoreOpen(selectedProduct.vendorId)}
                onClick={() => {
                  addToCart(selectedProduct, qty);
                  toast.success('Imeongezwa kwenye kikapu! 🛒');
                  setSelectedProduct(null);
                }}
                className={cn(
                  "py-5 rounded-[24px] font-black text-sm transition-all border-2",
                  isStoreOpen(selectedProduct.vendorId) 
                    ? "border-amber-600 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 active:scale-95" 
                    : "border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed"
                )}
              >
                {t('add_to_cart')} 🛒
              </button>
              <button 
                disabled={!isStoreOpen(selectedProduct.vendorId)}
                onClick={handleBuyClick}
                className={cn(
                  "py-5 rounded-[24px] font-black text-sm transition-all shadow-xl",
                  isStoreOpen(selectedProduct.vendorId) 
                    ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100 dark:shadow-none active:scale-95" 
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                )}
              >
                {t('buy_now')} 🚀
              </button>
            </div>
          </div>
        )}
      </Modal>

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
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm min-h-[120px] outline-none focus:ring-2 focus:ring-amber-500 transition-all dark:text-white"
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
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all dark:text-white"
              placeholder="https://youtube.com/..."
              value={statusVideoUrl}
              onChange={e => setStatusVideoUrl(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={isStatusLoading || !statusText.trim()}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-100 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isStatusLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={18} /> WEKA STATUS</>}
          </button>
        </form>
      </Modal>

      {/* Wallet Modal (Add Money) */}
      <Modal 
        isOpen={isWalletModalOpen} 
        onClose={() => {
          setIsWalletModalOpen(false);
          setWalletStep('method');
        }}
        title={walletStep === 'method' ? "Ongeza Pesa Wallet" : walletStep === 'details' ? "Maelezo ya Malipo" : "Tuma Uthibitisho"}
      >
        <div className="space-y-6">
          {walletStep === 'method' && (
            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-4">
                <p className="text-xs text-amber-800 font-bold">Weka kiasi unachotaka kuongeza kwenye wallet yako.</p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Kiasi (TZS)</label>
                <input 
                  type="number"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                  placeholder="Mf: 10000"
                  value={walletAmount}
                  onChange={e => setWalletAmount(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'tigo', label: 'Tigo Pesa', icon: '📱', color: 'bg-blue-50 text-blue-600' },
                  { id: 'mpesa', label: 'M-Pesa', icon: '📱', color: 'bg-red-50 text-red-600' },
                  { id: 'airtel', label: 'Airtel Money', icon: '📱', color: 'bg-red-50 text-red-600' },
                  { id: 'halopesa', label: 'HaloPesa', icon: '📱', color: 'bg-orange-50 text-orange-600' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (!walletAmount || Number(walletAmount) <= 0) {
                        toast.error('Tafadhali ingiza kiasi kwanza');
                        return;
                      }
                      setWalletPayMethod(m.id as any);
                      setWalletStep('details');
                    }}
                    className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 hover:border-amber-500 bg-white transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl", m.color)}>{m.icon}</span>
                      <p className="font-bold text-sm">{m.label}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {walletStep === 'details' && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Namba ya Malipo</p>
                  <div className="flex items-center justify-center gap-3">
                    <h3 className="text-2xl font-black text-slate-900">0687225353</h3>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText('0687225353');
                        toast.success('Namba imekopiwa!');
                      }}
                      className="p-2 bg-white rounded-lg shadow-sm text-amber-600 hover:bg-amber-50"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jina la Akaunti</p>
                  <h3 className="text-xl font-black text-slate-900">Amour</h3>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Jina la Mtumaji</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                    placeholder="Mf: John Doe"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Namba ya Simu</label>
                  <input 
                    type="tel"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                    placeholder="07XX XXX XXX"
                    value={senderPhone}
                    onChange={e => setSenderPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Namba ya Muamala (Transaction ID)</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                    placeholder="Mf: 5H67X9..."
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                  />
                </div>
                <button 
                  onClick={confirmDeposit}
                  disabled={isWalletLoading}
                  className="w-full bg-amber-500 text-amber-950 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  {isWalletLoading ? <div className="w-5 h-5 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" /> : 'THIBITISHA MALIPO ✅'}
                </button>
                <button 
                  onClick={() => setWalletStep('method')}
                  className="w-full text-slate-400 font-black text-xs uppercase tracking-widest"
                >
                  Rudi Nyuma
                </button>
              </div>
            </div>
          )}

          {walletStep === 'whatsapp' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">✅</div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Ombi Limetumwa!</h3>
                <p className="text-slate-500 text-sm mt-2">Tafadhali tuma uthibitisho WhatsApp ili Admin aweze kuongeza salio lako haraka.</p>
              </div>

              <button 
                onClick={() => {
                  const msg = `Habari Admin,\n\nNaomba kuongeza pesa kwenye Wallet yangu.\n\n👤 Jina: *${user?.name}*\n💰 Kiasi: *${formatCurrency(Number(walletAmount), currency)}*\n💳 Njia: *${walletPayMethod.toUpperCase()}*\n📱 Simu: *${senderPhone}*\n🔑 Trans ID: *${transactionId}*\n\nTafadhali nihakikie.`;
                  window.open(`https://wa.me/${ADMIN_WA.replace(/\+/g,'')}?text=${encodeURIComponent(msg)}`);
                  setIsWalletModalOpen(false);
                  setWalletStep('method');
                }}
                className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                TUMA UTHIBITISHO WHATSAPP 📱
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Wallet History Modal */}
      <Modal
        isOpen={isWalletHistoryOpen}
        onClose={() => setIsWalletHistoryOpen(false)}
        title="Wallet History"
      >
        <div className="space-y-4">
          {walletTransactions.filter(tx => tx.userId === user?.id).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm italic">Hakuna miamala bado.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
              {walletTransactions.filter(tx => tx.userId === user?.id).map(tx => (
                <div key={tx.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                      tx.type === 'deposit' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                    )}>
                      {tx.type === 'deposit' ? '↓' : '↑'}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        {tx.type === 'deposit' ? 'Deposit' : 'Purchase'}
                      </p>
                      <p className="text-[10px] text-slate-400">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-black text-sm",
                      tx.type === 'deposit' ? "text-emerald-600" : "text-red-600"
                    )}>
                      {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </p>
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase",
                      tx.status === 'approved' ? "bg-emerald-100 text-emerald-800" : 
                      tx.status === 'pending' ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                    )}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Offline QR Modal */}
      <Modal
        isOpen={isOfflineQRModalOpen}
        onClose={() => {
          setIsOfflineQRModalOpen(false);
          setOfflineQRAmount('');
        }}
        title="Tengeneza QR ya Kulipa"
      >
        <div className="flex flex-col items-center p-6 space-y-6">
          <div className="w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Kiasi cha Kulipa ({systemSettings?.currency || 'TZS'})</label>
            <input 
              type="number"
              value={offlineQRAmount}
              onChange={(e) => setOfflineQRAmount(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-lg dark:text-white mt-2 text-center"
              placeholder="Mfano: 5000"
            />
            {Number(offlineQRAmount) > (user?.walletBalance || 0) && (
              <p className="text-xs text-red-500 font-bold mt-2 text-center">Salio lako halitoshi. Salio: {formatCurrency(user?.walletBalance || 0, currency)}</p>
            )}
          </div>

          {Number(offlineQRAmount) > 0 && Number(offlineQRAmount) <= (user?.walletBalance || 0) && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="bg-white p-6 rounded-[40px] shadow-2xl mb-4 relative">
                <QRCode 
                  value={JSON.stringify({ 
                    type: 'offline_pay', 
                    userId: user?.id, 
                    amount: Number(offlineQRAmount),
                    timestamp: Date.now()
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
              <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                Muonyeshe Muuzaji QR hii ili akuscan na kukata kiasi cha {formatCurrency(Number(offlineQRAmount), currency)} kutoka kwenye Wallet yako.
              </p>
              <p className="text-[10px] text-amber-600 font-black mt-4 uppercase tracking-widest">
                QR hii inatumika kwa dakika 10 tu
              </p>
            </div>
          )}
        </div>
      </Modal>


      {/* Payment Modal */}
      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentStep('method');
        }}
        title={paymentStep === 'method' ? "Chagua Njia ya Malipo" : paymentStep === 'details' ? "Maelezo ya Malipo" : paymentStep === 'confirm' ? "Thibitisha Malipo" : "Tuma Uthibitisho"}
      >
        <div className="space-y-6">
          {/* Order Summary */}
          {paymentStep !== 'whatsapp' && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-500">Bidhaa:</span>
                <span className="text-sm font-bold">{selectedProduct?.name} × {qty}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-amber-200">
                <span className="font-black text-slate-900">Jumla:</span>
                <span className="font-black text-amber-700">{formatCurrency(selectedProduct?.price * qty, currency)}</span>
              </div>
            </div>
          )}

          {paymentStep === 'method' && (
            <div className="space-y-6">
              {/* Delivery Method Selector */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Njia ya Usafirishaji</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'city', label: 'Mjini', icon: '🏙️' },
                    { id: 'out', label: 'Nje ya Mji', icon: '🚚' },
                    { id: 'pickup', label: 'Pickup', icon: '🏪' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setDeliveryMethod(m.id as any)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                        deliveryMethod === m.id 
                          ? "border-amber-500 bg-amber-50 text-amber-900" 
                          : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-[10px] font-black uppercase">{m.label}</span>
                    </button>
                  ))}
                </div>
                {deliveryMethod === 'pickup' && (
                  <p className="text-[10px] text-emerald-600 font-bold text-center bg-emerald-50 py-2 rounded-xl">
                    Utakuja kuchukua mwenyewe dukani (Gharama ya usafiri ni 0)
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Njia ya Malipo</p>
                <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'wallet', label: 'Pay with Wallet', icon: '💳', color: 'bg-amber-50 text-amber-600' },
                  { id: 'tigo', label: 'Mix by Yas (Tigo Pesa)', icon: '📱', color: 'bg-blue-50 text-blue-600' },
                  { id: 'mpesa', label: 'M-Pesa', icon: '📱', color: 'bg-red-50 text-red-600' },
                  { id: 'airtel', label: 'Airtel Money', icon: '📱', color: 'bg-red-50 text-red-600' },
                  { id: 'halopesa', label: 'HaloPesa', icon: '📱', color: 'bg-orange-50 text-orange-600' },
                  { id: 'cash', label: 'Pesa Taslimu (Cash)', icon: '💵', color: 'bg-emerald-50 text-emerald-600' }
                ].map((m) => {
                  const deliveryFee = deliveryMethod === 'city' ? (selectedProduct?.deliveryCity || 0) : 
                                     deliveryMethod === 'out' ? (selectedProduct?.deliveryOut || 0) : 0;
                  const total = (selectedProduct?.price || 0) * qty + (deliveryMethod === 'pickup' ? 0 : deliveryFee);
                  const hasEnough = m.id === 'wallet' ? (user?.walletBalance || 0) >= total : true;

                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        if (m.id === 'wallet' && !hasEnough) {
                          toast.error('Salio la Wallet halitoshi. Tafadhali ongeza pesa.');
                          return;
                        }
                        setPayMethod(m.id as any);
                        if (m.id === 'cash') {
                          confirmOrder();
                        } else if (m.id === 'wallet') {
                          setPaymentStep('confirm');
                        } else {
                          setPaymentStep('details');
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left group",
                        !hasEnough && m.id === 'wallet' ? "opacity-50 cursor-not-allowed border-slate-100" : "border-slate-100 hover:border-amber-500 bg-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl", m.color)}>{m.icon}</span>
                        <div>
                          <p className="font-bold text-sm">{m.label}</p>
                          <p className="text-[10px] text-slate-400">
                            {m.id === 'wallet' ? `Salio: ${formatCurrency(user?.walletBalance || 0, currency)}` : m.id === 'cash' ? 'Lipa ukipokea mzigo' : 'Lipa sasa kwa usalama'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          )}

          {paymentStep === 'details' && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Namba ya Malipo</p>
                  <div className="flex items-center justify-center gap-3">
                    <h3 className="text-2xl font-black text-slate-900">0687225353</h3>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText('0687225353');
                        toast.success('Namba imekopiwa!');
                      }}
                      className="p-2 bg-white rounded-lg shadow-sm text-amber-600 hover:bg-amber-50"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jina la Akaunti</p>
                  <h3 className="text-xl font-black text-slate-900">Amour</h3>
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => {
                    // In a real app, this might trigger a USSD push or dialer
                    toast.success('Tafadhali kamilisha malipo kwenye simu yako');
                  }}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                >
                  LIPA SASA 💳
                </button>
                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider">
                  Tafadhali tuma pesa kisha bonyeza <span className="text-amber-600">Thibitisha Malipo</span>
                </p>
                <button 
                  onClick={() => setPaymentStep('confirm')}
                  className="w-full bg-amber-500 text-amber-950 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                >
                  THIBITISHA MALIPO ✅
                </button>
                <button 
                  onClick={() => setPaymentStep('method')}
                  className="w-full text-slate-400 font-black text-xs uppercase tracking-widest"
                >
                  Rudi Nyuma
                </button>
              </div>
            </div>
          )}

          {paymentStep === 'confirm' && (
            <div className="space-y-4">
              {payMethod === 'wallet' ? (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Wallet Balance:</span>
                    <span className="font-bold">{formatCurrency(user?.walletBalance || 0, currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-600">
                    <span className="text-sm">Product Price:</span>
                    <span className="font-bold">- {formatCurrency(selectedProduct?.price * qty, currency)}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-black text-slate-900">Balance After:</span>
                    <span className="font-black text-amber-600">
                      {formatCurrency((user?.walletBalance || 0) - (selectedProduct?.price * qty + (deliveryMethod === 'city' ? (selectedProduct?.deliveryCity || 0) : deliveryMethod === 'out' ? (selectedProduct?.deliveryOut || 0) : 0)), currency)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Jina la Mtumaji</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="Mf: John Doe"
                      value={senderName}
                      onChange={e => setSenderName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Namba ya Simu</label>
                    <input 
                      type="tel"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="07XX XXX XXX"
                      value={senderPhone}
                      onChange={e => setSenderPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Kiasi ulichotuma</label>
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="Mf: 10000"
                      value={sentAmount}
                      onChange={e => setSentAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Namba ya Muamala (Transaction ID)</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                      placeholder="Mf: 5H67X9..."
                      value={transactionId}
                      onChange={e => setTransactionId(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button 
                onClick={confirmOrder}
                disabled={isOrderLoading || (payMethod === 'wallet' && !hasEnoughWallet)}
                className={cn(
                  "w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg transition-all",
                  isOrderLoading || (payMethod === 'wallet' && !hasEnoughWallet)
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-amber-500 text-amber-950 shadow-amber-500/20 active:scale-95"
                )}
              >
                {isOrderLoading ? (
                  <div className="w-6 h-6 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  payMethod === 'wallet' ? (hasEnoughWallet ? 'CONFIRM PAYMENT 💳' : 'SALIO HALITOSHI ❌') : 'THIBITISHA MALIPO ✅'
                )}
              </button>
              <button 
                onClick={() => setPaymentStep(payMethod === 'wallet' ? 'method' : 'details')}
                className="w-full text-slate-400 font-black text-xs uppercase tracking-widest"
              >
                Rudi Nyuma
              </button>
            </div>
          )}

          {paymentStep === 'whatsapp' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">✅</div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Agizo Limepokelewa!</h3>
                <p className="text-slate-500 text-sm mt-2">Tafadhali tuma uthibitisho wa malipo WhatsApp ili agizo lako lishughulikiwe haraka.</p>
              </div>

              <button 
                onClick={() => {
                  const vendor = vendors.find(v => v.id === selectedProduct?.vendorId);
                  const msg = payMethod === 'wallet' 
                    ? `Habari Admin,\n\nKuna order mpya imelipwa kwa Wallet.\n\n📦 Product: *${selectedProduct?.name}*\n👤 Buyer: *${user?.name}*\n💳 Payment Method: Wallet\n💰 Amount: *${formatCurrency(selectedProduct?.price * qty + (deliveryMethod === 'city' ? (selectedProduct?.deliveryCity || 0) : deliveryMethod === 'out' ? (selectedProduct?.deliveryOut || 0) : 0), currency)}*\n🧑💼 Seller: *${vendor?.shopName || vendor?.name || 'N/A'}*\n📞 Seller Phone: *${vendor?.phone || 'N/A'}*`
                    : `Habari,\n\nNimelipia bidhaa kwenye app.\n\n📦 Product: *${selectedProduct?.name}*\n👤 Jina la Mnunuzi: *${user?.name}*\n\n💳 Njia ya Malipo: *${payMethod.toUpperCase()}*\n\n📱 Namba ya Mtumaji: *${senderPhone}*\n💰 Kiasi: *${formatCurrency(Number(sentAmount), currency)}*\n🔑 Transaction ID: *${transactionId}*\n\n🧑💼 Muuzaji wa Product: *${vendor?.shopName || vendor?.name || 'N/A'}*\n📞 Namba ya Muuzaji: *${vendor?.phone || 'N/A'}*\n\nAsante.`;
                  window.open(`https://wa.me/${ADMIN_WA.replace(/\+/g,'')}?text=${encodeURIComponent(msg)}`);
                  
                  // Reset and close
                  setIsPaymentModalOpen(false);
                  setPaymentStep('method');
                  setSelectedProduct(null);
                  setActiveTab('orders');
                }}
                className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                TUMA UTHIBITISHO WHATSAPP 📱
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Status Viewer Modal (WhatsApp Style) */}
      <AnimatePresence>
        {selectedStatus && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
          >
            {/* Progress Bar */}
            <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${statusProgress}%` }}
                />
              </div>
            </div>

            {/* Header */}
            <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-green-500 p-0.5">
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-800">
                    {selectedStatus.vendorAvatar ? (
                      <img src={selectedStatus.vendorAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold">🏪</div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-white font-black text-sm">{selectedStatus.vendorName}</p>
                  <p className="text-white/60 text-[10px] uppercase tracking-widest">Sasa hivi</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(user?.role === 'admin' || user?.id === selectedStatus.vendorId) && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStatus(selectedStatus.id);
                      setSelectedStatus(null);
                    }}
                    className="p-2 text-white/60 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  onClick={() => setSelectedStatus(null)}
                  className="p-2 text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="w-full h-full flex items-center justify-center relative">
              {selectedStatus.videoUrl ? (
                <div className="w-full h-full max-w-lg aspect-[9/16] bg-black flex items-center justify-center">
                  {getEmbedUrl(selectedStatus.videoUrl) ? (
                    <iframe 
                      src={`${getEmbedUrl(selectedStatus.videoUrl)}?autoplay=1&mute=0`}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  ) : (
                    <div className="text-white text-center p-8">
                      <Camera size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-bold">Video haiwezi kuonyeshwa</p>
                      <p className="text-xs opacity-60">{selectedStatus.videoUrl}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8 text-center bg-gradient-to-br from-amber-500 to-orange-700">
                  <p className="text-2xl sm:text-4xl text-white font-black leading-tight uppercase tracking-tighter drop-shadow-2xl">
                    {selectedStatus.text}
                  </p>
                </div>
              )}

              {/* Interaction Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-20">
                <div className="max-w-lg mx-auto">
                  <div className="flex items-center gap-6 mb-4">
                    <button 
                      onClick={() => handleLikeStatus(selectedStatus.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 transition-all",
                        selectedStatus.likes.includes(user?.id || '') ? "text-amber-500 scale-110" : "text-white"
                      )}
                    >
                      <ThumbsUp size={24} fill={selectedStatus.likes.includes(user?.id || '') ? "currentColor" : "none"} />
                      <span className="text-[10px] font-black">{selectedStatus.likes.length}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-white">
                      <MessageSquare size={24} />
                      <span className="text-[10px] font-black">{selectedStatus.comments.length}</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  <div className="max-h-40 overflow-y-auto mb-4 scrollbar-hide space-y-3 px-2">
                    {selectedStatus.comments.length === 0 ? (
                      <p className="text-white/40 text-[10px] italic text-center py-2">Hakuna maoni bado. Kuwa wa kwanza!</p>
                    ) : (
                      selectedStatus.comments.map(comment => (
                        <div key={comment.id} className="flex flex-col bg-white/5 p-2 rounded-xl border border-white/10">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-black text-amber-500 text-[10px]">{comment.userName}</span>
                            <span className="text-[8px] text-white/30">Leo</span>
                          </div>
                          <p className="text-white text-[11px] leading-relaxed">{comment.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Andika maoni..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-white/30"
                      value={commentText[selectedStatus.id] || ''}
                      onChange={e => setCommentText(prev => ({ ...prev, [selectedStatus.id]: e.target.value }))}
                      onFocus={() => setIsPaused(true)}
                      onBlur={() => setIsPaused(false)}
                    />
                    <button 
                      onClick={() => handleCommentStatus(selectedStatus.id)}
                      disabled={!commentText[selectedStatus.id]?.trim()}
                      className="bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-full disabled:opacity-50 transition-all active:scale-90 shadow-lg"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartFloatingBar onClick={() => setIsCartModalOpen(true)} />

      {/* Cart Modal */}
      <Modal 
        isOpen={isCartModalOpen} 
        onClose={() => setIsCartModalOpen(false)}
        title={`${t('cart_title')} 🛒`}
      >
        <div className="space-y-6">
          {cart.length === 0 ? (
            <div className="text-center py-20">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12 }}
                className="w-32 h-32 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-inner relative"
              >
                <ShoppingCart size={48} className="text-slate-200 dark:text-slate-700" />
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-2 -right-2 text-4xl"
                >
                  🛒
                </motion.div>
              </motion.div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('cart_empty')}</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-10">Hujachagua bidhaa yoyote bado</p>
              <button 
                onClick={() => setIsCartModalOpen(false)}
                className="px-10 py-5 bg-amber-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-amber-600/30 active:scale-95 transition-all hover:bg-amber-700"
              >
                {t('start_shopping')}
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 scrollbar-hide">
                <AnimatePresence mode="popLayout">
                  {cart.map(item => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-5 bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-amber-100 dark:hover:border-amber-900/30 transition-all group"
                    >
                      <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[24px] overflow-hidden border border-slate-100 dark:border-slate-800 flex-shrink-0 relative">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-black text-slate-900 dark:text-white truncate text-base">{item.name}</h4>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-sm font-black text-amber-600 dark:text-amber-500 mt-1">{formatCurrency(item.price, currency)}</p>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-2xl p-1 border border-slate-100 dark:border-slate-700">
                            <button 
                              onClick={() => updateCartQty(item.productId, -1)}
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-red-500 transition-all shadow-sm"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="text-sm font-black w-10 text-center dark:text-white">{item.qty}</span>
                            <button 
                              onClick={() => updateCartQty(item.productId, 1)}
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-emerald-500 transition-all shadow-sm"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Subtotal</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {formatCurrency(item.price * item.qty, currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-inner">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] block mb-2">{t('total')}</span>
                    <motion.span 
                      key={cart.reduce((sum, item) => sum + (item.price * item.qty), 0)}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter"
                    >
                      {formatCurrency(cart.reduce((sum, item) => sum + (item.price * item.qty), 0), currency)}
                    </motion.span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px]">
                          {i === 1 ? '💳' : i === 2 ? '📱' : '🚚'}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-1.5 rounded-full uppercase tracking-widest">
                      Malipo Salama
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (!user) {
                      setIsCartModalOpen(false);
                      setIsAuthModalOpen(true);
                    } else {
                      const firstItem = cart[0];
                      const product = products.find(p => p.id === firstItem.productId);
                      if (product) {
                        setSelectedProduct(product);
                        setQty(firstItem.qty);
                        setIsCartModalOpen(false);
                        setIsPaymentModalOpen(true);
                      }
                    }
                  }}
                  className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 bg-[length:200%_auto] hover:bg-right text-white font-black py-6 rounded-[32px] shadow-2xl shadow-amber-600/30 transition-all active:scale-95 flex items-center justify-center gap-4 group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <span className="text-base uppercase tracking-[0.3em] relative z-10">{t('checkout')}</span>
                  <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform relative z-10" />
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)}
        title="Badilisha Nywila"
      >
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nywila Mpya</label>
            <input 
              type="password" 
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold dark:text-white"
              placeholder="••••••••"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Rudia Nywila Mpya</label>
            <input 
              type="password" 
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold dark:text-white"
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

      <RecentPurchases />
      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      {/* Floating Scan Button (Mobile) */}
      <div className="fixed bottom-24 right-6 z-40 lg:hidden">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsQRScannerOpen(true)}
          className="w-14 h-14 bg-amber-500 text-amber-950 rounded-full shadow-2xl flex items-center justify-center border-4 border-white dark:border-slate-950"
        >
          <QrCode size={24} />
        </motion.button>
      </div>

      <AnimatePresence>
        {isQRScannerOpen && (
          <QRScanner 
            onScan={handleQRScan} 
            onClose={() => setIsQRScannerOpen(false)} 
            title="Skani QR Code"
          />
        )}
      </AnimatePresence>

      <Modal isOpen={isQRPaymentModalOpen} onClose={() => setIsQRPaymentModalOpen(false)} title="Kamilisha Malipo">
        {qrPaymentData.vendor && (
          <div className="flex flex-col items-center p-6">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
              <Store size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{qrPaymentData.vendor.shopName}</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Malipo ya QR Code</p>
            
            <div className="w-full space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Kiasi cha Kulipa ({systemSettings?.currency || 'TZS'})</label>
                <input 
                  type="number"
                  value={qrPaymentData.amount}
                  onChange={(e) => setQrPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-transparent text-3xl font-black text-slate-900 dark:text-white outline-none"
                  placeholder="0"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Salio Lako:</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-500">
                  {systemSettings?.currency || 'TZS'} {(user?.walletBalance || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <button 
              onClick={handleQRPayment}
              disabled={isProcessingQRPayment || !qrPaymentData.amount || Number(qrPaymentData.amount) <= 0 || (user?.walletBalance || 0) < Number(qrPaymentData.amount)}
              className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isProcessingQRPayment ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={20} />
                  THIBITISHA MALIPO
                </>
              )}
            </button>
          </div>
        )}
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
      <LiveStreamModal 
        key={activeLiveRoomId || 'no-room'}
        isOpen={!!activeLiveRoomId} 
        onClose={() => setActiveLiveRoomId(null)} 
        roomId={activeLiveRoomId || ''} 
        isHost={false} 
        userId={user?.id || `guest_${Math.floor(Math.random() * 10000)}`} 
        userName={user?.name || 'Mteja'} 
      />
    </div>
  );
};
