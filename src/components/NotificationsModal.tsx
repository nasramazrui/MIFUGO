import React from 'react';
import { Modal } from './Modal';
import { useApp } from '../context/AppContext';
import { Bell, CheckCircle2, Trash2 } from 'lucide-react';
import { doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { notifications, user } = useApp();

  const myNotifications = notifications.filter(n => 
    (n.userId === 'all' || n.userId === user?.id) && 
    !(n.deletedBy || []).includes(user?.id || '')
  );

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'kuku_activity', id), { 
        readBy: arrayUnion(user.id) 
      });
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNotification = async (n: any) => {
    if (!user) return;
    try {
      if (n.userId === user.id) {
        await deleteDoc(doc(db, 'kuku_activity', n.id));
      } else {
        await updateDoc(doc(db, 'kuku_activity', n.id), { 
          deletedBy: arrayUnion(user.id) 
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Matangazo & Ujumbe">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {myNotifications.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Bell size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold">Hakuna matangazo mapya</p>
          </div>
        ) : (
          myNotifications.map(n => {
            const isRead = n.readBy?.includes(user?.id || '');
            return (
            <div 
              key={n.id} 
              className={`p-4 rounded-2xl border ${isRead ? 'bg-slate-50 border-slate-100 dark:bg-slate-900 dark:border-slate-800' : 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/30'} transition-colors cursor-pointer`}
              onClick={() => !isRead && markAsRead(n.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className={`font-black ${isRead ? 'text-slate-700 dark:text-slate-300' : 'text-amber-900 dark:text-amber-500'} mb-1`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{n.message}</p>
                  {n.image && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={n.image} alt="Tangazo" className="w-full h-auto max-h-48 object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  {n.link && (
                    <a 
                      href={n.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-sm font-bold text-amber-600 dark:text-amber-500 hover:underline"
                    >
                      Fungua Link &rarr;
                    </a>
                  )}
                  <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
                    {new Date(n.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {!isRead && (
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-1 shrink-0" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n);
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Futa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )})
        )}
      </div>
    </Modal>
  );
};
