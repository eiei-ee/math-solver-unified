import { useCallback } from 'react'
import { buildChatPayload } from '../api/client'
import { useChatStore } from '../store/chat'
import { useSettingsStore } from '../store/settings'
import { useHistoryStore } from '../store/history'
import type { ChatMessage } from '../store/chat'
import type { InputType } from '../../shared/contracts'

interface SubmitChatOptions {
  content: string
  requestContent?: string
  imageBase64?: string
  ragQuery?: string
  inputType?: InputType
  onSubmitted?: () => void
  appendUser?: boolean
  messagesOverride?: ChatMessage[]
}

const MAX_CONTEXT_MESSAGES = 60

export function useChatSubmit() {
  const settings = useSettingsStore()
  const {
    activeTab,
    appendAssistant,
    finishRequest,
    loading,
    messages,
    pushUser,
    setError,
    setRagResult,
    startRequest
  } = useChatStore()

  const submitChat = useCallback(async ({
    content,
    requestContent,
    imageBase64,
    ragQuery,
    inputType,
    onSubmitted,
    appendUser = true,
    messagesOverride
  }: SubmitChatOptions) => {
    const trimmed = content.trim()
    if (!trimmed || loading) return false
    if (!settings.apiKeyConfigured) {
      setError('请先在设置中配置 API Key')
      return false
    }

    const lastOverrideUser = messagesOverride
      ? [...messagesOverride].reverse().find(message => message.role === 'user')
      : undefined
    const effectiveInputType = inputType ?? lastOverrideUser?.inputType ?? activeTab
    const nextUserMessage: ChatMessage = {
      role: 'user',
      content: requestContent ?? trimmed,
      inputType: effectiveInputType,
      ...(ragQuery?.trim() ? { ragQuery: ragQuery.trim() } : {}),
      ...(imageBase64 ? { imageDataUrl: imageBase64 } : {})
    }
    const requestMessages = (messagesOverride ?? [...messages, nextUserMessage]).slice(-MAX_CONTEXT_MESSAGES)
    const requestId = crypto.randomUUID()
    const payload = buildChatPayload(requestId, requestMessages, effectiveInputType, ragQuery)

    onSubmitted?.()
    if (appendUser) pushUser(trimmed, effectiveInputType, imageBase64 ?? null, ragQuery)
    startRequest(requestId)

    let settled = false
    const cleanup = window.electronAPI.onChatEvent(event => {
      if (event.requestId !== requestId) return
      if (useChatStore.getState().activeRequestId !== requestId) {
        if (event.type === 'done' || event.type === 'error') cleanup()
        return
      }
      if (event.type === 'rag') {
        setRagResult(event.hits, event.message)
      } else if (event.type === 'chunk') {
        appendAssistant(event.chunk)
      } else if (event.type === 'done') {
        settled = true
        finishRequest(requestId)
        cleanup()
      } else if (event.type === 'error') {
        settled = true
        setError(event.message)
        cleanup()
      }
    })

    try {
      await window.electronAPI.sendChat(payload)
      if (!settled) {
        finishRequest(requestId)
        cleanup()
      }
      await useHistoryStore.getState().saveCurrent()
      return true
    } catch (error) {
      if (useChatStore.getState().activeRequestId === requestId) {
        setError(error instanceof Error ? error.message : String(error))
      }
      cleanup()
      await useHistoryStore.getState().saveCurrent()
      return false
    }
  }, [
    activeTab,
    appendAssistant,
    finishRequest,
    loading,
    messages,
    pushUser,
    setError,
    setRagResult,
    settings.apiKeyConfigured,
    startRequest
  ])

  return { loading, submitChat }
}
