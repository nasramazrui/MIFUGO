import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, CheckCircle, Copy, AlertCircle } from 'lucide-react';
import { SystemSettings } from '../types';
import toast from 'react-hot-toast';

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  reason: string;
  systemSettings: SystemSettings | null;
  onSubmit: (details: { network: string; senderPhone: string; senderName: string; amount: number; sms: string }) => void;
}

export const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  reason,
  systemSettings,
  onSubmit
}) => {
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderName, setSenderName] = useState('');
  const [sms, setSms] = useState('');

  if (!isOpen) return null;

  const networks = [
    { id: 'mpesa', name: 'M-Pesa', color: 'bg-green-500', text: 'text-green-600', data: systemSettings?.paymentMethods?.mpesa },
    { id: 'tigopesa', name: 'Tigo Pesa', color: 'bg-blue-500', text: 'text-blue-600', data: systemSettings?.paymentMethods?.tigopesa },
    { id: 'airtel', name: 'Airtel Money', color: 'bg-red-500', text: 'text-red-600', data: systemSettings?.paymentMethods?.airtel },
    { id: 'halopesa', name: 'HaloPesa', color: 'bg-orange-500', text: 'text-orange-600', data: systemSettings?.paymentMethods?.halopesa },
  ].filter(n => n.data?.number); // Only show networks with a configured number

  const selectedNetworkData = networks.find(n => n.id === selectedNetwork);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNetwork) {
      toast.error('Tafadhali chagua mtandao wa kulipia');
      return;
    }
    if (!senderPhone || !senderName || !sms) {
      toast.error('Tafadhali jaza taarifa zote za malipo');
      return;
    }
    
    onSubmit({
      network: selectedNetworkData?.name || '',
      senderPhone,
      senderName,
      amount,
      sms
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Namba imenakiliwa!');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Fanya Malipo</h2>
              <p className="text-sm text-slate-500">{reason}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm text-amber-900 dark:text-amber-200 font-medium">
                  Kiasi cha Kulipia: <span className="font-black text-lg">{amount.toLocaleString()} {systemSettings?.currency || 'TZS'}</span>
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Tafadhali tuma pesa kwenye namba zetu hapa chini kisha jaza fomu kuthibitisha.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">1. Chagua Mtandao</label>
                <div className="grid grid-cols-2 gap-3">
                  {networks.map(network => (
                    <button
                      key={network.id}
                      type="button"
                      onClick={() => setSelectedNetwork(network.id)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all ${
                        selectedNetwork === network.id 
                          ? `border-${network.color.split('-')[1]}-500 bg-${network.color.split('-')[1]}-50 dark:bg-${network.color.split('-')[1]}-900/20` 
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Smartphone size={16} className={network.text} />
                        <span className={`font-bold text-sm ${selectedNetwork === network.id ? network.text : 'text-slate-700 dark:text-slate-300'}`}>
                          {network.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                {networks.length === 0 && (
                  <p className="text-sm text-red-500">Hakuna namba za malipo zilizowekwa na Admin.</p>
                )}
              </div>

              {selectedNetworkData && selectedNetworkData.data && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800"
                >
                  <p className="text-xs text-slate-500 mb-2">Tuma pesa kwenda:</p>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 mb-2">
                    <div>
                      <p className="font-black text-lg text-slate-900 dark:text-white">{selectedNetworkData.data.number}</p>
                      <p className="text-xs text-slate-500 uppercase">{selectedNetworkData.data.name}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => copyToClipboard(selectedNetworkData.data!.number)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">2. Jaza Taarifa za Malipo Yako</label>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Namba Uliyotuma Pesa</label>
                  <input
                    type="tel"
                    required
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="Mf. 07..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-all font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Jina la Aliyetuma</label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Jina lililosajiliwa na namba"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-all font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">SMS ya Malipo (Copy & Paste)</label>
                  <textarea
                    required
                    value={sms}
                    onChange={(e) => setSms(e.target.value)}
                    placeholder="Weka meseji uliyotumiwa na mtandao kuthibitisha malipo..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-all font-medium text-slate-900 dark:text-white h-24 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <CheckCircle size={20} />
                Thibitisha Malipo
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
