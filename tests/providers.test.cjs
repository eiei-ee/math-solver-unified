const test = require('node:test')
const assert = require('node:assert/strict')
const { getProvider } = require('../.test-dist/shared/providers.js')

const options = { temperature: 0.4, maxTokens: 4096 }

test('OpenAI-compatible body carries generation options', () => {
  const provider = getProvider('deepseek')
  const body = JSON.parse(provider.buildBody('deepseek-chat', [{ role: 'user', content: '题目' }], '系统提示', options))
  assert.equal(body.temperature, 0.4)
  assert.equal(body.max_tokens, 4096)
  assert.equal(body.messages[0].role, 'system')
})

test('Gemini and Claude preserve image data in their native message formats', () => {
  const message = [{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
      { type: 'text', text: '解题' }
    ]
  }]
  const gemini = JSON.parse(getProvider('gemini').buildBody('gemini-2.5-flash', message, '系统', options))
  assert.equal(getProvider('gemini').headers('secret')['x-goog-api-key'], 'secret')
  assert.equal(gemini.contents[0].parts[0].inlineData.mimeType, 'image/png')
  const claude = JSON.parse(getProvider('claude').buildBody('claude-sonnet-4-6', message, '系统', options))
  assert.equal(claude.messages[0].content[0].source.data, 'AAAA')
})
