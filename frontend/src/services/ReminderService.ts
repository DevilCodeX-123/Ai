export interface Reminder {
  id: string;
  text: string;
  time: number; // timestamp
  triggered: boolean;
}

const STORAGE_KEY = 'devil_ai_reminders';

export const ReminderService = {
  save: (reminders: Reminder[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  },

  load: (): Reminder[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  add: (text: string, delayMs: number): Reminder => {
    const reminder: Reminder = {
      id: Date.now().toString(),
      text,
      time: Date.now() + delayMs,
      triggered: false,
    };
    const existing = ReminderService.load();
    ReminderService.save([...existing, reminder]);
    return reminder;
  },

  markTriggered: (id: string) => {
    const reminders = ReminderService.load().map(r =>
      r.id === id ? { ...r, triggered: true } : r
    );
    ReminderService.save(reminders);
  },

  getPending: (): Reminder[] => {
    return ReminderService.load().filter(r => !r.triggered && r.time > Date.now() - 60000);
  },

  // Parse natural language delay: "5 minutes", "1 hour", "30 seconds"
  parseDelay: (text: string): number | null => {
    const t = text.toLowerCase();
    const secMatch = t.match(/(\d+)\s*sec/);
    const minMatch = t.match(/(\d+)\s*min/);
    const hrMatch = t.match(/(\d+)\s*h(ou)?r/);
    if (secMatch) return parseInt(secMatch[1]) * 1000;
    if (minMatch) return parseInt(minMatch[1]) * 60 * 1000;
    if (hrMatch) return parseInt(hrMatch[1]) * 3600 * 1000;
    return null;
  }
};

// Request browser notification permission
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

export const showNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/pwa-192x192.png' });
  }
};
