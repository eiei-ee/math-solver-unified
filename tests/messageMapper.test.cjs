const test = require('node:test')
const assert = require('node:assert/strict')
const { toProviderMessages } = require('../.test-dist/main/messageMapper.js')

test('images stay attached only to their owning user turn', () => {
  const mapped = toProviderMessages([
    { role: 'user', content: '第一题' },
    { role: 'assistant', content: '第一题答案' },
    { role: 'user', content: '第二题', imageDataUrl: 'data:image/png;base64,AAAA' }
  ])
  assert.equal(mapped[0].content, '第一题')
  assert.equal(mapped[1].content, '第一题答案')
  assert.equal(Array.isArray(mapped[2].content), true)
  assert.equal(mapped[2].content[0].image_url.url, 'data:image/png;base64,AAAA')
})

test('historical images are downgraded for text-only models', () => {
  const mapped = toProviderMessages([
    { role: 'user', content: '图片题', imageDataUrl: 'data:image/png;base64,AAAA' },
    { role: 'assistant', content: '图片题答案' },
    { role: 'user', content: '再解释结论' }
  ], { includeImages: false })
  assert.equal(mapped[0].content, '图片题\n[历史图片未随本次请求发送]')
  assert.equal(mapped[2].content, '再解释结论')
})
