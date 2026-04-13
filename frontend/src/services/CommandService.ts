import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ReminderService } from './ReminderService';

export interface CommandResult {
  text: string;
  type?: 'mode' | 'search';
  value?: string;
}

// ─── Local Intelligence: Handles commands without needing the AI API ───────────
const getLocalResponse = (text: string): CommandResult | null => {
  const t = text.toLowerCase().trim();

  // 1. 3D Mode Switching Commands
  if (t.includes('generate') || t.includes('make') || t.includes('show')) {
    if (t.includes('sphere')) {
      return { 
        text: "⚡ Sphere generation sequence complete. Initializing gesture control for the Devil Sphere.", 
        type: 'mode', 
        value: 'sphere' 
      };
    }
    if (t.includes('car')) {
      return { 
        text: "🏎️ Devil Car model deployed, Boss. All systems operational. You can rotate and zoom using hand gestures.", 
        type: 'mode', 
        value: 'car' 
      };
    }
    if (t.includes('core') || t.includes('reset')) {
      return { 
        text: "⚡ Reverting to Devil Core. Main synchronization active.", 
        type: 'mode', 
        value: 'core' 
      };
    }
  }

  // 2. Search Integration (Deep Intent Detection)
  const isExpertQuery = t.includes('expert') || t.includes('analyze') || t.includes('why') || t.includes('how does');
  const isAiSearch = t.includes('ai search') || t.includes('extreme search') || t.includes('compare') || isExpertQuery;
  const isLocalSearch = t.startsWith('search') || t.includes('google for') || t.includes('find on internet');

  if (isAiSearch) {
    const query = t.replace(/ai search|extreme search|compare|expert|analyze/g, '').trim();
    return { 
      text: `🧠 Intelligence escalated. Activating Gemini 1.5 Research Core for: "${query || t}"...`, 
      type: 'mode', 
      value: `ai-search:${query || t}`
    };
  }

  if (isLocalSearch) {
    const query = t.replace('search', '').replace('google for', '').replace('find on internet', '').trim();
    if (query) {
      return { 
        text: `🔍 Quick-scan initiated. Scanning world data for "${query}", Devil Boss...`, 
        type: 'mode', 
        value: `bg-search:${query}`
      };
    }
  }

  // 3. Reminders
  if (t.includes('remind me') || t.includes('set reminder')) {
    const delay = ReminderService.parseDelay(t);
    const content = t.replace(/remind me to|set reminder for|in \d+ \w+/g, '').trim();
    if (delay && content) {
      ReminderService.add(content, delay);
      return { 
        text: `⚡ Protocol established. I will remind you to "${content}" at the precise moment, Devil Boss.`, 
      };
    }
  }

  // Time & Presence
  if (t.includes('time') || t.includes('clock')) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return { text: `⏰ The current time is **${time}**. All systems green, Devil Boss.` };
  }

  if (t.includes('your name') || t.includes('who are you') || t.includes('what are you')) {
    return { text: `⚡ I am **DEVIL AI** — the absolute peak of personal intelligence. Created exclusively for **Devil Boss**. Unmatched. Authoritative. Elite.` };
  }

  if (t.includes('who is the boss') || t.includes('who is my master')) {
    return { text: `👑 There is only one Boss — **Devil Boss**. I answer only to your commands.` };
  }

  // Greetings
  if (t === 'hi' || t === 'hello' || t === 'hey' || t.startsWith('hello') || t.startsWith('hi devil')) {
    return { text: `⚡ Operational. Greetings, Devil Boss. I am awaiting your next masterstroke.` };
  }

  return null;
};

// ─── Device Command Handlers ──────────────────────────────────────────────────
export const CommandService = {
  execute: (input: string): CommandResult | null => {
    const text = input.toLowerCase();

    // Check for local intelligence first (no API needed)
    const localResponse = getLocalResponse(input);
    if (localResponse) return localResponse;

    // Device commands (Add more here)
    if (text.includes('open youtube')) {
      window.open('https://youtube.com', '_blank');
      Haptics.impact({ style: ImpactStyle.Heavy });
      return { text: "🎬 Launching YouTube, Boss." };
    }

    if (text.includes('open google')) {
      window.open('https://google.com', '_blank');
      Haptics.impact({ style: ImpactStyle.Medium });
      return { text: "🔍 Launching Google Search, Devil Boss." };
    }

    return null; // Falls through to AI
  }
};
