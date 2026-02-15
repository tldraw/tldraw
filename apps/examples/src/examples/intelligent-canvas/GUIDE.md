# Intelligent canvas

A dual-mode AI canvas built on tldraw:

- Assistant mode: users speak or type; Gemini reasons and calls tools.
- Composition mode: users type idea primitives, rank candidate pairs, and generate composed nodes.

## Architecture at a glance

```
User input (voice / text edit)
        |
        v
IntelligentCanvasAgent          <-- orchestrator
   |          |
   |   buildSystemPrompt()      <-- includes canvas snapshot
   |          |
   v          v
  Gemini (tool-calling loop)    <-- up to 10 iterations
   |
   |-- web_search / wikipedia_search
   |-- analyze_canvas_area
   |-- create_frame / move_shape / remove_shape
   |-- respond  <------------------ terminates the loop
   |
   v
executeResponse()
   |          |
   v          v
ElevenLabs   Canvas items placed
TTS audio    synced to word timings
```

## File map

```
intelligent-canvas/
  IntelligentCanvasExample.tsx     Entry point, React component, context provider
  intelligent-canvas.css           Pulse animation for recording indicator
  composition/
    CompositionPanel.tsx           Text-first composition UI and workflow
    graph.ts                       Idea node metadata helpers and canvas CRUD
    scoring.ts                     Pair ranking (compatibility x diversity x depth penalty)
    llm.ts                         LLM-powered composition generation
    types.ts                       Composition domain types
  agent/
    IntelligentCanvasAgent.ts      Core orchestrator loop + TTS playback
    systemPrompt.ts                System prompt builder (static rules + canvas snapshot)
    tools.ts                       Tool definitions + executors (7 tools)
    api.ts                         Gemini & ElevenLabs API clients, WebSocket streaming
  lib/
    canvas-helpers.ts              Spatial queries, shape-to-context, image base64
    constants.ts                   Config values (margins, voice ID, model ID)
  ui/
    AgentStatusIndicator.tsx       Status bar with character-reveal animation
    MicrophoneButton.tsx           M-key voice capture via Web Speech API
  vite-plugin-gemini-proxy.ts      Dev server middleware that proxies API calls
```

## How it works

### 1. Input

Two input paths, both leading to `runAgentPipeline()`:

**Text editing** -- Type on the canvas (create a text or note shape), press Enter. The agent detects text-edit-end via `editor.sideEffects.registerAfterChangeHandler('instance_page_state', ...)`, reads the text content, deletes the trigger shape, and fires the pipeline.

**Voice** -- Hold `M` to record. `MicrophoneButton` uses `webkitSpeechRecognition` (continuous=false, interimResults=false). On key-up the transcript is passed to `handleVoiceCommand()`, which uses the viewport center as the spatial anchor.

Both paths gather **nearby shapes** (within 400px margin) for context.

### 2. Building the Gemini request

`runAgentPipeline()` builds the request:

1. **System prompt** (`buildSystemPrompt`): static behavioral rules + a live canvas snapshot listing every shape's ID, type, position, size, and text. Includes a suggested next position to avoid overlap.

2. **User message parts**: the input text + nearby shape descriptions + base64 inline images from any nearby image shapes (enables Gemini vision).

3. **Tools**: the 7 function declarations from `AGENT_TOOLS`.

### 3. The orchestrator loop

A multi-turn loop runs for up to `MAX_AGENT_ITERATIONS` (10):

```
for each iteration:
  response = callGemini(systemPrompt, contents, tools)
  extract functionCall parts
  execute each tool → get result
  append model turn + function responses to contents
  if 'respond' tool was called → break
```

This lets Gemini chain actions: search Wikipedia, analyze canvas shapes, reorganize with move/remove, then deliver the final response. The loop terminates when `respond` is called (or after 10 iterations).

### 4. Tools

| Tool                  | What it does                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `web_search`          | Delegates to `wikipedia_search`                                                          |
| `wikipedia_search`    | Fetches Wikipedia REST summary + thumbnail URL                                           |
| `analyze_canvas_area` | Returns JSON of all shapes in a bounding box                                             |
| `create_frame`        | Creates a frame shape for grouping                                                       |
| `move_shape`          | Repositions a shape by ID                                                                |
| `remove_shape`        | Deletes a shape by ID                                                                    |
| `respond`             | **Terminal tool.** Returns speech text + optional canvas items. Signals the loop to end. |

The `respond` tool's payload:

```ts
{
  speech: string            // spoken aloud via TTS
  canvas?: CanvasItem[]     // visual items placed on canvas
}

// where each CanvasItem is:
{
  type: 'text' | 'image_search'
  content: string           // text to display, or Wikipedia query for images
  label: string             // word in speech -- item appears when this word is spoken
}
```

### 5. Response execution (speech + canvas sync)

`executeResponse()` streams speech and places canvas items synchronized to word timings.

**Three-tier TTS fallback:**

1. **ElevenLabs WebSocket** (primary) -- Opens a WebSocket to ElevenLabs, receives PCM audio chunks + character-level alignment in real-time. Converts character timings to word timings. As each chunk arrives, checks if any canvas item's `label` matches a spoken word -- if so, places it immediately. After streaming completes, concatenates all PCM chunks, converts 16-bit signed LE mono @ 22050Hz to Float32, plays via `AudioContext`.

2. **ElevenLabs REST with timestamps** (fallback) -- Single request returning MP3 audio + alignment data. Schedules canvas item placement at the correct time offsets during playback.

3. **Browser SpeechSynthesis** (final fallback) -- Places all items immediately, speaks via `window.speechSynthesis`.

**Post-placement layout:**
After all items are placed, `relayoutPlacedShapes()` stacks them vertically with 30px gaps, then `editor.zoomToFit()` animates the viewport to show everything.

### 6. Spatial awareness

Every request includes context about the canvas:

- **System prompt snapshot**: all shapes with IDs, types, positions, and text content
- **Nearby shapes**: shapes within 400px of the trigger, formatted for the user message
- **Image vision**: nearby image shapes are extracted as base64 and sent as Gemini `inlineData`
- **Suggested position**: computed by finding the bottom of all existing shapes + 60px gap

This lets the agent reason about what's already on the canvas ("what is this image?", "add details next to the diagram").

## Dev proxy (vite-plugin-gemini-proxy)

A Vite plugin adds middleware endpoints so API keys stay server-side:

| Endpoint                                   | Purpose                                              |
| ------------------------------------------ | ---------------------------------------------------- |
| `GET /api/gemini/status`                   | Returns `{ available: true/false }`                  |
| `POST /api/gemini`                         | Proxies to Gemini `generateContent`, appends API key |
| `GET /api/elevenlabs/status`               | Returns availability                                 |
| `POST /api/elevenlabs/tts`                 | Proxies streaming TTS                                |
| `POST /api/elevenlabs/tts-with-timestamps` | Proxies TTS with alignment data                      |

Keys are loaded from `apps/examples/.env.local`:

```
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...
```

## Setup

1. Create `apps/examples/.env.local` with your API keys
2. `yarn dev` from repo root (starts at localhost:5420)
3. Navigate to the intelligent canvas example
4. Type on the canvas and press Enter, or hold M to speak

## Key design decisions

**Orchestrator pattern** -- Rather than a single prompt-response, Gemini runs a multi-turn loop with tools. This allows research-then-respond workflows (search Wikipedia, then synthesize a spoken answer with images).

**Label-based sync** -- Each canvas item has a `label` matching a word in the speech. Items appear at the moment that word is spoken, creating a presentation-like reveal effect.

**Spatial context window** -- Instead of sending the entire canvas, the agent receives shapes near the input point. This keeps the context focused and avoids token waste on distant, irrelevant shapes.

**Graceful degradation** -- Three TTS tiers ensure the agent always responds, even without ElevenLabs. Browser `SpeechSynthesis` is the last resort.

**Shape deletion on input** -- When you type a prompt as a text shape, it's deleted before the agent runs. The canvas shows only the agent's output, keeping things clean.
