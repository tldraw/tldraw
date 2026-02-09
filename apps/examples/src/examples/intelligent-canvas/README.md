---
title: Intelligent canvas
component: ./IntelligentCanvasExample.tsx
category: use-cases
priority: 2
keywords: [ai, gemini, agent, canvas, multimodal]
---

An AI-powered infinite canvas where you interact with a Gemini-backed agent through text and voice.
Double-click to type a prompt, or hold M to speak. The agent can respond with text, images,
web lookups, and speech synthesis. It can also analyze images on the canvas.

Set `ELEVENLABS_API_KEY` in `apps/examples/.env.local` for high-quality ElevenLabs TTS.
Falls back to browser speech synthesis if not configured.
