import React, { useEffect, useRef, useState } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { X, Heart, MessageSquare, Send, Users, QrCode, Gavel, ShoppingBag, MapPin, Clock, Video, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, addDoc, query, orderBy, limit, getDoc, getDocs, updateDoc, increment, where, handleFirestoreError, OperationType } from '../services/firebase';
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
  const [totalLikes, setTotalLikes] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const currentRoomIdRef = useRef(roomId);
  const initInProgressRoomIdRef = useRef<string | null>(null);
  const initializedRoomIdRef = useRef<string | null>(null);
  const creationTimeRef = useRef<number>(0);
  const hasJoinedRef = useRef(false);
  const hasLeftRef = useRef(false);
  const [isZegoReady, setIsZegoReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const isZegoReadyRef = useRef(false);
  const joiningInstanceIdRef = useRef<number | null>(null);
  const hasDecrementedRef = useRef(false);
  const lastLikeTimeRef = useRef(0);
  const zegoInstanceIdRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
  const showLike = (xOffset?: number) => {
    const id = Date.now();
    const x = xOffset ?? (Math.random() * 100 - 50);
    setLikes(prev => [...prev, { id, x }]);
    setTimeout(() => {
      setLikes(prev => prev.filter(l => l.id !== id));
    }, 2000);
  };

  const addLike = () => {
    const now = Date.now();
    if (now - lastLikeTimeRef.current < 200) return; // Throttle likes
    lastLikeTimeRef.current = now;

    showLike();
    
    // Update global like count in Firestore
    if (roomId) {
      updateDoc(doc(db, 'kuku_live_sessions', roomId), {
        likeCount: increment(1)
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `kuku_live_sessions/${roomId}`));
    }

    // Broadcast like to all participants
    if (zpRef.current && hasJoinedRef.current && isZegoReadyRef.current && !hasLeftRef.current) {
      try {
        const x = Math.random() * 100 - 50;
        // Ensure room is still joined and ready
        (zpRef.current as any).sendInRoomCommand(JSON.stringify({ type: 'like', x }), [] as string[]);
      } catch (e) {
        console.error("Error broadcasting like:", e);
      }
    }
  };

  const notifyJoin = (zp: any) => {
    if (!isHost && hasJoinedRef.current && isZegoReadyRef.current && zpRef.current === zp && !hasLeftRef.current) {
      try {
        (zp as any).sendInRoomCommand(JSON.stringify({ type: 'user_joined', userName: safeUserName }), [] as string[]);
      } catch (e) {
        console.error("Error broadcasting join:", e);
      }
    }
  };

  useEffect(() => {
    if (!isOpen || !roomId) return;

    // Listen for session data (viewer count, etc)
    const unsubSession = onSnapshot(doc(db, 'kuku_live_sessions', roomId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSessionData(data);
        setViewerCount(data.viewerCount || 0);
        setTotalLikes(data.likeCount || 0);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `kuku_live_sessions/${roomId}`);
    });

    // Listen for chat
    const unsubChat = onSnapshot(collection(db, 'kuku_live_chats'), (snapshot) => {
      const msgs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(m => m.roomId === roomId)
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        })
        .slice(0, 20);
      setMessages(msgs.reverse());
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'kuku_live_chats');
    });

    // If it's an auction, fetch auction data
    const auction = Array.isArray(auctions) ? auctions.find(a => a.id === roomId) : undefined;
    if (auction) {
      setAuctionData(auction);
    } else if (!roomId.startsWith('live_shopping_')) {
      // Try fetching if not in context
      getDoc(doc(db, 'kuku_auctions', roomId))
        .then(d => {
          if (d.exists()) setAuctionData({ id: d.id, ...d.data() });
        })
        .catch(e => handleFirestoreError(e, OperationType.GET, `kuku_auctions/${roomId}`));
    }

    return () => {
      unsubSession();
      unsubChat();
    };
  }, [isOpen, roomId, auctions]);

  const [timeLeft, setTimeLeft] = useState<string>('N/A');

  // Countdown timer for auctions
  useEffect(() => {
    if (!auctionData?.endTime || !isOpen) return;

    const updateTimer = () => {
      const end = auctionData.endTime.toDate ? auctionData.endTime.toDate().getTime() : new Date(auctionData.endTime).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        return false;
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        return true;
      }
    };

    // Initial update
    const isRunning = updateTimer();
    if (!isRunning) {
      toast.success("Mnada umekwisha!");
      setTimeout(() => onClose(), 2000);
      return;
    }

    const timer = setInterval(() => {
      const isRunning = updateTimer();
      if (!isRunning) {
        clearInterval(timer);
        toast.success("Mnada umekwisha!");
        setTimeout(() => onClose(), 2000);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auctionData?.endTime, isOpen, onClose]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    try {
      const text = replyTo ? `@${replyTo.userName} ${chatInput}` : chatInput;
      await addDoc(collection(db, 'kuku_live_chats'), {
        roomId,
        userId: safeUserId,
        userName: safeUserName,
        text: text,
        createdAt: serverTimestamp()
      });
      setChatInput('');
      setReplyTo(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'kuku_live_chats');
    }
  };

  const endLiveSession = async () => {
    if (!isHost || !roomId) return;
    
    try {
      console.log("Explicitly ending live session:", roomId);
      const sessionRef = doc(db, 'kuku_live_sessions', roomId);
      const snap = await getDoc(sessionRef);
      if (snap.exists()) {
        await setDoc(sessionRef, {
          status: 'ended',
          endedAt: serverTimestamp(),
          viewerCount: 0
        }, { merge: true });
      }

      // Also update the auction if this roomId is an auctionId
      if (!roomId.startsWith('live_shopping_')) {
        const auctionRef = doc(db, 'kuku_auctions', roomId);
        const auctionSnap = await getDoc(auctionRef);
        if (auctionSnap.exists()) {
          await updateDoc(auctionRef, {
            status: 'ended',
            liveEnded: true,
            endedAt: serverTimestamp()
          });
        }
      }

      toast.success("Live imemalizika!");
    } catch (e: any) {
      if (e?.code !== 'not-found' && !e?.message?.includes('No document to update')) {
        handleFirestoreError(e, OperationType.UPDATE, `kuku_live_sessions/${roomId}`);
      }
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

  const [showCameraSelect, setShowCameraSelect] = useState(false);

  const handleRestartLiveClick = () => {
    setShowCameraSelect(true);
  };

  const confirmRestartLive = async (facingMode: 'user' | 'environment') => {
    if (!isHost || !roomId) return;
    try {
      // Delete old messages
      const snapshot = await getDocs(collection(db, 'kuku_live_chats'));
      const deletePromises = snapshot.docs
        .filter(d => d.data().roomId === roomId)
        .map(d => deleteDoc(doc(db, 'kuku_live_chats', d.id)));
      await Promise.all(deletePromises);

      await setDoc(doc(db, 'kuku_live_sessions', roomId), {
        status: 'live',
        startTime: serverTimestamp(),
        viewerCount: 0
      }, { merge: true });
      
      // Set flag to auto-reopen modal and reload page to completely reset Zego SDK state
      sessionStorage.setItem('autoRestartLive', roomId);
      sessionStorage.setItem('autoRestartCamera', facingMode);
      window.location.reload();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `kuku_live_sessions/${roomId}`);
      toast.error("Imeshindwa kuanza tena live");
    }
  };

  useEffect(() => {
    const isZegoInternalError = (err: any) => {
      if (!err) return false;
      const msg = typeof err === 'string' ? err : (err.message || '');
      const stack = err.stack || '';
      return msg.includes('createSpan') || stack.includes('createSpan') || 
             msg.includes('binaryType') || stack.includes('binaryType') ||
             msg.includes('.find is not a function') || msg.includes('e2.find');
    };

    const handleError = (e: ErrorEvent) => {
      if (isZegoInternalError(e.error) || isZegoInternalError(e.message)) {
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      if (isZegoInternalError(e.reason)) {
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleRejection, true);
    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection, true);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !container || !systemSettings) return;

    // If already initialized or initializing for this room, don't do it again
    if (initializedRoomIdRef.current === roomId && zpRef.current && !initError) return;
    if (initInProgressRoomIdRef.current === roomId && !initError) return;

    // Viewers must wait for session data to check status
    if (!isHost && !sessionData) return;

    // If the session has already ended, don't initialize Zego unless we are the host
    if (sessionData && sessionData.status === 'ended' && !isHost) {
      console.log("Session has ended, skipping Zego initialization");
      return;
    }

    currentRoomIdRef.current = roomId;
    let shouldAbortInit = false;
    const instanceId = ++zegoInstanceIdRef.current;
    initInProgressRoomIdRef.current = roomId;
    setInitError(null);

    const initLiveStream = async () => {
      if (!isMountedRef.current) return;
      try {
        console.log(`[LiveStream] Starting init for room: ${roomId}, isHost: ${isHost}`);

      // Wait for any pending destroy from previous session to finish
      const timeSinceCreation = Date.now() - creationTimeRef.current;
      if (timeSinceCreation < 1500 && creationTimeRef.current > 0) {
        console.log("[LiveStream] Waiting for previous session cleanup...");
        await new Promise(resolve => setTimeout(resolve, 1500 - timeSinceCreation));
      }

      if (shouldAbortInit || zegoInstanceIdRef.current !== instanceId || !isMountedRef.current) {
        console.log("[LiveStream] Init aborted before container check");
        return;
      }

      // Wait for the modal to be fully rendered and container to have dimensions
      let attempts = 0;
      console.log("[LiveStream] Waiting for container dimensions...");
      while (!shouldAbortInit && zegoInstanceIdRef.current === instanceId && isMountedRef.current && container && (container.offsetWidth === 0 || container.offsetHeight === 0) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (shouldAbortInit || zegoInstanceIdRef.current !== instanceId || !isMountedRef.current || !container || container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.warn("[LiveStream] Zego container not ready or hidden after waiting", {
          shouldAbortInit,
          instanceMatch: zegoInstanceIdRef.current === instanceId,
          isMounted: isMountedRef.current,
          hasContainer: !!container,
          width: container?.offsetWidth,
          height: container?.offsetHeight,
          attempts
        });
        if (initInProgressRoomIdRef.current === roomId) {
          initInProgressRoomIdRef.current = null;
        }
        return;
      }

      console.log("[LiveStream] Container ready, fetching credentials...");

      // Try to get from systemSettings first, then fallback to env
      const appID = parseInt(systemSettings?.zego_app_id || import.meta.env.VITE_ZEGO_APP_ID || '0', 10);
      const serverSecret = systemSettings?.zego_server_secret || import.meta.env.VITE_ZEGO_SERVER_SECRET || '';

      if (!appID || !serverSecret) {
        console.error("[LiveStream] Missing ZegoCloud credentials", { appID: !!appID, serverSecret: !!serverSecret });
        if (!shouldAbortInit) {
          toast.error("ZegoCloud credentials are not configured. Please set them in Admin Panel.");
          onClose();
        }
        if (initInProgressRoomIdRef.current === roomId) {
          initInProgressRoomIdRef.current = null;
        }
        return;
      }

      if (!safeUserId || safeUserId.trim() === '') {
        console.error("[LiveStream] Zego initialization aborted: empty safeUserId");
        if (initInProgressRoomIdRef.current === roomId) {
          initInProgressRoomIdRef.current = null;
        }
        return;
      }

      console.log(`[LiveStream] Generating kit token: Room=${roomId}, User=${safeUserId}, AppID=${appID}`);
        
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomId,
          safeUserId,
          safeUserName
        );

        if (shouldAbortInit) {
          console.log("[LiveStream] Init aborted after token generation");
          if (initInProgressRoomIdRef.current === roomId) {
            initInProgressRoomIdRef.current = null;
          }
          return;
        }

        console.log("[LiveStream] Creating Zego instance...");
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        if (shouldAbortInit || zegoInstanceIdRef.current !== instanceId || !isMountedRef.current) {
          try { (zp as any).destroy(); } catch(e) {}
          return;
        }
        
        zpRef.current = zp;
        creationTimeRef.current = Date.now();
        initializedRoomIdRef.current = roomId;
        // Do NOT set initInProgressRoomIdRef.current = null here, wait until joinRoom finishes or fails

        // If host, create or update a live session record in Firestore
        if (isHost && !shouldAbortInit) {
          const sessionRef = doc(db, 'kuku_live_sessions', roomId);
          const sessionSnap = await getDoc(sessionRef);
          
          if (sessionSnap.exists() && sessionSnap.data().status === 'live') {
            // Just update host info if needed, don't reset viewerCount
            await setDoc(sessionRef, {
              hostName: safeUserName,
              hostAvatar: vendorAvatar || '',
              lastSeen: serverTimestamp()
            }, { merge: true });
          } else {
            // New session or restarting ended session
            // Clear past chat messages
            try {
              const chatSnap = await getDocs(collection(db, 'kuku_live_chats'));
              const deletePromises = chatSnap.docs
                .filter(d => d.data().roomId === roomId)
                .map(d => deleteDoc(doc(db, 'kuku_live_chats', d.id)));
              await Promise.all(deletePromises);
              console.log("Cleared past chat messages for new session");
            } catch (chatErr) {
              handleFirestoreError(chatErr, OperationType.DELETE, 'kuku_live_chats');
            }

            await setDoc(sessionRef, {
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
        }

        if (shouldAbortInit || !container) {
          if (zp) {
            const timeSinceCreation = Date.now() - creationTimeRef.current;
            const delay = Math.max(0, 1000 - timeSinceCreation);
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
            const delay = Math.max(0, 1000 - timeSinceCreation);
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
          const savedCamera = sessionStorage.getItem('autoRestartCamera');
          const useFrontCamera = savedCamera === 'environment' ? false : true;
          
          console.log(`[LiveStream] Joining Zego room: ${roomId} as ${isHost ? 'Host' : 'Audience'}`);
          
          const zegoConfig: any = {
            container: container,
            showPreJoinView: false, // Start immediately without pre-join screen
            scenario: {
              mode: ZegoUIKitPrebuilt.LiveStreaming,
              config: {
                role: isHost ? ZegoUIKitPrebuilt.Host : ZegoUIKitPrebuilt.Audience,
              },
            },
            showMyCameraControls: isHost,
            showMyMicrophoneControls: isHost,
            showAudioVideoSettingsButton: true,
            showScreenSharingButton: false,
            showLayoutButton: false,
            showNonVideoUser: false,
            showUserList: false,
            showTextChat: false,
            showInRoomMessageButton: false,
            videoViewConfig: {
              showOnlySelf: false,
              objectFit: 'cover'
            },
            onInRoomCommandReceived: (commandData: any) => {
              try {
                if (!commandData.content || commandData.content === 'undefined' || typeof commandData.content !== 'string') return;
                const data = JSON.parse(commandData.content);
                if (data.type === 'like') {
                  showLike(data.x);
                } else if (data.type === 'user_joined') {
                  toast.success(`${data.userName} ameingia kwenye live!`, { icon: '👋', duration: 2000 });
                } else if (data.type === 'remove_user' && data.targetUserId === safeUserId) {
                  toast.error("Umetolewa kwenye live hii na muuzaji.");
                  onClose();
                }
              } catch (e) {
                console.error("[LiveStream] Error parsing custom command:", e, "Raw content:", commandData.content);
              }
            },
            onJoinRoom: () => {
              if (shouldAbortInit || zegoInstanceIdRef.current !== instanceId || !isMountedRef.current) {
                console.log("[LiveStream] onJoinRoom: aborted or instance mismatch");
                return;
              }
              if (hasJoinedRef.current) return;
              
              console.log(`[LiveStream] Successfully joined room: ${roomId}`);
              hasJoinedRef.current = true;
              hasLeftRef.current = false;
              hasDecrementedRef.current = false;
              joiningInstanceIdRef.current = null;
              initInProgressRoomIdRef.current = null;
              
              // Set ready flag after a more conservative delay
              setTimeout(() => {
                if (hasJoinedRef.current && !hasLeftRef.current && zegoInstanceIdRef.current === instanceId && isMountedRef.current) {
                  console.log("[LiveStream] Zego is now fully ready");
                  isZegoReadyRef.current = true;
                  setIsZegoReady(true);
                }
              }, 2000);

              // Notify others that someone joined
              if (!isHost) {
                setTimeout(async () => {
                  if (!hasJoinedRef.current || hasLeftRef.current || !isZegoReadyRef.current || zegoInstanceIdRef.current !== instanceId || !isMountedRef.current) return;
                  
                  try {
                    notifyJoin(zp);
                    
                    const sessionJoinedKey = `joined_live_${roomId}`;
                    if (!sessionStorage.getItem(sessionJoinedKey)) {
                      await setDoc(doc(db, 'kuku_live_sessions', roomId), {
                        viewerCount: increment(1)
                      }, { merge: true });
                      sessionStorage.setItem(sessionJoinedKey, 'true');
                    }
                  } catch (e) {
                    handleFirestoreError(e, OperationType.UPDATE, `kuku_live_sessions/${roomId}`);
                  }
                }, 3500);
              }
            },
            onLeaveRoom: () => {
              if (zegoInstanceIdRef.current !== instanceId) return;
              
              console.log(`[LiveStream] Leaving room: ${roomId}`);
              hasJoinedRef.current = false;
              hasLeftRef.current = true;
              isZegoReadyRef.current = false;
              setIsZegoReady(false);
              joiningInstanceIdRef.current = null;
              
              if (isHost) {
                setDoc(doc(db, 'kuku_live_sessions', roomId), {
                  status: 'ended',
                  endedAt: serverTimestamp(),
                  viewerCount: 0
                }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `kuku_live_sessions/${roomId}`));
              } else {
                if (!hasDecrementedRef.current && isMountedRef.current) {
                  setDoc(doc(db, 'kuku_live_sessions', roomId), {
                    viewerCount: increment(-1)
                  }, { merge: true }).then(() => {
                    hasDecrementedRef.current = true;
                  }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `kuku_live_sessions/${roomId}`));
                }
                if (isMountedRef.current) onClose();
              }
            },
          };

          // Only add camera/mic controls if host, as audience cannot configure these in LiveStreaming scenario
          if (isHost) {
            zegoConfig.showMyCameraControls = true;
            zegoConfig.showMyMicrophoneControls = true;
            zegoConfig.showAudioVideoSettingsButton = true;
            zegoConfig.turnOnMicrophoneWhenJoining = true;
            zegoConfig.turnOnCameraWhenJoining = true;
            zegoConfig.useFrontFacingCamera = useFrontCamera;
          }

          if (hasJoinedRef.current || hasLeftRef.current || (joiningInstanceIdRef.current === instanceId) || zegoInstanceIdRef.current !== instanceId || !isMountedRef.current) {
            console.warn("Skipping joinRoom: already joined, joining, leaving, or aborted");
            initInProgressRoomIdRef.current = null;
            return;
          }

          joiningInstanceIdRef.current = instanceId;
          await zp.joinRoom(zegoConfig);
          if (joiningInstanceIdRef.current === instanceId) {
            joiningInstanceIdRef.current = null;
          }
        } catch (joinError: any) {
          if (zegoInstanceIdRef.current === instanceId) {
            console.error("Zego joinRoom error:", joinError);
            joiningInstanceIdRef.current = null;
            initInProgressRoomIdRef.current = null;
            if (!shouldAbortInit && isMountedRef.current) {
              const errorMsg = (joinError?.errorCode === 1100002 || (joinError?.message && joinError.message.includes('timeout')))
                ? "Mtandao wako ni dhaifu. Tafadhali jaribu tena baada ya kuimarisha mtandao."
                : "Tatizo la kiufundi limetokea. Tafadhali jaribu tena.";
              
              setInitError(errorMsg);
              toast.error(errorMsg);
              // Don't close immediately, let user retry
            }
          }
        }
      } catch (error) {
        if (zegoInstanceIdRef.current === instanceId) {
          console.error("Error initializing ZegoCloud:", error);
          if (!shouldAbortInit && isMountedRef.current) {
            setInitError("Imeshindwa kuanzisha Live Stream.");
            toast.error("Imeshindwa kuanzisha Live Stream.");
          }
        }
        if (initInProgressRoomIdRef.current === roomId) {
          initInProgressRoomIdRef.current = null;
        }
      }
    };

    initLiveStream();

    return () => {
      const isSessionEnded = sessionData && sessionData.status === 'ended';
      const shouldDestroy = !isOpen || currentRoomIdRef.current !== roomId || !container || isSessionEnded || !!initError;
      
      if (shouldDestroy) {
        const joinedAtCleanup = hasJoinedRef.current;
        const decrementedAtCleanup = hasDecrementedRef.current;
        shouldAbortInit = true;
        hasJoinedRef.current = false;
        hasLeftRef.current = true;
        isZegoReadyRef.current = false;
        setIsZegoReady(false);
        joiningInstanceIdRef.current = null;
        initInProgressRoomIdRef.current = null;
        initializedRoomIdRef.current = null;
        
        console.log("Cleaning up Zego for room:", roomId);
        
        if (zpRef.current) {
          const zpToDestroy = zpRef.current;
          const rId = roomId;
          const wasHost = isHost;
          const timeSinceCreation = Date.now() - creationTimeRef.current;
          
          zpRef.current = null;

          // Cleanup viewer count if needed
          if (!wasHost && joinedAtCleanup && !decrementedAtCleanup && rId) {
            setDoc(doc(db, 'kuku_live_sessions', rId), {
              viewerCount: increment(-1)
            }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `kuku_live_sessions/${rId}`));
          }

          try {
            const delay = Math.max(0, 1000 - timeSinceCreation);
            setTimeout(() => {
              try {
                if (zpToDestroy && typeof zpToDestroy.destroy === 'function') {
                  console.log("Destroying Zego instance in cleanup");
                  zpToDestroy.destroy();
                }
              } catch (e) {
                console.warn("Error during Zego destroy:", e);
              }
            }, delay);
          } catch (e) {}
        }

        if (isHost && roomId && (!isOpen || currentRoomIdRef.current !== roomId)) {
          setDoc(doc(db, 'kuku_live_sessions', roomId), {
            status: 'ended',
            endedAt: serverTimestamp(),
            viewerCount: 0
          }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `kuku_live_sessions/${roomId}`));
        }
      }
    };
  }, [isOpen, roomId, isHost, safeUserId, safeUserName, onClose, vendorAvatar, systemSettings, container, sessionData?.status, !!sessionData, retryTrigger]);

  const handleRemoveUser = (targetUserId: string, targetUserName: string) => {
    if (!isHost || !zpRef.current || !hasJoinedRef.current || !isZegoReadyRef.current || hasLeftRef.current) return;
    if (window.confirm(`Je, una uhakika unataka kumtoa ${targetUserName} kwenye live?`)) {
      if (!zpRef.current || !hasJoinedRef.current || !isZegoReadyRef.current || hasLeftRef.current) return;
      try {
        (zpRef.current as any).sendInRoomCommand(JSON.stringify({ 
          type: 'remove_user', 
          targetUserId 
        }), [] as string[]);
        toast.success(`${targetUserName} ametolewa.`);
      } catch (e) {
        console.error("Error removing user:", e);
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!isHost || !roomId) return;
    if (window.confirm('Je, una uhakika unataka kufuta ujumbe huu?')) {
      try {
        await deleteDoc(doc(db, 'kuku_live_chats', messageId));
        toast.success('Ujumbe umefutwa');
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `kuku_live_chats/${messageId}`);
        toast.error('Imeshindwa kufuta ujumbe');
      }
    }
  };

  if (!isOpen) return null;

  if (!sessionData && !isHost) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const currentUrl = `${window.location.origin}/?live=${roomId}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
      {/* Zego Container */}
      {sessionData?.status !== 'ended' ? (
        <div className="relative flex-1 w-full h-full">
          {!isZegoReady && (
            <div className="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
              {initError ? (
                <>
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <X size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-widest mb-2">Tatizo Limetokea</h3>
                  <p className="text-slate-400 font-bold max-w-xs mb-8">{initError}</p>
                  
                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button 
                      onClick={() => {
                        setInitError(null);
                        setRetryTrigger(prev => prev + 1);
                      }}
                      className="bg-amber-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all active:scale-95"
                    >
                      JARIBU TENA
                    </button>
                    <button 
                      onClick={onClose}
                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                    >
                      ONDOKA
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <h3 className="text-xl font-black uppercase tracking-widest mb-2">Inaunganisha...</h3>
                  <p className="text-slate-400 font-bold max-w-xs">Tafadhali subiri kidogo wakati tunatayarisha matangazo ya moja kwa moja.</p>
                  
                  <button 
                    onClick={onClose}
                    className="mt-8 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    GHAIRISHA
                  </button>
                </>
              )}
            </div>
          )}
          <div 
            key="zego-container"
            ref={setContainer}
            className="w-full h-full" 
            style={{ width: '100%', height: '100%' }}
          />
        </div>
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
                onClick={handleRestartLiveClick}
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
                {viewerCount > 1000 ? `${(viewerCount/1000).toFixed(1)}K` : viewerCount}
              </div>
              <div className="bg-black/40 backdrop-blur-md text-white px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1">
                <Heart size={12} className="text-red-500 fill-red-500" />
                {totalLikes > 1000 ? `${(totalLikes/1000).toFixed(1)}K` : totalLikes}
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
            <button 
              onClick={() => setShowQR(!showQR)}
              className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors pointer-events-auto"
            >
              <QrCode size={24} />
            </button>
            <button 
              onClick={onClose} 
              className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors pointer-events-auto"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Top Center - END LIVE for Host */}
        {isHost && sessionData?.status !== 'ended' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[102] pointer-events-auto">
            <button 
              onClick={handleEndLive}
              disabled={isEnding}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/40 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Video size={16} />
              {isEnding ? 'ENDING...' : 'END LIVE'}
            </button>
          </div>
        )}

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
        <div className="space-y-4 pb-16 md:pb-20">
          {/* Chat Messages */}
          <div className="max-h-[200px] overflow-y-auto flex flex-col gap-2 pointer-events-auto scrollbar-hide">
            {messages.map((msg, idx) => (
              <motion.div 
                key={msg.id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 group"
              >
                <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/5 max-w-[80%] flex items-center gap-2">
                  <div className="flex-1">
                    <span className="text-amber-400 font-black text-xs mr-2">{msg.userName}:</span>
                    <span className="text-white text-xs">{msg.text}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isHost && (
                      <button 
                        onClick={() => setReplyTo(msg)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-all"
                        title="Jibu"
                      >
                        <MessageSquare size={12} />
                      </button>
                    )}
                    {isHost && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/20 rounded-lg transition-all"
                        title="Futa"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    {isHost && msg.userId !== safeUserId && (
                      <button 
                        onClick={() => handleRemoveUser(msg.userId, msg.userName)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/20 rounded-lg transition-all"
                        title="Ondoa huyu"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
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
                  {timeLeft}
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
          <div className="flex flex-col gap-2 pointer-events-auto">
            {replyTo && (
              <div className="flex items-center justify-between bg-amber-500/20 backdrop-blur-md px-3 py-1 rounded-lg border border-amber-500/30">
                <p className="text-[10px] text-amber-400 font-bold">Unajibu kwa @{replyTo.userName}</p>
                <button onClick={() => setReplyTo(null)} className="text-amber-400"><X size={12} /></button>
              </div>
            )}
            <div className="flex items-center gap-3">
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
              className="relative w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 hover:scale-110 transition-transform active:scale-95"
            >
              <Heart fill="white" size={24} />
              {totalLikes > 0 && (
                <div className="absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-red-500 min-w-[20px] text-center">
                  {totalLikes > 999 ? '999+' : totalLikes}
                </div>
              )}
            </button>
          </div>
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
                    handleFirestoreError(e, OperationType.UPDATE, `kuku_auctions/${auctionData.id}`);
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
