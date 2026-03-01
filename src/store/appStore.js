import { create } from 'zustand';

const useAppStore = create((set) => ({
  // Notifications
  notifications: [],
  addNotification: (notification) => set((state) => ({
    notifications: [{ id: Date.now(), ...notification }, ...state.notifications].slice(0, 50)
  })),
  markRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),
  clearNotifications: () => set({ notifications: [] }),

  // Map state
  selectedProvince: null,
  setSelectedProvince: (province) => set({ selectedProvince: province }),
  
  mapCenter: [16.0544, 108.2022], // Đà Nẵng default
  setMapCenter: (center) => set({ mapCenter: center }),
  
  mapZoom: 12,
  setMapZoom: (zoom) => set({ mapZoom: zoom }),

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Loading
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));

export default useAppStore;
