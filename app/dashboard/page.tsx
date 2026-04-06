'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, TrendSummary, SignalTracker } from '@/lib/supabase'
import { VERTICALS, REGIONS, getLast12Months } from '@/lib/constants'

const MONTHS = getLast12Months()

export default function Dashboard() {
  const [monthKey,     setMonthKey]     = useState(MONTHS[0].key)
  const [activeGeo,    setActiveGeo]    = useState('all')
  const [summaries,    setSummaries]    = useState<TrendSummary[]>([])
  const [signals,      setSignals]      = useState<SignalTracker[]>([])
  const [lastRun,      setLastRun]      = useState<any>(null)
  const [loading,      setLoading]      = useState(true)
  const [sending,      setSending]      = useState(false)
  const [showModal,    setShowModal]    = useState(false)
  const [digestStatus, setDigestStatus] = useState('')
  const [toast,        setToast]        = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const loadData = useCallback(async () => {
    setLoading(true)
    const [s, sig, run] = await Promise.all([
      supabase.from('trend_summaries').select('*').eq('month_key', monthKey),
      supabase.from('signal_tracker').select('*').order('count', { ascending: false }),
      supabase.from('cron_runs').select('*').order('ran_at', { ascending: false }).limit(1),
    ])
    setSummaries(s.data || [])
    setSignals(sig.data || [])
    setLastRun(run.data?.[0] || null)
    setLoading(false)
  }, [monthKey])

  useEffect(() => { loadData() }, [loadData])

  function getSummary(verticalId: string, regionId: string) {
    return summaries.find(s => s.vertical === verticalId && s.region === regionId)
  }

  const visibleRegions = activeGeo === 'all' ? REGIONS : REGIONS.filter(r => r.id === activeGeo)
  const hasData = summaries.length > 0

  async function sendDigest() {
    setSending(true)
    setDigestStatus('Sending...')
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ monthKey }),
      })
      const data = await res.json()
      if (res.ok) {
        setDigestStatus(`✓ Sent to ${data.sent_to}`)
        showToast(`✓ Digest sent!`)
        setTimeout(() => setShowModal(false), 2000)
      } else {
        setDigestStatus(`⚠ ${data.error}`)
      }
    } catch (e: any) {
      setDigestStatus(`⚠ ${e.message}`)
    }
    setSending(false)
  }

  const selectedMonthLabel = MONTHS.find(m => m.key === monthKey)?.label || monthKey

  return (
    <div style={styles.root}>
      <style>{css}</style>

      {toast && <div style={styles.toast}>{toast}</div>}

      {showModal && (
        <div style={styles.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={styles.modal}>
            <div style={styles.modalTitle}>Send Weekly Digest</div>
            <div style={styles.modalSub}>Sends a formatted trend briefing via email to <strong>mlagos@windventures.vc</strong></div>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>Month</label>
              <select style={styles.select} value={monthKey} onChange={e => setMonthKey(e.target.value)}>
                {MONTHS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            {digestStatus && (
              <div style={{ ...styles.digestStatus, color: digestStatus.startsWith('✓') ? '#10b981' : '#ef4444' }}>
                {digestStatus}
              </div>
            )}
            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={sendDigest} disabled={sending}>
                {sending ? 'Sending...' : '✉ Send Digest'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={styles.header}>
        <div style={styles.logoArea}>
          <div style={styles.logoMark} />
          <div>
            <div style={styles.logoText}>Wind Ventures</div>
            <div style={styles.logoSub}>Trend Intelligence</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          {lastRun && (
            <div style={styles.lastRun}>
              Last updated: {new Date(lastRun.ran_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
              {' · '}{lastRun.cells_ok}/12 cells ·{' '}
