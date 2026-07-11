import { contextBridge, ipcRenderer } from 'electron'
import type { ChatEvent, ChatRequest, ConversationUpsert, SettingsUpdate } from '../shared/contracts'

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: SettingsUpdate) => ipcRenderer.invoke('settings:set', settings),
  openImage: () => ipcRenderer.invoke('file:open-image'),
  saveMarkdown: (content: string) => ipcRenderer.invoke('file:save-markdown', content),
  sendChat: (payload: ChatRequest) => ipcRenderer.invoke('chat:send', payload),
  cancelChat: (requestId: string) => ipcRenderer.invoke('chat:cancel', requestId),
  listConversations: (query?: string) => ipcRenderer.invoke('conversations:list', query),
  getConversation: (id: string) => ipcRenderer.invoke('conversations:get', id),
  saveConversation: (conversation: ConversationUpsert) => ipcRenderer.invoke('conversations:save', conversation),
  renameConversation: (id: string, title: string) => ipcRenderer.invoke('conversations:rename', id, title),
  deleteConversation: (id: string) => ipcRenderer.invoke('conversations:delete', id),
  onChatEvent: (callback: (event: ChatEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, event: ChatEvent) => callback(event)
    ipcRenderer.on('chat:event', listener)
    return () => ipcRenderer.removeListener('chat:event', listener)
  }
})
