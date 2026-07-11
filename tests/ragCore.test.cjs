const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { buildIndex, searchIndex, splitText } = require('../.test-dist/main/ragCore.js')

function readKnowledgeDocuments(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return readKnowledgeDocuments(absolute)
    if (!entry.name.endsWith('.md')) return []
    return [{
      source: path.relative(directory, absolute).replaceAll('\\', '/'),
      content: fs.readFileSync(absolute, 'utf8')
    }]
  })
}

test('splitText enforces the configured size', () => {
  const chunks = splitText('甲'.repeat(420) + '\n\n' + '乙'.repeat(420), 500, 50)
  assert.ok(chunks.length >= 2)
  assert.ok(chunks.every(chunk => chunk.length <= 500))
})

test('built-in knowledge base retrieves algebra for a quadratic query', () => {
  const root = path.join(__dirname, '..', 'resources', 'knowledge')
  const documents = readKnowledgeDocuments(root)
  assert.ok(documents.length >= 9)
  const hits = searchIndex(
    buildIndex(documents),
    '一元二次方程 标准形式 ax^2 + bx + c = 0 判别式 Δ = b^2 - 4ac 求根公式',
    5
  )
  assert.ok(hits.length > 0)
  assert.equal(hits[0].source.endsWith('algebra.md'), true)
  assert.ok(hits.every((hit, index) => index === 0 || hits[index - 1].score >= hit.score))
})

test('empty query returns no knowledge hits', () => {
  const index = buildIndex([{ source: 'a.md', content: '二次方程与判别式' }])
  assert.deepEqual(searchIndex(index, '   '), [])
})
