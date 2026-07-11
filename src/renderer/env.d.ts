/// <reference types="vite/client" />

import type {
  ChatEvent,
  ChatRequest,
  ConversationSummary,
  ConversationUpsert,
  PickedImage,
  PublicSettings,
  SavedConversation,
  SettingsUpdate
} from '../shared/contracts'

interface ElectronAPI {
  getSettings: () => Promise<PublicSettings>
  setSettings: (settings: SettingsUpdate) => Promise<PublicSettings>
  openImage: () => Promise<PickedImage | null>
  saveMarkdown: (content: string) => Promise<string | null>
  sendChat: (payload: ChatRequest) => Promise<void>
  cancelChat: (requestId: string) => Promise<boolean>
  listConversations: (query?: string) => Promise<ConversationSummary[]>
  getConversation: (id: string) => Promise<SavedConversation | null>
  saveConversation: (conversation: ConversationUpsert) => Promise<SavedConversation>
  renameConversation: (id: string, title: string) => Promise<SavedConversation>
  deleteConversation: (id: string) => Promise<boolean>
  onChatEvent: (callback: (event: ChatEvent) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
