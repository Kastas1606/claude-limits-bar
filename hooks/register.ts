import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

const NAMES: Record<string, string> = { five_hour: '5ч', seven_day: 'неделя', spend_limit: 'бюджет' }

function bar(p: number): string {
  const n = Math.max(0, Math.min(10, Math.round(p / 10)))
  return '▓'.repeat(n) + '░'.repeat(10 - n)
}

function left(iso: string | undefined, now: number): string {
  if (!iso) return ''
  const s = Math.max(0, Math.floor((Date.parse(iso) - now) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h >= 24 ? ` ↻${Math.floor(h / 24)}д${h % 24}ч` : ` ↻${h}ч${m}м`
}

function mark(p: number): string {
  return p >= 80 ? '🔴' : p >= 50 ? '🟡' : '🟢'
}

export function line(limits: SessionRateLimit[], ctx: number | undefined, now: number): string {
  const parts: string[] = []
  for (const r of limits) {
    const name = NAMES[r.kind] ?? r.kind
    parts.push(`${mark(r.percentUsed)} ${name} ${bar(r.percentUsed)} ${Math.round(r.percentUsed)}%${left(r.resetsAt, now)}`)
  }
  if (ctx !== undefined) parts.push(`контекст ${Math.round(ctx)}%`)
  return parts.length ? parts.join('  │  ') : 'Лимиты появятся после первого ответа'
}

async function refresh($: EngineInterface): Promise<void> {
  const u = await $.session.usage()
  const now = await $.clock.now()
  const ctx = u.context.percent
  $.ui.status(line(u.rateLimits, ctx, now))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await refresh($)
    return r
  })

  on('session.measure', async ($, e, next) => {
    const r = await next(e)
    await refresh($)
    return r
  })
}
