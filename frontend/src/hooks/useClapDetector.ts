import { useEffect, useRef, useCallback } from 'react';

export const useClapDetector = (onClap: () => void) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const lastClapTime = useRef<number>(0);
  const clapCount = useRef<number>(0);

  const startClapDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkClap = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate volume/intensity
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Peak detection for clap
        // Claps are sharp, high-frequency transients.
        if (average > 60) { // Threshold for "sharp" sound
          const now = Date.now();
          if (now - lastClapTime.current > 150) { // Debounce
            if (now - lastClapTime.current < 800) { // Double clap window
              clapCount.current++;
              if (clapCount.current === 2) {
                console.log("DOUBLE CLAP DETECTED");
                onClap();
                clapCount.current = 0;
              }
            } else {
              clapCount.current = 1;
            }
            lastClapTime.current = now;
          }
        }

        requestAnimationFrame(checkClap);
      };

      checkClap();
    } catch (err) {
      console.error("Error accessing microphone for clap detection:", err);
    }
  }, [onClap]);

  useEffect(() => {
    startClapDetection();
    return () => {
      audioContextRef.current?.close();
    };
  }, [startClapDetection]);

  return { startClapDetection };
};
