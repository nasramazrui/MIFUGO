import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Product, Order, Review, Activity, Withdrawal, Status, Category, WalletTransaction, Auction, CartItem, AcademyPost, LoyaltyPoint, Invoice, ForumPost, ChatMessage, VaccinationRecord, RecurringOrder, LivestockHealthRecord, Livestock, MedicalRecord, BreedingRecord, ProductionRecord, NutritionRecord } from '../types';
import { generateId } from '../utils';
import { ADMIN_EMAIL, ADMIN_PASS, TRANSLATIONS } from '../constants';
import { 
  auth, 
  db,
  onAuthStateChanged, 
  signOut,
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  where,
  increment,
  getDocs,
  handleFirestoreError,
  OperationType,
  or
} from '../services/firebase';
import { GoogleGenAI } from "@google/genai";
import { toast } from 'react-hot-toast';

export interface Notification {
  id: string;
  userId: string; // 'all' or specific user id
  title: string;
  message: string;
  image?: string;
  link?: string;
  date: string;
  readBy: string[];
  deletedBy?: string[];
  createdAt: any;
}

export interface Offer {
  id: string;
  vendorId: string;
  title: string;
  message: string;
  image?: string;
  link?: string;
  expiryDate?: string;
  productIds: string[]; // 'all' or specific product IDs
  createdAt: any;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  vendors: User[];
  setVendors: React.Dispatch<React.SetStateAction<User[]>>;
  doctors: User[];
  setDoctors: React.Dispatch<React.SetStateAction<User[]>>;
  admins: User[];
  setAdmins: React.Dispatch<React.SetStateAction<User[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  activities: Activity[];
  addActivity: (icon: string, text: string) => void;
  withdrawals: Withdrawal[];
  setWithdrawals: React.Dispatch<React.SetStateAction<Withdrawal[]>>;
  statuses: Status[];
  setStatuses: React.Dispatch<React.SetStateAction<Status[]>>;
  walletTransactions: WalletTransaction[];
  setWalletTransactions: React.Dispatch<React.SetStateAction<WalletTransaction[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  auctions: Auction[];
  setAuctions: React.Dispatch<React.SetStateAction<Auction[]>>;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  offers: Offer[];
  setOffers: React.Dispatch<React.SetStateAction<Offer[]>>;
  addNotification: (title: string, message: string, userId?: string, link?: string) => Promise<void>;
  systemSettings: any;
  updateSystemSettings: (settings: any) => Promise<void>;
  logout: () => void;
  t: (key: string) => string;
  loading: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  language: 'sw' | 'en' | 'ar' | 'hi';
  setLanguage: (lang: 'sw' | 'en' | 'ar' | 'hi') => void;
  view: 'auto' | 'shop' | 'dashboard';
  setView: (view: 'auto' | 'shop' | 'dashboard') => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (id: string) => void;
  updateCartQty: (productId: string, delta: number) => void;
  academyPosts: AcademyPost[];
  loyaltyPoints: LoyaltyPoint[];
  invoices: Invoice[];
  forumPosts: ForumPost[];
  chatMessages: ChatMessage[];
  livestock: Livestock[];
  vaccinationRecords: VaccinationRecord[];
  medicalRecords: MedicalRecord[];
  breedingRecords: BreedingRecord[];
  productionRecords: ProductionRecord[];
  nutritionRecords: NutritionRecord[];
  livestockHealthRecords: LivestockHealthRecord[];
  recurringOrders: RecurringOrder[];
  liveSessions: any[];
  handleReferral: (referralCode: string, newUserId: string) => Promise<void>;
  confirmModal: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  };
  setConfirmModal: (state: { isOpen: boolean; title: string; message: string; onConfirm: () => void | Promise<void> }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark'>((localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [language, setLanguageState] = useState<'sw' | 'en' | 'ar' | 'hi'>((localStorage.getItem('language') as 'sw' | 'en' | 'ar' | 'hi') || 'sw');
  const [view, setView] = useState<'auto' | 'shop' | 'dashboard'>('auto');
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('kuku_cart');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing cart from localStorage:", e);
      return [];
    }
  });
  const [academyPosts, setAcademyPosts] = useState<AcademyPost[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPoint[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [vaccinationRecords, setVaccinationRecords] = useState<VaccinationRecord[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([]);
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([]);
  const [nutritionRecords, setNutritionRecords] = useState<NutritionRecord[]>([]);
  const [livestockHealthRecords, setLivestockHealthRecords] = useState<LivestockHealthRecord[]>([]);
  const [recurringOrders, setRecurringOrders] = useState<RecurringOrder[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play blocked:", e));
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  useEffect(() => {
    if (notifications.length > lastNotificationCount && lastNotificationCount !== 0) {
      const latest = notifications[0];
      // Only play if it's for this user or 'all'
      if (latest.userId === 'all' || latest.userId === user?.id) {
        playNotificationSound();
      }
    }
    setLastNotificationCount(notifications.length);
  }, [notifications, user?.id]);

  useEffect(() => {
    localStorage.setItem('kuku_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, quantity: number) => {
    const safeCart = Array.isArray(cart) ? cart : [];
    const existing = safeCart.find(item => item.productId === product.id);
    if (existing) {
      setCart(safeCart.map(item => 
        item.productId === product.id 
          ? { ...item, qty: item.qty + quantity } 
          : item
      ));
    } else {
      setCart([...safeCart, {
        id: generateId(),
        productId: product.id,
        name: product.name,
        price: product.price,
        qty: quantity,
        image: product.image || '',
        vendorId: product.vendorId
      }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(prev => (Array.isArray(prev) ? prev : []).filter(item => item.id !== id));
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      if (!Array.isArray(prev)) return [];
      const existing = prev.find(item => item.productId === productId);
      if (!existing) return prev;
      
      const newQty = existing.qty + delta;
      if (newQty <= 0) {
        return prev.filter(item => item.productId !== productId);
      }
      
      return prev.map(item => 
        item.productId === productId 
          ? { ...item, qty: newQty } 
          : item
      );
    });
  };

  const setTheme = async (newTheme: 'light' | 'dark') => {
    try {
      setThemeState(newTheme);
      localStorage.setItem('theme', newTheme);
      if (user) {
        await updateDoc(doc(db, 'kuku_users', user.id), { theme: newTheme });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `kuku_users/${user?.id}`);
    }
  };

  const setLanguage = async (newLang: 'sw' | 'en' | 'ar' | 'hi') => {
    try {
      setLanguageState(newLang);
      localStorage.setItem('language', newLang);
      if (user) {
        await updateDoc(doc(db, 'kuku_users', user.id), { language: newLang });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `kuku_users/${user?.id}`);
    }
  };

  // Sync theme and language with user profile ONLY on initial user load or login
  const [hasSyncedProfile, setHasSyncedProfile] = useState(false);
  useEffect(() => {
    if (user && !hasSyncedProfile) {
      if (user.theme) {
        setThemeState(user.theme);
        localStorage.setItem('theme', user.theme);
      }
      if (user.language) {
        setLanguageState(user.language);
        localStorage.setItem('language', user.language);
      }
      setHasSyncedProfile(true);
    } else if (!user) {
      setHasSyncedProfile(false);
    }
  }, [user, hasSyncedProfile]);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Auth Listener
  useEffect(() => {
    // Safety timeout: if auth doesn't respond in 8 seconds, stop loading
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 8000);

    let unsubUser: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubUser) unsubUser();
      
      try {
        if (fbUser) {
          unsubUser = onSnapshot(doc(db, 'kuku_users', fbUser.uid), (snap) => {
            if (snap.exists()) {
              setUser({ id: fbUser.uid, ...snap.data() } as User);
            } else if (fbUser.email === ADMIN_EMAIL) {
              const adminData: User = {
                id: fbUser.uid,
                name: 'Admin',
                email: ADMIN_EMAIL,
                role: 'admin',
                theme,
                language,
                walletBalance: 0,
                createdAt: new Date().toISOString()
              };
              setDoc(doc(db, 'kuku_users', fbUser.uid), adminData).catch(err => handleFirestoreError(err, OperationType.CREATE, `kuku_users/${fbUser.uid}`));
              setUser(adminData);
            }
            setLoading(false);
            clearTimeout(safetyTimer);
          }, (err) => {
            handleFirestoreError(err, OperationType.GET, `kuku_users/${fbUser.uid}`);
          });
        } else {
          setUser(null);
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      } catch (error) {
        console.error("Auth listener error:", error);
        setUser(null);
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUser) unsubUser();
      clearTimeout(safetyTimer);
    };
  }, []);

  // Firestore Listeners - Public Data
  useEffect(() => {
    const publicUnsubs: (() => void)[] = [];

    const setupPublicListener = (collName: string, setter: (data: any) => void, orderField = 'createdAt', direction: 'asc' | 'desc' = 'desc') => {
      const q = query(collection(db, collName), orderBy(orderField, direction));
      const unsub = onSnapshot(q, (snap) => {
        setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, collName);
      });
      publicUnsubs.push(unsub);
    };

    // Products
    setupPublicListener('kuku_products', setProducts);
    
    // Categories
    setupPublicListener('kuku_categories', setCategories, 'createdAt', 'asc');
    
    // Auctions
    setupPublicListener('kuku_auctions', setAuctions);
    
    // Reviews
    setupPublicListener('kuku_reviews', setReviews);
    
    // Statuses
    setupPublicListener('kuku_statuses', setStatuses);
    
    // Academy
    setupPublicListener('kuku_academy', setAcademyPosts);
    
    // Forum
    setupPublicListener('kuku_forum', setForumPosts);
    
    // Offers
    setupPublicListener('kuku_offers', setOffers);

    // Live Sessions
    setupPublicListener('kuku_live_sessions', setLiveSessions);

    // System Settings
    const unsubSettings = onSnapshot(doc(db, 'kuku_config', 'settings'), (snap) => {
      if (snap.exists()) {
        setSystemSettings(snap.data());
      } else {
        setSystemSettings({});
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'kuku_config/settings');
    });
    publicUnsubs.push(unsubSettings);

    // Vendors (Publicly readable)
    const qVendors = query(collection(db, 'kuku_users'), where('role', '==', 'vendor'), orderBy('createdAt', 'desc'));
    const unsubVendors = onSnapshot(qVendors, (snap) => {
      setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    }, (err) => {
      // Only log if it's not a permission error for unauthenticated users
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.GET, 'kuku_users_vendors');
      }
    });
    publicUnsubs.push(unsubVendors);

    // Doctors (Publicly readable)
    const qDoctors = query(collection(db, 'kuku_users'), where('role', '==', 'doctor'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'));
    const unsubDoctors = onSnapshot(qDoctors, (snap) => {
      setDoctors(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.GET, 'kuku_users_doctors');
      }
    });
    publicUnsubs.push(unsubDoctors);

    return () => {
      publicUnsubs.forEach(unsub => unsub());
    };
  }, []);

  // Firestore Listeners - Authenticated Data
  useEffect(() => {
    if (!user) {
      // Clear authenticated data when logged out
      setOrders([]);
      setActivities([]);
      setWithdrawals([]);
      setChatMessages([]);
      setNotifications([]);
      setWalletTransactions([]);
      setLoyaltyPoints([]);
      setInvoices([]);
      setLivestock([]);
      setVaccinationRecords([]);
      setMedicalRecords([]);
      setBreedingRecords([]);
      setProductionRecords([]);
      setNutritionRecords([]);
      setLivestockHealthRecords([]);
      setRecurringOrders([]);
      return;
    }

    const authUnsubs: (() => void)[] = [];

    const setupAuthListener = (collName: string, setter: (data: any) => void, orderField = 'createdAt', direction: 'asc' | 'desc' = 'desc') => {
      let q;
      if (user.role === 'admin') {
        q = query(collection(db, collName), orderBy(orderField, direction));
      } else {
        // Filter by userId or vendorId for non-admins
        if (collName === 'kuku_chat') {
          q = query(collection(db, collName), or(where('senderId', '==', user.id), where('receiverId', '==', user.id)), orderBy(orderField, direction));
        } else if (collName === 'kuku_orders') {
          q = query(collection(db, collName), or(where('userId', '==', user.id), where('vendorId', '==', user.id)), orderBy(orderField, direction));
        } else if (collName === 'kuku_notifications') {
          q = query(collection(db, collName), where('userId', 'in', [user.id, 'all']), orderBy(orderField, direction));
        } else if (collName === 'kuku_activity') {
          q = query(collection(db, collName), where('userId', '==', user.id), orderBy(orderField, direction));
        } else if (collName === 'kuku_withdrawals' || collName === 'kuku_wallet' || collName === 'kuku_invoices') {
          q = query(collection(db, collName), or(where('userId', '==', user.id), where('vendorId', '==', user.id)), orderBy(orderField, direction));
        } else if (collName.startsWith('kuku_livestock') || collName.includes('records')) {
          // Livestock related collections often use vendorId or userId
          q = query(collection(db, collName), or(where('userId', '==', user.id), where('vendorId', '==', user.id)), orderBy(orderField, direction));
        } else {
          q = query(collection(db, collName), where('userId', '==', user.id), orderBy(orderField, direction));
        }
      }

      const unsub = onSnapshot(q, (snap) => {
        setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => {
        // Suppress permission errors for non-admins on certain collections if needed
        if (err.code === 'permission-denied' && user.role !== 'admin') {
          console.warn(`Permission denied for ${collName}, skipping listener.`);
          return;
        }
        handleFirestoreError(err, OperationType.GET, collName);
      });
      authUnsubs.push(unsub);
    };

    // Orders
    setupAuthListener('kuku_orders', setOrders);
    
    // Activities
    setupAuthListener('kuku_activity', setActivities);
    
    // Chat
    setupAuthListener('kuku_chat', setChatMessages, 'createdAt', 'asc');
    
    // Notifications
    setupAuthListener('kuku_notifications', setNotifications);
    
    // Wallet
    setupAuthListener('kuku_wallet', setWalletTransactions);
    
    // Withdrawals
    setupAuthListener('kuku_withdrawals', setWithdrawals);
    
    // Loyalty
    setupAuthListener('kuku_loyalty', setLoyaltyPoints);
    
    // Invoices
    setupAuthListener('kuku_invoices', setInvoices);
    
    // Livestock & Records
    setupAuthListener('kuku_livestock', setLivestock);
    setupAuthListener('kuku_vaccination_records', setVaccinationRecords);
    setupAuthListener('kuku_medical_records', setMedicalRecords);
    setupAuthListener('kuku_breeding_records', setBreedingRecords);
    setupAuthListener('kuku_production_records', setProductionRecords);
    setupAuthListener('kuku_nutrition_records', setNutritionRecords);
    setupAuthListener('kuku_livestock_health', setLivestockHealthRecords);
    setupAuthListener('kuku_recurring_orders', setRecurringOrders);

    // Admin-only data
    if (user.role === 'admin') {
      const qUsers = query(collection(db, 'kuku_users'), orderBy('createdAt', 'desc'));
      const unsubUsers = onSnapshot(qUsers, (snap) => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'kuku_users_admin');
      });
      authUnsubs.push(unsubUsers);

      const qAdmins = query(collection(db, 'kuku_users'), where('role', '==', 'admin'), orderBy('createdAt', 'desc'));
      const unsubAdmins = onSnapshot(qAdmins, (snap) => {
        setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'kuku_admins_admin');
      });
      authUnsubs.push(unsubAdmins);
    }

    return () => {
      authUnsubs.forEach(unsub => unsub());
    };
  }, [user]);

  const addActivity = async (icon: string, text: string) => {
    try {
      await addDoc(collection(db, 'kuku_activity'), {
        icon,
        text,
        userId: user?.id || 'system',
        time: 'Sasa hivi',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'kuku_activity');
    }
  };

  const addNotification = async (title: string, message: string, userId: string = 'all', link?: string) => {
    try {
      await addDoc(collection(db, 'kuku_notifications'), {
        title,
        message,
        userId: userId || 'all',
        link,
        icon: '🔔',
        text: `${title}: ${message}`,
        date: new Date().toISOString(),
        readBy: [],
        createdAt: serverTimestamp()
      });
      
      // Also add to activity for general log
      await addActivity('🔔', `${title}: ${message}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'kuku_notifications');
    }
  };

  const updateSystemSettings = async (settings: any) => {
    try {
      await setDoc(doc(db, 'kuku_config', 'settings'), {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'kuku_config/settings');
      throw e;
    }
  };

  const logout = () => {
    signOut(auth);
  };

  const t = (key: string) => {
    const lang = language || 'sw';
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['sw']?.[key] || key;
  };

  const handleReferral = async (referralCode: string, newUserId: string) => {
    try {
      const usersRef = collection(db, 'kuku_users');
      const q = query(usersRef, where('referralCode', '==', referralCode));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const referrerDoc = querySnapshot.docs[0];
        const referrerId = referrerDoc.id;
        const referrerData = referrerDoc.data();
        const bonus = systemSettings?.referralBonus || 500;
        
        // Award points to referrer
        await updateDoc(doc(db, 'kuku_users', referrerId), {
          loyaltyPoints: increment(bonus)
        }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `kuku_users/${referrerId}`));
        
        // Award points to referee
        await updateDoc(doc(db, 'kuku_users', newUserId), {
          loyaltyPoints: increment(bonus),
          referredBy: referrerId
        }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `kuku_users/${newUserId}`));

        await addDoc(collection(db, 'kuku_loyalty'), {
          userId: referrerId,
          userName: referrerData.name || 'User',
          points: bonus,
          type: 'referral',
          description: `Referral bonus for inviting a new user`,
          createdAt: serverTimestamp()
        }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'kuku_loyalty'));

        await addDoc(collection(db, 'kuku_loyalty'), {
          userId: newUserId,
          points: bonus,
          type: 'referral',
          description: `Welcome bonus for using referral code`,
          createdAt: serverTimestamp()
        }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'kuku_loyalty'));

        toast.success(`Zawadi ya mwaliko imetolewa! 🎁`);
      }
    } catch (error) {
      console.error("Referral Error:", error);
    }
  };

  return (
    <AppContext.Provider value={{
      user, setUser,
      products, setProducts,
      orders, setOrders,
      vendors, setVendors,
      doctors, setDoctors,
      admins, setAdmins,
      users, setUsers,
      reviews, setReviews,
      activities, addActivity,
      withdrawals, setWithdrawals,
      statuses, setStatuses,
      walletTransactions, setWalletTransactions,
      categories, setCategories,
      auctions, setAuctions,
      notifications, setNotifications,
      offers, setOffers,
      addNotification,
      systemSettings, updateSystemSettings,
      logout,
      t,
      loading,
      theme,
      setTheme,
      language,
      setLanguage,
      view,
      setView,
      cart,
      setCart,
      addToCart,
      removeFromCart,
      updateCartQty,
      academyPosts,
      loyaltyPoints,
      invoices,
      forumPosts,
      chatMessages,
      livestock,
      vaccinationRecords,
      medicalRecords,
      breedingRecords,
      productionRecords,
      nutritionRecords,
      livestockHealthRecords,
      recurringOrders,
      liveSessions,
      handleReferral,
      confirmModal,
      setConfirmModal
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
