export type InputType = 'text' | 'image' | 'latex'

export interface RagHit {
  source: string
  excerpt: string
  score: number
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  inputType?: InputType
  ragQuery?: string
  imageDataUrl?: string
  ragHits?: RagHit[]
  ragStatus?: string
}

export interface PublicSettings {
  provider: string
  model: string
  temperature: number
  useRag: boolean
  apiKeyConfigured: boolean
}

export interface SettingsUpdate {
  provider?: string
  model?: string
  temperature?: number
  useRag?: boolean
  apiKey?: string
}

export interface ChatRequest {
  requestId: string
  messages: ConversationMessage[]
  inputType: InputType
  ragQuery?: string
}

export type RagStatus = 'matched' | 'empty' | 'disabled' | 'skipped' | 'error'

export type ChatEvent =
  | { requestId: string; type: 'rag'; status: RagStatus; hits: RagHit[]; message: string }
  | { requestId: string; type: 'chunk'; chunk: string }
  | { requestId: string; type: 'done' }
  | { requestId: string; type: 'error'; message: string }

export interface PickedImage {
  name: string
  dataUrl: string
}

export interface SavedConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ConversationMessage[]
}

export interface ConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export interface ConversationUpsert {
  id: string
  title: string
  createdAt: string
  messages: ConversationMessage[]
}
