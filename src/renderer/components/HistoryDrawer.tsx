import { useEffect, useMemo, useState } from 'react'
import { History, MessageSquare, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import type { ConversationSummary } from '../../shared/contracts'
import { useChatStore } from '../store/chat'
import { useHistoryStore } from '../store/history'

interface HistoryDrawerProps {
  onClose: () => void
}

function groupLabel(date: string): string {
  const value = new Date(date)
  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const startValue = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const days = Math.round((startToday - startValue) / 86_400_000)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return '本周'
  return '更早'
}

function groupSummaries(summaries: ConversationSummary[]) {
  const order = ['今天', '昨天', '本周', '更早']
  const grouped = new Map<string, ConversationSummary[]>()
  for (const summary of summaries) {
    const label = groupLabel(summary.updatedAt)
    grouped.set(label, [...(grouped.get(label) ?? []), summary])
  }
  return order.flatMap(label => grouped.has(label) ? [[label, grouped.get(label)!] as const] : [])
}

export default function HistoryDrawer({ onClose }: HistoryDrawerProps) {
  const { summaries, query, loading, error, setQuery, refresh, openConversation, renameConversation, deleteConversation } = useHistoryStore()
  const currentId = useChatStore(state => state.conversationId)
  const chatLoading = useChatStore(state => state.loading)
  const newConversation = useChatStore(state => state.newConversation)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const groups = useMemo(() => groupSummaries(summaries), [summaries])

  useEffect(() => {
    void refresh()
  }, [query, refresh])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleRename = async (id: string) => {
    await renameConversation(id, draftTitle)
    setEditingId(null)
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <button aria-label="关闭对话历史" className="absolute inset-0 bg-black/65" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        className="relative z-10 flex h-full w-[360px] max-w-[90vw] flex-col border-r border-gray-800 bg-gray-900"
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-800 px-4">
          <div className="flex items-center gap-2">
            <History size={15} className="text-blue-400" />
            <h2 id="history-title" className="text-sm font-semibold text-gray-100">对话历史</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-100" title="关闭">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 border-b border-gray-800 p-4">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-gray-700 bg-gray-950 px-3 focus-within:border-blue-500">
            <Search size={14} className="shrink-0 text-gray-500" />
            <span className="sr-only">搜索对话</span>
            <input
              autoFocus
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索对话"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-100 outline-none placeholder:text-gray-400"
            />
          </label>
          <button
            onClick={() => {
              newConversation()
              onClose()
            }}
            disabled={chatLoading}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-blue-500 text-sm font-medium text-blue-400 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={15} />
            新建对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading && summaries.length === 0 && (
            <div className="space-y-2" aria-label="正在加载对话历史">
              {[0, 1, 2].map(item => <div key={item} className="h-12 animate-pulse rounded-lg bg-gray-800" />)}
            </div>
          )}

          {!loading && summaries.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <MessageSquare size={24} className="mb-3 text-gray-600" />
              <p className="text-sm text-gray-300">{query ? '没有找到相关对话' : '还没有历史对话'}</p>
              <p className="mt-1.5 text-xs leading-5 text-gray-400">{query ? '试试题目中的其他关键词' : '完成一次解答后会自动保存在这里'}</p>
            </div>
          )}

          {groups.map(([label, items]) => (
            <section key={label} className="mb-4">
              <h3 className="px-2 pb-1.5 text-xs font-medium text-gray-400">{label}</h3>
              <div className="space-y-1">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`group flex min-h-12 items-center rounded-lg border px-2 transition-colors ${
                      item.id === currentId
                        ? 'border-blue-500 bg-blue-500/5'
                        : 'border-transparent hover:bg-gray-800'
                    }`}
                  >
                    {editingId === item.id ? (
                      <input
                        autoFocus
                        value={draftTitle}
                        onChange={event => setDraftTitle(event.target.value)}
                        onBlur={() => void handleRename(item.id)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') void handleRename(item.id)
                          if (event.key === 'Escape') setEditingId(null)
                        }}
                        className="min-w-0 flex-1 rounded-md border border-blue-500 bg-gray-950 px-2 py-1 text-sm text-gray-100 outline-none"
                      />
                    ) : (
                      <button
                        onClick={async () => {
                          if (await openConversation(item.id)) onClose()
                        }}
                        disabled={chatLoading}
                        className="min-w-0 flex-1 py-2 text-left disabled:cursor-not-allowed"
                      >
                        <span className="block truncate text-sm text-gray-200">{item.title}</span>
                        <span className="mt-0.5 block text-[11px] text-gray-400">
                          {new Date(item.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} · {item.messageCount} 条消息
                        </span>
                      </button>
                    )}
                    {editingId !== item.id && (
                      <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          onClick={() => {
                            setEditingId(item.id)
                            setDraftTitle(item.title)
                          }}
                          className="rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-gray-100"
                          title="重命名"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`确定删除“${item.title}”吗？`)) void deleteConversation(item.id)
                          }}
                          className="rounded-md p-2 text-red-400/70 hover:bg-red-900/40 hover:text-red-300"
                          title="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {error && <p className="border-t border-red-900/60 bg-red-950/40 px-4 py-3 text-xs text-red-300">{error}</p>}
      </aside>
    </div>
  )
}
