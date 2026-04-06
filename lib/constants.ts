export const VERTICALS = [
  {
    id: 'energy',
    label: 'Energy',
    tag: 'Clean Energy & Power',
    color: '#f0a500',
    searchTerms: 'clean energy renewable power grid battery storage solar wind EV charging infrastructure',
  },
  {
    id: 'mobility',
    label: 'Mobility',
    tag: 'Transportation & Logistics',
    color: '#3b82f6',
    searchTerms: 'electric vehicles autonomous driving mobility logistics transportation fleet last-mile delivery',
  },
  {
    id: 'convenience',
    label: 'Convenience',
    tag: 'Retail & Commerce',
    color: '#10b981',
    searchTerms: 'retail convenience commerce quick commerce instant delivery grocery tech omnichannel consumer',
  },
] as const

export const REGIONS = [
  { id: 'na',    label: 'North America', flag: '🌎' },
  { id: 'eu',    label: 'Europe',        flag: '🌍' },
  { id: 'apac',  label: 'Asia-Pacific',  flag: '🌏' },
  { id: 'latam', label: 'Latin America', flag: '🌎' },
] as const

export type VerticalId = 'energy' | 'mobility' | 'convenience'
export type RegionId   = 'na' | 'eu' | 'apac' | 'latam'

export function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-')
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export function getLast12Months() {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { key, label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) }
  })
}
