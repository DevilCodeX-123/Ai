import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Ghost, Terminal, Settings, Send, Eye, Trash2, ShieldAlert, Square } from 'lucide-react';
import { SearchCard } from './components/SearchCard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import DevilCore from './components/DevilCore';
import HandTracker from './components/HandTracker';
import CodeBlock from './components/CodeBlock';
import { useGemini } from './hooks/useGemini';
import { useSpeech } from './hooks/useSpeech';
import { useClapDetector } from './hooks/useClapDetector';
import { CommandService } from './services/CommandService';
import { ReminderService } from './services/ReminderService';

const App = () => {
  const { messages, setMessages, sendMessage, isLoading, setIsLoading, error, clearChat, clearError, stopStreaming } = useGemini();
  const { isListening, transcript, setTranscript, startListening, stopListening, speak, isSpeaking } = useSpeech();
  
  const [inputText, setInputText] = useState('');
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [showGestures, setShowGestures] = useState(false);
  const [devilMode, setDevilMode] = useState<'core' | 'sphere' | 'car'>('core');
  const [handInteraction, setHandInteraction] = useState<any>(null);
  const lastSpokenIndex = useRef<number>(-1);
  const hasGreeted = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Smart Greeting logic
  useEffect(() => {
    if (!hasGreeted.current) {
      hasGreeted.current = true; // Block immediately
      
      const now = new Date();
      const hour = now.getHours();
      let greeting = "Good Evening";
      if (hour < 12) greeting = "Good Morning";
      else if (hour < 17) greeting = "Good Afternoon";

      const fullGreeting = `${greeting} Devil Boss. I am online and fully functional. Ready to receive your orders.`;
      
      setTimeout(() => {
        speak(fullGreeting);
        // Only send init message if chat is empty
        if (messages.length === 0) {
          sendMessage("[SYSTEM INIT: User Greeted]");
        }
      }, 1000);
    }
  }, []); // Only run once on mount

  // Helper to parse text for code blocks with safety
  const renderMessageContent = useCallback((text: string | undefined) => {
    if (!text) return null;
    try {
      const parts = text.split(/(```[\s\S]*?```)/g);
      return parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
          const lang = match?.[1] || 'javascript';
          const code = match?.[2] || part.slice(3, -3);
          return <CodeBlock key={`code-${index}`} code={code} language={lang} />;
        }
        return <p key={`text-${index}`} className="text-sm leading-relaxed whitespace-pre-wrap">{part}</p>;
      });
    } catch (e) {
      console.error("Parse error:", e);
      return <p className="text-sm opacity-70 italic">[System: Parsing Error]</p>;
    }
  }, []);

  const handleClap = () => {
    speak("Yes Devil Boss. I am listening.");
    Haptics.impact({ style: ImpactStyle.Heavy });
    if (!isListening) startListening();
  };

  useClapDetector(handleClap);

  const handleClear = () => {
    if (window.confirm("Purge all memories?")) {
      clearChat();
      Haptics.notification({ type: 'WARNING' as any });
    }
  };
   
  // Auto-send voice transcript
  useEffect(() => {
    if (transcript && !isListening) {
      const text = transcript;
      
      // 1. Add spoken message to state INSTANTLY
      setMessages(prev => [...prev, { role: 'user', parts: [{ text }] }]);

      const cmdResult = CommandService.execute(text);
      
      if (cmdResult) {
        if (cmdResult.type === 'mode') {
          if (cmdResult.value?.startsWith('bg-search:')) {
            const query = cmdResult.value.split(':')[1];
            handleBackgroundSearch(query);
            speak(cmdResult.text);
          } else if (cmdResult.value?.startsWith('ai-search:')) {
            const query = cmdResult.value.split(':')[1];
            sendMessage(`RESEARCH AND COMPARE: ${query}`); 
            speak(`🧠 Activating deep research protocol for ${query}...`);
          } else {
            setDevilMode(cmdResult.value as any);
            speak(cmdResult.text);
          }
        } else {
          speak(cmdResult.text);
        }
      } else {
        // API Guard for Voice - Wider range for direct AI intelligence
        const apiKeywords = ['api', 'ai', 'gemini', 'brain', 'core', 'process', 'extreme', 'time', 'date', 'battery', 'who', 'where', 'weather', 'news', 'calculate', 'event'];
        const isApiRequested = apiKeywords.some(kw => text.toLowerCase().includes(kw));

        if (isApiRequested) {
          sendMessage(text);
        } else {
          // Mandatory Background Search (Zero-API)
          handleBackgroundSearch(text);
        }
      }
      setTranscript('');
      Haptics.impact({ style: ImpactStyle.Medium });
    }
  }, [transcript, isListening, sendMessage, setTranscript, speak]);

  // Read AI response aloud
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      const lastIndex = messages.length - 1;
      const lastMsg = messages[lastIndex];
      
      if (lastMsg.role === 'model' && !isSpeaking && lastIndex > lastSpokenIndex.current) {
        speak(lastMsg.parts[0].text);
        lastSpokenIndex.current = lastIndex;
        Haptics.notification({ type: 'SUCCESS' as any });
      }
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, speak, isSpeaking, isLoading]);

  // Reminder Monitor
  useEffect(() => {
    const checkReminders = () => {
      const pending = ReminderService.getPending();
      if (pending.length > 0) {
        pending.forEach(r => {
          speak(`Devil Boss, a reminder for you: ${r.text}`);
          ReminderService.markTriggered(r.id);
          Haptics.notification({ type: 'WARNING' as any });
        });
      }
    };
    const interval = setInterval(checkReminders, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [speak]);

  useEffect(() => {
    if (error) {
      Haptics.vibrate({ duration: 500 });
    }
  }, [error]);

  const handleHandData = (data: any) => {
    setHandInteraction(data);
    
    // Auto-trigger listening on 'open' gesture
    if (data.gesture === 'open' && !isListening && !isSpeaking && !isLoading) {
      startListening();
      Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  const handleBackgroundSearch = async (query: string) => {
    setIsLoading(true);
    
    // Add immediate "Scanning" feedback
    setMessages(prev => [...prev, { 
      role: 'model', 
      parts: [{ text: `🔍 Initiating deep scan for "${query}"...` }] 
    }]);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Success: Update the placeholder with search report
        const topResult = data.results[0];
        const title = topResult.title || "Information found";
        const summary = `Scan complete. I found results for "${query}". Top result: ${title}. Report displayed.`;
        
        speak(summary);
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = { 
            role: 'model', 
            parts: [{ text: summary }],
            isSearch: true,
            searchResults: data.results,
            searchQuery: query
          } as any;
          return updated;
        });
      } else {
        // Fallback: No search results, escalate to AI Core
        setMessages(prev => prev.slice(0, -1)); // Remove the "Scanning..." placeholder
        sendMessage(query); // Send to Gemini
      }
    } catch (err) {
      // Emergency: Search crash, escalate to AI Core
      setMessages(prev => prev.slice(0, -1)); 
      sendMessage(query);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (inputText.trim()) {
      const text = inputText.trim();
      
      // 1. Add user message to state INSTANTLY
      setMessages(prev => [...prev, { role: 'user', parts: [{ text }] }]);

      const cmdResult = CommandService.execute(text);
      if (cmdResult) {
        if (cmdResult.type === 'mode') {
          if (cmdResult.value?.startsWith('bg-search:')) {
            const query = cmdResult.value.split(':')[1];
            handleBackgroundSearch(query);
            speak(cmdResult.text);
          } else if (cmdResult.value?.startsWith('ai-search:')) {
            const query = cmdResult.value.split(':')[1];
            sendMessage(`RESEARCH AND COMPARE: ${query}`); 
            speak(`🧠 Activating deep research protocol for ${query}...`);
          } else {
            setDevilMode(cmdResult.value as any);
            speak(cmdResult.text);
          }
        } else {
          speak(cmdResult.text);
        }
      } else {
        const apiKeywords = ['api', 'ai', 'gemini', 'brain', 'core', 'process', 'extreme', 'time', 'date', 'battery', 'who', 'where', 'weather', 'news', 'calculate', 'event'];
        const isApiRequested = apiKeywords.some(kw => text.toLowerCase().includes(kw));

        if (isApiRequested) {
          sendMessage(text);
        } else {
          handleBackgroundSearch(text);
        }
      }
      setInputText('');
      Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  return (
    <div className={`h-screen w-screen overflow-hidden text-white font-sans ${isGhostMode ? 'bg-transparent' : 'bg-obsidian-900'}`}>
      
      {/* 3D Background Core */}
      {!isGhostMode && (
        <div className="absolute inset-0 z-0">
          <Suspense fallback={<div className="w-full h-full bg-black/20 animate-pulse" />}>
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
              <DevilCore 
                isThinking={isLoading} 
                isSpeaking={isSpeaking} 
                mode={devilMode} 
                handData={handInteraction}
              />
            </Canvas>
          </Suspense>
        </div>
      )}

      {/* Main Overlay UI */}
      <div className="relative z-10 h-full flex flex-col safe-p-top safe-p-bottom">
        
        {/* Top Header */}
        <header className="p-6 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-devil-gold flex items-center justify-center gold-glow">
              <span className="text-devil-gold font-bold italic">D</span>
            </div>
            {!isGhostMode && <h1 className="text-xl font-bold tracking-widest text-devil-gold">DEVIL AI</h1>}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-devil-gold/10 border border-devil-gold/20 mr-2">
              <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-pulse' : 'bg-devil-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]'}`} />
              <span className="text-[10px] font-mono tracking-widest text-devil-gold/80 uppercase">
                {isLoading ? 'Brain: Active' : 'Brain: Locked'}
              </span>
            </div>
            <button onClick={handleClear} className="p-2 rounded-full glass text-red-400">
              <Trash2 size={20} />
            </button>
            <button onClick={() => setShowGestures(!showGestures)} className={`p-2 rounded-full glass ${showGestures ? 'text-devil-gold' : ''}`}>
              <Eye size={20} />
            </button>
            <button onClick={() => setIsGhostMode(!isGhostMode)} className={`p-2 rounded-full glass ${isGhostMode ? 'text-devil-gold' : ''}`}>
              <Ghost size={20} />
            </button>
            <Settings size={20} className="p-2 glass rounded-full" />
          </div>
        </header>

        {/* Hand Tracker (Optional View) */}
        {showGestures && (
          <div className="absolute top-24 right-6 z-50">
            <HandTracker onHandData={handleHandData} showDebug={true} />
            <p className="text-[10px] text-devil-gold mt-1 text-center font-mono uppercase">Gesture Engine: {handInteraction?.gesture || 'IDLE'}</p>
          </div>
        )}

        {/* Chat Area */}
        {!isGhostMode && (
          <main className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`p-4 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-devil-gold text-black rounded-tr-none' : 'bg-white/10 text-white rounded-tl-none border border-white/5'}`}>
                  {msg.parts?.[0]?.text && <div className="whitespace-pre-wrap leading-relaxed">{renderMessageContent(msg.parts[0].text)}</div>}
                  
                  {/* Background Search Result Card */}
                  {(msg as any).isSearch && (msg as any).searchResults && (
                    <div className="mt-4">
                      <SearchCard query={(msg as any).searchQuery} results={(msg as any).searchResults} />
                    </div>
                  )}
                  
                  {msg.role === 'model' && i === messages.length - 1 && isLoading && (
                       <div className="mt-2 flex gap-1 h-2 items-end">
                         <div className="w-1 h-full bg-devil-gold animate-wave-slow" />
                         <div className="w-1 h-2/3 bg-devil-gold animate-wave-slow delay-75" />
                         <div className="w-1 h-full bg-devil-gold animate-wave-slow delay-150" />
                       </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </main>
        )}

        {/* Bottom Bar / Ghost Mode UI */}
        <footer className={`p-6 transition-all duration-500 ${isGhostMode ? 'fixed bottom-6 right-6 p-0' : 'bg-transparent'}`}>
          {isGhostMode ? (
            <motion.div 
               layoutId="assistant"
               onClick={() => setIsGhostMode(false)}
               className="w-16 h-16 rounded-full glass flex items-center justify-center cursor-pointer border-2 border-devil-gold gold-glow"
            >
              {isSpeaking ? (
                <div className="flex gap-1">
                   <div className="w-1 h-4 bg-devil-gold animate-pulse" />
                   <div className="w-1 h-6 bg-devil-gold animate-pulse delay-75" />
                   <div className="w-1 h-4 bg-devil-gold animate-pulse delay-150" />
                </div>
              ) : (
                <Terminal size={28} className="text-devil-gold" />
              )}
            </motion.div>
          ) : (
            <div className="max-w-4xl mx-auto flex items-center gap-4">
              <div className="flex-1 flex items-center glass rounded-2xl p-2 px-4 border border-white/10 opacity-80">
                <input 
                  type="text" 
                  value={inputText}
                  disabled={isLoading}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                  placeholder={isLoading ? "Processing command..." : "Initiate command..."}
                  className="bg-transparent flex-1 outline-none text-sm p-2 disabled:cursor-not-allowed"
                />
                {isLoading ? (
                  <button 
                    onClick={stopStreaming}
                    className="p-2 text-red-500 hover:text-red-400 transition-colors animate-pulse"
                  >
                    <Square size={20} fill="currentColor" />
                  </button>
                ) : (
                  <button 
                    onClick={handleSend}
                    className="p-2 hover:text-devil-gold transition-colors"
                  >
                    <Send size={20} />
                  </button>
                )}
              </div>
              
              <button 
                onClick={() => {
                   if (isLoading) return;
                   isListening ? stopListening() : startListening();
                }}
                disabled={isLoading}
                className={`p-4 rounded-2xl glass transition-all duration-300 ${isLoading ? 'opacity-30 cursor-not-allowed' : (isListening ? 'text-red-500 gold-glow' : 'text-devil-gold')}`}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            </div>
          )}
        </footer>
      </div>

      {/* Error / Safety Alert Modal */}
      {error && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass p-8 rounded-3xl border-2 border-red-500 max-w-md text-center shadow-[0_0_50px_rgba(239,68,68,0.3)]"
          >
            <ShieldAlert size={64} className="text-red-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-red-500 mb-2 uppercase tracking-tighter">SYSTEM ALERT</h2>
            <p className="text-gray-400 mb-6 font-mono text-sm">{error}</p>
            <div className="flex gap-3">
               <button
                 onClick={clearError}
                 className="flex-1 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors border border-white/20"
               >
                 DISMISS
               </button>
               <button
                 onClick={() => window.location.reload()}
                 className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
               >
                 REBOOT
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default App;
