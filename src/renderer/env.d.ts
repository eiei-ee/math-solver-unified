/// <reference types="vite/client" />

import type {
  ChatEvent,
  ChatRequest,
  PickedImage,
  PublicSettings,
  SettingsUpdate
} from '../shared/contracts'

interface ElectronAPI {
  getSettings: () => Promise<PublicSettings>
  setSettings: (settings: SettingsUpdate) => Promise<PublicSettings>
  openImage: () => Promise<PickedImage | null>
  saveMarkdown: (content: string) => Promise<string | null>
  sendChat: (payload: ChatRequest) => Promise<void>
  cancelChat: (requestId: string) => Promise<boolean>
  onChatEvent: (callback: (event: ChatEvent) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
