'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ── Animated speaking orb — the "wow" element ──────────────────────────────
// This is the ambient AI presence at the top of the page.
// It pulses like a voice waveform to immediately signal "this is voice AI".
function SpeakingOrb() {
  return (
    <div className="orb-container" aria-hidden="true">
      {/* Outer ambient glow rings — they breathe slowly */}
      <div className="orb-ring orb-ring-3" />
      <div className="orb-ring orb-ring-2" />
      <div className="orb-ring orb-ring-1" />
      {/* Inner core — the brightest point */}
      <div className="orb-core">
        {/* Waveform bars inside the orb */}
        {[...Array(7)].map((_, i) => (
          <div key={i} className="orb-bar" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
    </div>
  )
}

// ── Mode card data ─────────────────────────────────────────────────────────
const MODES = [
  {
    id: 'interview',
    icon: (
      // Briefcase outline — clean monochrome SVG
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="12" />
        <path d="M2 12h20" />
      </svg>
    ),
    label: 'Interview Mode',
    desc: 'Real questions. Live follow-ups. Structured feedback.',
  },
  {
    id: 'practice',
    icon: (
      // Mic outline
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="8" y1="22" x2="16" y2="22" />
      </svg>
    ),
    label: 'Speaking Practice',
    desc: 'Free conversation to build fluency and confidence.',
  },
  {
    id: 'wordgame',
    icon: (
      // Link chain outline
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    label: 'Word Game',
    desc: 'Last word first word. How many rounds can you survive?',
  },
]

const INDUSTRIES = ['tech', 'finance', 'marketing']

// ── Main page component ────────────────────────────────────────────────────
export default function HomePage() {
  const [selectedMode, setSelectedMode]           = useState<string | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState('aria')
  const [selectedIndustry, setSelectedIndustry]   = useState('tech')
  const [previousFeedback, setPreviousFeedback]   = useState('')
  const [mounted, setMounted]                     = useState(false) // controls fade-in on load
  const router = useRouter()

  // Trigger entrance animation after first render
  useEffect(() => { setMounted(true) }, [])

  function handleStart() {
    if (!selectedMode) return
    sessionStorage.setItem('mode', selectedMode)
    sessionStorage.setItem('character', selectedCharacter)
    sessionStorage.setItem('industry', selectedIndustry)
    sessionStorage.setItem('previousFeedback', previousFeedback)
    router.push('/session')
  }

  return (
    <>
      {/* ── Global styles injected as a style tag ── */}
      <style>{`
        /* Import a distinctive font — Syne for headings, DM Sans for body */
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg-start:    #0A0F0A;
          --bg-end:      #020602;
          --accent:      #06EA0E;
          --accent-dim:  #04A80A;
          --text-primary:#F1F5F1;
          --text-subtle: #8A9E8A;
          --surface:     #111A11;
          --surface-2:   #162016;
          --border:      rgba(6,234,14,0.12);
          --border-hover:rgba(6,234,14,0.35);
          --border-active:rgba(6,234,14,1);
          --error:       #FF4D4D;
        }

        body {
          background: linear-gradient(160deg, var(--bg-start) 0%, var(--bg-end) 100%);
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          color: var(--text-primary);
          overflow-x: hidden;
        }

        /* ── Page entrance fade ── */
        .page-wrap {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .page-wrap.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── Ambient radial glow behind the hero ── */
        .hero-glow {
          position: absolute;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 500px;
          background: radial-gradient(ellipse at center, rgba(6,234,14,0.07) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Speaking Orb ── */
        .orb-container {
          position: relative;
          width: 110px;
          height: 110px;
          margin: 0 auto 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .orb-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(6,234,14,0.15);
        }
        .orb-ring-1 { width: 80px;  height: 80px;  animation: pulse 2.4s ease-in-out infinite; }
        .orb-ring-2 { width: 100px; height: 100px; animation: pulse 2.4s ease-in-out infinite 0.4s; border-color: rgba(6,234,14,0.09); }
        .orb-ring-3 { width: 120px; height: 120px; animation: pulse 2.4s ease-in-out infinite 0.8s; border-color: rgba(6,234,14,0.05); }

        @keyframes pulse {
          0%, 100% { transform: scale(1);    opacity: 1; }
          50%       { transform: scale(1.06); opacity: 0.6; }
        }

        .orb-core {
          position: relative;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 35%, #1aff22, #04A80A 60%, #021802);
          box-shadow: 0 0 24px rgba(6,234,14,0.5), 0 0 60px rgba(6,234,14,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2.5px;
        }

        /* Waveform bars inside the orb */
        .orb-bar {
          width: 2.5px;
          border-radius: 99px;
          background: rgba(255,255,255,0.9);
          animation: wave 1.1s ease-in-out infinite;
          height: 10px;
        }
        @keyframes wave {
          0%, 100% { height: 6px;  opacity: 0.5; }
          50%       { height: 22px; opacity: 1;   }
        }

        /* ── Cards ── */
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s, background 0.2s;
          position: relative;
          overflow: hidden;
        }
        /* Subtle top-edge highlight on every card */
        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(6,234,14,0.2), transparent);
        }
        .card:hover {
          border-color: var(--border-hover);
          box-shadow: 0 4px 24px rgba(6,234,14,0.08), 0 1px 4px rgba(0,0,0,0.4);
          transform: translateY(-2px);
          background: var(--surface-2);
        }
        .card.selected {
          border-color: var(--border-active);
          box-shadow: 0 0 0 1px rgba(6,234,14,0.3), 0 4px 32px rgba(6,234,14,0.15);
          background: #0f1e0f;
        }
        /* Green inner glow on selected card */
        .card.selected::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: radial-gradient(ellipse at 20% 20%, rgba(6,234,14,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .card-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(6,234,14,0.08);
          border: 1px solid rgba(6,234,14,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          margin-bottom: 14px;
        }
        .card.selected .card-icon {
          background: rgba(6,234,14,0.15);
          border-color: rgba(6,234,14,0.4);
        }

        /* ── Section labels ── */
        .section-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-subtle);
          margin-bottom: 14px;
        }

        /* ── Industry pills ── */
        .pill {
          padding: 9px 22px;
          border-radius: 99px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-subtle);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pill:hover {
          border-color: var(--border-hover);
          color: var(--text-primary);
        }
        .pill.selected {
          border-color: var(--accent);
          background: rgba(6,234,14,0.1);
          color: var(--accent);
          box-shadow: 0 0 12px rgba(6,234,14,0.15);
        }

        /* ── Textarea ── */
        .feedback-area {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          resize: none;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          line-height: 1.6;
        }
        .feedback-area::placeholder { color: #4a614a; }
        .feedback-area:focus {
          border-color: rgba(6,234,14,0.3);
          box-shadow: 0 0 0 3px rgba(6,234,14,0.06);
        }

        /* ── CTA button ── */
        .cta-btn {
          width: 100%;
          padding: 17px;
          border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          border: none;
          transition: all 0.25s;
          position: relative;
          overflow: hidden;
        }
        .cta-btn.active {
          background: linear-gradient(135deg, #08ff11 0%, #04c40b 100%);
          color: #031203;
          box-shadow: 0 0 0 1px rgba(6,234,14,0.5), 0 4px 24px rgba(6,234,14,0.35), 0 1px 4px rgba(0,0,0,0.3);
        }
        .cta-btn.active:hover {
          box-shadow: 0 0 0 1px rgba(6,234,14,0.7), 0 6px 36px rgba(6,234,14,0.5), 0 1px 4px rgba(0,0,0,0.3);
          transform: translateY(-1px);
        }
        .cta-btn.active::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: shimmer 2.5s infinite;
        }
        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left: 200%; }
        }
        .cta-btn.inactive {
          background: var(--surface);
          color: #3a4e3a;
          border: 1px solid var(--border);
          cursor: not-allowed;
        }

        /* ── Divider ── */
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(6,234,14,0.1), transparent);
          margin: 8px 0 28px;
        }
      `}</style>

      <div className={`page-wrap${mounted ? ' visible' : ''}`}>

        {/* ── HEADER ── */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px 0' }}>
          <img src="/oroo_fulllogo.svg" alt="Oroo" style={{ height: '36px' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', letterSpacing: '0.08em' }}>
            RUNWAY API HACKATHON 2026
          </span>
        </header>

        {/* ── HERO ── */}
        <section style={{ textAlign: 'center', padding: '52px 40px 44px', position: 'relative' }}>
          {/* Ambient glow behind hero */}
          <div className="hero-glow" />

          {/* Speaking orb — the wow element */}
          <SpeakingOrb />

          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 'clamp(36px, 5vw, 54px)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: '16px',
            position: 'relative',
            zIndex: 1,
          }}>
            Practice speaking.<br />
            <span style={{ color: 'var(--accent)' }}>Get better. Fast.</span>
          </h1>

          <p style={{
            color: 'var(--text-subtle)',
            fontSize: '16px',
            fontWeight: 400,
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: 1.65,
            position: 'relative',
            zIndex: 1,
          }}>
            An AI coach that watches you, listens to you, catches your filler words,
            and gives you real feedback powered by a live avatar.
          </p>
        </section>

        {/* ── CONTENT AREA ── */}
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 32px 80px' }}>

          {/* ── CHOOSE YOUR COACH ── */}
          <div style={{ marginBottom: '32px' }}>
            <p className="section-label">Choose your coach</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

              {/* Aria */}
              <button
                className={`card${selectedCharacter === 'aria' ? ' selected' : ''}`}
                onClick={() => setSelectedCharacter('aria')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0f2e10, #1a4a1b)',
                    border: '1px solid rgba(6,234,14,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', flexShrink: 0,
                  }}>A</div>
                  <div>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px' }}>Aria</p>
                    <p style={{ color: 'var(--text-subtle)', fontSize: '12px', marginTop: '2px' }}>Warm · Professional · Encouraging</p>
                  </div>
                </div>
              </button>

              {/* Marcus */}
              <button
                className={`card${selectedCharacter === 'marcus' ? ' selected' : ''}`}
                onClick={() => setSelectedCharacter('marcus')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0f2e10, #1a4a1b)',
                    border: '1px solid rgba(6,234,14,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', flexShrink: 0,
                  }}>M</div>
                  <div>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px' }}>Marcus</p>
                    <p style={{ color: 'var(--text-subtle)', fontSize: '12px', marginTop: '2px' }}>Sharp · Direct · Motivating</p>
                  </div>
                </div>
              </button>

            </div>
          </div>

          <div className="divider" />

          {/* ── CHOOSE YOUR MODE ── */}
          <div style={{ marginBottom: '32px' }}>
            <p className="section-label">Choose your mode</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  className={`card${selectedMode === mode.id ? ' selected' : ''}`}
                  onClick={() => setSelectedMode(mode.id)}>
                  <div className="card-icon">{mode.icon}</div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
                    {mode.label}
                  </p>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '12px', lineHeight: 1.55 }}>
                    {mode.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* ── INDUSTRY SELECTOR (interview only) ── */}
          {selectedMode === 'interview' && (
            <div style={{ marginBottom: '32px' }}>
              <p className="section-label">Your industry</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    className={`pill${selectedIndustry === ind ? ' selected' : ''}`}
                    onClick={() => setSelectedIndustry(ind)}>
                    {ind.charAt(0).toUpperCase() + ind.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="divider" />

          {/* ── PREVIOUS FEEDBACK ── */}
          <div style={{ marginBottom: '28px' }}>
            <p className="section-label">Previous feedback <span style={{ color: '#2e3e2e', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span></p>
            <textarea
              className="feedback-area"
              rows={3}
              value={previousFeedback}
              onChange={(e) => setPreviousFeedback(e.target.value)}
              placeholder="Paste your last session feedback here. Your coach will reference what you worked on before."
            />
          </div>

          {/* ── CTA BUTTON ── */}
          <button
            className={`cta-btn${selectedMode ? ' active' : ' inactive'}`}
            onClick={handleStart}
            disabled={!selectedMode}>
            {selectedMode
              ? `Start Session with ${selectedCharacter === 'aria' ? 'Aria' : 'Marcus'} →`
              : 'Select a mode to begin'}
          </button>

        </div>
      </div>
    </>
  )
}
