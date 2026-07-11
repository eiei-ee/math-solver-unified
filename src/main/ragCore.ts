import type { RagHit } from '../shared/contracts'

export interface KnowledgeDocument {
  source: string
  content: string
}

interface IndexedChunk {
  source: string
  text: string
  vector: Map<string, number>
}

export interface RagIndex {
  chunks: IndexedChunk[]
  idf: Map<string, number>
}

const DEFAULT_CHUNK_SIZE = 500
const DEFAULT_OVERLAP = 50

function splitLongPart(part: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  const step = Math.max(1, chunkSize - overlap)
  for (let start = 0; start < part.length; start += step) {
    chunks.push(part.slice(start, start + chunkSize).trim())
    if (start + chunkSize >= part.length) break
  }
  return chunks.filter(Boolean)
}

export function splitText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP
): string[] {
  if (chunkSize <= 0) throw new Error('chunkSize 必须大于 0')
  if (overlap < 0 || overlap >= chunkSize) throw new Error('overlap 必须在 0 和 chunkSize 之间')

  const sections = text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map(section => section.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  const flush = () => {
    if (!current.trim()) return
    chunks.push(current.trim())
    current = overlap > 0 ? current.slice(-overlap) : ''
  }

  for (const section of sections) {
    if (section.length > chunkSize) {
      flush()
      chunks.push(...splitLongPart(section, chunkSize, overlap))
      current = ''
      continue
    }
    const candidate = current ? `${current}\n\n${section}` : section
    if (candidate.length > chunkSize) flush()
    current = current && `${current}\n\n${section}`.length <= chunkSize
      ? `${current}\n\n${section}`
      : section
  }
  flush()
  return chunks
}

function ngramCounts(text: string): Map<string, number> {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim()
  const counts = new Map<string, number>()
  for (let n = 1; n <= 3; n += 1) {
    for (let index = 0; index <= normalized.length - n; index += 1) {
      const gram = normalized.slice(index, index + n)
      if (!gram.trim()) continue
      counts.set(gram, (counts.get(gram) ?? 0) + 1)
    }
  }
  return counts
}

function vectorize(text: string, idf: Map<string, number>): Map<string, number> {
  const counts = ngramCounts(text)
  const vector = new Map<string, number>()
  let normSquared = 0
  for (const [term, count] of counts) {
    const weight = count * (idf.get(term) ?? 0)
    if (!weight) continue
    vector.set(term, weight)
    normSquared += weight * weight
  }
  const norm = Math.sqrt(normSquared)
  if (norm > 0) {
    for (const [term, value] of vector) vector.set(term, value / norm)
  }
  return vector
}

function cosine(left: Map<string, number>, right: Map<string, number>): number {
  const [small, large] = left.size <= right.size ? [left, right] : [right, left]
  let score = 0
  for (const [term, value] of small) score += value * (large.get(term) ?? 0)
  return score
}

export function buildIndex(documents: KnowledgeDocument[]): RagIndex {
  const rawChunks = documents.flatMap(document =>
    splitText(document.content).map(text => ({ source: document.source, text }))
  )
  if (rawChunks.length === 0) return { chunks: [], idf: new Map() }

  const documentFrequency = new Map<string, number>()
  for (const chunk of rawChunks) {
    for (const term of ngramCounts(chunk.text).keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1)
    }
  }

  const idf = new Map<string, number>()
  for (const [term, frequency] of documentFrequency) {
    idf.set(term, Math.log((1 + rawChunks.length) / (1 + frequency)) + 1)
  }

  return {
    idf,
    chunks: rawChunks.map(chunk => ({ ...chunk, vector: vectorize(chunk.text, idf) }))
  }
}

export function searchIndex(index: RagIndex, query: string, limit = 5): RagHit[] {
  if (!query.trim() || limit <= 0 || index.chunks.length === 0) return []
  const queryVector = vectorize(query, index.idf)
  const seen = new Set<string>()
  return index.chunks
    .map(chunk => ({ chunk, score: cosine(queryVector, chunk.vector) }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .filter(item => {
      const key = item.chunk.text.slice(0, 60)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
    .map(item => ({
      source: item.chunk.source,
      excerpt: item.chunk.text,
      score: Number(item.score.toFixed(4))
    }))
}

export function formatRagContext(hits: RagHit[]): string {
  return hits.map((hit, index) => `[参考${index + 1}] (${hit.source})\n${hit.excerpt}`).join('\n\n---\n\n')
}
