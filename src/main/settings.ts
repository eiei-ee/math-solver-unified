import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { PublicSettings, SettingsUpdate } from '../shared/contracts'

interface Settings extends Omit<PublicSettings, 'apiKeyConfigured'> {
  apiKey: string
}

interface StoredSettings extends Omit<Settings, 'apiKey'> {
  version: 1
  encryptedApiKey?: string
  apiKey?: string
}

const defaults: Settings = {
  provider: 'deepseek',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.7,
  useRag: true
}

let cached: Settings | null = null

function storePath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function decryptKey(stored: StoredSettings): string {
  if (stored.encryptedApiKey && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(stored.encryptedApiKey, 'base64'))
    } catch {
      return ''
    }
  }
  return typeof stored.apiKey === 'string' ? stored.apiKey : ''
}

function load(): Settings {
  try {
    if (!existsSync(storePath())) return { ...defaults }
    const stored = JSON.parse(readFileSync(storePath(), 'utf-8')) as StoredSettings
    return {
      ...defaults,
      provider: typeof stored.provider === 'string' ? stored.provider : defaults.provider,
      model: typeof stored.model === 'string' ? stored.model : defaults.model,
      temperature: typeof stored.temperature === 'number' ? stored.temperature : defaults.temperature,
      useRag: typeof stored.useRag === 'boolean' ? stored.useRag : defaults.useRag,
      apiKey: decryptKey(stored)
    }
  } catch {
    return { ...defaults }
  }
}

function persist(settings: Settings): void {
  const stored: StoredSettings = {
    version: 1,
    provider: settings.provider,
    model: settings.model,
    temperature: settings.temperature,
    useRag: settings.useRag
  }
  if (settings.apiKey) {
    if (safeStorage.isEncryptionAvailable()) {
      stored.encryptedApiKey = safeStorage.encryptString(settings.apiKey).toString('base64')
    } else {
      stored.apiKey = settings.apiKey
    }
  }
  writeFileSync(storePath(), JSON.stringify(stored, null, 2), { encoding: 'utf-8', mode: 0o600 })
}

export function getSettings(): Settings {
  if (!cached) cached = load()
  return cached
}

export function getPublicSettings(): PublicSettings {
  const settings = getSettings()
  return {
    provider: settings.provider,
    model: settings.model,
    temperature: settings.temperature,
    useRag: settings.useRag,
    apiKeyConfigured: Boolean(settings.apiKey)
  }
}

export function updateSettings(update: SettingsUpdate): PublicSettings {
  const current = getSettings()
  const providerChanged = typeof update.provider === 'string' && update.provider !== current.provider
  cached = {
    ...current,
    ...(typeof update.provider === 'string' ? { provider: update.provider } : {}),
    ...(typeof update.model === 'string' ? { model: update.model } : {}),
    ...(typeof update.temperature === 'number' ? { temperature: Math.min(2, Math.max(0, update.temperature)) } : {}),
    ...(typeof update.useRag === 'boolean' ? { useRag: update.useRag } : {}),
    ...(providerChanged ? { apiKey: '' } : {}),
    ...(typeof update.apiKey === 'string' && update.apiKey.trim() ? { apiKey: update.apiKey.trim() } : {})
  }
  persist(cached)
  return getPublicSettings()
}
