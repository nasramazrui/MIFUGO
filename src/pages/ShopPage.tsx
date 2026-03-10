import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Status } from '../types';
import { ProductCard } from '../components/ProductCard';
import { CartFloatingBar } from '../components/CartFloatingBar';
import { CATEGORIES, DAYS, ADMIN_WA } from '../constants';
import { Modal } from '../components/Modal';
import { formatCurrency, generateId, cn } from '../utils';
import { AuthModal } from '../components/AuthModal';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShoppingBag, ShoppingCart, Store, Package, Star, Plus, Minus, Send, MapPin, LogOut, Info, User as UserIcon, Settings, Trash2, Camera, X, ThumbsUp, MessageSquare, Smile, Moon, Sun, Globe, LayoutDashboard, ChevronRight, Copy, Wallet, ArrowRight, Check, Gavel } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db, auth } from '../services/firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile, deleteUser } from 'firebase/auth';
import { AuctionPage } from './AuctionPage';
import { IKContext, IKUpload } from 'imagekitio-react';
import { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT, IMAGEKIT_AUTH_ENDPOINT, isImageKitConfigured } from '../services/imageKitService';

export const ShopPage: React.FC = () => {
  const { products, user, vendors, orders, setOrders, addActivity, reviews, statuses, categories, auctions, walletTransactions, logout, systemSettings, t, theme, setTheme, language, setLanguage, setView, cart, addToCart, removeFromCart, updateCartQty } = useApp();
  const currency = systemSettings?.currency || 'TZS';
  const [activeTab, setActiveTab] = useState<'browse' | 'stores' | 'orders' | 'auctions'>('browse');
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [viewedStatuses, setViewedStatuses] = useState<string[]>(() => {
    const saved = localStorage.getItem('viewed_statuses');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWalletHistoryOpen, setIsWalletHistoryOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletStep, setWalletStep] = useState<'method' | 'details' | 'whatsapp'>('method');
  const [walletPayMethod, setWalletPayMethod] = useState<'mpesa' | 'tigo' | 'airtel' | 'halopesa'>('tigo');
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [lastWalletTxId, setLastWalletTxId] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Status State
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
          theme,
          language,
          createdAt: new Date().toISOString(),
          serverCreatedAt: serverTimestamp()
        };
        
        await setDoc(doc(db, 'kuku_users', fbUser.uid), vendorData);
        addActivity('🏪', `Muuzaji mpya "${vendorFormData.shopName}" amejisajili`);
        toast.success('Usajili umekamilika! Subiri idhini ya Admin.');
      }
      
      const msg = `*Maombi ya Muuzaji — ${systemSettings?.app_name || 'FarmConnect'}*\n\nJina la Duka: ${vendorFormData.shopName}\nMmiliki: ${user?.name || vendorFormData.ownerName}\nSimu: ${vendorFormData.phone}\n\nTafadhali nihakikie.`;
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

  const confirmReceipt = async () => {
    if (!selectedOrder) return;
    
    try {
      await updateDoc(doc(db, 'kuku_orders', selectedOrder.id), { 
        status: 'completed',
        receivedAt: serverTimestamp()
      });
      setIsTrackingModalOpen(false);
      setIsOrderReviewModalOpen(true);
      toast.success('Asante kwa kuthibitisha! Tafadhali acha maoni yako.');
    } catch (error) {
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
        productName: selectedOrder.productName,
        vendorId: selectedOrder.vendorId,
        rating: orderReviewRating || 0,
        comment: orderReviewComment || '',
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      
      setIsOrderReviewModalOpen(false);
      setOrderReviewRating(0);
      setOrderReviewComment('');
      toast.success('Asante kwa maoni yako!');
    } catch (error) {
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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800/50 flex-col z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-amber-600/20">
              {systemSettings?.app_name?.[0] || 'K'}
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {systemSettings?.app_name || 'Kuku Market'}
            </h1>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'browse', label: t('market'), icon: ShoppingBag },
              { id: 'auctions', label: t('auctions'), icon: Gavel },
              { id: 'cart', label: t('cart_title'), icon: ShoppingCart },
              { id: 'stores', label: t('stores'), icon: Store },
              { id: 'orders', label: t('orders'), icon: Package },
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
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-amber-500/20 focus:bg-white dark:focus:bg-slate-900 rounded-[20px] pl-14 pr-6 py-3.5 text-sm font-bold outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="relative" ref={langRef}>
                  <button 
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-amber-600 transition-all font-black text-[10px] uppercase tracking-widest"
                  >
                    <Globe size={18} /> {language}
                  </button>
                  <AnimatePresence>
                    {isLangOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-40 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-2 overflow-hidden z-50"
                      >
                        {['sw', 'en', 'ar', 'hi'].map(l => (
                          <button
                            key={l}
                            onClick={() => { setLanguage(l as any); setIsLangOpen(false); }}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              language === l ? "bg-amber-600 text-white" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                          >
                            {l === 'sw' ? 'Kiswahili' : l === 'en' ? 'English' : l === 'ar' ? 'العربية' : 'हिन्दी'}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <button 
                onClick={() => setIsVendorRegModalOpen(true)}
                className="flex bg-amber-600/10 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[8px] sm:text-[10px] uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all active:scale-95 border border-amber-600/20 whitespace-nowrap"
              >
                <Store size={14} className="sm:hidden" />
                <span className="hidden sm:inline">{t('register_store')}</span>
                <span className="sm:hidden ml-1">SAJILI</span>
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                  {user.role === 'admin' && (
                    <button 
                      onClick={() => setView('dashboard')}
                      className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                    >
                      <LayoutDashboard size={20} />
                    </button>
                  )}
                  {user.role === 'vendor' && (
                    <button 
                      onClick={() => setView('dashboard')}
                      className="p-3 bg-amber-600 text-white rounded-2xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
                    >
                      <Store size={20} />
                    </button>
                  )}
                  <button 
                    onClick={() => setIsProfileModalOpen(true)}
                    className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm active:scale-95 transition-all"
                  >
                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">👤</div>}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-600/20 active:scale-95 transition-all"
                >
                  {t('login')}
                </button>
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
        {activeTab === 'browse' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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

                {statuses.length === 0 && !(user?.role === 'vendor' || user?.role === 'admin') ? (
                  <div className="flex-shrink-0 w-full py-12 text-center">
                    <p className="text-slate-400 font-bold text-sm">Hakuna status kwa sasa.</p>
                  </div>
                ) : (
                  statuses.map(status => (
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
                  ))
                )}
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#050A18] border-t border-white/5 px-4 py-3 z-40 pb-safe">
        <div className="max-w-md mx-auto flex justify-between items-end">
          <button 
            onClick={() => setActiveTab('browse')}
            className={cn("flex flex-col items-center gap-1 transition-all flex-1", activeTab === 'browse' ? "text-amber-500" : "text-slate-500")}
          >
            <ShoppingBag size={20} strokeWidth={2} />
            <span className="text-[8px] font-black uppercase tracking-widest">{t('market')}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('auctions')}
            className={cn("flex flex-col items-center gap-1 transition-all flex-1", activeTab === 'auctions' ? "text-amber-500" : "text-slate-500")}
          >
            <Gavel size={20} strokeWidth={2} />
            <span className="text-[8px] font-black uppercase tracking-widest">{t('auctions')}</span>
          </button>

          <button 
            onClick={() => setActiveTab('stores')}
            className={cn("flex flex-col items-center gap-1 transition-all flex-1", activeTab === 'stores' ? "text-amber-500" : "text-slate-500")}
          >
            <Store size={20} strokeWidth={2} />
            <span className="text-[8px] font-black uppercase tracking-widest">{t('stores')}</span>
          </button>

          <button 
            onClick={() => setActiveTab('orders')}
            className={cn("flex flex-col items-center gap-1 transition-all flex-1", activeTab === 'orders' ? "text-amber-500" : "text-slate-500")}
          >
            <Package size={20} strokeWidth={2} />
            <span className="text-[8px] font-black uppercase tracking-widest">{t('orders')}</span>
          </button>
          
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className={cn("flex flex-col items-center gap-1 transition-all flex-1 text-slate-500")}
          >
            <UserIcon size={20} strokeWidth={2} />
            <span className="text-[8px] font-black uppercase tracking-widest">{t('profile')}</span>
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
                      onClick={() => setIsWalletHistoryOpen(true)}
                      className="bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-400 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider border border-amber-200 dark:border-amber-900/50"
                    >
                      History
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
              {t('welcome')} {systemSettings?.app_name || 'FarmConnect'}! Ili kuanza kuuza, tunahitaji maelezo ya biashara yako. 
              Admin atahakiki maelezo haya kabla ya duka lako kuwa hewani.
            </p>
          </div>
          {!user && (
            <div className="grid grid-cols-2 gap-4">
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

            <button 
              onClick={() => {
                const msg = `Habari ${selectedVendor.shopName || selectedVendor.name}, nimeona duka lenu ${systemSettings?.app_name || 'FarmConnect'} na ningependa kuuliza kuhusu bidhaa zenu.`;
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
