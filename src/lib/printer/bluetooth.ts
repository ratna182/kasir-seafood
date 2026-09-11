import type { PrinterConfig, PrinterStatus } from './types'
import { SPP_UUID } from './types'
import { loadPrinterConfig, savePrinterConfig, clearPrinterConfig } from './storage'

type StatusListener = (status: PrinterStatus) => void

class BluetoothPrinter {
  private device: any = null
  private characteristic: any = null
  private listeners: Set<StatusListener> = new Set()
  private currentStatus: PrinterStatus = 'idle'

  get status(): PrinterStatus {
    return this.currentStatus
  }

  private setStatus(status: PrinterStatus) {
    this.currentStatus = status
    this.listeners.forEach((fn) => fn(status))
  }

  onStatusChange(fn: StatusListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).bluetooth
  }

  async connect(savedConfig?: PrinterConfig): Promise<boolean> {
    if (!this.isSupported()) {
      this.setStatus('unsupported')
      return false
    }

    try {
      this.setStatus('connecting')

      let device: any

      if (savedConfig?.deviceId) {
        try {
          device = await (navigator as any).bluetooth.requestDevice({
            filters: [{ deviceId: savedConfig.deviceId }],
            optionalServices: [SPP_UUID],
          })
        } catch {
          device = await (navigator as any).bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [SPP_UUID],
          })
        }
      } else {
        device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [SPP_UUID],
        })
      }

      device.addEventListener('gattserverdisconnected', () => {
        this.device = null
        this.characteristic = null
        this.setStatus('idle')
      })

      const server = await device.gatt.connect()
      let service: any

      try {
        service = await server.getPrimaryService(SPP_UUID)
      } catch {
        const services = await server.getPrimaryServices()
        service = services[0]
      }

      let characteristic: any
      try {
        characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb')
      } catch {
        const chars = await service.getCharacteristics()
        characteristic = chars.find((c: any) => c.properties.write) || chars[0]
      }

      this.device = device
      this.characteristic = characteristic

      const config: PrinterConfig = {
        deviceId: device.id,
        deviceName: device.name || 'Printer Bluetooth',
        width: savedConfig?.width || '80mm',
      }
      savePrinterConfig(config)

      this.setStatus('connected')
      return true
    } catch {
      this.setStatus('idle')
      return false
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.device?.gatt?.connected) {
        this.device.gatt.disconnect()
      }
    } catch {}
    this.device = null
    this.characteristic = null
    this.setStatus('idle')
    clearPrinterConfig()
  }

  async write(data: Uint8Array): Promise<boolean> {
    if (!this.characteristic) return false

    try {
      const CHUNK_SIZE = 512
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE)
        await this.characteristic.writeValueWithResponse(chunk)
      }
      return true
    } catch {
      return false
    }
  }

  async autoReconnect(): Promise<boolean> {
    const saved = loadPrinterConfig()
    if (!saved) return false
    return this.connect(saved)
  }
}

export const printer = new BluetoothPrinter()
