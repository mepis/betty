import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    sharedSecret: '',
    apiKeys: {} as Record<string, string>,
    theme: 'dark' as 'dark' | 'light',
    fontSize: 14 as number,
    autoScroll: true,
    showThinking: true,
    showTools: true,
  }),

  actions: {
    loadFromLocalStorage() {
      try {
        const saved = localStorage.getItem('betty:settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.sharedSecret) this.sharedSecret = parsed.sharedSecret;
          if (parsed.apiKeys) this.apiKeys = parsed.apiKeys;
          if (parsed.theme) this.theme = parsed.theme;
          if (parsed.fontSize) this.fontSize = parsed.fontSize;
          if (parsed.autoScroll !== undefined) this.autoScroll = parsed.autoScroll;
          if (parsed.showThinking !== undefined) this.showThinking = parsed.showThinking;
          if (parsed.showTools !== undefined) this.showTools = parsed.showTools;
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    },

    saveToLocalStorage() {
      try {
        localStorage.setItem(
          'betty:settings',
          JSON.stringify({
            sharedSecret: this.sharedSecret,
            apiKeys: this.apiKeys,
            theme: this.theme,
            fontSize: this.fontSize,
            autoScroll: this.autoScroll,
            showThinking: this.showThinking,
            showTools: this.showTools,
          }),
        );
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    },

    setApiKey(provider: string, key: string) {
      this.apiKeys[provider] = key;
      this.saveToLocalStorage();
    },

    setSharedSecret(secret: string) {
      this.sharedSecret = secret;
      this.saveToLocalStorage();
    },

    setTheme(theme: 'dark' | 'light') {
      this.theme = theme;
      this.saveToLocalStorage();
    },
  },
});
