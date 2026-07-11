import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type {
  ConversationMessage,
  ConversationSummary,
  ConversationUpsert,
  InputType,
  RagHit,
  SavedConversation
} from '../shared/contracts'

interface ConversationFile {
  version: 1
  conversations: SavedConversation[]
}

const MAX_CONVERSATIONS = 100
const MAX_MESSAGES = 80
const MAX_MESSAGE_LENGTH = 30_000
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_STORED_IMAGE_BYTES = 50 * 1024 * 1024
const ID_PATTERN = /^[a-zA-Z0-9-]{8,80}$/

let cached: SavedConversation[] | null = null

function storePath(): string {
  return join(app.getPath('userData'), 'conversations.json')
}

function cleanTitle(value: unknown): string {
  if (typeof value !== 'string') return '未命名对话'
  return value.replace(/\s+/g, ' ').trim().slice(0, 80) || '未命名对话'
}

function validDate(value: unknown, fallback: string): string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : fallback
}

function cleanInputType(value: unknown): InputType | undefined {
  return value === 'text' || value === 'image' || value === 'latex' ? value : undefined
}

function cleanRagHits(value: unknown): RagHit[] | undefined {
  if (!Array.isArray(value)) return undefined
  const hits = value.slice(0, 8).flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const hit = item as Partial<RagHit>
    if (typeof hit.source !== 'string' || typeof hit.excerpt !== 'string' || typeof hit.score !== 'number') return []
    return [{ source: hit.source.slice(0, 500), excerpt: hit.excerpt.slice(0, 5_000), score: hit.score }]
  })
  return hits.length ? hits : undefined
}

function cleanMessage(value: unknown): ConversationMessage | null {
  if (!value || typeof value !== 'object') return null
  const message = value as Partial<ConversationMessage>
  if ((message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string') return null
  if (message.content.length > MAX_MESSAGE_LENGTH) return null

  const imageDataUrl = typeof message.imageDataUrl === 'string' &&
    /^data:image\/(png|jpeg|gif|webp);base64,/.test(message.imageDataUrl) &&
    message.imageDataUrl.length <= MAX_IMAGE_BYTES * 1.4
      ? message.imageDataUrl
      : undefined
  const inputType = cleanInputType(message.inputType)
  const ragHits = cleanRagHits(message.ragHits)

  return {
    role: message.role,
    content: message.content,
    ...(inputType ? { inputType } : {}),
    ...(typeof message.ragQuery === 'string' ? { ragQuery: message.ragQuery.slice(0, 2_000) } : {}),
    ...(imageDataUrl ? { imageDataUrl } : {}),
    ...(ragHits ? { ragHits } : {}),
    ...(typeof message.ragStatus === 'string' ? { ragStatus: message.ragStatus.slice(0, 500) } : {})
  }
}

function cleanConversation(value: unknown): SavedConversation | null {
  if (!value || typeof value !== 'object') return null
  const conversation = value as Partial<SavedConversation>
  if (typeof conversation.id !== 'string' || !ID_PATTERN.test(conversation.id) || !Array.isArray(conversation.messages)) return null
  const messages = conversation.messages.slice(-MAX_MESSAGES).map(cleanMessage).filter((item): item is ConversationMessage => Boolean(item))
  if (messages.length === 0) return null
  const now = new Date().toISOString()
  const createdAt = validDate(conversation.createdAt, now)
  return {
    id: conversation.id,
    title: cleanTitle(conversation.title),
    createdAt,
    updatedAt: validDate(conversation.updatedAt, createdAt),
    messages
  }
}

function imageBytes(conversation: SavedConversation): number {
  return conversation.messages.reduce((total, message) => {
    if (!message.imageDataUrl) return total
    const payload = message.imageDataUrl.slice(message.imageDataUrl.indexOf(',') + 1)
    return total + Math.floor(payload.length * 0.75)
  }, 0)
}

function compact(conversations: SavedConversation[]): SavedConversation[] {
  const sorted = [...conversations].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  const result: SavedConversation[] = []
  let storedImageBytes = 0
  for (const conversation of sorted) {
    if (result.length >= MAX_CONVERSATIONS) break
    const nextImageBytes = imageBytes(conversation)
    if (storedImageBytes + nextImageBytes > MAX_STORED_IMAGE_BYTES) continue
    storedImageBytes += nextImageBytes
    result.push(conversation)
  }
  return result
}

function load(): SavedConversation[] {
  if (cached) return cached
  try {
    if (!existsSync(storePath())) return (cached = [])
    const parsed = JSON.parse(readFileSync(storePath(), 'utf-8')) as Partial<ConversationFile>
    if (parsed.version !== 1 || !Array.isArray(parsed.conversations)) return (cached = [])
    cached = compact(parsed.conversations.map(cleanConversation).filter((item): item is SavedConversation => Boolean(item)))
  } catch {
    cached = []
  }
  return cached
}

function persist(conversations: SavedConversation[]): void {
  cached = compact(conversations)
  const file: ConversationFile = { version: 1, conversations: cached }
  writeFileSync(storePath(), JSON.stringify(file, null, 2), { encoding: 'utf-8', mode: 0o600 })
}

function summary(conversation: SavedConversation): ConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messages.length
  }
}

export function listConversations(query = ''): ConversationSummary[] {
  const needle = query.trim().toLocaleLowerCase().slice(0, 100)
  return load()
    .filter(conversation => !needle || conversation.title.toLocaleLowerCase().includes(needle) ||
      conversation.messages.some(message => message.content.toLocaleLowerCase().includes(needle)))
    .map(summary)
}

export function getConversation(id: string): SavedConversation | null {
  if (!ID_PATTERN.test(id)) return null
  return load().find(conversation => conversation.id === id) ?? null
}

export function upsertConversation(value: ConversationUpsert): SavedConversation {
  if (!ID_PATTERN.test(value.id)) throw new Error('无效的对话编号')
  if (!Array.isArray(value.messages) || value.messages.length === 0 || value.messages.length > MAX_MESSAGES) {
    throw new Error('对话消息数量无效')
  }
  const messages = value.messages.map(cleanMessage)
  if (messages.some(message => !message)) throw new Error('对话中包含无效消息')
  const now = new Date().toISOString()
  const existing = load().find(conversation => conversation.id === value.id)
  const conversation: SavedConversation = {
    id: value.id,
    title: cleanTitle(value.title),
    createdAt: existing?.createdAt ?? validDate(value.createdAt, now),
    updatedAt: now,
    messages: messages as ConversationMessage[]
  }
  if (imageBytes(conversation) > MAX_STORED_IMAGE_BYTES) throw new Error('当前对话中的图片总量超过本地历史上限')
  persist([conversation, ...load().filter(item => item.id !== conversation.id)])
  return conversation
}

export function renameConversation(id: string, title: string): SavedConversation {
  const existing = getConversation(id)
  if (!existing) throw new Error('找不到该对话')
  const renamed = { ...existing, title: cleanTitle(title), updatedAt: new Date().toISOString() }
  persist([renamed, ...load().filter(item => item.id !== id)])
  return renamed
}

export function deleteConversation(id: string): boolean {
  if (!ID_PATTERN.test(id)) return false
  const next = load().filter(conversation => conversation.id !== id)
  if (next.length === load().length) return false
  persist(next)
  return true
}
