import { describe, expect, it } from 'vitest'
import { createZip, crc32 } from './zip'

describe('crc32', () => {
  it('matches the known CRC-32 of "123456789"', () => {
    const bytes = new TextEncoder().encode('123456789')
    expect(crc32(bytes)).toBe(0xcbf43926)
  })

  it('returns 0 for empty input', () => {
    expect(crc32(new Uint8Array())).toBe(0)
  })
})

describe('createZip', () => {
  it('produces a Blob with the zip content type', () => {
    const zip = createZip([{ name: 'a.txt', data: new TextEncoder().encode('hello') }])
    expect(zip).toBeInstanceOf(Blob)
    expect(zip.type).toBe('application/zip')
  })

  it('writes a valid end-of-central-directory signature and entry count', async () => {
    const zip = createZip([
      { name: 'one.txt', data: new TextEncoder().encode('one') },
      { name: 'two.txt', data: new TextEncoder().encode('two') },
    ])
    const view = new DataView(await zip.arrayBuffer())
    const length = view.byteLength

    // End-of-central-directory record signature 0x06054b50 is the last 22 bytes.
    expect(view.getUint32(length - 22, true)).toBe(0x06054b50)
    expect(view.getUint16(length - 22 + 8, true)).toBe(2)
    expect(view.getUint16(length - 22 + 10, true)).toBe(2)
  })

  it('starts the archive with a local file header signature', async () => {
    const zip = createZip([{ name: 'a.txt', data: new TextEncoder().encode('x') }])
    const view = new DataView(await zip.arrayBuffer())
    expect(view.getUint32(0, true)).toBe(0x04034b50)
  })
})
