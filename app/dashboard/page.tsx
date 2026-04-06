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
              <span style={{ color: lastRun.status === 'success' ? '#10b981' : '#f59e0b' }}>{lastRun.status}</span>
            </div>
          )}
          <button className="digest-btn" onClick={() => { setShowModal(true); setDigestStatus('') }}>
            ✉ Send Digest
          </button>
        </div>
      </header>

      <div style={styles.controls}>
        <span style={styles.ctrlLabel}>Region</span>
        {[{ id: 'all', label: 'All', flag: '' }, ...REGIONS].map(r => (
          <button
            key={r.id}
            className={`pill ${activeGeo === r.id ? 'pill-active' : ''}`}
            onClick={() => setActiveGeo(r.id)}
          >
            {r.flag} {r.label}
          </button>
        ))}
        <div style={styles.divider} />
        <span style={styles.ctrlLabel}>Month</span>
        <select style={styles.monthSelect} value={monthKey} onChange={e => setMonthKey(e.target.value)}>
          {MONTHS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <button className="refresh-btn" onClick={loadData}>↻ Refresh</button>
      </div>

      {!loading && !hasData && (
        <div style={styles.emptyBanner}>
          <div style={styles.emptyTitle}>No data yet for {selectedMonthLabel}</div>
          <div style={styles.emptySub}>
            Trigger the first fetch by calling the cron endpoint with your secret key.
          </div>
        </div>
      )}

      <div style={styles.bodyLayout}>
        <div style={{ ...styles.grid, gridTemplateColumns: `repeat(${VERTICALS.length}, 1fr)` }}>
          {VERTICALS.map((v, vi) => (
            <div key={v.id} style={{ ...styles.col, borderRight: vi < VERTICALS.length - 1 ? '1px solid #0f1724' : 'none' }}>
              <div style={styles.colHeader}>
                <div style={{ ...styles.colTag, color: v.color }}>{v.tag}</div>
                <div style={{ ...styles.colTitle, color: v.color }}>{v.label}</div>
                <div style={{ ...styles.colBar, background: v.color }} />
              </div>
              {visibleRegions.map(r => {
                const d = getSummary(v.id, r.id)
                return (
                  <div key={r.id} className="cell" style={styles.cell}>
                    <div style={styles.regionLabel}>{r.flag} {r.label}</div>
                    {loading && <LoadingSkeleton />}
                    {!loading && !d && <div style={styles.empty}>—</div>}
                    {!loading && d && (
                      <div>
                        <p style={styles.summary}>{d.summary}</p>
                        <div style={styles.tags}>
                          {d.signals.map(s => (
                            <span key={s} style={{ ...styles.tag, borderColor: v.color + '44', color: v.color, background: v.color + '10' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                        {d.sources.length > 0 && (
                          <div style={styles.sources}>Sources: {d.sources.join(', ')}</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div style={styles.signalPanel}>
          <div style={styles.signalHeader}>
            <div style={styles.signalTitle}>Signal Tracker</div>
            <div style={styles.signalSub}>Recurring themes across months</div>
          </div>
          {signals.length === 0 && !loading && (
            <div style={styles.signalEmpty}>No signals yet.<br />Runs automatically<br />on Monday mornings.</div>
          )}
          {VERTICALS.map(v => {
            const vSignals = signals.filter(s => s.vertical === v.id).slice(0, 8)
            if (!vSignals.length) return null
            const max = vSignals[0].count
            return (
              <div key={v.id} style={styles.signalGroup}>
                <div style={{ ...styles.signalGroupLabel, color: v.color }}>{v.label}</div>
                {vSignals.map(s => (
                  <div key={s.tag} style={styles.signalRow}>
                    <span style={styles.signalName}>{s.tag.replace(/\b\w/g, c => c.toUpperCase())}</span>
                    <div style={styles.barWrap}>
                      <div style={{ ...styles.barFill, width: `${Math.round((s.count / max) * 100)}%`, background: v.color }} />
                    </div>
                    <span style={styles.signalCount}>{s.count}×</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <footer style={styles.footer}>
        <span style={styles.footerLabel}>Status</span>
        <span style={styles.footerText}>
          {loading ? 'Loading...' : hasData
            ? `${summaries.length} summaries loaded · ${selectedMonthLabel} · Auto-refreshes every Monday 8am UTC`
            : `No data for ${selectedMonthLabel} — trigger the cron to fetch`}
        </span>
      </footer>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div>
      {[92, 78, 85, 60].map((w, i) => (
        <div key={i} className="skeleton" style={{ width: `${w}%`, height: 11, marginTop: i > 0 ? 7 : 0 }} />
      ))}
    </div>
  )
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080b10; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
  @keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none} }
  .skeleton {
    border-radius: 4px;
    background: linear-gradient(90deg,#161b27 25%,#1e2535 50%,#161b27 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }
  .cell:hover { background: rgba(255,255,255,0.015) !important; }
  .pill {
    padding: 5px 13px; border-radius: 100px;
    border: 1px solid #1e293b; background: #0f172a;
    color: #475569; font-size: 12px; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s; white-space: nowrap;
  }
  .pill:hover { border-color: #334155; color: #94a3b8; }
  .pill-active { border-color: #a78bfa !important; color: #a78bfa !important; background: rgba(167,139,250,0.08) !important; }
  .digest-btn {
    padding: 6px 14px; border-radius: 100px;
    border: 1px solid rgba(167,139,250,0.3); background: rgba(167,139,250,0.08);
    color: #a78bfa; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer;
  }
  .refresh-btn {
    margin-left: auto; padding: 6px 16px; border-radius: 100px;
    border: 1px solid #1e293b; background: #0f172a;
    color: #e2e8f0; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer;
  }
`

const styles: Record<string, React.CSSProperties> = {
  root:        { fontFamily: "'DM Sans', sans-serif", background: '#080b10', color: '#e2e8f0', minHeight: '100vh' },
  toast:       { position: 'fixed', bottom: 24, right: 24, zIndex: 999, padding: '11px 18px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 13, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'fadeUp 0.3s ease' },
  overlay:     { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:       { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 32, width: 460, maxWidth: '92vw' },
  modalTitle:  { fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 6 },
  modalSub:    { fontSize: 13, color: '#475569', marginBottom: 24, lineHeight: 1.6 },
  field:       { marginBottom: 16 },
  fieldLabel:  { display: 'block', fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 },
  select:      { width: '100%', padding: '9px 14px', borderRadius: 8, border: '1px solid #1e293b', background: '#080b10', color: '#e2e8f0', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none' },
  digestStatus:{ fontFamily: "'DM Mono', monospace", fontSize: 12, marginTop: 12 },
  modalActions:{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 },
  btnSecondary:{ padding: '8px 18px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13 },
  btnPrimary:  { padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(167,139,250,0.4)', background: 'rgba(167,139,250,0.12)', color: '#a78bfa', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13 },
  header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '1px solid #0d1420', background: 'rgba(8,11,16,0.97)', position: 'sticky', top: 0, zIndex: 50 },
  logoArea:    { display: 'flex', alignItems: 'center', gap: 12 },
  logoMark:    { width: 28, height: 28, background: 'linear-gradient(135deg,#f0a500,#3b82f6)', clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)', flexShrink: 0 },
  logoText:    { fontFamily: "'DM Serif Display', serif", fontSize: 15 },
  logoSub:     { fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#334155', letterSpacing: '0.15em', textTransform: 'uppercase' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  lastRun:     { fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#334155' },
  controls:    { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderBottom: '1px solid #0d1420', flexWrap: 'wrap', background: '#080b10' },
  ctrlLabel:   { fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#334155', letterSpacing: '0.12em', textTransform: 'uppercase' },
  divider:     { width: 1, height: 16, background: '#1e293b', margin: '0 2px' },
  monthSelect: { padding: '5px 12px', borderRadius: 100, border: '1px solid #1e293b', background: '#0f172a', color: '#e2e8f0', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none', cursor: 'pointer' },
  emptyBanner: { margin: '40px 28px', padding: '32px', borderRadius: 12, border: '1px dashed #1e293b', textAlign: 'center' },
  emptyTitle:  { fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 12 },
  emptySub:    { fontSize: 13, color: '#475569', lineHeight: 1.7 },
  bodyLayout:  { display: 'flex', minHeight: 'calc(100vh - 160px)' },
  grid:        { flex: 1, display: 'grid', borderRight: '1px solid #0d1420', overflowX: 'auto' },
  col:         {},
  colHeader:   { padding: '20px 22px 16px', borderBottom: '1px solid #0d1420', position: 'sticky', top: 62, background: 'rgba(8,11,16,0.97)', zIndex: 4 },
  colTag:      { fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 },
  colTitle:    { fontFamily: "'DM Serif Display', serif", fontSize: 24, lineHeight: 1.1 },
  colBar:      { height: 2, width: 28, borderRadius: 2, marginTop: 10 },
  cell:        { padding: '18px 22px', borderBottom: '1px solid #0d1420', transition: 'background 0.2s', minHeight: 100 },
  regionLabel: { fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#334155', marginBottom: 10 },
  empty:       { fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#1e293b' },
  summary:     { fontSize: 12, lineHeight: 1.85, color: '#94a3b8', fontWeight: 300 },
  tags:        { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 11 },
  tag:         { fontFamily: "'DM Mono', monospace", fontSize: 9, padding: '3px 8px', borderRadius: 4, border: '1px solid', letterSpacing: '0.04em' },
  sources:     { marginTop: 8, fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#334155' },
  signalPanel: { width: 248, flexShrink: 0, background: '#0a0e18', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  signalHeader:{ padding: '18px 18px 12px', borderBottom: '1px solid #0d1420', position: 'sticky', top: 62, background: '#0a0e18', zIndex: 4 },
  signalTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 15, marginBottom: 2 },
  signalSub:   { fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#334155', letterSpacing: '0.12em', textTransform: 'uppercase' },
  signalEmpty: { padding: 20, fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#1e293b', lineHeight: 2 },
  signalGroup: { padding: '12px 18px', borderBottom: '1px solid #0d1420' },
  signalGroupLabel: { fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 },
  signalRow:   { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 },
  signalName:  { flex: 1, fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  barWrap:     { width: 52, height: 3, background: '#1e293b', borderRadius: 2, overflow: 'hidden', flexShrink: 0 },
  barFill:     { height: '100%', borderRadius: 2, transition: 'width 0.5s ease' },
  signalCount: { fontFamily: 'monospace', fontSize: 10, color: '#475569', minWidth: 22, textAlign: 'right' },
  footer:      { padding: '10px 28px', borderTop: '1px solid #0d1420', background: '#0a0e18', display: 'flex', alignItems: 'center', gap: 12 },
  footerLabel: { fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#1e293b', letterSpacing: '0.14em', textTransform: 'uppercase', flexShrink: 0 },
  footerText:  { fontSize: 11, color: '#334155', fontStyle: 'italic' },
}
