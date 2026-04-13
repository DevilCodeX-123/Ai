import type { Message } from '../hooks/useGemini';

const STORAGE_KEY = 'devil_ai_history';
const MAX_HISTORY = 50;

export const HistoryService = {
  saveHistory: (messages: Message[]) => {
    try {
      const historyToSave = messages.slice(-MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historyToSave));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  },

  loadHistory: (): Message[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            return parsed;
        } else {
            console.warn("Corrupted history data, clearing...");
            localStorage.removeItem(STORAGE_KEY);
        }
      }
      return [];
    } catch (e) {
      console.error("Failed to load history", e);
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  },

  clearHistory: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
