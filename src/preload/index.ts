import { contextBridge, ipcRenderer } from 'electron'
import type { ChatEvent, ChatRequest, SettingsUpdate } from '../shared/contracts'

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: SettingsUpdate) => ipcRenderer.invoke('settings:set', settings),
  openImage: () => ipcRenderer.invoke('file:open-image'),
  saveMarkdown: (content: string) => ipcRenderer.invoke('file:save-markdown', content),
  sendChat: (payload: ChatRequest) => ipcRenderer.invoke('chat:send', payload),
  cancelChat: (requestId: string) => ipcRenderer.invoke('chat:cancel', requestId),
  onChatEvent: (callback: (event: ChatEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, event: ChatEvent) => callback(event)
    ipcRenderer.on('chat:event', listener)
    return () => ipcRenderer.removeListener('chat:event', listener)
  }
})
