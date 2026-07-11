import { app } from 'electron'
import { readdirSync, readFileSync } from 'fs'
import { basename, join, relative } from 'path'
import { buildIndex, formatRagContext, searchIndex } from './ragCore'
import type { KnowledgeDocument, RagIndex } from './ragCore'

let cachedIndex: RagIndex | null = null

function knowledgeDirectory(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'knowledge')
    : join(app.getAppPath(), 'resources', 'knowledge')
}

function loadMarkdownDocuments(directory: string): KnowledgeDocument[] {
  const documents: KnowledgeDocument[] = []
  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolutePath = join(current, entry.name)
      if (entry.isDirectory()) visit(absolutePath)
      else if (entry.isFile() && entry.name.endsWith('.md')) {
        const source = relative(directory, absolutePath).replace(/\\/g, '/') || basename(absolutePath)
        documents.push({ source, content: readFileSync(absolutePath, 'utf-8') })
      }
    }
  }
  visit(directory)
  return documents
}

export function retrieveKnowledge(query: string, limit = 5) {
  if (!cachedIndex) cachedIndex = buildIndex(loadMarkdownDocuments(knowledgeDirectory()))
  const hits = searchIndex(cachedIndex, query, limit)
  return { hits, context: formatRagContext(hits) }
}
