import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Camera, CameraOff, Loader } from 'lucide-react';

export interface HandData {
  gesture: 'open' | 'fist' | 'pinch' | 'none';
  x: number;
  y: number;
  pinchDist: number;
  fingerCount: number;
}

interface HandTrackerProps {
  onHandData?: (data: HandData) => void;
  showDebug?: boolean;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandData, showDebug = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-camera'>('loading');
  const lastGesture = useRef<'open' | 'fist' | 'pinch' | 'none'>('none');

  // Step 1: Initialize MediaPipe
  useEffect(() => {
    const initHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setHandLandmarker(landmarker);
      } catch (e) {
        console.error("Failed to init HandLandmarker:", e);
        setStatus('error');
      }
    };
    initHandLandmarker();
  }, []);

  // Step 2: Request camera access and start stream
  useEffect(() => {
    const enableWebcam = async () => {
      try {
        const constraints = {
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setStatus('ready');
          };
        }
      } catch (e) {
        console.error("Camera access denied:", e);
        setStatus('no-camera');
      }
    };
    enableWebcam();

    // Cleanup on unmount
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
      }
    };
  }, []);

  // Step 3: Run gesture detection loop with Stability Filter
  useEffect(() => {
    if (!handLandmarker || status !== 'ready') return;

    let requestID: number;
    let gestureBuffer: string[] = [];
    const BUFFER_SIZE = 5;

    const startDetection = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const results = await handLandmarker.detectForVideo(videoRef.current, performance.now());
        
        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          // Helper for finger state
          const isFingerOpen = (f: number, j: number) => landmarks[f].y < landmarks[j].y;
          const openFingers = [8, 12, 16, 20].filter(f => isFingerOpen(f, f - 2)).length;
          
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          const pinchDist = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) + 
            Math.pow(thumbTip.y - indexTip.y, 2)
          );

          const centerX = landmarks.reduce((sum, l) => sum + l.x, 0) / landmarks.length;
          const centerY = landmarks.reduce((sum, l) => sum + l.y, 0) / landmarks.length;

          let rawGesture: 'open' | 'fist' | 'pinch' | 'none' = 'none';
          if (pinchDist < 0.08) rawGesture = 'pinch';
          else if (openFingers >= 4) rawGesture = 'open';
          else if (openFingers <= 1) rawGesture = 'fist';

          // Stability Buffer
          gestureBuffer.push(rawGesture);
          if (gestureBuffer.length > BUFFER_SIZE) gestureBuffer.shift();
          
          const mostFrequent = gestureBuffer.reduce((acc, curr) => {
             acc[curr] = (acc[curr] || 0) + 1;
             return acc;
          }, {} as Record<string, number>);

          const stableGesture = Object.keys(mostFrequent).reduce((a, b) => 
            mostFrequent[a] > mostFrequent[b] ? a : b
          ) as 'open' | 'fist' | 'pinch' | 'none';

          const handData: HandData = {
            gesture: stableGesture,
            x: (centerX - 0.5) * 2,
            y: (centerY - 0.5) * 2,
            pinchDist,
            fingerCount: openFingers
          };

          onHandData?.(handData);

          if (stableGesture !== lastGesture.current) {
            lastGesture.current = stableGesture;
            if (stableGesture !== 'none' && stableGesture !== 'open') {
               Haptics.impact({ style: ImpactStyle.Heavy });
            }
          }
        } else {
          gestureBuffer = [];
          onHandData?.({ gesture: 'none', x: 0, y: 0, pinchDist: 0, fingerCount: 0 });
        }
      }
      requestID = requestAnimationFrame(startDetection);
    };

    startDetection();
    return () => cancelAnimationFrame(requestID);
  }, [handLandmarker, status, onHandData]);

  if (!showDebug) return null;

  return (
    <div className="relative w-full max-w-[200px] md:w-48 aspect-video rounded-xl overflow-hidden glass border border-devil-gold/30 shadow-2xl">
      {/* Status overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10 gap-2">
          <Loader size={24} className="text-devil-gold animate-spin" />
          <span className="text-[10px] text-devil-gold font-mono">LOADING AI...</span>
        </div>
      )}
      {status === 'no-camera' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 gap-3 p-4 text-center">
          <CameraOff size={24} className="text-red-400" />
          <span className="text-[10px] text-red-400 font-mono uppercase">Camera Blocked</span>
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-devil-gold text-black text-[10px] font-bold rounded-lg hover:bg-devil-dark transition-colors"
          >
            RETRY CAMERA
          </button>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10 gap-2">
          <Camera size={24} className="text-orange-400" />
          <span className="text-[10px] text-orange-400 font-mono text-center px-2 uppercase">Neural Error</span>
        </div>
      )}
      {status === 'ready' && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse" />
        </div>
      )}
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
    </div>
  );
};

export default HandTracker;
