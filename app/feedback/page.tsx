'use client'

// This is the post-session feedback screen.
// It reads the transcript and filler data saved during the session,
// sends the transcript to Groq for AI analysis,
// and displays the results as four clean cards.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// What the Groq API will return — matches our prompt structure exactly
interface FeedbackData {
  filler_count: {
    total: number
    breakdown: Record<string, number>
  }
  pacing_score: number
  pacing_note: string
  top_3_improvements: string[]
  one_strength: string
}

export default function FeedbackPage() {
  const router = useRouter()
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // Word game score (only used if mode was wordgame)
  const [wordGameRound, setWordGameRound] = useState(0)
  const [mode, setMode] = useState('')

  useEffect(() => {
    // Read everything saved by the session page
    const transcript   = sessionStorage.getItem('transcript') || ''
    const fillerRaw    = sessionStorage.getItem('fillerCounts') || '{}'
    const round        = sessionStorage.getItem('wordGameRound') || '0'
    const sessionMode  = sessionStorage.getItem('mode') || ''

    setWordGameRound(parseInt(round))
    setMode(sessionMode)

    // Send transcript to our Groq API route for analysis
    async function getFeedback() {
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, fillerCounts: JSON.parse(fillerRaw) }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setFeedback(data)
      } catch (err: any) {
        setError(err.message || 'Could not load feedback')
      } finally {
        setLoading(false)
      }
    }

    getFeedback()
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0A0F0A 0%, #020602 100%)',
      color: '#F1F5F1',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        .card {
          background: #111A11;
          border: 1px solid rgba(6,234,14,0.12);
          border-radius: 20px;
          padding: 28px;
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(6,234,14,0.2), transparent);
        }
        .card-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #8A9E8A;
          margin-bottom: 16px;
        }
        .strength-card {
          background: #0a1f0a;
          border-color: rgba(6,234,14,0.3);
        }
        .again-btn {
          background: linear-gradient(135deg, #08ff11, #04c40b);
          color: #031203;
          border: none;
          padding: 16px 48px;
          border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 24px rgba(6,234,14,0.3);
        }
        .again-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 32px rgba(6,234,14,0.5);
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 40px', borderBottom:'1px solid rgba(6,234,14,0.08)' }}>
        <img src="/oroo_fulllogo.svg" alt="Oroo" style={{ height:'28px' }} />
        <span style={{ fontSize:'12px', color:'#8A9E8A', letterSpacing:'0.08em' }}>SESSION COMPLETE</span>
      </header>

      <div style={{ maxWidth:'720px', margin:'0 auto', padding:'48px 32px 80px' }}>

        {/* Page title */}
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(28px,4vw,40px)', fontWeight:800, marginBottom:'8px' }}>
          Your Feedback
        </h1>
        <p style={{ color:'#8A9E8A', marginBottom:'40px', fontSize:'15px' }}>
          Here is what your coach observed during the session.
        </p>

        {/* Word game score — shown only in word game mode */}
        {mode === 'wordgame' && (
          <div className="card" style={{ marginBottom:'16px', textAlign:'center' }}>
            <p className="card-label">Word Game Score</p>
            <p style={{ fontFamily:"'Syne',sans-serif", fontSize:'64px', fontWeight:800, color:'#06EA0E', lineHeight:1 }}>
              {wordGameRound}
            </p>
            <p style={{ color:'#8A9E8A', marginTop:'8px' }}>rounds survived</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'20px', padding:'60px 0' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', border:'2px solid #06EA0E', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }} />
            <p style={{ color:'#8A9E8A' }}>Analyzing your session...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="card" style={{ borderColor:'rgba(255,77,77,0.3)', marginBottom:'16px' }}>
            <p style={{ color:'#FF4D4D', fontWeight:600 }}>Could not load AI feedback</p>
            <p style={{ color:'#8A9E8A', marginTop:'8px', fontSize:'14px' }}>{error}</p>
          </div>
        )}

        {/* Feedback cards */}
        {feedback && !loading && (
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

            {/* Card 1 — Filler Count */}
            <div className="card">
              <p className="card-label">Filler Words</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:'12px', marginBottom:'16px' }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:'48px', fontWeight:800, color: feedback.filler_count.total > 10 ? '#FF4D4D' : '#06EA0E', lineHeight:1 }}>
                  {feedback.filler_count.total}
                </span>
                <span style={{ color:'#8A9E8A', fontSize:'14px' }}>total detected</span>
              </div>
              {/* Breakdown pills */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                {Object.entries(feedback.filler_count.breakdown)
                  .sort(([,a],[,b]) => b - a)
                  .slice(0, 8)
                  .map(([word, count]) => (
                    <span key={word} style={{
                      padding:'4px 12px', borderRadius:'99px',
                      background:'rgba(6,234,14,0.08)',
                      border:'1px solid rgba(6,234,14,0.15)',
                      fontSize:'12px', color:'#8A9E8A',
                    }}>
                      "{word}" × {count}
                    </span>
                  ))}
              </div>
            </div>

            {/* Card 2 — Pacing Score */}
            <div className="card">
              <p className="card-label">Pacing Score</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:'8px', marginBottom:'12px' }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:'48px', fontWeight:800, color:'#06EA0E', lineHeight:1 }}>
                  {feedback.pacing_score}
                </span>
                <span style={{ color:'#8A9E8A', fontSize:'18px' }}>/10</span>
              </div>
              <p style={{ color:'#8A9E8A', fontSize:'14px', lineHeight:1.6 }}>{feedback.pacing_note}</p>
            </div>

            {/* Card 3 — Top 3 Improvements */}
            <div className="card">
              <p className="card-label">Top 3 Improvements</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                {feedback.top_3_improvements.map((tip, i) => (
                  <div key={i} style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
                    <span style={{
                      width:24, height:24, borderRadius:'50%', flexShrink:0,
                      background:'rgba(6,234,14,0.1)', border:'1px solid rgba(6,234,14,0.2)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'11px', fontWeight:700, color:'#06EA0E',
                    }}>{i + 1}</span>
                    <p style={{ color:'#F1F5F1', fontSize:'14px', lineHeight:1.6, marginTop:'2px' }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 4 — One Strength */}
            <div className="card strength-card">
              <p className="card-label" style={{ color:'#06EA0E' }}>One Strength</p>
              <p style={{ fontSize:'16px', lineHeight:1.65, color:'#F1F5F1' }}>{feedback.one_strength}</p>
            </div>

          </div>
        )}

        {/* Copy and Practice Again buttons */}
        {!loading && feedback && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', marginTop:'40px' }}>
            
            {/* Copy feedback button — copies a clean summary to clipboard */}
            <button
              onClick={() => {
                const summary = `OROO SESSION FEEDBACK
Filler words: ${feedback.filler_count.total} total — ${Object.entries(feedback.filler_count.breakdown).map(([w,c]) => `"${w}" x${c}`).join(', ')}
Pacing: ${feedback.pacing_score}/10 — ${feedback.pacing_note}
Improvements: ${feedback.top_3_improvements.join(' | ')}
Strength: ${feedback.one_strength}`
                navigator.clipboard.writeText(summary)
                  .then(() => alert('Feedback copied! Paste it on the home screen next time.'))
                  .catch(() => alert('Could not copy — please select and copy manually.'))
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(6,234,14,0.3)',
                color: '#8A9E8A',
                padding: '12px 32px',
                borderRadius: '14px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(6,234,14,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(6,234,14,0.3)')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',marginRight:'6px',verticalAlign:'middle'}}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy Feedback Summary
            </button>

            <button className="again-btn" onClick={() => router.push('/')}>
              Practice Again →
            </button>

          </div>
        )}

        {/* Show Practice Again even if feedback failed to load */}
        {!loading && !feedback && (
          <div style={{ textAlign:'center', marginTop:'40px' }}>
            <button className="again-btn" onClick={() => router.push('/')}>
              Practice Again →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}