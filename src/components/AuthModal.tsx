import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal } from './Modal';
import { ADMIN_EMAIL } from '../constants';
import { toast } from 'react-hot-toast';
import { auth, db } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addActivity, systemSettings, t, theme, language } = useApp();
  const [view, setView] = useState<'choice' | 'login' | 'register'>('choice');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'ok' | 'fail'>('checking');

  React.useEffect(() => {
    fetch('/api/health')
      .then(r => r.ok ? setServerStatus('ok') : setServerStatus('fail'))
      .catch(() => setServerStatus('fail'));
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    contact: '',
    hasWhatsApp: true
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      if (formData.email === ADMIN_EMAIL) {
        addActivity('⚙️', 'Admin ameingia kwenye mfumo');
      }
      toast.success('Karibu tena!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Hitilafu wakati wa kuingia');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Nywila hazilingani!');
      return;
    }
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const fbUser = userCredential.user;
      
      await updateProfile(fbUser, { displayName: formData.name });
      
      const userData = {
        name: formData.name,
        email: formData.email,
        role: 'user',
        contact: formData.contact,
        hasWhatsApp: formData.hasWhatsApp,
        theme,
        language,
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'kuku_users', fbUser.uid), userData);
      
      addActivity('👤', `Mteja mpya "${formData.name}" amesajiliwa`);
      toast.success('Akaunti imetengenezwa!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Hitilafu wakati wa kusajili');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {view === 'choice' && (
        <div className="text-center py-6">
          <div className="w-24 h-24 bg-amber-50 dark:bg-amber-900/20 rounded-[32px] flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner">🐔</div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight leading-tight">
            {t('welcome')} <span className="text-amber-600">{systemSettings?.app_name || 'FarmConnect'}</span>!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-10 max-w-[280px] mx-auto leading-relaxed">
            Unahitaji akaunti ili uweze kununua bidhaa na kufurahia huduma zetu.
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => setView('login')}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-4 rounded-2xl transition-all active:scale-95 shadow-xl shadow-amber-600/20 dark:shadow-none flex items-center justify-center gap-2"
            >
              ✅ Ndiyo — {t('login')}
            </button>
            <button 
              onClick={() => setView('register')}
              className="w-full bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 text-amber-800 dark:text-amber-400 font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              ✨ Hapana — {t('register')}
            </button>
          </div>
          {serverStatus === 'fail' && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-2xl border border-red-100 dark:border-red-900/50 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>Server haijibu. Tafadhali subiri kidogo au wasiliana na msaada.</span>
            </div>
          )}
          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-bold uppercase tracking-widest">Unataka kuuza bidhaa zako?</p>
            <button 
              onClick={() => {
                onClose();
                toast('Tafadhali tumia kitufe cha "SAJILI DUKA LAKO" kwenye ukurasa mkuu.', { icon: '🏪' });
              }}
              className="bg-slate-50 dark:bg-slate-800/50 text-amber-600 dark:text-amber-500 text-xs font-black px-6 py-3 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all border border-slate-100 dark:border-slate-700"
            >
              SAJILI DUKA LAKO HAPA →
            </button>
          </div>
        </div>
      )}

      {view === 'login' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t('login')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Karibu tena kwenye soko letu</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t('email')}</label>
              <input 
                type="text" 
                required
                className="input-field"
                placeholder="amina@mfano.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t('password')}</label>
              <input 
                type="password" 
                required
                className="input-field"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <button type="submit" className="w-full btn-primary mt-4">{t('login')} Sasa →</button>
            <button 
              type="button"
              onClick={() => setView('register')}
              className="w-full text-sm text-slate-400 dark:text-slate-500 font-bold py-2"
            >
              Huna akaunti? {t('register')}
            </button>
          </form>
        </div>
      )}

      {view === 'register' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t('register')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Tengeneza akaunti yako bure</p>
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t('name')}</label>
              <input 
                type="text" 
                required
                className="input-field"
                placeholder="Amina Juma"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t('email')}</label>
              <input 
                type="email" 
                required
                className="input-field"
                placeholder="amina@mfano.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t('whatsapp')}</label>
              <input 
                type="tel" 
                required
                className="input-field"
                placeholder="0712345678"
                value={formData.contact}
                onChange={e => setFormData({...formData, contact: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t('password')}</label>
                <input 
                  type="password" 
                  required
                  className="input-field"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Rudia Nywila</label>
                <input 
                  type="password" 
                  required
                  className="input-field"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>
            </div>
            <button type="submit" className="w-full btn-primary mt-4">{t('register')} Sasa 🎉</button>
            <button 
              type="button"
              onClick={() => setView('login')}
              className="w-full text-sm text-slate-400 dark:text-slate-500 font-bold py-2"
            >
              Tayari una akaunti? {t('login')}
            </button>
          </form>
        </div>
      )}
    </Modal>
  );
};
