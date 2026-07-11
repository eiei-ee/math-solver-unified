import type { ChatRequest, ConversationMessage, InputType } from '../../shared/contracts'

export function buildChatPayload(
  requestId: string,
  messages: ConversationMessage[],
  inputType: InputType,
  ragQuery?: string
): ChatRequest {
  return {
    requestId,
    messages,
    inputType,
    ...(ragQuery?.trim() ? { ragQuery: ragQuery.trim() } : {})
  }
}
