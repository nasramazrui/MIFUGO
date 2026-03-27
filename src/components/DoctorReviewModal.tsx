import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface DoctorReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorName: string;
  onSubmit: (rating: number, reviewText: string) => void;
  isSubmitting: boolean;
}

export const DoctorReviewModal: React.FC<DoctorReviewModalProps> = ({
  isOpen,
  onClose,
  doctorName,
  onSubmit,
  isSubmitting
}) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Tafadhali chagua nyota');
      return;
    }
    onSubmit(rating, reviewText);
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
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Toa Maoni</h2>
              <p className="text-sm text-slate-500">Dkt. {doctorName}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">
                  Umeridhishwa kiasi gani?
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-2 rounded-full transition-all ${
                        star <= rating ? 'text-amber-500 scale-110' : 'text-slate-300 hover:text-amber-300'
                      }`}
                    >
                      <Star size={32} fill={star <= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Maoni yako (Si lazima)
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Andika maoni yako hapa..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-amber-500 transition-all text-sm min-h-[100px] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Tuma Maoni
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
