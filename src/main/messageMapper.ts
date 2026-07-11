import type { ConversationMessage } from '../shared/contracts'
import type { ProviderMessage } from '../shared/providers'

interface MessageMappingOptions {
  includeImages?: boolean
}

export function toProviderMessages(
  messages: ConversationMessage[],
  { includeImages = true }: MessageMappingOptions = {}
): ProviderMessage[] {
  return messages.map(message => {
    if (message.role === 'user' && message.imageDataUrl && includeImages) {
      return {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: message.imageDataUrl } },
          { type: 'text', text: message.content }
        ]
      }
    }
    if (message.role === 'user' && message.imageDataUrl) {
      return {
        role: 'user',
        content: `${message.content}\n[历史图片未随本次请求发送]`
      }
    }
    return { role: message.role, content: message.content }
  })
}
