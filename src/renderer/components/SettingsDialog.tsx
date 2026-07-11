import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { providers } from '../api/registry'
import { useSettingsStore } from '../store/settings'

export default function SettingsDialog({ onClose }: { onClose: () => void }) {
  const settings = useSettingsStore()
  const [form, setForm] = useState({
    provider: settings.provider,
    model: settings.model,
    temperature: settings.temperature,
    useRag: settings.useRag,
    apiKey: ''
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setForm({
      provider: settings.provider,
      model: settings.model,
      temperature: settings.temperature,
      useRag: settings.useRag,
      apiKey: ''
    })
  }, [settings.model, settings.provider, settings.temperature, settings.useRag])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const currentProvider = providers.find(item => item.id === form.provider)

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await settings.save({
        provider: form.provider,
        model: form.model,
        temperature: form.temperature,
        useRag: form.useRag,
        ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {})
      })
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="bg-gray-900 border border-gray-700 rounded-xl w-[440px] max-w-full max-h-full overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 id="settings-title" className="text-sm font-semibold">模型与知识库设置</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-800 text-gray-400" title="关闭">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label htmlFor="provider" className="block text-xs text-gray-400 mb-1.5">服务商</label>
            <select
              id="provider"
              value={form.provider}
              onChange={event => {
                const provider = providers.find(item => item.id === event.target.value)
                setForm({
                  ...form,
                  provider: event.target.value,
                  model: provider?.models[0]?.id ?? '',
                  apiKey: ''
                })
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {providers.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="model" className="block text-xs text-gray-400 mb-1.5">模型</label>
            <select
              id="model"
              value={form.model}
              onChange={event => setForm({ ...form, model: event.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {currentProvider?.models.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="api-key" className="block text-xs text-gray-400 mb-1.5">
              API Key {settings.apiKeyConfigured && form.provider === settings.provider ? '（已保存，留空不变）' : ''}
            </label>
            <input
              id="api-key"
              type="password"
              value={form.apiKey}
              onChange={event => setForm({ ...form, apiKey: event.target.value })}
              placeholder={settings.apiKeyConfigured && form.provider === settings.provider ? '输入新 Key 可替换' : '输入该服务商的 API Key'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
            />
            <p className="mt-1.5 text-[11px] text-gray-400">切换服务商会清除旧 Key，避免把凭据发送给错误厂商。</p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <label htmlFor="temperature">温度</label>
              <span>{form.temperature.toFixed(1)}</span>
            </div>
            <input
              id="temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={form.temperature}
              onChange={event => setForm({ ...form, temperature: Number(event.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-950/40 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.useRag}
              onChange={event => setForm({ ...form, useRag: event.target.checked })}
              className="mt-0.5 accent-blue-500"
            />
            <span>
              <span className="block text-sm text-gray-200">启用本地知识库增强</span>
              <span className="block mt-1 text-xs text-gray-400">离线检索内置数学资料，再将相关片段交给模型参考。</span>
            </span>
          </label>

          {saveError && <p className="text-xs text-red-400">保存失败：{saveError}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg hover:bg-gray-800 text-gray-400">取消</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-ink font-semibold"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
