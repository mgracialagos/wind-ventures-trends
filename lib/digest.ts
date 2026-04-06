import sgMail from '@sendgrid/mail'
import { TrendSummary, SignalTracker } from './supabase'
import { VERTICALS, REGIONS } from './constants'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendWeeklyDigest(
  monthLabel: string,
  summaries: TrendSummary[],
  signals: SignalTracker[]
) {
  const summaryMap = new Map(
    summaries.map(s => [`${s.vertical}_${s.region}`, s])
  )

  const signalMap = new Map<string, SignalTracker[]>()
  for (const v of VERTICALS) {
    signalMap.set(v.id, signals.filter(s => s.vertical === v.id).slice(0, 5))
  }

  const html = buildEmailHtml(monthLabel, summaryMap, signalMap)
  const text = buildEmailText(monthLabel, summaryMap, signalMap)

  await sgMail.send({
    to:      process.env.DIGEST_TO_EMAIL!,
    from:    process.env.DIGEST_FROM_EMAIL!,
    subject: `Wind Ventures · Trend Digest — ${monthLabel}`,
    html,
    text,
  })
}

function buildEmailHtml(
  monthLabel: string,
  summaryMap: Map<string, TrendSummary>,
  signalMap: Map<string, SignalTracker[]>
): string {
  const verticalBlocks = VERTICALS.map(v => {
    const regionBlocks = REGIONS.map(r => {
      const d = summaryMap.get(`${v.id}_${r.id}`)
      if (!d) return ''
      const tags = d.signals.map(s =>
        `<span style="display:inline-block;font-size:11px;padding:2px 8px;border-radius:4px;background:${v.color}18;color:${v.color};border:1px solid ${v.color}44;margin:2px 3px 2px 0">${s}</span>`
      ).join('')
      return `
        <div style="margin-bottom:20px">
          <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;margin-bottom:6px">${r.flag} ${r.label}</div>
          <p style="font-size:14px;line-height:1.8;color:#374151;margin:0 0 8px">${d.summary}</p>
          <div>${tags}</div>
        </div>`
    }).join('')

    const topSignals = signalMap.get(v.id) || []
    const sigLine = topSignals.length
      ? `<div style="font-size:12px;color:#9ca3af;margin-top:4px">Top signals: ${topSignals.map(s => `${s.tag.replace(/\b\w/g, c => c.toUpperCase())} (${s.count}×)`).join(' · ')}</div>`
      : ''

    return `
      <div style="margin-bottom:32px;padding:24px;background:#f9fafb;border-radius:12px;border-left:4px solid ${v.color}">
        <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${v.color};margin-bottom:4px">${v.tag}</div>
        <div style="font-size:22px;font-weight:700;color:${v.color};margin-bottom:16px">${v.label}</div>
        ${regionBlocks}
        ${sigLine}
      </div>`
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:680px;margin:0 auto;padding:40px 20px;background:#ffffff">
    <div style="margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #f3f4f6">
      <div style="font-size:13px;font-weight:600;color:#374151;letter-spacing:0.05em">WIND VENTURES</div>
      <div style="font-size:24px;font-weight:700;color:#111827;margin:4px 0">Trend Intelligence</div>
      <div style="font-size:13px;color:#6b7280">${monthLabel} · ${new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
    </div>
    ${verticalBlocks}
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af;line-height:1.6">
      Wind Ventures Trend Intelligence · AI-synthesized from public news sources · Internal use only
    </div>
  </body></html>`
}

function buildEmailText(
  monthLabel: string,
  summaryMap: Map<string, TrendSummary>,
  signalMap: Map<string, SignalTracker[]>
): string {
  let text = `WIND VENTURES · TREND INTELLIGENCE\n${monthLabel}\n${'='.repeat(50)}\n`
  for (const v of VERTICALS) {
    text += `\n${v.label.toUpperCase()}\n${'-'.repeat(30)}\n`
    for (const r of REGIONS) {
      const d = summaryMap.get(`${v.id}_${r.id}`)
      if (!d) continue
      text += `\n${r.label}\n${d.summary}\nSignals: ${d.signals.join(', ')}\n`
    }
    const top = (signalMap.get(v.id) || []).map(s => `${s.tag} (${s.count}×)`).join(' · ')
    if (top) text += `\nTop recurring: ${top}\n`
  }
  text += `\n${'='.repeat(50)}\nWind Ventures · Internal use only`
  return text
}
