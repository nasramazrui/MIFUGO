import React, { useEffect, useRef, useState } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { X, Heart, MessageSquare, Send, Users, QrCode, Gavel, ShoppingBag, MapPin, Clock, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, addDoc, query, orderBy, limit, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'react-qr-code';
import { cn, formatCurrency } from '../utils';

interface LiveStreamModalProps {
  key?: string | number;
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  isHost: boolean;
  userId: string;
  userName: string;
  vendorAvatar?: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

export default function LiveStreamModal({ isOpen, onClose, roomId, isHost, userId, userName, vendorAvatar }: LiveStreamModalProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const zpRef = useRef<any>(null);
  const initStartedRef = useRef(false);
  const { systemSettings, auctions, user, addActivity } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [likes, setLikes] = useState<{ id: number, x: number }[]>([]);
  const [sessionData, setSessionData] = useState<any>(null);
  const [showQR, setShowQR] = useState(false);
  const [auctionData, setAuctionData] = useState<any>(null);
  const [viewerCount, setViewerCount] = useState(0);

  // Ensure we have a valid userId for Zego - must be a non-empty string
  const safeUserId = (userId && userId.trim()) ? userId.trim() : `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const safeUserName = (userName && userName.trim()) ? userName.trim() : 'Mgeni';

  // Floating hearts logic
  const addLike = () => {
    const id = Date.now();
    const x = Math.random() * 100 - 50; // Random horizontal offset
    setLikes(prev => [...prev, { id, x }]);
    setTimeout(() => {
      setLikes(prev => prev.filter(l => l.id !== id));
    }, 2000);
  };

  useEffect(() => {
    if (!isOpen || !roomId) return;

    // Listen for session data (viewer count, etc)
    const unsubSession = onSnapshot(doc(db, 'kuku_live_sessions', roomId), (doc) => {
      if (doc.exists()) {
        setSessionData(doc.data());
        setViewerCount(doc.data().viewerCount || 0);
      }
    });

    // Listen for chat
    const q = query(
      collection(db, 'kuku_live_chats', roomId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubChat = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
      setMessages(msgs.reverse());
    });

    // If it's an auction, fetch auction data
    const auction = auctions.find(a => a.id === roomId);
    if (auction) {
      setAuctionData(auction);
    } else if (!roomId.startsWith('live_shopping_')) {
      // Try fetching if not in context
      getDoc(doc(db, 'kuku_auctions', roomId)).then(d => {
        if (d.exists()) setAuctionData({ id: d.id, ...d.data() });
      });
    }

    return () => {
      unsubSession();
      unsubChat();
    };
  }, [isOpen, roomId, auctions]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    try {
      await addDoc(collection(db, 'kuku_live_chats', roomId, 'messages'), {
        userId: safeUserId,
        userName: safeUserName,
        text: chatInput,
        createdAt: serverTimestamp()
      });
      setChatInput('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  useEffect(() => {
    if (!isOpen || !container || !systemSettings || initStartedRef.current || !sessionData) return;

    // If the session has already ended, don't initialize Zego
    if (sessionData.status === 'ended') {
      console.log("Session has ended, skipping Zego initialization");
      return;
    }

    let isMounted = true;
    initStartedRef.current = true;

    const initLiveStream = async () => {
      // Wait for the modal to be fully rendered and container to have dimensions
      let attempts = 0;
      while (isMounted && container && (container.offsetWidth === 0 || container.offsetHeight === 0) && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!isMounted || !container || container.offsetWidth === 0) {
        console.warn("Zego container not ready or hidden");
        initStartedRef.current = false;
        return;
      }

      // Try to get from systemSettings first, then fallback to env
      const appID = parseInt(systemSettings?.zego_app_id || import.meta.env.VITE_ZEGO_APP_ID || '0', 10);
      const serverSecret = systemSettings?.zego_server_secret || import.meta.env.VITE_ZEGO_SERVER_SECRET || '';

      if (!appID || !serverSecret) {
        if (isMounted) {
          toast.error("ZegoCloud credentials are not configured. Please set them in Admin Panel.");
          onClose();
        }
        return;
      }

      try {
        console.log(`Initializing Zego: Room=${roomId}, User=${safeUserId}, AppID=${appID}`);
        
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomId,
          safeUserId,
          safeUserName
        );

        if (!isMounted) return;

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        // If host, create a live session record in Firestore
        if (isHost && isMounted) {
          await setDoc(doc(db, 'kuku_live_sessions', roomId), {
            hostId: safeUserId,
            hostName: safeUserName,
            hostAvatar: vendorAvatar || '',
            roomId: roomId,
            type: roomId.startsWith('live_shopping_') ? 'shopping' : 'auction',
            startTime: serverTimestamp(),
            status: 'live',
            viewerCount: 0
          });
        }

        if (!isMounted || !container) {
          if (zp) zp.destroy();
          zpRef.current = null;
          return;
        }

        // Final check: ensure container is still attached to document
        if (!document.body.contains(container)) {
          console.warn("Zego container detached before joinRoom");
          if (zp) zp.destroy();
          zpRef.current = null;
          initStartedRef.current = false;
          return;
        }

        try {
          zp.joinRoom({
            container: container,
            showPreJoinView: false,
            showUserList: false,
            turnOnMicrophoneWhenJoining: isHost,
            turnOnCameraWhenJoining: isHost,
            scenario: {
              mode: ZegoUIKitPrebuilt.LiveStreaming,
              config: {
                role: isHost ? ZegoUIKitPrebuilt.Host : ZegoUIKitPrebuilt.Audience,
              },
            },
            onJoinRoom: async () => {
              if (!isHost && isMounted) {
                try {
                  await updateDoc(doc(db, 'kuku_live_sessions', roomId), {
                    viewerCount: increment(1)
                  });
                } catch (e) {}
              }
            },
            onLeaveRoom: async () => {
              if (isHost) {
                try {
                  await updateDoc(doc(db, 'kuku_live_sessions', roomId), {
                    status: 'ended',
                    endedAt: serverTimestamp(),
                    viewerCount: 0
                  });
                } catch (e) {
                  console.error("Error ending session:", e);
                }
              } else {
                try {
                  await updateDoc(doc(db, 'kuku_live_sessions', roomId), {
                    viewerCount: increment(-1)
                  });
                } catch (e) {}
              }
              onClose();
            },
          });
        } catch (joinError) {
          console.error("Zego joinRoom error:", joinError);
          if (isMounted) {
            toast.error("Tatizo la kiufundi limetokea. Tafadhali jaribu tena.");
            onClose();
          }
        }
      } catch (error) {
        console.error("Error initializing ZegoCloud:", error);
        if (isMounted) {
          toast.error("Imeshindwa kuanzisha Live Stream.");
          onClose();
        }
      }
    };

    initLiveStream();

    return () => {
      isMounted = false;
      initStartedRef.current = false;
      if (zpRef.current) {
        try {
          zpRef.current.destroy();
        } catch (e) {}
        zpRef.current = null;
      }
    };
  }, [isOpen, roomId, isHost, safeUserId, safeUserName, onClose, vendorAvatar, systemSettings, container]);

  if (!isOpen) return null;

  const currentUrl = `${window.location.origin}/stream/${roomId}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
      {/* Zego Container */}
      {sessionData?.status !== 'ended' ? (
        <div 
          ref={setContainer}
          className="flex-1 w-full h-full" 
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 p-8 text-center">
          <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mb-6">
            <Video size={48} className="text-red-600 opacity-50" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Live Imeisha</h2>
          <p className="text-slate-400 font-bold max-w-xs mx-auto">
            Asante kwa kujiunga! Muuzaji amemaliza matangazo haya ya moja kwa moja.
          </p>
          <button 
            onClick={onClose}
            className="mt-8 bg-white text-slate-900 px-8 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
          >
            RUDI NYUMBANI
          </button>
        </div>
      )}

      {/* HUD OVERLAY */}
      {sessionData?.status !== 'ended' && (
        <div className="absolute inset-0 z-[101] pointer-events-none flex flex-col justify-between p-4 md:p-6">
        {/* Top Section */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="flex flex-col gap-3">
            {/* Live Badge & Viewer Count */}
            <div className="flex items-center gap-2">
              <div className="bg-red-600 text-white px-2 py-1 rounded-md text-[10px] font-black flex items-center gap-1 animate-pulse">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                LIVE
              </div>
              <div className="bg-black/40 backdrop-blur-md text-white px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1">
                <Users size={12} />
                {viewerCount > 1000 ? `${(viewerCount/1000).toFixed(1)}K` : viewerCount} WATCHING
              </div>
            </div>

            {/* Vendor Info */}
            <div className="flex items-center gap-3 bg-black/20 backdrop-blur-sm p-2 rounded-2xl border border-white/10">
              <div className="w-10 h-10 rounded-full border-2 border-amber-500 overflow-hidden bg-slate-800">
                <img 
                  src={sessionData?.hostAvatar || vendorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${roomId}`} 
                  alt="Host" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-white font-black text-sm leading-tight">{sessionData?.hostName || 'Rashid Farm'}</h3>
                <p className="text-white/60 text-[10px] flex items-center gap-1">
                  <MapPin size={8} />
                  {auctionData?.location || 'Morogoro, TZ'}
                </p>
              </div>
            </div>

            {/* Product Info (if auction) */}
            {auctionData && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-black/20 backdrop-blur-sm p-3 rounded-2xl border border-white/10 max-w-[200px]"
              >
                <h4 className="text-white font-black text-lg leading-tight">{auctionData.title}</h4>
                <div className="mt-1 space-y-0.5">
                  <p className="text-white/70 text-xs">Age: <span className="text-white font-bold">{auctionData.age || '2 Years'}</span></p>
                  <p className="text-white/70 text-xs">Weight: <span className="text-white font-bold">{auctionData.weight || '320 kg'}</span></p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {isHost && (
              <button 
                onClick={() => {
                  if (zpRef.current) {
                    zpRef.current.leaveRoom();
                  } else {
                    onClose();
                  }
                }}
                className="bg-red-600 text-white px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all"
              >
                END LIVE
              </button>
            )}
            <button 
              onClick={onClose} 
              className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <X size={24} />
            </button>
            <button 
              onClick={() => setShowQR(!showQR)}
              className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <QrCode size={24} />
            </button>
          </div>
        </div>

        {/* Middle Section - Floating Hearts */}
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence>
            {likes.map(like => (
              <motion.div
                key={like.id}
                initial={{ opacity: 0, y: 0, x: like.x, scale: 0.5 }}
                animate={{ opacity: 1, y: -400, x: like.x + (Math.random() * 40 - 20), scale: 1.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute bottom-0 right-10 text-red-500"
              >
                <Heart fill="currentColor" size={32} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom Section */}
        <div className="space-y-4">
          {/* Chat Messages */}
          <div className="max-h-[200px] overflow-y-auto flex flex-col gap-2 pointer-events-auto scrollbar-hide">
            {messages.map((msg, idx) => (
              <motion.div 
                key={msg.id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2"
              >
                <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/5 max-w-[80%]">
                  <span className="text-amber-400 font-black text-xs mr-2">{msg.userName}:</span>
                  <span className="text-white text-xs">{msg.text}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Auction Stats (if auction) */}
          {auctionData && (
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex items-center justify-between pointer-events-auto">
              <div>
                <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mb-1">Time Left</p>
                <div className="flex items-center gap-2 text-white font-black text-xl">
                  <Clock size={18} className="text-amber-500" />
                  {auctionData.endTime ? '00:22' : 'N/A'}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mb-1">Winning Bid</p>
                <p className="text-amber-500 font-black text-xl">
                  {formatCurrency(auctionData.currentBid || auctionData.startingPrice || 0, systemSettings?.currency || 'TZS')}
                </p>
              </div>
            </div>
          )}

          {/* Input & Actions */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-3 rounded-full border border-white/10">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Sema kitu..."
                className="bg-transparent border-none outline-none text-white text-sm flex-1 placeholder:text-white/40"
              />
              <button type="submit" className="text-amber-500 hover:scale-110 transition-transform">
                <Send size={20} />
              </button>
            </form>

            <button 
              onClick={addLike}
              className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 hover:scale-110 transition-transform"
            >
              <Heart fill="white" size={24} />
            </button>
          </div>

          {/* Main Action Buttons */}
          {auctionData && (
            <div className="grid grid-cols-2 gap-4 pointer-events-auto">
              <button 
                onClick={async () => {
                  if (!user) {
                    toast.error("Tafadhali ingia ili uweze kuweka dau");
                    return;
                  }
                  const bidAmount = (auctionData.currentBid || auctionData.startingPrice) + 5000;
                  try {
                    await updateDoc(doc(db, 'kuku_auctions', auctionData.id), {
                      currentBid: bidAmount,
                      lastBidderId: user.id,
                      lastBidderName: user.name,
                      bidsCount: increment(1)
                    });
                    toast.success(`Dau lako la ${formatCurrency(bidAmount, systemSettings?.currency || 'TZS')} limewekwa!`);
                    addActivity('🔨', `Uliweka dau la ${formatCurrency(bidAmount, systemSettings?.currency || 'TZS')} kwenye mnada: ${auctionData.title}`);
                  } catch (e) {
                    toast.error("Imeshindwa kuweka dau");
                  }
                }}
                className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-600/20 active:scale-95 transition-all"
              >
                PLACE BID
              </button>
              <button 
                onClick={() => {
                  if (!user) {
                    toast.error("Tafadhali ingia ili uweze kununua");
                    return;
                  }
                  toast.success("Hii itakupeleka kwenye malipo ya moja kwa moja!");
                }}
                className="bg-gradient-to-r from-emerald-600 to-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
              >
                BUY NOW
              </button>
            </div>
          )}
        </div>
      </div>
    )}

      {/* QR Code Modal Overlay */}
      <AnimatePresence>
        {showQR && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowQR(false)}
          >
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-white p-8 rounded-[40px] flex flex-col items-center gap-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 bg-slate-50 rounded-3xl">
                <QRCode value={currentUrl} size={200} />
              </div>
              <div className="text-center">
                <h3 className="text-slate-900 font-black text-xl">Scan to Join Live</h3>
                <p className="text-slate-500 text-sm mt-1">Shiriki na rafiki zako!</p>
              </div>
              <button 
                onClick={() => setShowQR(false)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black"
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
