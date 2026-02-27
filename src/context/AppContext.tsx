import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Product, Order, Review, Activity, Withdrawal, Status } from '../types';
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

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  vendors: User[];
  setVendors: React.Dispatch<React.SetStateAction<User[]>>;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark'>((localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [language, setLanguageState] = useState<'sw' | 'en' | 'ar' | 'hi'>((localStorage.getItem('language') as 'sw' | 'en' | 'ar' | 'hi') || 'sw');
  const [view, setView] = useState<'auto' | 'shop' | 'dashboard'>('auto');

  const setTheme = async (newTheme: 'light' | 'dark') => {
    if (!user) return; // Guests can't change theme
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
    // Force light mode for guests
    const activeTheme = user ? theme : 'light';
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, user]);

  // Auth Listener
  useEffect(() => {
    // Safety timeout: if auth doesn't respond in 8 seconds, stop loading
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          const userDoc = await getDoc(doc(db, 'kuku_users', fbUser.uid));
          if (userDoc.exists()) {
            setUser({ id: fbUser.uid, ...userDoc.data() } as User);
          } else {
            // Fallback for admin if doc doesn't exist yet but email matches
            if (fbUser.email === ADMIN_EMAIL) {
              const adminData: User = {
                id: fbUser.uid,
                name: 'Admin',
                email: ADMIN_EMAIL,
                role: 'admin',
                theme,
                language,
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'kuku_users', fbUser.uid), adminData);
              setUser(adminData);
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth listener error:", error);
        setUser(null);
      } finally {
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

    return () => {
      unsubProducts();
      unsubOrders();
      unsubUsers();
      unsubActs();
      unsubWithdraws();
      unsubReviews();
      unsubSettings();
      unsubStatuses();
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
      users, setUsers,
      reviews, setReviews,
      activities, addActivity,
      withdrawals, setWithdrawals,
      statuses, setStatuses,
      systemSettings, updateSystemSettings,
      logout,
      t,
      loading,
      theme,
      setTheme,
      language,
      setLanguage,
      view,
      setView
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
