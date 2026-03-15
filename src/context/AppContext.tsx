import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Product, Order, Review, Activity, Withdrawal, Status, Category, WalletTransaction, Auction, CartItem, AcademyPost, LoyaltyPoint, Invoice } from '../types';
import { generateId } from '../utils';
import { ADMIN_EMAIL, ADMIN_PASS, TRANSLATIONS } from '../constants';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
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
  where
} from 'firebase/firestore';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<User[]>([]);
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
    return saved ? JSON.parse(saved) : [];
  });
  const [academyPosts, setAcademyPosts] = useState<AcademyPost[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPoint[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    localStorage.setItem('kuku_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, quantity: number) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, qty: item.qty + quantity } 
          : item
      ));
    } else {
      setCart([...cart, {
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
    setCart(cart.filter(item => item.id !== id));
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
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
      console.error("Error updating theme:", e);
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
      console.error("Error updating language:", e);
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

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          // Use a snapshot for real-time user data (like wallet balance)
          const unsubUser = onSnapshot(doc(db, 'kuku_users', fbUser.uid), (snap) => {
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
              setDoc(doc(db, 'kuku_users', fbUser.uid), adminData);
              setUser(adminData);
            }
            setLoading(false);
            clearTimeout(safetyTimer);
          });
          return unsubUser;
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
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  // Firestore Listeners
  useEffect(() => {
    // Products
    const qProducts = query(collection(db, 'kuku_products'), orderBy('createdAt', 'desc'));
    const unsubProducts = onSnapshot(qProducts, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (err) => {
      console.error("Firestore Products Error:", err);
    });

    // Orders
    const qOrders = query(collection(db, 'kuku_orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    }, (err) => {
      console.error("Firestore Orders Error:", err);
    });

    // Users & Vendors
    const qUsers = query(collection(db, 'kuku_users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
      setUsers(all.filter(u => u.role === 'user'));
      setVendors(all.filter(u => u.role === 'vendor'));
      setAdmins(all.filter(u => u.role === 'admin'));
    }, (err) => {
      console.error("Firestore Users Error:", err);
    });

    // Activities
    const qActs = query(collection(db, 'kuku_activity'), orderBy('createdAt', 'desc'));
    const unsubActs = onSnapshot(qActs, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    });

    // Withdrawals
    const qWithdraws = query(collection(db, 'kuku_withdrawals'), orderBy('createdAt', 'desc'));
    const unsubWithdraws = onSnapshot(qWithdraws, (snap) => {
      setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal)));
    });

    // Reviews
    const qReviews = query(collection(db, 'kuku_reviews'), orderBy('createdAt', 'desc'));
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
    });

    // System Settings
    const unsubSettings = onSnapshot(doc(db, 'kuku_config', 'settings'), (snap) => {
      if (snap.exists()) {
        setSystemSettings(snap.data());
      }
    });

    // Statuses
    const qStatuses = query(collection(db, 'kuku_statuses'), orderBy('createdAt', 'desc'));
    const unsubStatuses = onSnapshot(qStatuses, (snap) => {
      setStatuses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Status)));
    });

    // Categories
    const qCats = query(collection(db, 'kuku_categories'), orderBy('createdAt', 'asc'));
    const unsubCats = onSnapshot(qCats, (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    });

    // Auctions
    const qAuctions = query(collection(db, 'kuku_auctions'), orderBy('createdAt', 'desc'));
    const unsubAuctions = onSnapshot(qAuctions, (snap) => {
      setAuctions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Auction)));
    });

    // Wallet Transactions
    const qWallet = query(collection(db, 'kuku_wallet'), orderBy('createdAt', 'desc'));
    const unsubWallet = onSnapshot(qWallet, (snap) => {
      setWalletTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as WalletTransaction)));
    });

    // Notifications (stored in kuku_activity)
    const qNotifications = query(collection(db, 'kuku_activity'), orderBy('createdAt', 'desc'));
    const unsubNotifications = onSnapshot(qNotifications, (snap) => {
      setNotifications(snap.docs.filter(d => d.data().title).map(d => ({ id: d.id, ...d.data() } as Notification)));
    });

    // Offers
    const qOffers = query(collection(db, 'kuku_offers'), orderBy('createdAt', 'desc'));
    const unsubOffers = onSnapshot(qOffers, (snap) => {
      setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Offer)));
    });

    // Academy Posts
    const qAcademy = query(collection(db, 'kuku_academy'), orderBy('createdAt', 'desc'));
    const unsubAcademy = onSnapshot(qAcademy, (snap) => {
      setAcademyPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademyPost)));
    });

    // Loyalty Points
    const qLoyalty = query(collection(db, 'kuku_loyalty'), orderBy('createdAt', 'desc'));
    const unsubLoyalty = onSnapshot(qLoyalty, (snap) => {
      setLoyaltyPoints(snap.docs.map(d => ({ id: d.id, ...d.data() } as LoyaltyPoint)));
    });

    // Invoices
    const qInvoices = query(collection(db, 'kuku_invoices'), orderBy('createdAt', 'desc'));
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
    });

    return () => {
      unsubProducts();
      unsubOrders();
      unsubUsers();
      unsubActs();
      unsubWithdraws();
      unsubReviews();
      unsubSettings();
      unsubStatuses();
      unsubCats();
      unsubWallet();
      unsubAuctions();
      unsubNotifications();
      unsubOffers();
      unsubAcademy();
      unsubLoyalty();
      unsubInvoices();
    };
  }, []);

  const addActivity = async (icon: string, text: string) => {
    try {
      await addDoc(collection(db, 'kuku_activity'), {
        icon,
        text,
        time: 'Sasa hivi',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Error adding activity: ", e);
    }
  };

  const updateSystemSettings = async (settings: any) => {
    try {
      await setDoc(doc(db, 'kuku_config', 'settings'), {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Error updating settings: ", e);
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

  return (
    <AppContext.Provider value={{
      user, setUser,
      products, setProducts,
      orders, setOrders,
      vendors, setVendors,
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
      invoices
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
