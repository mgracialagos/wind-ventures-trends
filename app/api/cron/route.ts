import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { generateTrendSummary } from '@/lib/summarize'
import { sendWeeklyDigest } from '@/lib/digest'
import { VERTICALS, REGIONS, getCurrentMonthKey, getMonthLabel } from '@/lib/constants'

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServiceClient()
  const monthKey   = getCurrentMonthKey()
  const monthLabel = getMonthLabel(monthKey)
  const startTime  = Date.now()

  let cellsOk  = 0
  let cellsErr = 0
  const errors: string[] = []

  console.log(`[cron] Starting run for ${monthLabel}`)

  for (const vertical of VERTICALS) {
    for (const region of REGIONS) {
      try {
        console.log(`[cron] Fetching ${vertical.label} / ${region.label}`)

        const result = await generateTrendSummary(
          vertical.label,
          vertical.searchTerms,
          region.label,
          monthLabel
        )

        const { error: upsertErr } = await db
          .from('trend_summaries')
          .upsert({
            vertical:    vertical.id,
            region:      region.id,
            month_key:   monthKey,
            month_label: monthLabel,
            summary:     result.summary,
            signals:     result.signals,
            sources:     result.sources,
            updated_at:  new Date().toISOString(),
          }, { onConflict: 'vertical,region,month_key' })

        if (upsertErr) throw upsertErr

        for (const tag of result.signals) {
          const tagKey = tag.trim().toLowerCase()
          const { data: existing } = await db
            .from('signal_tracker')
            .select('id, count')
            .eq('vertical', vertical.id)
            .eq('tag', tagKey)
            .single()

          if (existing) {
            await db
              .from('signal_tracker')
              .update({ count: existing.count + 1, last_seen: monthKey, updated_at: new Date().toISOString() })
              .eq('id', existing.id)
          } else {
            await db
              .from('signal_tracker')
              .insert({ vertical: vertical.id, tag: tagKey, count: 1, first_seen: monthKey, last_seen: monthKey })
          }
        }

        cellsOk++
        await new Promise(r => setTimeout(r, 8000))

      } catch (err: any) {
        cellsErr++
        const msg = `${vertical.id}/${region.id}: ${err.message || String(err)}`
        errors.push(msg)
        console.error(`[cron] Error — ${msg}`)
      }
    }
  }

  const duration = Date.now() - startTime

  await db.from('cron_runs').insert({
    month_key:   monthKey,
    status:      cellsErr === 0 ? 'success' : cellsOk > 0 ? 'partial' : 'error',
    cells_ok:    cellsOk,
    cells_err:   cellsErr,
    duration_ms: duration,
    error:       errors.length ? errors.join('\n') : null,
  })

  if (cellsOk > 0) {
    try {
      const { data: summaries } = await db
        .from('trend_summaries')
        .select('*')
        .eq('month_key', monthKey)

      const { data: signals } = await db
        .from('signal_tracker')
        .select('*')
        .order('count', { ascending: false })

      await sendWeeklyDigest(monthLabel, summaries || [], signals || [])
      console.log(`[cron] Digest sent for ${monthLabel}`)
    } catch (err: any) {
      console.error('[cron] Digest send failed:', err.message)
    }
  }

  return NextResponse.json({
    month: monthLabel,
    cells_ok: cellsOk,
    cells_err: cellsErr,
    duration_ms: duration,
    errors,
  })
}
