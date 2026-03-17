import React, { useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useApp } from '../context/AppContext';

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  isHost: boolean;
  userId: string;
  userName: string;
  vendorAvatar?: string;
}

export default function LiveStreamModal({ isOpen, onClose, roomId, isHost, userId, userName, vendorAvatar }: LiveStreamModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<any>(null);
  const { systemSettings } = useApp();

  useEffect(() => {
    if (!isOpen || !containerRef.current || !systemSettings) return;

    let isMounted = true;

    const initLiveStream = async () => {
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
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomId,
          userId,
          userName
        );

        if (!isMounted) return;

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        // If host, create a live session record in Firestore
        if (isHost && isMounted) {
          await setDoc(doc(db, 'kuku_live_sessions', roomId), {
            hostId: userId,
            hostName: userName,
            hostAvatar: vendorAvatar || '',
            roomId: roomId,
            type: roomId.startsWith('live_shopping_') ? 'shopping' : 'auction',
            startTime: serverTimestamp(),
            status: 'live'
          });
        }

        if (!isMounted) {
          zp.destroy();
          return;
        }

        zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.LiveStreaming,
            config: {
              role: isHost ? ZegoUIKitPrebuilt.Host : ZegoUIKitPrebuilt.Audience,
            },
          },
          onLeaveRoom: async () => {
            if (isHost) {
              await deleteDoc(doc(db, 'kuku_live_sessions', roomId));
            }
            onClose();
          },
        });
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
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
    };
  }, [isOpen, roomId, isHost, userId, userName, onClose, vendorAvatar, systemSettings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex justify-end p-4 absolute top-0 right-0 z-[101]">
        <button onClick={onClose} className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors">
          <X size={24} />
        </button>
      </div>
      <div ref={containerRef} className="flex-1 w-full h-full" />
    </div>
  );
}
