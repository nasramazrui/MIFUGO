import React, { useEffect, useRef, useState } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { X, Heart, MessageSquare, Send, Users, QrCode, Gavel, ShoppingBag, MapPin, Clock, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, addDoc, query, orderBy, limit, getDoc, getDocs, updateDoc, increment } from 'firebase/firestore';
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
  const { systemSettings, auctions, user, addActivity } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [likes, setLikes] = useState<{ id: number, x: number }[]>([]);
  const [sessionData, setSessionData] = useState<any>(null);
  const [showQR, setShowQR] = useState(false);
  const [auctionData, setAuctionData] = useState<any>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [showCameraSelect, setShowCameraSelect] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const currentRoomIdRef = useRef(roomId);
  const initInProgressRoomIdRef = useRef<string | null>(null);
  const initializedRoomIdRef = useRef<string | null>(null);
  const creationTimeRef = useRef<number>(0);

  useEffect(() => {
    currentRoomIdRef.current = roomId;
  }, [roomId]);

  // Ensure we have a valid userId for Zego - must be a non-empty string
  const safeUserId = React.useMemo(() => {
    if (userId && userId.trim()) return userId.trim();
    return `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }, [userId]);

  const safeUserName = React.useMemo(() => {
    if (userName && userName.trim()) return userName.trim();
    return 'Mgeni';
  }, [userName]);

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

  const endLiveSession = async () => {
    if (!isHost || !roomId) return;
    
    try {
      console.log("Explicitly ending live session:", roomId);
      await updateDoc(doc(db, 'kuku_live_sessions', roomId), {
        status: 'ended',
        endedAt: serverTimestamp(),
        viewerCount: 0
      });
      toast.success("Live imemalizika!");
    } catch (e) {
      console.error("Error explicitly ending session:", e);
    }
  };

  const handleEndLive = async () => {
    setIsEnding(true);
    try {
      await endLiveSession();
    } finally {
      setIsEnding(false);
    }
  };

  const handleRestartLive = () => {
    if (!isHost || !roomId) return;
    setShowCameraSelect(true);
  };

  const confirmRestartLive = async (selectedFacingMode: "user" | "environment") => {
    setShowCameraSelect(false);
    setFacingMode(selectedFacingMode);
    try {
      // Delete old messages
      const messagesRef = collection(db, 'kuku_live_chats', roomId, 'messages');
      const q = query(messagesRef);
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      await updateDoc(doc(db, 'kuku_live_sessions', roomId), {
        status: 'live',
        startTime: serverTimestamp(),
        viewerCount: 0
      });
      toast.success("Live imeanza tena!");
    } catch (e) {
      console.error("Error restarting live:", e);
      toast.error("Imeshindwa kuanza tena live");
    }
  };

  useEffect(() => {
    if (!isOpen || !container || !systemSettings) return;

    // If already initialized or initializing for this room, don't do it again
    if (initializedRoomIdRef.current === roomId && zpRef.current) return;
    if (initInProgressRoomIdRef.current === roomId) return;

    // Viewers must wait for session data to check status
    if (!isHost && !sessionData) return;

    // If the session has already ended, don't initialize Zego unless we are the host
    if (sessionData && sessionData.status === 'ended' && !isHost) {
      console.log("Session has ended, skipping Zego initialization");
      return;
    }

    currentRoomIdRef.current = roomId;
    let isMounted = true;
    initInProgressRoomIdRef.current = roomId;

    const initLiveStream = async () => {
      // Wait for the modal to be fully rendered and container to have dimensions
      let attempts = 0;
      while (isMounted && container && (container.offsetWidth === 0 || container.offsetHeight === 0) && attempts < 40) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!isMounted || !container || container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.warn("Zego container not ready or hidden after waiting");
        if (initInProgressRoomIdRef.current === roomId) {
          initInProgressRoomIdRef.current = null;
        }
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
        if (initInProgressRoomIdRef.current === roomId) {
          initInProgressRoomIdRef.current = null;
        }
        return;
      }

      if (!safeUserId || safeUserId.trim() === '') {
        console.error("Zego initialization aborted: empty safeUserId");
        if (initInProgressRoomIdRef.current === roomId) {
          initInProgressRoomIdRef.current = null;
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

        if (!isMounted) {
          if (initInProgressRoomIdRef.current === roomId) {
            initInProgressRoomIdRef.current = null;
          }
          return;
        }

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;
        creationTimeRef.current = Date.now();
        initializedRoomIdRef.current = roomId;
        initInProgressRoomIdRef.current = null;

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
          if (zp) {
            const timeSinceCreation = Date.now() - creationTimeRef.current;
            const delay = Math.max(1000, 1000 - timeSinceCreation);
            setTimeout(() => {
              try { 
                if (zp && typeof zp.destroy === 'function') {
                  zp.destroy(); 
                }
              } catch (e) {}
            }, delay);
          }
          zpRef.current = null;
          return;
        }

        // Final check: ensure container is still attached to document
        if (!document.body.contains(container)) {
          console.warn("Zego container detached before joinRoom");
          if (zp) {
            const timeSinceCreation = Date.now() - creationTimeRef.current;
            const delay = Math.max(1000, 1000 - timeSinceCreation);
            setTimeout(() => {
              try { 
                if (zp && typeof zp.destroy === 'function') {
                  zp.destroy(); 
                }
              } catch (e) {}
            }, delay);
          }
          zpRef.current = null;
          initializedRoomIdRef.current = null;
          return;
        }

        try {
          zp.joinRoom({
            container: container,
            showPreJoinView: isHost, // Enable pre-join for host to check camera/mic
            showUserList: false,
            turnOnMicrophoneWhenJoining: isHost,
            turnOnCameraWhenJoining: isHost,
            showAudioVideoSettingsButton: isHost,
            useFrontFacingCamera: facingMode === "user",
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
                onClose();
              }
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
      
      // Only destroy Zego if the modal is closing, we are changing rooms, or the container is being removed, or session ended
      // This prevents re-initializing on every sessionData update but ensures we re-init if the container changes
      const isSessionEnded = sessionData && sessionData.status === 'ended';
      const shouldDestroy = !isOpen || currentRoomIdRef.current !== roomId || !container || isSessionEnded;
      
      if (shouldDestroy) {
        console.log("Cleaning up Zego for room:", roomId, "Reason:", !isOpen ? "Modal closed" : currentRoomIdRef.current !== roomId ? "Room changed" : !container ? "Container removed" : "Session ended");
        initInProgressRoomIdRef.current = null;
        initializedRoomIdRef.current = null;
        
        if (zpRef.current) {
          const zpToDestroy = zpRef.current;
          const timeSinceCreation = Date.now() - creationTimeRef.current;
          zpRef.current = null;
          try {
            // Increased delay to ensure any pending internal Zego tasks can settle
            // before we hard-destroy the instance, which can cause the binaryType or createSpan error
            // We ensure at least 1 second has passed since creation to avoid race conditions in SDK tracing
            const delay = Math.max(1000, 1000 - timeSinceCreation);
            setTimeout(() => {
              try {
                if (zpToDestroy && typeof zpToDestroy.destroy === 'function') {
                  zpToDestroy.destroy();
                }
              } catch (e) {
                console.warn("Error during Zego destroy:", e);
              }
            }, delay);
          } catch (e) {}
        }

        // If host is leaving (modal closing or room changing), make sure session is ended
        if (isHost && roomId && (!isOpen || currentRoomIdRef.current !== roomId)) {
          updateDoc(doc(db, 'kuku_live_sessions', roomId), {
            status: 'ended',
            endedAt: serverTimestamp(),
            viewerCount: 0
          }).catch(e => console.error("Cleanup error ending session:", e));
        }
      }
    };
  }, [isOpen, roomId, isHost, safeUserId, safeUserName, onClose, vendorAvatar, systemSettings, container, sessionData?.status, !!sessionData]);

  if (!isOpen) return null;

  if (!sessionData && !isHost) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const currentUrl = `${window.location.origin}/stream/${roomId}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
      {/* Zego Container */}
      {sessionData?.status !== 'ended' ? (
        <div 
          key="zego-container"
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
            {isHost 
              ? "Umemaliza matangazo haya ya moja kwa moja. Unaweza kuanza tena au kufunga." 
              : "Asante kwa kujiunga! Muuzaji amemaliza matangazo haya ya moja kwa moja."}
          </p>
          
          <div className="flex flex-col gap-3 w-full max-w-xs mt-8">
            {isHost && (
              <button 
                onClick={handleRestartLive}
                className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-amber-600 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
              >
                ANZA TENA LIVE
              </button>
            )}
            <button 
              onClick={onClose}
              className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
            >
              {isHost ? "FUNGA" : "RUDI NYUMBANI"}
            </button>
          </div>
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
                onClick={handleEndLive}
                disabled={isEnding}
                className="bg-red-600 text-white px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isEnding ? 'ENDING...' : 'END LIVE'}
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

      {/* Camera Selection Modal */}
      <AnimatePresence>
        {showCameraSelect && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowCameraSelect(false)}
          >
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-slate-900 p-8 rounded-[40px] flex flex-col items-center gap-6 border border-white/10 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center">
                <Video size={40} className="text-amber-500" />
              </div>
              <div className="text-center">
                <h3 className="text-white font-black text-2xl mb-2">Chagua Kamera</h3>
                <p className="text-slate-400 text-sm">Unataka kutumia kamera gani kuanza live?</p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={() => confirmRestartLive("user")}
                  className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black hover:bg-slate-700 transition-colors"
                >
                  KAMERA YA MBELE (FRONT)
                </button>
                <button 
                  onClick={() => confirmRestartLive("environment")}
                  className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
                >
                  KAMERA YA NYUMA (BACK)
                </button>
              </div>
              <button 
                onClick={() => setShowCameraSelect(false)}
                className="text-slate-500 font-bold text-sm mt-2 hover:text-white transition-colors"
              >
                Ghairi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
