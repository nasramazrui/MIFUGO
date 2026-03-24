import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, Send, X, User, Image as ImageIcon, Loader2, ArrowLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, generateId } from '../utils';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface ChatProps {
  receiverId: string;
  receiverName: string;
  onClose: () => void;
}

export const Chat: React.FC<ChatProps> = ({ receiverId, receiverName, onClose }) => {
  const { user, theme } = useApp();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'kuku_chat'),
      where('participants', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter for this specific conversation and sort by date
      const filtered = allMsgs
        .filter((m: any) => 
          (m.senderId === user.id && m.receiverId === receiverId) ||
          (m.senderId === receiverId && m.receiverId === user.id)
        )
        .sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeA - timeB;
        });
      setMessages(filtered);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'kuku_chat');
    });

    return () => unsubscribe();
  }, [user, receiverId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!user || !input.trim()) return;

    const text = input.trim();
    setInput('');

    try {
      await addDoc(collection(db, 'kuku_chat'), {
        senderId: user.id,
        receiverId,
        participants: [user.id, receiverId],
        text,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'kuku_chat');
      toast.error('Imeshindwa kutuma ujumbe');
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full",
      theme === 'dark' ? "bg-slate-900" : "bg-white"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
        <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-slate-500" />
        </button>
        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center text-amber-600">
          <User size={20} />
        </div>
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-sm">{receiverName}</h3>
          <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-amber-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300 mb-4">
              <MessageSquare size={32} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Anza mazungumzo na {receiverName}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[80%]",
                msg.senderId === user?.id ? "ml-auto items-end" : "items-start"
              )}
            >
              <div className={cn(
                "p-3 rounded-2xl text-sm font-medium leading-relaxed",
                msg.senderId === user?.id 
                  ? "bg-amber-600 text-white rounded-tr-none" 
                  : (theme === 'dark' ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-800") + " rounded-tl-none"
              )}>
                {msg.text}
              </div>
              <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
                {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="relative">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Andika ujumbe..."
            className={cn(
              "w-full pl-4 pr-12 py-3 rounded-2xl outline-none text-sm font-bold transition-all",
              theme === 'dark' 
                ? "bg-slate-800 border-slate-700 text-white focus:border-amber-500" 
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500"
            )}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
