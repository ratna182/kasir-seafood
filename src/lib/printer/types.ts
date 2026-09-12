export interface PrinterConfig {
  deviceId: string
  deviceName: string
  width: '58mm' | '80mm'
}

export type PrinterStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unsupported'

export const CHAR_WIDTHS = { '80mm': 48, '58mm': 32 } as const

// Legacy UUIDs kept for reference
export const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb'
export const WRITE_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb'
