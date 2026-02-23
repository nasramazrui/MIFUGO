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

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addActivity } = useApp();
  const [view, setView] = useState<'choice' | 'login' | 'register'>('choice');
  const [loading, setLoading] = useState(false);
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
        <div className="text-center py-4">
          <div className="text-6xl mb-6">🐔</div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Karibu KukuMart!</h2>
          <p className="text-slate-500 text-sm mb-8">Unahitaji akaunti ili uweze kununua bidhaa. Je, tayari una akaunti?</p>
          <div className="space-y-3">
            <button 
              onClick={() => setView('login')}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-4 rounded-2xl transition active:scale-95 shadow-lg shadow-amber-100"
            >
              ✅ Ndiyo — Ingia
            </button>
            <button 
              onClick={() => setView('register')}
              className="w-full bg-white border-2 border-amber-200 hover:border-amber-400 text-amber-800 font-black py-4 rounded-2xl transition active:scale-95"
            >
              ✨ Hapana — Jisajili Bure
            </button>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 mb-3">Unataka kuuza bidhaa zako?</p>
            <button 
              onClick={() => {
                onClose();
                toast('Tafadhali tumia kitufe cha "SAJILI DUKA LAKO" kwenye ukurasa mkuu.', { icon: '🏪' });
              }}
              className="text-amber-600 text-xs font-black hover:underline"
            >
              SAJILI DUKA LAKO HAPA →
            </button>
          </div>
        </div>
      )}

      {view === 'login' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900">Ingia</h2>
            <p className="text-slate-500 text-sm">Karibu tena kwenye soko letu</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email au Jina</label>
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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nywila</label>
              <input 
                type="password" 
                required
                className="input-field"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <button type="submit" className="w-full btn-primary mt-4">Ingia Sasa →</button>
            <button 
              type="button"
              onClick={() => setView('register')}
              className="w-full text-sm text-slate-400 font-bold py-2"
            >
              Huna akaunti? Jisajili
            </button>
          </form>
        </div>
      )}

      {view === 'register' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900">Jisajili</h2>
            <p className="text-slate-500 text-sm">Tengeneza akaunti yako bure</p>
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jina Kamili</label>
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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Namba ya WhatsApp</label>
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nywila</label>
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rudia Nywila</label>
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
            <button type="submit" className="w-full btn-primary mt-4">Jisajili Sasa 🎉</button>
            <button 
              type="button"
              onClick={() => setView('login')}
              className="w-full text-sm text-slate-400 font-bold py-2"
            >
              Tayari una akaunti? Ingia
            </button>
          </form>
        </div>
      )}
    </Modal>
  );
};
