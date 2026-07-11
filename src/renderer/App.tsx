import { useEffect, useState } from 'react'
import { BookOpen, History, Plus, Settings } from 'lucide-react'
import InputPanel from './components/InputPanel'
import AnswerPanel from './components/AnswerPanel'
import SettingsDialog from './components/SettingsDialog'
import HistoryDrawer from './components/HistoryDrawer'
import { useChatStore } from './store/chat'
import { useSettingsStore } from './store/settings'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const loadSettings = useSettingsStore(s => s.load)
  const saveSettings = useSettingsStore(s => s.save)
  const useRag = useSettingsStore(s => s.useRag)
  const setError = useChatStore(s => s.setError)
  const newConversation = useChatStore(s => s.newConversation)
  const loading = useChatStore(s => s.loading)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-gray-100"
            title="打开对话历史"
          >
            <History size={15} className="text-blue-400" />
            数学题解答助手
          </button>
          <button
            onClick={newConversation}
            disabled={loading}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            title="新建对话"
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              void saveSettings({ useRag: !useRag }).catch(error => {
                setError(`知识库设置保存失败：${error instanceof Error ? error.message : String(error)}`)
              })
            }}
            className={`h-7 px-2.5 rounded-md border text-xs flex items-center gap-1.5 transition-colors ${
              useRag
                ? 'border-blue-700/70 bg-blue-500/10 text-blue-300'
                : 'border-gray-800 text-gray-400 hover:text-gray-200'
            }`}
            title="切换本地知识库增强"
          >
            <BookOpen size={13} />
            知识库 {useRag ? '开' : '关'}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-md hover:bg-gray-800 text-gray-400 hover:text-gray-100 transition-colors"
            title="设置"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <InputPanel />
        <AnswerPanel />
      </div>

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
      {showHistory && <HistoryDrawer onClose={() => setShowHistory(false)} />}
    </div>
  )
}
