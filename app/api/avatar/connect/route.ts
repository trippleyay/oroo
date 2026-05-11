// This is a server-side API route — it runs on the server, never in the browser.
// It creates a Runway avatar session and returns the credentials to the frontend.
// The secret API key lives here so it is never exposed to users.

import Runway from '@runwayml/sdk'
import { NextRequest, NextResponse } from 'next/server'

// Create a Runway client using the secret API key from our .env.local file
const client = new Runway({
  apiKey: process.env.RUNWAYML_API_SECRET,
})

export async function POST(req: NextRequest) {
  try {
    // Read the avatarId and optional overrides sent from the frontend
    const { avatarId, personality, startScript } = await req.json()

    // Create a new realtime session with Runway
    // We pass the character ID and any dynamic personality overrides
    const { id: sessionId } = await client.realtimeSessions.create({
      model: 'gwm1_avatars',
      avatar: {
        type: 'custom',   // 'custom' means we're using our own character, not a preset
        avatarId,
      },
      // Only include overrides if they were provided
      ...(personality  && { personality }),
      ...(startScript  && { startScript }),
    })

    // Poll Runway every second until the session is ready (max 30 seconds)
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
      const session = await client.realtimeSessions.retrieve(sessionId)

      if (session.status === 'READY') {
        // Session is ready — return the credentials to the frontend
        return NextResponse.json({
          sessionId,
          sessionKey: session.sessionKey,
        })
      }

      // Wait 1 second before checking again
      await new Promise((resolve) => setTimeout(resolve, 1_000))
    }

    // If we get here, the session never became ready in time
    return NextResponse.json(
      { error: 'Session creation timed out' },
      { status: 504 }
    )

  } catch (err: any) {
    console.error('Session creation error:', err)
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}