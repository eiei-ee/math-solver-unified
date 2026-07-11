import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Copy, Download, Eraser, RotateCcw, Square } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { useChatSubmit } from '../hooks/useChatSubmit'
import { useChatStore } from '../store/chat'
import type { ChatMessage } from '../store/chat'

function buildMarkdown(messages: ChatMessage[]): string {
  const sections = messages.map((message, index) => {
    const speaker = message.role === 'user' ? '题目' : '解答'
    const imageNote = message.imageDataUrl ? '\n\n> 本题包含一张图片（导出文件不内嵌图片数据）。' : ''
    const references = message.ragHits?.length
      ? `\n\n### 知识库参考\n\n${message.ragHits.map(hit => `- ${hit.source}（相似度 ${(hit.score * 100).toFixed(1)}%）`).join('\n')}`
      : ''
    return `## ${index + 1}. ${speaker}\n\n${message.content.trim() || '...'}${imageNote}${references}`
  })

  return [
    '# 数学题解答助手对话',
    '',
    `导出时间：${new Date().toLocaleString()}`,
    '',
    ...sections
  ].join('\n')
}

function findLatestUserIndex(messages: ChatMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') return index
  }
  return -1
}

export default function AnswerPanel() {
  const { activeRequestId, messages, loading, error, clearMessages, setLoading, setMessages, setError } = useChatStore()
  const { submitChat } = useChatSubmit()
  const [status, setStatus] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const latestAssistant = useMemo(
    () => [...messages].reverse().find(message => message.role === 'assistant' && message.content.trim()),
    [messages]
  )
  const latestUserIndex = useMemo(
    () => findLatestUserIndex(messages),
    [messages]
  )
  const canRegenerate = latestUserIndex >= 0 && !loading

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(null), 1800)
    return () => window.clearTimeout(timer)
  }, [status])

  const handleCancel = async () => {
    if (activeRequestId) await window.electronAPI.cancelChat(activeRequestId)
    setLoading(false)
  }

  const handleCopy = async () => {
    if (!latestAssistant) return
    try {
      await navigator.clipboard.writeText(latestAssistant.content)
      setStatus('已复制最新解答')
    } catch (copyError) {
      setError(`复制失败: ${copyError instanceof Error ? copyError.message : String(copyError)}`)
    }
  }

  const handleExport = async () => {
    if (messages.length === 0) return
    try {
      const path = await window.electronAPI.saveMarkdown(buildMarkdown(messages))
      if (path) setStatus('已导出 Markdown')
    } catch (exportError) {
      setError(`导出失败: ${exportError instanceof Error ? exportError.message : String(exportError)}`)
    }
  }

  const handleRegenerate = async () => {
    if (!canRegenerate) return
    const history = messages.slice(0, latestUserIndex + 1)
    const lastUser = history[history.length - 1]
    setMessages(history)
    await submitChat({
      content: lastUser.content,
      imageBase64: lastUser.imageDataUrl,
      inputType: lastUser.inputType,
      ragQuery: lastUser.ragQuery,
      appendUser: false,
      messagesOverride: history
    })
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <span className="text-xs text-gray-400">
          {messages.length > 0 ? `共 ${messages.length} 条消息` : '输入题目开始'}
        </span>
        <div className="flex items-center gap-1">
          {loading && (
            <button
              onClick={handleCancel}
              className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300"
              title="停止生成"
            >
              <Square size={14} />
            </button>
          )}
          {latestAssistant && (
            <button
              onClick={handleCopy}
              disabled={loading}
              className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
              title="复制最新解答"
            >
              <Copy size={14} />
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={handleExport}
              disabled={loading}
              className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
              title="导出 Markdown"
            >
              <Download size={14} />
            </button>
          )}
          {canRegenerate && (
            <button
              onClick={handleRegenerate}
              className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300"
              title="重新生成上一题"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              disabled={loading}
              className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
              title={loading ? '回答生成中，暂不能清空' : '清空对话'}
            >
              <Eraser size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            在左侧输入数学题目，AI 将为你逐步解答
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={message.role === 'user' ? 'flex justify-end' : ''}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                message.role === 'user'
                  ? 'bg-blue-600/20 text-blue-100 ml-8'
                  : 'bg-gray-900 border border-gray-800 mr-8'
              }`}
            >
              {message.role === 'assistant' ? (
                <>
                  <div className="text-gray-200 leading-7 [&_pre]:bg-gray-950 [&_pre]:p-3 [&_pre]:rounded-lg [&_code]:text-gray-300 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:ml-5">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {message.content || '...'}
                    </ReactMarkdown>
                  </div>
                  {message.ragStatus && (
                    <details className="mt-3 border-t border-gray-800 pt-2 text-xs text-gray-400">
                      <summary className="cursor-pointer select-none flex items-center gap-1.5 hover:text-gray-300">
                        <BookOpen size={12} />
                        {message.ragStatus}
                      </summary>
                      {message.ragHits?.length ? (
                        <div className="mt-2 space-y-2">
                          {message.ragHits.map((hit, hitIndex) => (
                            <div key={`${hit.source}-${hitIndex}`} className="rounded-md bg-gray-950/70 border border-gray-800 p-2.5">
                              <div className="flex items-center justify-between gap-3 text-gray-400">
                                <span>{hit.source}</span>
                                <span>{(hit.score * 100).toFixed(1)}%</span>
                              </div>
                              <p className="mt-1.5 whitespace-pre-wrap line-clamp-4 text-gray-400">{hit.excerpt}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-gray-400">本次没有注入知识库片段。</p>
                      )}
                    </details>
                  )}
                </>
              ) : (
                <div>
                  {message.imageDataUrl && (
                    <img src={message.imageDataUrl} alt="题目附件" className="mb-2 max-h-40 rounded-md object-contain" />
                  )}
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            AI 正在思考...
          </div>
        )}

        {status && (
          <div className="bg-emerald-900/25 border border-emerald-800 rounded-lg px-4 py-3 text-sm text-emerald-300">
            {status}
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
