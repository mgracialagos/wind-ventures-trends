import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface TrendSummary {
  id: string
  vertical: string
  region: string
  month_key: string
  month_label: string
  summary: string
  signals: string[]
  sources: string[]
  created_at: string
  updated_at: string
}

export interface SignalTracker {
  id: string
  vertical: string
  tag: string
  count: number
  first_seen: string
  last_seen: string
}
