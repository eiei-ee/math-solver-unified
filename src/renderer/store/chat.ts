import { create } from 'zustand'
import type { ConversationMessage, InputType, RagHit, SavedConversation } from '../../shared/contracts'

export type InputTab = InputType
export type ChatMessage = ConversationMessage

interface PendingRag {
  hits: RagHit[]
  message: string
}

interface ChatStore {
  messages: ChatMessage[]
  conversationId: string
  conversationTitle: string
  conversationCreatedAt: string
  loading: boolean
  error: string | null
  activeTab: InputTab
  imageBase64: string | null
  activeRequestId: string | null
  pendingRag: PendingRag | null
  pushUser: (content: string, inputType: InputType, imageDataUrl?: string | null, ragQuery?: string) => void
  appendAssistant: (chunk: string) => void
  setRagResult: (hits: RagHit[], message: string) => void
  startRequest: (requestId: string) => void
  finishRequest: (requestId: string) => void
  setLoading: (value: boolean) => void
  setError: (error: string | null) => void
  setActiveTab: (tab: InputTab) => void
  setImageBase64: (dataUrl: string | null) => void
  setMessages: (messages: ChatMessage[]) => void
  loadConversation: (conversation: SavedConversation) => void
  updateConversationMeta: (conversation: SavedConversation) => void
  newConversation: () => void
  clearMessages: () => void
}

function newConversationMeta() {
  return {
    conversationId: crypto.randomUUID(),
    conversationTitle: '',
    conversationCreatedAt: new Date().toISOString()
  }
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  ...newConversationMeta(),
  loading: false,
  error: null,
  activeTab: 'text',
  imageBase64: null,
  activeRequestId: null,
  pendingRag: null,

  pushUser: (content, inputType, imageDataUrl, ragQuery) => {
    set({
      messages: [...get().messages, {
        role: 'user',
        content,
        inputType,
        ...(ragQuery?.trim() ? { ragQuery: ragQuery.trim() } : {}),
        ...(imageDataUrl ? { imageDataUrl } : {})
      }],
      error: null,
      imageBase64: null
    })
  },

  appendAssistant: (chunk) => {
    const messages = get().messages
    const last = messages[messages.length - 1]
    if (last?.role === 'assistant') {
      set({ messages: [...messages.slice(0, -1), { ...last, content: last.content + chunk }] })
      return
    }
    const pending = get().pendingRag
    set({
      messages: [...messages, {
        role: 'assistant',
        content: chunk,
        ...(pending?.hits.length ? { ragHits: pending.hits } : {}),
        ...(pending?.message ? { ragStatus: pending.message } : {})
      }]
    })
  },

  setRagResult: (hits, message) => set({ pendingRag: { hits, message } }),
  startRequest: (requestId) => set({ loading: true, activeRequestId: requestId, pendingRag: null, error: null }),
  finishRequest: (requestId) => set(state => (
    state.activeRequestId === requestId
      ? { loading: false, activeRequestId: null, pendingRag: null }
      : {}
  )),
  setLoading: (value) => set({ loading: value, ...(value ? {} : { activeRequestId: null }) }),
  setError: (error) => set({ error, loading: false, activeRequestId: null, pendingRag: null }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setImageBase64: (dataUrl) => set({ imageBase64: dataUrl }),
  setMessages: (messages) => set({ messages, error: null, pendingRag: null }),
  loadConversation: (conversation) => set({
    messages: conversation.messages,
    conversationId: conversation.id,
    conversationTitle: conversation.title,
    conversationCreatedAt: conversation.createdAt,
    error: null,
    imageBase64: null,
    pendingRag: null
  }),
  updateConversationMeta: (conversation) => set({
    conversationId: conversation.id,
    conversationTitle: conversation.title,
    conversationCreatedAt: conversation.createdAt
  }),
  newConversation: () => set({
    messages: [],
    ...newConversationMeta(),
    error: null,
    imageBase64: null,
    pendingRag: null
  }),
  clearMessages: () => set({
    messages: [],
    ...newConversationMeta(),
    error: null,
    imageBase64: null,
    pendingRag: null
  })
}))
