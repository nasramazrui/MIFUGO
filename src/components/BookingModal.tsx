import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorName: string;
  consultationFee: number;
  currency: string;
  onSubmit: (date: string, time: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  doctorName,
  consultationFee,
  currency,
  onSubmit
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      toast.error('Tafadhali chagua tarehe na muda');
      return;
    }
    onSubmit(selectedDate, selectedTime);
  };

  // Generate next 7 days
  const nextDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: d.toISOString().split('T')[0],
      label: i === 0 ? 'Leo' : i === 1 ? 'Kesho' : d.toLocaleDateString('sw-TZ', { weekday: 'short', day: 'numeric', month: 'short' })
    };
  });

  // Generate timeslots
  const timeSlots = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
    '04:00 PM', '05:00 PM', '06:00 PM'
  ];

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
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Weka Miadi</h2>
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar size={14} /> Chagua Tarehe
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {nextDays.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => setSelectedDate(day.value)}
                      className={`py-3 px-2 rounded-xl text-sm font-bold transition-all border-2 ${
                        selectedDate === day.value 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                          : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock size={14} /> Chagua Muda
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(time => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                        selectedTime === time 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                          : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-200'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Gharama ya Ushauri:</span>
                <span className="text-xl font-black text-emerald-600">{consultationFee.toLocaleString()} {currency}</span>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                Thibitisha Miadi
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
