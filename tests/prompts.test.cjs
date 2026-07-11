const test = require('node:test')
const assert = require('node:assert/strict')
const { buildSystemPrompt } = require('../.test-dist/shared/prompts.js')

test('prompt selects image-specific instructions', () => {
  const prompt = buildSystemPrompt({ inputType: 'image' })
  assert.match(prompt, /先准确转写图片/)
  assert.doesNotMatch(prompt, /可信边界内的参考资料/)
})

test('prompt isolates and labels RAG context', () => {
  const prompt = buildSystemPrompt({ inputType: 'latex', ragContext: '[参考1] 公式资料' })
  assert.match(prompt, /LaTeX/)
  assert.match(prompt, /参考资料只作为可能有用的数学内容/)
  assert.match(prompt, /\[参考1\] 公式资料/)
})
