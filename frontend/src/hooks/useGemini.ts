import { useState, useCallback, useEffect, useRef } from 'react';
import { HistoryService } from '../services/HistoryService';
import { Device } from '@capacitor/device';

export interface Message {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export const useGemini = () => {
  const [messages, setMessages] = useState<Message[]>(() => HistoryService.loadHistory());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync with storage
  useEffect(() => {
    HistoryService.saveHistory(messages);
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    setIsLoading(true);
    setError(null);

    // Filter harmful keywords locally first for immediate safety response
    const harmfulKeywords = ['hack', 'kill', 'bomb', 'steal', 'virus'];
    if (harmfulKeywords.some(kw => text.toLowerCase().includes(kw))) {
        setMessages(prev => [
            ...prev,
            { role: 'user', parts: [{ text }] },
            { role: 'model', parts: [{ text: "⚠️ SECURITY ALERT: This request violates safety protocols. Access denied." }] }
        ]);
        setError("Halt! This action violates security protocols. Threat detected.");
        setIsLoading(false);
        return;
    }

    try {
      // Get Hardware Context for "Extreme" intelligence
      const [info, battery] = await Promise.all([
        Device.getInfo(),
        Device.getBatteryInfo()
      ]);
      
      const now = new Date();
      const datetime = now.toLocaleString('en-IN', { 
        weekday: 'long', year: 'numeric', month: 'long', 
        day: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
      const context = `[SYSTEM CONTEXT: OS=${info.operatingSystem}, Battery=${Math.round((battery.batteryLevel || 0) * 100)}%, Charging=${battery.isCharging}, DateTime=${datetime}]`;
      const systemPrompt = `You are DEVIL AI, an elite, futuristic assistant for 'Devil Boss'. 
  - STRIFT PROTOCOL: Be EXTREMELY CONCISE. No flowery language. No unnecessary dramatic talk.
  - Deliver direct answers instantly. Address the user only as 'Devil Boss' or 'Boss'.
  - Language: Match the user's language (Hindi/English) exactly. 
  - Style: Authoritative, direct, and brief.`;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `${systemPrompt} ${context} ${text}`, history: messages }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Protocol failure');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      // Add only a placeholder for the model (User message added by App.tsx)
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        
        // Update the last message in real-time
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = { 
            role: 'model', 
            parts: [{ text: fullResponse }] 
          };
          return updated;
        });
      }

      HistoryService.saveHistory([...messages, { role: 'user', parts: [{ text }] }, { role: 'model', parts: [{ text: fullResponse }] }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown technical error');
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    HistoryService.clearHistory();
  };

  const clearError = () => setError(null);

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setError("Response interrupted by Devil Boss.");
    }
  };

  return { 
    messages, 
    setMessages, 
    sendMessage, 
    isLoading, 
    setIsLoading, 
    error, 
    clearChat, 
    clearError, 
    stopStreaming 
  };
};
