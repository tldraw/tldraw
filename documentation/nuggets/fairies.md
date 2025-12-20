# Fairies: building AI agents on the canvas

This nugget documents how we built the tldraw agent system—a multi-modal, agentic AI that can see, reason about, and manipulate an infinite canvas.

## Story arc

### 1. Agents on the canvas

The fundamental challenge: how do you give an AI model meaningful awareness of an infinite 2D space? We developed a multi-modal approach that combines:

- **Screenshots**: JPEG images of the agent's viewport (40KB optimized)
- **Structured shape data**: Three levels of detail (blurry, simple, peripheral)
- **Coordinate offsetting**: Novel technique to keep numbers small for better model performance

The agent doesn't just "see" the canvas—it maintains spatial awareness of shapes both inside and outside its viewport, with clustered peripheral data providing context about unexplored areas.

### 2. Scheduling and context management

Unlike simple chatbot integrations, our agent operates in **multi-turn agentic loops**:

- Actions can schedule follow-up requests (`AddDetail`, `Review`)
- Todo lists drive task completion without user intervention
- Chat history maintains coherent conversation context
- User action history tracks recent canvas modifications

The prompt part system assembles 15+ context sources into prioritized multi-modal prompts, with each part implementing its own gathering, formatting, and priority logic.

### 3. Using the agent starter

The `templates/agent/` template provides a complete production-ready implementation:

- **Client layer**: TldrawAgent class, prompt parts, action utilities, UI components
- **Worker layer**: Cloudflare Workers with Durable Objects for streaming
- **Shared layer**: Type system, coordinate helpers, shape format converters

Everything is modular—25 action utilities and 15 prompt part utilities can be extended or replaced.

## What's interesting

### Coordinate offsetting

Models perform better with smaller numbers. We offset all coordinates relative to a "chat origin" point, transforming canvas coordinates like `(12847, -3291)` into model-friendly values like `(47, 109)`. The `AgentHelpers` class handles bidirectional transformation.

### Shape representation pyramid

Three formats serve different purposes:

| Format | Fields | Use case |
|--------|--------|----------|
| BlurryShape | ~6 | Viewport overview |
| SimpleShape | ~40-60 | Detailed editing |
| PeripheralCluster | ~5 | Spatial awareness outside viewport |

### Streaming with sanitization

Actions stream as partial JSON objects. Each action utility implements:
- `sanitizeAction()`: Validates and corrects model mistakes in real-time
- `applyAction()`: Executes against the editor with diff tracking
- `getInfo()`: Provides chat history display with icons and summaries

The sanitization system handles ID collisions, type coercion, and reference validation before actions touch the canvas.

### Multi-turn scheduling

```
prompt(input) → process actions → check scheduledRequest or todoItems
  → if found: add continuation → prompt(scheduled) [recursive]
  → if none: loop ends
```

This enables complex multi-step tasks to complete autonomously.

## Key files

### Client core

| File | Purpose |
|------|---------|
| `client/agent/TldrawAgent.ts` | Main agent class with reactive atoms for state |
| `client/agent/useTldrawAgent.ts` | React hook wrapper |
| `client/agent/agentsAtom.ts` | Global agents registry |

### Prompt parts (15 utilities)

| Utility | Gathers |
|---------|---------|
| `ScreenshotPartUtil` | JPEG screenshot of viewport |
| `BlurryShapesPartUtil` | Simplified shapes in view |
| `PeripheralShapesPartUtil` | Clustered shapes outside view |
| `ChatHistoryPartUtil` | Conversation context |
| `SelectedShapesPartUtil` | User's selected shapes |
| `UserActionHistoryPartUtil` | Recent canvas edits |
| `SystemPromptPartUtil` | Model instructions |
| `MessagesPartUtil` | User messages |
| `ContextItemsPartUtil` | User-provided context areas/shapes |
| `TodoListPartUtil` | Outstanding tasks |
| `ViewportBoundsPartUtil` | Visible area coordinates |
| `TimePartUtil` | Current timestamp |
| `DataPartUtil` | External API results |
| `ModelNamePartUtil` | Model selection |

### Action utilities (25 utilities)

| Category | Actions |
|----------|---------|
| Communication | Message, Think, Review, AddDetail |
| Planning | TodoList, SetMyView |
| Single shapes | Create, Delete, Update, Label, Move |
| Multi-shapes | Place, BringToFront, SendToBack, Rotate, Resize, Align, Distribute, Stack, Clear |
| Drawing | Pen |
| External APIs | RandomWikipediaArticle, CountryInfo, CountShapes |

### Worker

| File | Purpose |
|------|---------|
| `worker/do/AgentDurableObject.ts` | SSE streaming endpoint |
| `worker/do/AgentService.ts` | Model integration bridge |
| `worker/prompt/buildSystemPrompt.ts` | Concatenates system messages |
| `worker/prompt/buildMessages.ts` | Organizes parts by priority |
| `worker/prompt/buildResponseSchema.ts` | Union schema from actions |

### Shared utilities

| File | Purpose |
|------|---------|
| `shared/AgentHelpers.ts` | Coordinate transforms, ID management, rounding |
| `shared/AgentUtils.ts` | Exports PROMPT_PART_UTILS and AGENT_ACTION_UTILS |
| `shared/format/SimpleShape.ts` | Zod schemas for detailed shapes |
| `shared/format/BlurryShape.ts` | Minimal viewport format |

## Outline for full article

### Part 1: The vision problem
- Why infinite canvas is hard for AI
- Multi-modal approach: screenshots + structured data
- Coordinate offsetting technique

### Part 2: The prompt part architecture
- How PromptPartUtil works
- Priority system and model selection
- Building custom prompt parts

### Part 3: The action system
- AgentActionUtil interface
- Streaming and sanitization
- Building custom actions

### Part 4: Multi-turn scheduling
- Request types: user, schedule, todo
- Continuation handling
- Task-driven completion

### Part 5: Putting it together
- The agentic loop in TldrawAgent
- State management with atoms
- Error recovery

### Part 6: Deployment
- Cloudflare Workers setup
- Durable Objects for sessions
- Multi-provider support (Claude, GPT, Gemini)

---

*Status: Placeholder—full content to be written*
