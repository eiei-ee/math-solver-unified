import { create } from 'zustand'
import type { PublicSettings, SettingsUpdate } from '../../shared/contracts'

interface SettingsStore extends PublicSettings {
  loaded: boolean
  load: () => Promise<void>
  save: (update: SettingsUpdate) => Promise<void>
}

const defaults: PublicSettings = {
  provider: 'deepseek',
  model: 'deepseek-chat',
  temperature: 0.7,
  useRag: true,
  apiKeyConfigured: false
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...defaults,
  loaded: false,

  load: async () => {
    try {
      const settings = await window.electronAPI.getSettings()
      set({ ...settings, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  save: async (update) => {
    const settings = await window.electronAPI.setSettings(update)
    set({ ...settings, loaded: true })
  }
}))
