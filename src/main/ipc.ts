import { BrowserWindow, dialog, ipcMain } from 'electron'
import { readFileSync, statSync, writeFileSync } from 'fs'
import { extname } from 'path'
import { getModel, getProviderInfo } from '../shared/providerCatalog'
import { getProvider } from '../shared/providers'
import type { ProviderMessage } from '../shared/providers'
import { buildSystemPrompt } from '../shared/prompts'
import type {
  ChatEvent,
  ChatRequest,
  ConversationMessage,
  InputType,
  PickedImage,
  SettingsUpdate
} from '../shared/contracts'
import { toProviderMessages } from './messageMapper'
import { retrieveKnowledge } from './rag'
import { SseDataParser } from './sse'
import { getPublicSettings, getSettings, updateSettings } from './settings'

const MAX_MESSAGES = 80
const MAX_MESSAGE_LENGTH = 30_000
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_REQUEST_CHARACTERS = 30_000_000
const STREAM_IDLE_TIMEOUT_MS = 90_000

const activeRequests = new Map<string, { controller: AbortController; senderId: number }>()
const activeRequestBySender = new Map<number, string>()
const abortReasons = new Map<string, 'cancel' | 'timeout' | 'replaced'>()

function assertTrustedSender(event: Electron.IpcMainInvokeEvent): void {
  const url = event.senderFrame?.url ?? event.sender.getURL()
  const devUrl = process.env.ELECTRON_RENDERER_URL
  let trusted = url.startsWith('file:') && !devUrl
  if (devUrl) {
    try {
      trusted = new URL(url).origin === new URL(devUrl).origin
    } catch {
      trusted = false
    }
  }
  if (!trusted) throw new Error('拒绝来自非应用页面的 IPC 请求')
}

function sendEvent(sender: Electron.WebContents, event: ChatEvent): void {
  if (!sender.isDestroyed()) sender.send('chat:event', event)
}

function validateInputType(value: unknown): InputType {
  if (value === 'text' || value === 'image' || value === 'latex') return value
  throw new Error('无效的输入类型')
}

function validateMessage(value: unknown): ConversationMessage {
  if (!value || typeof value !== 'object') throw new Error('无效的消息')
  const candidate = value as Partial<ConversationMessage>
  if (candidate.role !== 'user' && candidate.role !== 'assistant') throw new Error('无效的消息角色')
  if (typeof candidate.content !== 'string' || candidate.content.length > MAX_MESSAGE_LENGTH) {
    throw new Error('消息内容为空或过长')
  }
  if (candidate.imageDataUrl !== undefined) {
    if (candidate.role !== 'user' || !/^data:image\/(png|jpeg|gif|webp);base64,/.test(candidate.imageDataUrl)) {
      throw new Error('无效的图片数据')
    }
    if (candidate.imageDataUrl.length > MAX_IMAGE_BYTES * 1.4) throw new Error('图片过大，请压缩后重试')
  }
  return {
    role: candidate.role,
    content: candidate.content,
    ...(candidate.imageDataUrl ? { imageDataUrl: candidate.imageDataUrl } : {})
  }
}

function validateChatRequest(value: unknown): ChatRequest {
  if (!value || typeof value !== 'object') throw new Error('无效的请求')
  const candidate = value as Partial<ChatRequest>
  if (typeof candidate.requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(candidate.requestId)) {
    throw new Error('无效的请求编号')
  }
  if (!Array.isArray(candidate.messages) || candidate.messages.length === 0 || candidate.messages.length > MAX_MESSAGES) {
    throw new Error('消息数量无效')
  }
  const messages = candidate.messages.map(validateMessage)
  const requestCharacters = messages.reduce(
    (total, message) => total + message.content.length + (message.imageDataUrl?.length ?? 0),
    0
  )
  if (requestCharacters > MAX_REQUEST_CHARACTERS) throw new Error('请求历史过大，请清空对话后重试')
  if (messages[messages.length - 1].role !== 'user') throw new Error('最后一条消息必须来自用户')
  return {
    requestId: candidate.requestId,
    inputType: validateInputType(candidate.inputType),
    messages,
    ...(typeof candidate.ragQuery === 'string' ? { ragQuery: candidate.ragQuery.slice(0, 2_000) } : {})
  }
}

function friendlyError(status: number, responseText: string): string {
  let message = ''
  try {
    const parsed = JSON.parse(responseText) as { error?: { message?: string } }
    message = parsed.error?.message ?? ''
  } catch {
    message = ''
  }
  if (status === 401 || status === 403) return 'API Key 无效或无权访问当前模型，请检查设置。'
  if (status === 402) return 'API 余额不足，请充值后重试。'
  if (status === 429) return '请求过于频繁，请稍后重试。'
  return message ? `模型服务返回错误：${message}` : `模型服务请求失败（HTTP ${status}）`
}

async function streamChat(payload: ChatRequest, sender: Electron.WebContents): Promise<void> {
  const settings = getSettings()
  if (!settings.apiKey) {
    sendEvent(sender, { requestId: payload.requestId, type: 'error', message: '请先在设置中配置 API Key' })
    return
  }

  const provider = getProvider(settings.provider)
  const model = getModel(settings.provider, settings.model)
  if (!provider || !model) {
    sendEvent(sender, { requestId: payload.requestId, type: 'error', message: '当前服务商或模型配置无效' })
    return
  }
  const latestUser = [...payload.messages].reverse().find(message => message.role === 'user')
  if (latestUser?.imageDataUrl && !model.supportsImage) {
    sendEvent(sender, {
      requestId: payload.requestId,
      type: 'error',
      message: `当前模型 ${model.label} 不支持图片输入，请切换到视觉模型后重试`
    })
    return
  }

  let ragContext = ''
  if (!settings.useRag) {
    sendEvent(sender, { requestId: payload.requestId, type: 'rag', status: 'disabled', hits: [], message: '知识库增强已关闭' })
  } else {
    const query = payload.ragQuery?.trim() || (payload.inputType === 'image' ? '' : latestUser?.content.trim() ?? '')
    if (!query) {
      sendEvent(sender, {
        requestId: payload.requestId,
        type: 'rag',
        status: 'skipped',
        hits: [],
        message: '图片题未提供检索关键词，已跳过知识库'
      })
    } else {
      try {
        const result = retrieveKnowledge(query)
        ragContext = result.context
        sendEvent(sender, {
          requestId: payload.requestId,
          type: 'rag',
          status: result.hits.length > 0 ? 'matched' : 'empty',
          hits: result.hits,
          message: result.hits.length > 0 ? `已检索 ${result.hits.length} 条参考资料` : '知识库未命中，已直接解答'
        })
      } catch {
        sendEvent(sender, {
          requestId: payload.requestId,
          type: 'rag',
          status: 'error',
          hits: [],
          message: '知识库检索失败，已跳过并继续解答'
        })
      }
    }
  }

  const previousRequestId = activeRequestBySender.get(sender.id)
  if (previousRequestId) {
    abortReasons.set(previousRequestId, 'replaced')
    activeRequests.get(previousRequestId)?.controller.abort()
  }

  const controller = new AbortController()
  activeRequests.set(payload.requestId, { controller, senderId: sender.id })
  activeRequestBySender.set(sender.id, payload.requestId)

  let timeout: ReturnType<typeof setTimeout> | undefined
  const resetTimeout = () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      abortReasons.set(payload.requestId, 'timeout')
      controller.abort()
    }, STREAM_IDLE_TIMEOUT_MS)
  }
  resetTimeout()

  const endpoint = settings.provider === 'gemini'
    ? `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:streamGenerateContent?alt=sse`
    : provider.endpoint

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: provider.headers(settings.apiKey),
      body: provider.buildBody(
        settings.model,
        toProviderMessages(payload.messages, { includeImages: Boolean(model.supportsImage) }),
        buildSystemPrompt({ inputType: payload.inputType, ragContext }),
        { temperature: settings.temperature, maxTokens: 4096 }
      ),
      signal: controller.signal
    })
    if (!response.ok) {
      sendEvent(sender, {
        requestId: payload.requestId,
        type: 'error',
        message: friendlyError(response.status, await response.text())
      })
      return
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('模型服务没有返回可读取的数据流')
    const decoder = new TextDecoder()
    const parser = new SseDataParser()
    let streamServiceError: string | null = null

    const consume = (dataPayloads: string[]) => {
      for (const data of dataPayloads) {
        if (!data || data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data) as { error?: { message?: unknown } | string }
          if (parsed.error) {
            const detail = typeof parsed.error === 'string' ? parsed.error : parsed.error.message
            streamServiceError = typeof detail === 'string' && detail ? detail : '模型流返回未知错误'
            continue
          }
          const chunk = provider.parseChunk(parsed)
          if (chunk) sendEvent(sender, { requestId: payload.requestId, type: 'chunk', chunk })
        } catch {
          // Ignore a malformed event without dropping the otherwise valid stream.
        }
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      resetTimeout()
      consume(parser.push(decoder.decode(value, { stream: true })))
      if (streamServiceError) {
        await reader.cancel()
        break
      }
    }
    if (streamServiceError) {
      sendEvent(sender, {
        requestId: payload.requestId,
        type: 'error',
        message: `模型服务返回错误：${streamServiceError}`
      })
    } else {
      consume(parser.push(decoder.decode()))
      consume(parser.finish())
      sendEvent(sender, { requestId: payload.requestId, type: 'done' })
    }
  } catch (error) {
    if (controller.signal.aborted) {
      const reason = abortReasons.get(payload.requestId)
      if (reason === 'timeout') {
        sendEvent(sender, { requestId: payload.requestId, type: 'error', message: '响应流长时间没有数据，请稍后重试' })
      } else {
        sendEvent(sender, { requestId: payload.requestId, type: 'done' })
      }
    } else {
      const detail = error instanceof Error ? error.message : String(error)
      sendEvent(sender, { requestId: payload.requestId, type: 'error', message: `网络请求失败：${detail}` })
    }
  } finally {
    if (timeout) clearTimeout(timeout)
    if (activeRequests.get(payload.requestId)?.controller === controller) activeRequests.delete(payload.requestId)
    if (activeRequestBySender.get(sender.id) === payload.requestId) activeRequestBySender.delete(sender.id)
    abortReasons.delete(payload.requestId)
  }
}

function imageMimeType(path: string): string {
  const extension = extname(path).toLowerCase()
  if (extension === '.png') return 'image/png'
  if (extension === '.gif') return 'image/gif'
  if (extension === '.webp') return 'image/webp'
  return 'image/jpeg'
}

export function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', (event) => {
    assertTrustedSender(event)
    return getPublicSettings()
  })

  ipcMain.handle('settings:set', (event, value: SettingsUpdate) => {
    assertTrustedSender(event)
    const update = { ...value }
    if (update.provider !== undefined && !getProviderInfo(update.provider)) throw new Error('无效的服务商')
    const providerId = update.provider ?? getSettings().provider
    if (update.model !== undefined && !getModel(providerId, update.model)) throw new Error('无效的模型')
    if (typeof update.apiKey === 'string' && update.apiKey.length > 2_000) throw new Error('API Key 过长')
    return updateSettings(update)
  })

  ipcMain.handle('file:open-image', async (event): Promise<PickedImage | null> => {
    assertTrustedSender(event)
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const path = result.filePaths[0]
    if (statSync(path).size > MAX_IMAGE_BYTES) throw new Error('图片文件不能超过 10MB')
    return {
      name: path.split(/[\\/]/).pop() ?? 'image',
      dataUrl: `data:${imageMimeType(path)};base64,${readFileSync(path).toString('base64')}`
    }
  })

  ipcMain.handle('file:save-markdown', async (event, content: string) => {
    assertTrustedSender(event)
    if (typeof content !== 'string' || content.length > 5_000_000) throw new Error('导出内容无效或过长')
    const result = await dialog.showSaveDialog({
      title: '导出对话',
      defaultPath: `math-solution-${new Date().toISOString().slice(0, 10)}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (result.canceled || !result.filePath) return null
    writeFileSync(result.filePath, content, 'utf-8')
    return result.filePath
  })

  ipcMain.handle('chat:send', async (event, value: unknown) => {
    assertTrustedSender(event)
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('应用窗口已关闭')
    await streamChat(validateChatRequest(value), win.webContents)
  })

  ipcMain.handle('chat:cancel', (event, requestId: string) => {
    assertTrustedSender(event)
    const active = activeRequests.get(requestId)
    if (!active || active.senderId !== event.sender.id) return false
    abortReasons.set(requestId, 'cancel')
    active.controller.abort()
    return true
  })
}
