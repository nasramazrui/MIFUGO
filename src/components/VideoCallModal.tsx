import React, { useEffect, useRef, useState } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  userId: string;
  userName: string;
  isVideo: boolean;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  onClose,
  roomId,
  userId,
  userName,
  isVideo
}) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const zpRef = useRef<any>(null);
  const { systemSettings } = useApp();

  useEffect(() => {
    if (!container || !isOpen || !roomId) return;

    const initZego = async () => {
      try {
        const appID = Number(systemSettings?.zegoAppId || 0);
        const serverSecret = systemSettings?.zegoServerSecret || '';

        if (!appID || !serverSecret) {
          console.error("Zego credentials missing");
          return;
        }

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomId,
          userId || `user_${Date.now()}`,
          userName || 'User'
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        zp.joinRoom({
          container: container,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: isVideo,
          showPreJoinView: false,
          showLeavingView: false,
          onLeaveRoom: () => {
            onClose();
          },
        });
      } catch (error) {
        console.error("Failed to initialize Zego:", error);
      }
    };

    initZego();

    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
    };
  }, [container, isOpen, roomId, userId, userName, isVideo, systemSettings, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black z-[100] flex flex-col">
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => {
              if (zpRef.current) {
                zpRef.current.destroy();
              }
              onClose();
            }}
            className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div ref={setContainer} className="flex-1 w-full h-full" />
      </div>
    </AnimatePresence>
  );
};
