import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const BOARD_THEMES = [
  {
    id: 'mahogany',
    name: 'Mahogany & Birch',
    accent: '#C4956A',
    bg: '#2C1810',
    sqLight: '#F0CFA0',
    sqDark: '#8B4513',
  },
  {
    id: 'charcoal',
    name: 'Charcoal Grey & Soft White',
    accent: '#D0D0D0',
    bg: '#2D2D2D',
    sqLight: '#F0F0F0',
    sqDark: '#757575',
  },
  {
    id: 'navy',
    name: 'Navy Blue & Off-White',
    accent: '#4A90D9',
    bg: '#0A1628',
    sqLight: '#EDE0C8',
    sqDark: '#1E3A5F',
  },
  {
    id: 'purple',
    name: 'Deep Purple & Neon Cyan',
    accent: '#00FFFF',
    bg: '#1A0A2E',
    sqLight: '#DDD0FF',
    sqDark: '#4B0082',
  },
  {
    id: 'carbon',
    name: 'Carbon Black & Crimson Red',
    accent: '#DC143C',
    bg: '#111111',
    sqLight: '#F5E0E0',
    sqDark: '#7A0020',
  },
];

function applyTheme(themeId) {
  document.documentElement.setAttribute('data-board-theme', themeId);
  localStorage.setItem('chess-board-theme', themeId);
}

export const useSettingsStore = create(
  persist(
    (set) => ({
      boardTheme: 'mahogany',
      sound: true,
      animations: true,
      defaultTimeControl: '300',
      boardOrientation: 'white',

      setBoardTheme: (themeId) => {
        applyTheme(themeId);
        set({ boardTheme: themeId });
      },
      setSound: (v) => set({ sound: v }),
      setAnimations: (v) => set({ animations: v }),
      setDefaultTimeControl: (v) => set({ defaultTimeControl: v }),
      setBoardOrientation: (v) => set({ boardOrientation: v }),
      applyServerPrefs: (prefs) => {
        if (!prefs) return;
        set({
          sound: prefs.sound ?? true,
          animations: prefs.animations ?? true,
          defaultTimeControl: prefs.defaultTimeControl ?? '300',
          boardOrientation: prefs.boardOrientation ?? 'white',
        });
      },
    }),
    { name: 'chess-settings' }
  )
);
