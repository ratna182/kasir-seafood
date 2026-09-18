import type { Prisma } from '@prisma/client'

type KasirSessionDb = Pick<Prisma.TransactionClient, 'kasirSesi'>

export function getTodayRange(now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return { today, tomorrow }
}

export async function getKasirSessionState(db: KasirSessionDb, warungId: string, kasirId: string, now = new Date()) {
  const { today, tomorrow } = getTodayRange(now)
  const latest = await db.kasirSesi.findFirst({
    where: { warungId, ditutupOleh: kasirId, tanggal: today },
    orderBy: { ditutupPada: 'desc' },
  })
  const isClosed = Boolean(latest && !latest.dibukaKembaliPada)
  const previous = isClosed && latest
    ? await db.kasirSesi.findFirst({
        where: { warungId, ditutupOleh: kasirId, tanggal: today, ditutupPada: { lt: latest.ditutupPada } },
        orderBy: { ditutupPada: 'desc' },
      })
    : null

  return {
    today,
    tomorrow,
    latest,
    isClosed,
    sessionStart: latest?.dibukaKembaliPada ?? previous?.dibukaKembaliPada ?? today,
    sessionEnd: isClosed ? latest!.ditutupPada : now,
  }
}
