// This server route receives the session transcript,
// sends it to Groq for analysis, and returns structured feedback.
// It runs on the server so the Groq API key stays secret.

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { transcript, fillerCounts } = await req.json()

    // Filter out filler words with 0 count — only keep what was actually detected
    const cleanedFillers: Record<string, number> = {}
    for (const [word, count] of Object.entries(fillerCounts || {})) {
      if ((count as number) > 0) cleanedFillers[word] = count as number
    }
    const totalFillers = Object.values(cleanedFillers).reduce((a: number, b: number) => a + b, 0)

    // Build the prompt — filler counts come from our app, Groq only analyzes pacing and tips
    const prompt = `You are a professional communication coach analyzing a speaking session transcript.

Return ONLY valid JSON. No explanation, no preamble, no markdown fences.

Return this exact structure:
{
  "filler_count": {
    "total": ${totalFillers},
    "breakdown": ${JSON.stringify(cleanedFillers)}
  },
  "pacing_score": <number 1-10>,
  "pacing_note": "<one sentence about their pacing>",
  "top_3_improvements": ["<specific tip>", "<specific tip>", "<specific tip>"],
  "one_strength": "<one sentence about what they did well>"
}

IMPORTANT: Use the filler_count exactly as shown above — do not change it.
Only fill in pacing_score, pacing_note, top_3_improvements, and one_strength from the transcript.

Transcript:
${transcript || 'No transcript available — give general encouragement and generic tips.'}`

    // Call the Groq API
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()

    console.log('Groq raw response:', text)

    if (!clean) {
      return NextResponse.json({
        filler_count: { total: totalFillers, breakdown: cleanedFillers },
        pacing_score: 7,
        pacing_note: 'Not enough transcript data to score pacing.',
        top_3_improvements: [
          'Try to speak for longer so we can analyze your pacing.',
          'Make sure your microphone is working and picking up your voice.',
          'Practice a full 2-3 minute session for better feedback.',
        ],
        one_strength: 'You showed up and practiced — that is the first step.',
      })
    }

    const parsed = JSON.parse(clean)
    return NextResponse.json(parsed)

  } catch (err: any) {
    console.error('Feedback route error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate feedback' }, { status: 500 })
  }
}