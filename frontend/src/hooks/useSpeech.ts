import { useState, useCallback, useEffect, useRef } from 'react';

export const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const recognitionRef = useRef<any>(null);

  // Request microphone permission
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => setMicPermission('granted'))
      .catch(() => setMicPermission('denied'));
  }, []);

  // Initialize Speech Recognition for "Hinglish"
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'hi-IN';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          recognition.stop(); // Immediate stop to process
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || micPermission !== 'granted') return;
    setIsListening(true);
    setTranscript('');
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.warn("Recognition restart:", e);
    }
  }, [micPermission]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setIsListening(false);
    recognitionRef.current.stop();
  }, []);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/```[\s\S]*?```/g, 'code block').replace(/[*_`#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Settle tone: Authoritative but smart
    utterance.pitch = 0.9;
    utterance.rate = 1.0;
    utterance.volume = 1.0;
    
    // Look for a High Quality voice
    const voices = window.speechSynthesis.getVoices();
    // Try to find a voice that matches the user's language preference
    const hiVoice = voices.find(v => v.lang.includes('hi-IN'));
    const engVoice = voices.find(v => v.name.includes('Google UK English Male'));
    
    // If text contains more Hindi characters, use Hindi voice, else English
    const isHindi = /[\u0900-\u097F]/.test(text);
    if (isHindi && hiVoice) utterance.voice = hiVoice;
    else if (engVoice) utterance.voice = engVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  return { isListening, transcript, setTranscript, startListening, stopListening, speak, isSpeaking, micPermission };
};
