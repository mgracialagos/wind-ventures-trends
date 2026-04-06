import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendWeeklyDigest } from '@/lib/digest'
import { getMonthLabel } from '@/lib/constants'

export async function POST(req: NextRequest) {
  const { monthKey } = await req.json()
  if (!monthKey) return NextResponse.json({ error: 'monthKey required' }, { status: 400 })

  const monthLabel = getMonthLabel(monthKey)

  const { data: summaries, error: e1 } = await supabase
    .from('trend_summaries').select('*').eq('month_key', monthKey)

  const { data: signals, error: e2 } = await supabase
    .from('signal_tracker').select('*').order('count', { ascending: false })

  if (e1 || e2) return NextResponse.json({ error: e1?.message || e2?.message }, { status: 500 })
  if (!summaries?.length) return NextResponse.json({ error: 'No data for this month' }, { status: 404 })

  await sendWeeklyDigest(monthLabel, summaries, signals || [])
  return NextResponse.json({ ok: true, month: monthLabel, sent_to: process.env.DIGEST_TO_EMAIL })
}
