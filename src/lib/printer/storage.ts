import type { PrinterConfig } from './types'

const STORAGE_KEY = 'kasir_printer_config'

export function savePrinterConfig(config: PrinterConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {}
}

export function loadPrinterConfig(): PrinterConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PrinterConfig
  } catch {
    return null
  }
}

export function clearPrinterConfig(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
