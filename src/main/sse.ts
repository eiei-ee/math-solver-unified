export class SseDataParser {
  private buffer = ''

  push(text: string): string[] {
    this.buffer += text
    return this.drain(false)
  }

  finish(): string[] {
    return this.drain(true)
  }

  private drain(flush: boolean): string[] {
    const payloads: string[] = []
    const separator = /\r?\n\r?\n/
    while (true) {
      const match = separator.exec(this.buffer)
      if (!match) break
      const block = this.buffer.slice(0, match.index)
      this.buffer = this.buffer.slice(match.index + match[0].length)
      const payload = this.parseBlock(block)
      if (payload !== null) payloads.push(payload)
    }
    if (flush && this.buffer.trim()) {
      const payload = this.parseBlock(this.buffer)
      if (payload !== null) payloads.push(payload)
      this.buffer = ''
    }
    return payloads
  }

  private parseBlock(block: string): string | null {
    const data = block
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart())
    return data.length > 0 ? data.join('\n') : null
  }
}
