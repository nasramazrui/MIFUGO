import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Plus, CheckCircle2, Clock, AlertCircle, Trash2, Edit2, ChevronRight, Bell, Syringe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, generateId } from '../utils';
import { db, collection, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, handleFirestoreError, OperationType } from '../services/firebase';
import { toast } from 'react-hot-toast';
import { Modal } from '../components/Modal';

export const VaccinationCalendar: React.FC = () => {
  const { user, vaccinationRecords, theme } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    birdType: '',
    vaccineName: '',
    date: new Date().toISOString().split('T')[0],
    nextDueDate: '',
    notes: ''
  });

  const myRecords = (Array.isArray(vaccinationRecords) ? vaccinationRecords : []).filter(r => r.userId === user?.id);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newRecord.birdType || !newRecord.vaccineName || !newRecord.date) {
      toast.error('Tafadhali jaza taarifa muhimu');
      return;
    }

    try {
      await addDoc(collection(db, 'kuku_vaccinations'), {
        userId: user.id,
        ...newRecord,
        completed: false,
        createdAt: serverTimestamp()
      });
      toast.success('Kumbukumbu imeongezwa!');
      setIsAddModalOpen(false);
      setNewRecord({
        birdType: '',
        vaccineName: '',
        date: new Date().toISOString().split('T')[0],
        nextDueDate: '',
        notes: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'kuku_vaccinations');
      toast.error('Hitilafu imetokea');
    }
  };

  const toggleComplete = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'kuku_vaccinations', id), { completed: !current });
      toast.success(current ? 'Imewekwa kama haijakamilika' : 'Hongera! Chanjo imekamilika');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `kuku_vaccinations/${id}`);
      toast.error('Hitilafu imetokea');
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('Futa kumbukumbu hii?')) return;
    try {
      await deleteDoc(doc(db, 'kuku_vaccinations', id));
      toast.success('Imefutwa');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `kuku_vaccinations/${id}`);
      toast.error('Hitilafu imetokea');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
            Kalenda ya <span className="text-amber-600">Chanjo</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold">Fuatilia na panga chanjo za kuku wako kwa urahisi.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-amber-100 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <Plus size={20} /> WEKA CHANJO MPYA
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
            <Calendar size={24} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">{myRecords.length}</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumla ya Chanjo</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-500/10 rounded-2xl flex items-center justify-center text-green-600 mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            {(Array.isArray(myRecords) ? myRecords : []).filter(r => r.completed).length}
          </h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zilizokamilika</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
            <Clock size={24} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            {(Array.isArray(myRecords) ? myRecords : []).filter(r => !r.completed).length}
          </h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zinazofuata</p>
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-4">
        {myRecords.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl mx-auto flex items-center justify-center text-slate-300 mb-4">
              <Syringe size={40} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Huna kumbukumbu za chanjo</h3>
            <p className="text-slate-400 font-bold text-sm">Anza kwa kuongeza chanjo ya kwanza leo.</p>
          </div>
        ) : (
          myRecords.map((record) => (
            <motion.div 
              key={record.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "bg-white dark:bg-slate-900 rounded-3xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all",
                record.completed ? "border-green-100 dark:border-green-900/30 opacity-75" : "border-slate-100 dark:border-slate-800"
              )}
            >
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0",
                  record.completed ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                )}>
                  <Syringe size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{record.vaccineName}</h3>
                    {record.completed && <CheckCircle2 size={16} className="text-green-500" />}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <span className="text-[10px] uppercase tracking-wider opacity-50">Kundi:</span> {record.birdType}
                    </p>
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <span className="text-[10px] uppercase tracking-wider opacity-50">Tarehe:</span> {record.date}
                    </p>
                    {record.nextDueDate && (
                      <p className="text-xs font-bold text-amber-600 flex items-center gap-1">
                        <span className="text-[10px] uppercase tracking-wider opacity-50">Inayofuata:</span> {record.nextDueDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => toggleComplete(record.id, record.completed)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    record.completed 
                      ? "bg-slate-100 text-slate-500 hover:bg-slate-200" 
                      : "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-100"
                  )}
                >
                  {record.completed ? 'RUDISHA' : 'KAMILISHA'}
                </button>
                <button 
                  onClick={() => deleteRecord(record.id)}
                  className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Record Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Weka Kumbukumbu ya Chanjo"
      >
        <form onSubmit={handleAddRecord} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Aina ya Kuku/Ndege</label>
              <input 
                type="text"
                value={newRecord.birdType}
                onChange={(e) => setNewRecord(prev => ({ ...prev, birdType: e.target.value }))}
                placeholder="Mfano: Kuchi, Layers..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Jina la Chanjo</label>
              <input 
                type="text"
                value={newRecord.vaccineName}
                onChange={(e) => setNewRecord(prev => ({ ...prev, vaccineName: e.target.value }))}
                placeholder="Mfano: Gumboro, New Castle..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tarehe ya Leo</label>
              <input 
                type="date"
                value={newRecord.date}
                onChange={(e) => setNewRecord(prev => ({ ...prev, date: e.target.value }))}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tarehe Inayofuata (Optional)</label>
              <input 
                type="date"
                value={newRecord.nextDueDate}
                onChange={(e) => setNewRecord(prev => ({ ...prev, nextDueDate: e.target.value }))}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Maelezo ya Ziada</label>
            <textarea 
              value={newRecord.notes}
              onChange={(e) => setNewRecord(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Andika maelezo yoyote hapa..."
              rows={3}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-amber-100 transition-all active:scale-95"
          >
            HIFADHI KUMBUKUMBU
          </button>
        </form>
      </Modal>
    </div>
  );
};
