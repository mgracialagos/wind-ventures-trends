import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const monthKey = searchParams.get('month')
  const vertical = searchParams.get('vertical')
  const region   = searchParams.get('region')

  let query = supabase.from('trend_summaries').select('*')
  if (monthKey) query = query.eq('month_key', monthKey)
  if (vertical) query = query.eq('vertical', vertical)
  if (region)   query = query.eq('region', region)

  const { data, error } = await query.order('vertical').order('region')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
