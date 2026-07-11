import { getProviderInfo } from './providerCatalog'
import type { ProviderInfo } from './providerCatalog'

export interface ChatContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export interface ProviderMessage {
  role: 'user' | 'assistant'
  content: string | ChatContentPart[]
}

export interface GenerationOptions {
  temperature: number
  maxTokens: number
}

export interface ProviderConfig extends ProviderInfo {
  endpoint: string
  headers: (apiKey: string) => Record<string, string>
  buildBody: (
    model: string,
    messages: ProviderMessage[],
    systemPrompt: string,
    options: GenerationOptions
  ) => string
  parseChunk: (data: unknown) => string | null
}

interface DataUrlImage {
  mediaType: string
  data: string
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } }
type ClaudeContent = string | ClaudePart[]
type ClaudePart = { type: 'text'; text: string } | {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

function catalog(id: string): ProviderInfo {
  const provider = getProviderInfo(id)
  if (!provider) throw new Error(`Provider catalog missing: ${id}`)
  return provider
}

function parseDataUrl(url: string): DataUrlImage | null {
  const match = url.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mediaType: match[1], data: match[2] }
}

function openAICompat(endpoint: string): Pick<ProviderConfig, 'endpoint' | 'headers' | 'buildBody' | 'parseChunk'> {
  return {
    endpoint,
    headers: (apiKey: string) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    }),
    buildBody: (model, messages, systemPrompt, options) => JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true
    }),
    parseChunk: (data) => {
      const parsed = data as { choices?: { delta?: { content?: string } }[] }
      return parsed.choices?.[0]?.delta?.content ?? null
    }
  }
}

function buildGeminiParts(content: ProviderMessage['content']): GeminiPart[] {
  if (typeof content === 'string') return [{ text: content }]
  const parts: GeminiPart[] = []
  for (const part of content) {
    if (part.type === 'text') {
      if (part.text) parts.push({ text: part.text })
      continue
    }
    const url = part.image_url?.url
    if (!url) continue
    const image = parseDataUrl(url)
    if (image) parts.push({ inlineData: { mimeType: image.mediaType, data: image.data } })
  }
  return parts
}

function buildClaudeContent(content: ProviderMessage['content']): ClaudeContent {
  if (typeof content === 'string') return content
  const parts: ClaudePart[] = []
  for (const part of content) {
    if (part.type === 'text') {
      if (part.text) parts.push({ type: 'text', text: part.text })
      continue
    }
    const url = part.image_url?.url
    if (!url) continue
    const image = parseDataUrl(url)
    if (!image) continue
    parts.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mediaType,
        data: image.data
      }
    })
  }
  return parts
}

export const providerConfigs: ProviderConfig[] = [
  {
    ...catalog('deepseek'),
    ...openAICompat('https://api.deepseek.com/v1/chat/completions')
  },
  {
    ...catalog('openai'),
    ...openAICompat('https://api.openai.com/v1/chat/completions')
  },
  {
    ...catalog('qwen'),
    ...openAICompat('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')
  },
  {
    ...catalog('glm'),
    ...openAICompat('https://open.bigmodel.cn/api/paas/v4/chat/completions')
  },
  {
    ...catalog('moonshot'),
    ...openAICompat('https://api.moonshot.cn/v1/chat/completions')
  },
  {
    ...catalog('gemini'),
    endpoint: '',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    }),
    buildBody: (_model, messages, systemPrompt, options) => JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map(message => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: buildGeminiParts(message.content)
      })),
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature
      }
    }),
    parseChunk: (data) => {
      const parsed = data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      return parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? null
    }
  },
  {
    ...catalog('grok'),
    ...openAICompat('https://api.x.ai/v1/chat/completions')
  },
  {
    ...catalog('mistral'),
    ...openAICompat('https://api.mistral.ai/v1/chat/completions')
  },
  {
    ...catalog('claude'),
    endpoint: 'https://api.anthropic.com/v1/messages',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }),
    buildBody: (model, messages, systemPrompt, options) => JSON.stringify({
      model,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: systemPrompt,
      messages: messages.map(message => ({
        role: message.role,
        content: buildClaudeContent(message.content)
      })),
      stream: true
    }),
    parseChunk: (data) => {
      const parsed = data as { type?: string; delta?: { text?: string } }
      return parsed.type === 'content_block_delta' ? parsed.delta?.text ?? null : null
    }
  }
]

export function getProvider(id: string): ProviderConfig | undefined {
  return providerConfigs.find(provider => provider.id === id)
}
