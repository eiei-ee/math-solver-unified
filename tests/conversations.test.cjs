const { after, test } = require('node:test')
const assert = require('node:assert/strict')
const { mkdtempSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const Module = require('node:module')

const userData = mkdtempSync(join(tmpdir(), 'math-solver-history-'))
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'electron') return { app: { getPath: () => userData } }
  return originalLoad.call(this, request, parent, isMain)
}
const history = require('../.test-dist/main/conversations.js')
Module._load = originalLoad

after(() => rmSync(userData, { recursive: true, force: true }))

test('conversation history saves, searches, renames and deletes locally', () => {
  const conversation = history.upsertConversation({
    id: 'conversation-0001',
    title: '  二次函数\n求极值  ',
    createdAt: '2026-07-11T08:00:00.000Z',
    messages: [
      { role: 'user', content: '求函数 f(x)=x²-4x+1 的最小值', inputType: 'text' },
      { role: 'assistant', content: '配方可得最小值为 -3。' }
    ]
  })

  assert.equal(conversation.title, '二次函数 求极值')
  assert.equal(history.listConversations().length, 1)
  assert.equal(history.listConversations('配方').length, 1)
  assert.equal(history.getConversation(conversation.id).messages.length, 2)

  const renamed = history.renameConversation(conversation.id, '抛物线复习')
  assert.equal(renamed.title, '抛物线复习')
  assert.equal(history.listConversations('抛物线')[0].id, conversation.id)

  const stored = JSON.parse(readFileSync(join(userData, 'conversations.json'), 'utf8'))
  assert.equal(stored.version, 1)
  assert.equal(stored.conversations.length, 1)

  assert.equal(history.deleteConversation(conversation.id), true)
  assert.equal(history.listConversations().length, 0)
})
