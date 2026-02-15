---
title: Intelligent canvas
component: ./IntelligentCanvasExample.tsx
category: use-cases
priority: 2
keywords: [ai, gemini, agent, canvas, multimodal]
---

An AI-powered infinite canvas with two modes:

- Assistant mode: interact with a Gemini-backed agent using text and voice.
- Composition mode: text-first idea composition on canvas using ranked pair suggestions.

In composition mode, add primitive idea nodes, review top candidate pairs, and generate
composed idea nodes with one click. Accept/reject proposed nodes to steer the frontier.

Set `ELEVENLABS_API_KEY` in `apps/examples/.env.local` for high-quality ElevenLabs TTS.
Falls back to browser speech synthesis if not configured.
