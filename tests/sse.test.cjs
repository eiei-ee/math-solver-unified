const test = require('node:test')
const assert = require('node:assert/strict')
const { SseDataParser } = require('../.test-dist/main/sse.js')

test('SSE parser handles fragmented CRLF events and tail data', () => {
  const parser = new SseDataParser()
  assert.deepEqual(parser.push('data: {"a":'), [])
  assert.deepEqual(parser.push('1}\r\n\r\ndata: [DONE]'), ['{"a":1}'])
  assert.deepEqual(parser.finish(), ['[DONE]'])
})

test('SSE parser joins multiple data lines', () => {
  const parser = new SseDataParser()
  assert.deepEqual(parser.push('data: first\ndata: second\n\n'), ['first\nsecond'])
})
