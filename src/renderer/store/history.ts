import { create } from 'zustand'
import type { ConversationSummary } from '../../shared/contracts'
import { useChatStore } from './chat'

interface HistoryStore {
  summaries: ConversationSummary[]
  query: string
  loading: boolean
  error: string | null
  setQuery: (query: string) => void
  refresh: () => Promise<void>
  saveCurrent: () => Promise<void>
  openConversation: (id: string) => Promise<boolean>
  renameConversation: (id: string, title: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
}

function deriveTitle(): string {
  const firstUser = useChatStore.getState().messages.find(message => message.role === 'user')
  return firstUser?.content.replace(/\s+/g, ' ').trim().slice(0, 40) || '未命名对话'
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  summaries: [],
  query: '',
  loading: false,
  error: null,

  setQuery: (query) => set({ query }),

  refresh: async () => {
    set({ loading: true, error: null })
    try {
      const summaries = await window.electronAPI.listConversations(get().query)
      set({ summaries, loading: false })
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : String(error) })
    }
  },

  saveCurrent: async () => {
    const chat = useChatStore.getState()
    if (chat.messages.length === 0) return
    try {
      const conversation = await window.electronAPI.saveConversation({
        id: chat.conversationId,
        title: chat.conversationTitle || deriveTitle(),
        createdAt: chat.conversationCreatedAt,
        messages: chat.messages
      })
      useChatStore.getState().updateConversationMeta(conversation)
      await get().refresh()
    } catch (error) {
      set({ error: `对话历史保存失败：${error instanceof Error ? error.message : String(error)}` })
    }
  },

  openConversation: async (id) => {
    if (useChatStore.getState().loading) return false
    set({ loading: true, error: null })
    try {
      const conversation = await window.electronAPI.getConversation(id)
      if (!conversation) throw new Error('找不到该对话')
      useChatStore.getState().loadConversation(conversation)
      set({ loading: false })
      return true
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : String(error) })
      return false
    }
  },

  renameConversation: async (id, title) => {
    const trimmed = title.trim()
    if (!trimmed) return
    try {
      const conversation = await window.electronAPI.renameConversation(id, trimmed)
      if (useChatStore.getState().conversationId === id) {
        useChatStore.getState().updateConversationMeta(conversation)
      }
      await get().refresh()
    } catch (error) {
      set({ error: `重命名失败：${error instanceof Error ? error.message : String(error)}` })
    }
  },

  deleteConversation: async (id) => {
    try {
      await window.electronAPI.deleteConversation(id)
      if (useChatStore.getState().conversationId === id) useChatStore.getState().newConversation()
      await get().refresh()
    } catch (error) {
      set({ error: `删除失败：${error instanceof Error ? error.message : String(error)}` })
    }
  }
}))
