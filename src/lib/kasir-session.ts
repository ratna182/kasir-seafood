import type { Prisma } from '@prisma/client'

type KasirSessionDb = Pick<Prisma.TransactionClient, 'kasirSesi'>

export function getTodayRange(now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return { today, tomorrow }
}

export async function getKasirSessionState(db: KasirSessionDb, warungId: string, now = new Date()) {
  const { today, tomorrow } = getTodayRange(now)
  const latest = await db.kasirSesi.findFirst({
    where: { warungId, tanggal: today },
    orderBy: { ditutupPada: 'desc' },
  })

  return {
    today,
    tomorrow,
    latest,
    isClosed: Boolean(latest && !latest.dibukaKembaliPada),
    sessionStart: latest?.dibukaKembaliPada ?? today,
  }
}
