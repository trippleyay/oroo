'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AvatarCall,
  AvatarVideo,
  useAvatarSession,
  useLocalMedia,
} from '@runwayml/avatars-react'

const FILLER_WORDS = [
  'um','uh','like','you know','basically','literally',
  'sort of','kind of','right','i mean','actually',
  'honestly','so','well','just','okay','yeah',
]

function countFillers(text: string): Record<string, number> {
  const lower = text.toLowerCase()
  const counts: Record<string, number> = {}
  for (const word of FILLER_WORDS) {
    const matches = lower.match(new RegExp(`\\b${word}\\b`, 'g'))
    if (matches) counts[word] = (counts[word] || 0) + matches.length
  }
  return counts
}

const SESSION_DURATION = 5 * 60

function buildPersonality(mode: string, industry: string, previousFeedback: string) {
  let modeInstruction = ''

  if (mode === 'interview') {
    modeInstruction = `The user has selected INTERVIEW MODE for a ${industry.toUpperCase()} interview. Start immediately by asking their name and the role they are interviewing for. Use the ${industry} question bank from your knowledge base.`
  } else if (mode === 'practice') {
    modeInstruction = `The user has selected SPEAKING PRACTICE MODE. Start with a warm greeting and jump into friendly conversation. Keep responses to 2-3 sentences and ask open ended questions.`
  } else if (mode === 'wordgame') {
    modeInstruction = `The user has selected the LAST WORD FIRST WORD GAME. Briefly explain the rules: they say a sentence, you respond starting with their last word, then they must start their next sentence with YOUR last word. Start the game immediately with an enthusiastic opening sentence.`
  }

  // If previous feedback exists, inject it as the FIRST thing to address
  // The character must acknowledge it before doing anything else
  const memoryBlock = previousFeedback
    ? `

CRITICAL INSTRUCTION — DO THIS FIRST BEFORE ANYTHING ELSE:
The user has shared feedback from their last session. You MUST open the conversation by acknowledging it warmly and specifically. Reference at least one concrete detail from it. Then transition naturally into the selected mode.

Here is their previous feedback:
${previousFeedback}

Example opening: "Welcome back! I can see from your last session that you worked on reducing filler words like 'like' — let's keep that momentum going. Now, ${mode === 'interview' ? "tell me your name and the role you're preparing for." : mode === 'wordgame' ? "let's jump into the word game!" : "what would you like to talk about today?"}"
`
    : ''

  return modeInstruction + memoryBlock
}

function SessionHUD({ mode, character }: { mode: string; character: string }) {
  const router = useRouter()
  const { state, end } = useAvatarSession()
  const { isMicEnabled, toggleMic } = useLocalMedia()
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [fillerCounts, setFillerCounts] = useState<Record<string, number>>({})
  const fullTranscriptRef = useRef('')
  const fillerCountsRef = useRef<Record<string, number>>({}) // ADD THIS LINE
  const [currentWord, setCurrentWord] = useState('')
  const [wordGameRound, setWordGameRound] = useState(0)
  const [wordGameFails, setWordGameFails] = useState(0)
  const deepgramRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (state !== 'active') return
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { handleEndSession(); return 0 }
        return prev - 1
      })
    }, 1000)
    startDeepgram()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [state])

  async function startDeepgram() {
    try {
      console.log('Starting Deepgram...')
      
      // Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      
      console.log('Mic access granted, connecting to Deepgram...')

      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY
      
      if (!apiKey) {
        console.error('No Deepgram API key found!')
        return
      }

      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?language=en&punctuate=true&interim_results=true`,
        ['token', apiKey]
      )

      deepgramRef.current = ws

      ws.onopen = () => {
        console.log('Deepgram WebSocket connected!')
        document.title = 'Deepgram: connected'
        
        // Check if browser supports audio/webm, fall back to audio/ogg
        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg'
          
        console.log('Using mimeType:', mimeType)
        
        const recorder = new MediaRecorder(stream, { mimeType })
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data)
          }
        }
        recorder.start(250)
      }

      ws.onclose = (e) => {
        console.log('Deepgram WebSocket closed:', e.code, e.reason)
        // Use refs here — state is stale inside closures
        sessionStorage.setItem('transcript', fullTranscriptRef.current)
        sessionStorage.setItem('fillerCounts', JSON.stringify(fillerCountsRef.current))
        console.log('Saved transcript length:', fullTranscriptRef.current.length)
        console.log('Saved fillers:', fillerCountsRef.current)
      }

      ws.onerror = (e) => {
        console.error('Deepgram WebSocket error:', e)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const text: string = data?.channel?.alternatives?.[0]?.transcript || ''
        const isFinal: boolean = data?.is_final

        if (text) {
          console.log('Transcript chunk:', text, '| final:', isFinal)
          document.title = `Heard: ${text.slice(0, 40)}`
        }

        if (text && isFinal) {
          fullTranscriptRef.current += ' ' + text
          
          const newFillers = countFillers(text)
          setFillerCounts((prev) => {
            const updated = { ...prev }
            for (const [word, count] of Object.entries(newFillers)) {
              updated[word] = (updated[word] || 0) + count
            }
            fillerCountsRef.current = updated // Keep ref in sync
            return updated
          })

          if (mode === 'wordgame') {
            const words = text.trim().split(/\s+/)
            const firstWord = words[0]?.toLowerCase().replace(/[^a-z]/g, '')
            const lastWord = words[words.length - 1]?.toLowerCase().replace(/[^a-z]/g, '')
            if (currentWord && firstWord !== currentWord) {
              setWordGameFails((prev) => prev + 1)
            } else if (currentWord) {
              setWordGameRound((prev) => prev + 1)
            }
            if (lastWord) setCurrentWord(lastWord)
          }
        }
      }

    } catch (err) {
      console.error('Deepgram startDeepgram error:', err)
    }
  }

  function handleEndSession() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (deepgramRef.current) deepgramRef.current.close()
    
    // Save using refs — always up to date unlike state
    sessionStorage.setItem('transcript', fullTranscriptRef.current)
    sessionStorage.setItem('fillerCounts', JSON.stringify(fillerCountsRef.current))
    sessionStorage.setItem('wordGameRound', String(wordGameRound))
    
    setTimeout(() => {
      end()
      router.push('/feedback')
    }, 500)
  }

  function formatTime(s: number) {
    return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
  }

  const totalFillers = Object.values(fillerCounts).reduce((a: number, b: number) => a + b, 0)
  const isTimeLow = timeLeft <= 30

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0A0F0A 0%,#020602 100%)', color:'#F1F5F1', fontFamily:"'DM Sans',sans-serif", display:'flex', flexDirection:'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes waveAnim { 0%,100% { height:6px; opacity:0.4; } 50% { height:20px; opacity:1; } }
        @keyframes timerPulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .wave-bar { width:3px; border-radius:99px; background:#06EA0E; animation:waveAnim 0.8s ease-in-out infinite; }
        .timer-low { animation:timerPulse 1s ease-in-out infinite; }
        .end-btn { background:transparent; border:1px solid rgba(255,77,77,0.4); color:#FF4D4D; padding:12px 32px; border-radius:99px; font-family:'DM Sans',sans-serif; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s; }
        .end-btn:hover { background:rgba(255,77,77,0.08); border-color:#FF4D4D; }
        .mute-btn { background:#111A11; border:1px solid rgba(6,234,14,0.2); color:#8A9E8A; padding:10px 22px; border-radius:99px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; cursor:pointer; transition:all 0.2s; }
        .mute-btn:hover { border-color:rgba(6,234,14,0.5); color:#F1F5F1; }
      `}</style>

      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 32px', borderBottom:'1px solid rgba(6,234,14,0.08)' }}>
        <img src="/oroo_fulllogo.svg" alt="Oroo" style={{ height:'28px' }} />
        <div className={isTimeLow ? 'timer-low' : ''} style={{ fontFamily:"'Syne',sans-serif", fontSize:'22px', fontWeight:700, color:isTimeLow ? '#FF4D4D' : '#06EA0E', letterSpacing:'0.06em' }}>
          {formatTime(timeLeft)}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:state==='active' ? '#06EA0E' : '#8A9E8A', boxShadow:state==='active' ? '0 0 8px #06EA0E' : 'none' }} />
          <span style={{ fontSize:'12px', color:'#8A9E8A' }}>{state === 'active' ? 'Live' : state}</span>
        </div>
      </header>

      <main style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 24px' }}>
        <div style={{ width:'100%', maxWidth:'560px', aspectRatio:'1408/768', borderRadius:'24px', overflow:'hidden', border:'1px solid rgba(6,234,14,0.15)', boxShadow:'0 0 60px rgba(6,234,14,0.08)', background:'#0a120a', position:'relative' }}>
          <AvatarVideo style={{ width:'100%', height:'100%', objectFit:'contain' }} />
          {state !== 'active' && (
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(10,15,10,0.85)', gap:'16px' }}>
              <div style={{ width:44, height:44, borderRadius:'50%', border:'2px solid #06EA0E', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }} />
              <p style={{ color:'#8A9E8A', fontSize:'14px' }}>Connecting to {character}...</p>
            </div>
          )}
        </div>

        <p style={{ fontFamily:"'Syne',sans-serif", fontSize:'15px', fontWeight:700, marginTop:'14px', marginBottom:'20px', textTransform:'capitalize' }}>{character}</p>

        <div style={{ width:'100%', maxWidth:'400px', background:'#111A11', border:'1px solid rgba(6,234,14,0.12)', borderRadius:'16px', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
          {mode === 'wordgame' ? (
            <div>
              <p style={{ fontSize:'10px', color:'#8A9E8A', textTransform:'uppercase', letterSpacing:'0.12em' }}>{wordGameFails >= 3 ? 'Game Over' : 'Start with'}</p>
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:'24px', fontWeight:800, color:wordGameFails >= 3 ? '#FF4D4D' : '#06EA0E', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:'2px' }}>
                {wordGameFails >= 3 ? `${wordGameRound} rounds` : (currentWord || '...')}
              </p>
              <p style={{ fontSize:'11px', color:'#8A9E8A', marginTop:'4px' }}>Round {wordGameRound} · {wordGameFails}/3 fails</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize:'10px', color:'#8A9E8A', textTransform:'uppercase', letterSpacing:'0.12em' }}>Filler words</p>
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:'32px', fontWeight:800, color:totalFillers > 10 ? '#FF4D4D' : '#06EA0E', marginTop:'2px' }}>{totalFillers}</p>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:'3px' }}>
            {[...Array(5)].map((_,i) => <div key={i} className="wave-bar" style={{ animationDelay:`${i*0.15}s` }} />)}
          </div>
        </div>

        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <button className="mute-btn" onClick={toggleMic}>{isMicEnabled ? '🔇 Mute' : '🎙️ Unmute'}</button>
          <button className="end-btn" onClick={handleEndSession}>End Session</button>
        </div>
      </main>
    </div>
  )
}

export default function SessionPage() {
  const mode      = typeof window !== 'undefined' ? sessionStorage.getItem('mode') || 'practice'  : 'practice'
  const character = typeof window !== 'undefined' ? sessionStorage.getItem('character') || 'aria' : 'aria'
  const industry  = typeof window !== 'undefined' ? sessionStorage.getItem('industry') || 'tech'  : 'tech'
  const prevFeedback = typeof window !== 'undefined' ? sessionStorage.getItem('previousFeedback') || '' : ''
  const avatarId  = character === 'aria'
    ? process.env.NEXT_PUBLIC_ARIA_CHARACTER_ID!
    : process.env.NEXT_PUBLIC_MARCUS_CHARACTER_ID!
  const personality = buildPersonality(mode, industry, prevFeedback)
  const router = useRouter()

  return (
    <AvatarCall
      avatarId={avatarId}
      connect={async (id) => {
        const res = await fetch('/api/avatar/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarId: id, personality }),
        })
        return res.json()
      }}
      onEnd={() => router.push('/feedback')}
      onError={(err) => console.error('Avatar error:', err)}
    >
      <SessionHUD mode={mode} character={character} />
    </AvatarCall>
  )
}
