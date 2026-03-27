import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Pill, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prescriptionData: any) => void;
  patientName: string;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  patientName
}) => {
  const { theme } = useApp();
  const [medications, setMedications] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [notes, setNotes] = useState('');

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: string, value: string) => {
    const newMeds = [...medications];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setMedications(newMeds);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty medications
    const validMeds = medications.filter(m => m.name.trim() !== '');
    if (validMeds.length === 0) return;

    onSubmit({
      medications: validMeds,
      notes: notes.trim(),
      date: new Date().toISOString()
    });
    
    // Reset
    setMedications([{ name: '', dosage: '', frequency: '', duration: '' }]);
    setNotes('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden ${
              theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white'
            }`}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <Pill size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Andika Cheti cha Dawa</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kwa: {patientName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                {medications.map((med, index) => (
                  <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-4 relative">
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(index)}
                        className="absolute top-4 right-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jina la Dawa *</label>
                      <input
                        type="text"
                        required
                        value={med.name}
                        onChange={(e) => handleChange(index, 'name', e.target.value)}
                        placeholder="Mfano: Amoxicillin"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kipimo</label>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleChange(index, 'dosage', e.target.value)}
                          placeholder="Mfano: 5ml au Kidonge 1"
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mara Ngapi</label>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => handleChange(index, 'frequency', e.target.value)}
                          placeholder="Mfano: Kutwa mara 2"
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Muda (Siku)</label>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => handleChange(index, 'duration', e.target.value)}
                        placeholder="Mfano: Siku 5"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Ongeza Dawa Nyingine
                </button>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Maelezo ya Ziada (Hiari)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Maelekezo mengine kwa mfugaji..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <Send size={18} /> Tuma Cheti cha Dawa
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
