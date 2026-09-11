function bytes(...arr: number[]): Uint8Array {
  return new Uint8Array(arr)
}

function textEncoder(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function initPrinter(): Uint8Array {
  return bytes(0x1B, 0x40)
}

export function feedAndCut(lines: number = 3): Uint8Array {
  const feed = new Uint8Array(lines)
  feed.fill(0x0A)
  const cut = bytes(0x1D, 0x56, 0x00)
  const result = new Uint8Array(feed.length + cut.length)
  result.set(feed)
  result.set(cut, feed.length)
  return result
}

export function setText(text: string): Uint8Array {
  return textEncoder(text)
}

export function setAlign(mode: 'left' | 'center' | 'right'): Uint8Array {
  const code = mode === 'center' ? 0x01 : mode === 'right' ? 0x02 : 0x00
  return bytes(0x1B, 0x61, code)
}

export function setBold(on: boolean): Uint8Array {
  return bytes(0x1B, 0x45, on ? 0x01 : 0x00)
}

export function setFontSize(width: 1 | 2, height: 1 | 2 = 1): Uint8Array {
  const n = ((width - 1) << 4) | (height - 1)
  return bytes(0x1D, 0x21, n)
}

export function setLineSpacing(spacing: number): Uint8Array {
  return bytes(0x1B, 0x33, spacing)
}

export function compose(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

export function padRight(text: string, totalWidth: number): string {
  if (text.length >= totalWidth) return text.slice(0, totalWidth)
  return text + ' '.repeat(totalWidth - text.length)
}

export function drawLine(width: number): string {
  return '-'.repeat(width)
}

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}
