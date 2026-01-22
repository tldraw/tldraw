# Memory levels and transitions implementation research

**Author**: Claude Code
**Date**: 2026-01-22
**Purpose**: Research report on implementing fairies-style memory levels and transitions in the agent starter

---

## Executive summary

This document analyzes how the fairies system implements hierarchical memory management and proposes a detailed implementation plan for bringing this functionality to the agent starter template. The fairies system uses a three-tier memory hierarchy (fairy/project/task) with explicit memory transitions to manage context window size while maintaining relevant historical information. The agent starter can adopt similar patterns with minimal architectural changes.

**Key recommendation**: Implement a three-level memory system (session/project/interaction) with automatic transition detection, history filtering, and summarization utilities.

---

## Part 1: How fairies implements memory levels

### 1.1 Memory level hierarchy

Fairies defines three memory levels in `/packages/fairy-shared/src/types/FairyMemoryLevel.ts`:

```typescript
export type FairyMemoryLevel = 'fairy' | 'project' | 'task'
```

**Memory level characteristics**:

| Level | Scope | Persistence | Detail | Use case |
|-------|-------|-------------|--------|----------|
| `task` | Current task | Cleared after task completion | High detail, granular actions | Immediate work focus |
| `project` | Current project | Cleared after project end | Medium detail, milestones | Multi-task coordination |
| `fairy` | Global agent | Persists across all work | Low detail, core traits | Long-term memory & personality |

**Design principle**: Memory levels create a hierarchy where information flows upward (task → project → fairy) through explicit transitions, compressing detail at each level.

### 1.2 Memory transitions

Memory transitions are special chat history items that mark scope changes:

```typescript
// From /packages/fairy-shared/src/types/ChatHistoryItem.ts
export interface ChatHistoryMemoryTransitionItem {
  id?: string
  type: 'memory-transition'
  memoryLevel: FairyMemoryLevel
  agentFacingMessage: string
  userFacingMessage: string | null
}
```

**Two-message pattern**:
- `agentFacingMessage`: Detailed instruction for the AI model (often includes `[ACTIONS]: <filtered for brevity>`)
- `userFacingMessage`: Optional user-facing summary (null for internal transitions)

**When transitions occur**:

1. **Task completion** (`MarkSoloTaskDoneActionUtil.ts`):
   ```typescript
   agent.chat.push(
     {
       type: 'memory-transition',
       memoryLevel: 'fairy',
       agentFacingMessage: '[ACTIONS]: <Task actions filtered for brevity>',
       userFacingMessage: null,
     },
     {
       type: 'prompt',
       promptSource: 'self',
       memoryLevel: 'fairy',
       agentFacingMessage: 'I just finished the task...',
       userFacingMessage: null,
     }
   )
   ```

2. **Project completion** (`EndCurrentProjectActionUtil.ts`):
   ```typescript
   memberAgent.chat.push(
     {
       type: 'memory-transition',
       memoryLevel: 'fairy',
       agentFacingMessage: '[ACTIONS]: <Project actions filtered for brevity>',
       userFacingMessage: null,
     },
     {
       type: 'prompt',
       promptSource: 'self',
       memoryLevel: 'fairy',
       agentFacingMessage: `I led and completed the "${project.title}" project...`,
       userFacingMessage: `I completed X tasks as part of the "${project.title}" project.`,
     }
   )
   ```

3. **Project cancellation** (`FairyAppProjectsManager.ts`):
   ```typescript
   memberAgent.chat.push(
     {
       type: 'memory-transition',
       memoryLevel: 'fairy',
       agentFacingMessage: '[ACTIONS]: <Project actions filtered for brevity>',
       userFacingMessage: 'Project cancelled',
     },
     {
       type: 'prompt',
       promptSource: 'self',
       memoryLevel: 'fairy',
       agentFacingMessage: '[THOUGHT]: I was ${verb} ${projectReference} that got cancelled...',
       userFacingMessage: '',
     }
   )
   ```

4. **Project abortion** (`AbortProjectActionUtil.ts`):
   ```typescript
   memberAgent.chat.push({
     type: 'memory-transition',
     memoryLevel: 'fairy',
     agentFacingMessage: `Project aborted: ${action.reason}`,
     userFacingMessage: isOrchestrator
       ? `I aborted the project because: ${action.reason}`
       : `The project was aborted because: ${action.reason}`,
   })
   ```

### 1.3 History filtering mechanism

The core filtering logic in `/apps/dotcom/client/src/fairy/fairy-ui/chat/filterChatHistoryByMode.ts`:

```typescript
export function filterChatHistoryByMode(
  allItems: ChatHistoryItem[],
  memoryLevel: FairyMemoryLevel
): ChatHistoryItem[] {
  switch (memoryLevel) {
    case 'fairy':
      // Global context: only show fairy-level items
      return allItems.filter((item) => item.memoryLevel === 'fairy')

    case 'project': {
      // Project context: show project items, skip task items, stop at fairy items
      const filteredItems: ChatHistoryItem[] = []
      for (let i = allItems.length - 1; i >= 0; i--) {
        const item = allItems[i]
        if (item.memoryLevel === 'project') {
          filteredItems.unshift(item)
        } else if (item.memoryLevel === 'task') {
          continue  // Skip task-level details
        } else if (item.memoryLevel === 'fairy') {
          break  // Stop at fairy boundary
        }
      }
      return filteredItems
    }

    case 'task': {
      // Task context: only consecutive task items from end
      const filteredItems: ChatHistoryItem[] = []
      for (let i = allItems.length - 1; i >= 0; i--) {
        const item = allItems[i]
        if (item.memoryLevel === 'task') {
          filteredItems.unshift(item)
        } else {
          break  // Stop at first non-task item
        }
      }
      return filteredItems
    }
  }
}
```

**Filtering algorithm insights**:
- **Backwards scanning**: Processes history from most recent to oldest
- **Boundary stopping**: Stops at scope boundaries (e.g., task mode stops at first project/fairy item)
- **Skip vs stop**: Project mode skips task items but continues scanning
- **Preserves order**: Filtered items maintain chronological order via `unshift()`

### 1.4 Mode-memory level mapping

From `/packages/fairy-shared/src/schema/FairyModeDefinition.ts`, each operational mode has an associated memory level:

| Mode | Memory level | Description |
|------|--------------|-------------|
| `idling` | `fairy` | Passive, no active work |
| `sleeping` | `fairy` | Dormant state |
| `one-shotting` | `fairy` | Single generation request |
| `working-solo` | `task` | Focused on current task |
| `working-drone` | `project` | Part of project work |
| `orchestrating-active` | `project` | Leading project |
| `orchestrating-waiting` | `project` | Waiting for other agents |

**Design insight**: Memory level is tied to operational mode, creating automatic context switching based on what the agent is currently doing.

### 1.5 Prompt integration

Memory filtering integrates into prompt generation via `ChatHistoryPartUtil.ts`:

```typescript
override async getPart(_request: AgentRequest) {
  // Get all history items
  const allItems = structuredClone(this.agent.chat.getHistory())

  // Determine current memory level from mode
  const modeDefinition = getFairyModeDefinition(this.agent.mode.getMode())
  const { memoryLevel } = modeDefinition

  // Filter history based on memory level
  const filteredItems = filterChatHistoryByMode(allItems, memoryLevel)

  return {
    type: 'chatHistory' as const,
    items: filteredItems,
  }
}
```

**Integration pattern**: Filtering happens transparently during prompt preparation, so the AI model only receives relevant context without manual curation.

### 1.6 UI rendering

Memory transitions render in the chat UI with a flag icon:

```typescript
// From FairyChatHistorySection.tsx
function FairyChatHistoryMemoryTransition({ item }: { item: ChatHistoryMemoryTransitionItem }) {
  if (!item.userFacingMessage) return null
  return (
    <div className="fairy-chat-history-group">
      <div className="fairy-chat-history-item-container">
        <div className="fairy-chat-history-action">
          <div className="fairy-chat-history-action-icon">
            <AgentIcon type="flag" />  {/* Visual indicator */}
          </div>
          <Markdown>{item.userFacingMessage}</Markdown>
        </div>
      </div>
    </div>
  )
}
```

**UI pattern**: Only display `userFacingMessage` to users; `agentFacingMessage` is internal.

### 1.7 Key architectural patterns

1. **Linear timeline preservation**: All history items remain in chronological order; filtering just changes visibility
2. **Action summary pattern**: Use `[ACTIONS]: <filtered for brevity>` to signal context compression to the model
3. **Self-sourced prompts**: Memory transitions added via `promptSource: 'self'` after scope changes
4. **Dual messaging**: Every transition has both AI-facing (detailed) and user-facing (summary) messages
5. **Automatic transitions**: Scope changes trigger transitions automatically (task done, project end, etc.)
6. **Hierarchical compression**: Information becomes more compressed as it moves up the hierarchy

---

## Part 2: Agent starter architecture analysis

### 2.1 Current architecture overview

The agent starter (`/templates/agent/`) implements a modular AI agent for canvas interaction with these core components:

```
┌─────────────────────────────────────────────────────────┐
│                     TldrawAgent                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Reactive State (Atoms)                            │  │
│  │ - $chatHistory        - $todoList                 │  │
│  │ - $userActionHistory  - $contextItems             │  │
│  │ - $activeRequest      - $scheduledRequest         │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Request Pipeline                                  │  │
│  │ prompt() → request() → preparePrompt() → act()   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
           ↓                                      ↑
┌──────────────────────┐             ┌────────────────────┐
│   Prompt Part Utils  │             │  Action Utils      │
│   (What agent sees)  │             │  (What agent does) │
├──────────────────────┤             ├────────────────────┤
│ - ChatHistoryPart    │             │ - CreateAction     │
│ - ScreenshotPart     │             │ - UpdateAction     │
│ - SelectedShapesPart │             │ - DeleteAction     │
│ - TodoListPart       │             │ - MessageAction    │
│ - UserActionHistory  │             │ - TodoListAction   │
│ - ContextItemsPart   │             │ - ThinkAction      │
│ - ViewportBoundsPart │             │ - (20+ more...)    │
└──────────────────────┘             └────────────────────┘
```

### 2.2 Memory system components

#### Current chat history structure

```typescript
// From /templates/agent/shared/types/ChatHistoryItem.ts
export type ChatHistoryItem =
  | ChatHistoryPromptItem
  | ChatHistoryActionItem
  | ChatHistoryContinuationItem

interface ChatHistoryPromptItem {
  id: string
  time: number
  type: 'prompt'
  input: string
  requestType: 'user' | 'schedule' | 'todo'
  userActionHistory?: UserActionHistory
  contextItems?: AgentContextItem[]
}

interface ChatHistoryActionItem {
  id: string
  time: number
  type: 'action'
  action: AgentAction
}

interface ChatHistoryContinuationItem {
  id: string
  time: number
  type: 'continuation'
  requestId: string
  data: unknown
}
```

**No memory levels currently**: All history items are stored at the same level with no filtering or hierarchy.

#### User action history tracking

```typescript
// From /templates/agent/shared/types/UserActionHistory.ts
export interface UserActionHistory {
  added: TLShape[]
  removed: TLShape[]
  updated: {
    from: TLShape
    to: TLShape
  }[]
}
```

Tracks user edits since the last agent request, providing the agent with awareness of user modifications.

#### Context items (user-selected focus)

```typescript
// From /templates/agent/shared/types/AgentContextItem.ts
export type AgentContextItem =
  | { type: 'shape'; shapeId: TLShapeId }
  | { type: 'shapes'; shapeIds: TLShapeId[] }
  | { type: 'group'; groupId: TLShapeId }
  | { type: 'area'; bounds: Box }
  | { type: 'point'; x: number; y: number }
```

Allows users to explicitly mark shapes/areas for the agent to focus on.

### 2.3 Prompt part system

Each prompt part is a modular utility that contributes context to the agent's perception:

```typescript
// Base class: /templates/agent/shared/parts/PromptPartUtil.ts
export abstract class PromptPartUtil<Part = unknown> {
  constructor(protected agent: TldrawAgent)

  // Gather the data for this prompt part
  abstract getPart(request: AgentRequest): Promise<Part>

  // Convert data to text/image content for the model
  abstract buildContent(part: Part): MessageContent

  // Determine message priority (lower = later in prompt)
  abstract getPriority(): number

  // Optional system prompt contribution
  buildSystemPrompt?(part: Part): string | null
}
```

**Example: ChatHistoryPartUtil** (current implementation):

```typescript
// From /templates/agent/shared/parts/ChatHistoryPartUtil.ts
export class ChatHistoryPartUtil extends PromptPartUtil {
  override async getPart(_request: AgentRequest) {
    const items = structuredClone(this.agent.$chatHistory.get())
    return { type: 'chatHistory' as const, items }
  }

  override buildContent(part: ReturnType<typeof this.getPart>) {
    // Converts chat history to text format for model
    // Currently returns ALL history with no filtering
  }

  override getPriority() {
    return 100  // High priority (appears early in prompt)
  }
}
```

**Key insight**: `ChatHistoryPartUtil.getPart()` currently returns all history items without any filtering—this is the primary integration point for memory levels.

### 2.4 Action execution system

Actions are executed through utility classes:

```typescript
// Base class: /templates/agent/shared/actions/AgentActionUtil.ts
export abstract class AgentActionUtil<Action extends { _type: string }> {
  constructor(protected agent: TldrawAgent)

  // Zod schema for validating action JSON from model
  abstract getSchema(): z.ZodType<Action>

  // Execute the action and return any data
  abstract applyAction(action: Action): Promise<unknown>

  // Validate and fix model output
  sanitizeAction?(action: Action): Action

  // Whether this action should be saved to history
  savesToHistory?(): boolean

  // Display info for chat UI
  getInfo?(action: Action): ActionInfo

  // Optional system prompt instructions
  buildSystemPrompt?(): string
}
```

**No memory-aware actions currently**: Actions don't consider memory levels or trigger transitions.

### 2.5 Request pipeline

```typescript
// Simplified flow from TldrawAgent.ts
async prompt(input: string) {
  // Agentic loop: continues until all todos complete
  await this.request(input, 'user')
  while (this.$todoList.get().length > 0) {
    await this.request('Continue with next todo', 'todo')
  }
}

async request(input: string, type: RequestType) {
  // 1. Prepare prompt from all prompt part utils
  const prompt = await this.preparePrompt(input, type)

  // 2. Send to worker/model
  const response = await fetch('/stream', {
    method: 'POST',
    body: JSON.stringify(prompt),
  })

  // 3. Stream and execute actions
  for await (const actions of streamResponse(response)) {
    for (const action of actions) {
      await this.act(action)
    }
  }

  // 4. Save to history
  this.$chatHistory.update((prev) => [
    ...prev,
    { type: 'prompt', input, ... },
    ...actions.map(a => ({ type: 'action', action: a })),
  ])
}
```

**Integration point**: After step 4, we could detect if a memory transition is needed and trigger it before the next request.

### 2.6 Persistence strategy

```typescript
// From TldrawAgent.ts constructor
persistAtomInLocalStorage(
  this.$chatHistory,
  `${id}:chat-history`,
  {
    defaultValue: [],
    mode: 'debounced',
    debounceMs: 500,
  }
)
```

Current persistence is simple: save entire atom to localStorage. No compression, archival, or size limits.

### 2.7 Key differences from fairies

| Aspect | Fairies | Agent starter |
|--------|---------|---------------|
| Memory levels | 3 levels (fairy/project/task) | None (flat history) |
| History filtering | Automatic based on mode | No filtering |
| Memory transitions | Explicit transition items | No transitions |
| Summarization | `[ACTIONS]: <filtered>` pattern | No summarization |
| Mode-memory mapping | Each mode has a memory level | No modes |
| Session management | Project/task boundaries | Continuous session |
| Archival | Compressed summaries | All history kept |
| UI indicators | Flag icon for transitions | No transition indicators |

---

## Part 3: Implementation proposal

### 3.1 Memory level design for agent starter

**Proposed three-level hierarchy**:

```typescript
// New file: /templates/agent/shared/types/MemoryLevel.ts
export type MemoryLevel = 'interaction' | 'session' | 'global'
```

| Level | Scope | Persistence | Detail | Analogy to fairies |
|-------|-------|-------------|--------|-------------------|
| `interaction` | Single request-response | Cleared after request completes | High detail (all shapes, full diffs) | `task` |
| `session` | Current work session | Cleared when user ends session | Medium detail (summaries, key changes) | `project` |
| `global` | Persistent across sessions | Never cleared | Low detail (agent personality, preferences) | `fairy` |

**Memory level characteristics**:

- **Interaction**: Immediate context for the current request
  - Full chat history for current exchange
  - All user action diffs
  - Complete shape details for selected/relevant shapes
  - Screenshot and viewport bounds

- **Session**: Working memory for the current canvas session
  - Key milestones and decisions
  - Summaries of completed work
  - Important shape IDs and relationships
  - Todo list and scheduled work

- **Global**: Long-term memory across all sessions
  - User preferences and patterns
  - Agent personality traits
  - Frequently used workflows
  - Historical session summaries

### 3.2 Memory transition triggers

**When to trigger transitions**:

1. **Interaction → Session** (after each request completes):
   ```typescript
   if (shouldTransitionToSession(agent)) {
     createMemoryTransition({
       level: 'session',
       reason: 'request-complete',
       agentMessage: '[ACTIONS]: <Request actions filtered for brevity>',
       userMessage: null,
     })
   }
   ```

   **Trigger conditions**:
   - Request completes successfully
   - Multiple actions were executed
   - Significant canvas changes occurred

2. **Session → Global** (when session ends or gets too large):
   ```typescript
   if (shouldArchiveSession(agent)) {
     createMemoryTransition({
       level: 'global',
       reason: 'session-end',
       agentMessage: '[SESSION SUMMARY]: User worked on X, creating Y shapes...',
       userMessage: 'Session archived',
     })
   }
   ```

   **Trigger conditions**:
   - User explicitly ends session
   - History exceeds size threshold (e.g., 100 items)
   - Time threshold exceeded (e.g., 1 hour of inactivity)
   - Context window approaching limit

3. **Manual transition** (user-initiated):
   ```typescript
   if (userRequestsArchival()) {
     createMemoryTransition({
       level: 'global',
       reason: 'manual',
       agentMessage: 'User requested session archival',
       userMessage: 'Archived previous work',
     })
   }
   ```

### 3.3 Implementation architecture

```
┌─────────────────────────────────────────────────────────┐
│                     TldrawAgent                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ New Memory Atoms                                  │  │
│  │ + $memoryLevel: Atom<MemoryLevel>                │  │
│  │ + $sessionMetadata: Atom<SessionMetadata>        │  │
│  │ + $archivedSessions: Atom<ArchivedSession[]>     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Modified Request Pipeline                         │  │
│  │ request() → preparePrompt() → [NEW: checkMemory] │  │
│  │          → act() → [NEW: detectTransition]       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
           ↓                                      ↑
┌──────────────────────┐             ┌────────────────────┐
│ Modified Prompt Parts│             │  New Action Utils  │
├──────────────────────┤             ├────────────────────┤
│ • ChatHistoryPart    │             │ + TransitionAction │
│   (add filtering)    │             │ + ArchiveSession   │
│                      │             │ + SummarizeAction  │
│ • UserActionHistory  │             │                    │
│   (add compression)  │             │                    │
│                      │             │                    │
│ • ContextItemsPart   │             │                    │
│   (add priority)     │             │                    │
└──────────────────────┘             └────────────────────┘
           ↓                                      ↓
┌─────────────────────────────────────────────────────────┐
│              New Memory Management Layer                │
├─────────────────────────────────────────────────────────┤
│ • MemoryTransitionManager  - Detect and execute         │
│ • HistoryFilterer          - Filter by level            │
│ • HistoryCompressor        - Summarize old items        │
│ • SessionArchiver          - Archive/restore sessions   │
│ • MemoryMetrics            - Track size/token usage     │
└─────────────────────────────────────────────────────────┘
```

### 3.4 Detailed implementation plan

#### Step 1: Type definitions

**File: `/templates/agent/shared/types/MemoryLevel.ts`** (new)

```typescript
export type MemoryLevel = 'interaction' | 'session' | 'global'

export interface MemoryLevelConfig {
  maxHistoryItems: number
  includeFullShapes: boolean
  includeScreenshots: boolean
  compressUserActions: boolean
  summarizationStrategy: 'none' | 'aggressive' | 'smart'
}

export const MEMORY_LEVEL_CONFIGS: Record<MemoryLevel, MemoryLevelConfig> = {
  interaction: {
    maxHistoryItems: 20,
    includeFullShapes: true,
    includeScreenshots: true,
    compressUserActions: false,
    summarizationStrategy: 'none',
  },
  session: {
    maxHistoryItems: 50,
    includeFullShapes: false,
    includeScreenshots: false,
    compressUserActions: true,
    summarizationStrategy: 'smart',
  },
  global: {
    maxHistoryItems: 10,
    includeFullShapes: false,
    includeScreenshots: false,
    compressUserActions: true,
    summarizationStrategy: 'aggressive',
  },
}

export interface SessionMetadata {
  id: string
  startTime: number
  endTime?: number
  requestCount: number
  actionCount: number
  lastActivity: number
}

export interface ArchivedSession {
  metadata: SessionMetadata
  summary: string
  keyMilestones: string[]
  importantShapeIds: TLShapeId[]
}
```

**File: `/templates/agent/shared/types/ChatHistoryItem.ts`** (modify)

```typescript
// Add memory level to existing items
export interface ChatHistoryPromptItem {
  id: string
  time: number
  type: 'prompt'
  memoryLevel: MemoryLevel  // NEW
  input: string
  requestType: 'user' | 'schedule' | 'todo'
  userActionHistory?: UserActionHistory
  contextItems?: AgentContextItem[]
}

export interface ChatHistoryActionItem {
  id: string
  time: number
  type: 'action'
  memoryLevel: MemoryLevel  // NEW
  action: AgentAction
}

// Add new memory transition item
export interface ChatHistoryMemoryTransitionItem {
  id: string
  time: number
  type: 'memory-transition'
  memoryLevel: MemoryLevel
  reason: 'request-complete' | 'session-end' | 'manual' | 'size-limit' | 'time-limit'
  agentFacingMessage: string
  userFacingMessage: string | null
}

export type ChatHistoryItem =
  | ChatHistoryPromptItem
  | ChatHistoryActionItem
  | ChatHistoryContinuationItem
  | ChatHistoryMemoryTransitionItem  // NEW
```

#### Step 2: Memory filtering

**File: `/templates/agent/shared/memory/HistoryFilterer.ts`** (new)

```typescript
import { ChatHistoryItem, MemoryLevel } from '../types'

export class HistoryFilterer {
  /**
   * Filter chat history based on memory level.
   * Algorithm inspired by fairies' filterChatHistoryByMode.
   */
  static filter(
    allItems: ChatHistoryItem[],
    memoryLevel: MemoryLevel
  ): ChatHistoryItem[] {
    switch (memoryLevel) {
      case 'global':
        // Global context: only show global-level items
        return allItems.filter((item) => item.memoryLevel === 'global')

      case 'session': {
        // Session context: show session items, skip interaction items, stop at global
        const filteredItems: ChatHistoryItem[] = []
        for (let i = allItems.length - 1; i >= 0; i--) {
          const item = allItems[i]
          if (item.memoryLevel === 'session') {
            filteredItems.unshift(item)
          } else if (item.memoryLevel === 'interaction') {
            continue  // Skip interaction-level details
          } else if (item.memoryLevel === 'global') {
            break  // Stop at global boundary
          }
        }
        return filteredItems
      }

      case 'interaction': {
        // Interaction context: only consecutive interaction items from end
        const filteredItems: ChatHistoryItem[] = []
        for (let i = allItems.length - 1; i >= 0; i--) {
          const item = allItems[i]
          if (item.memoryLevel === 'interaction') {
            filteredItems.unshift(item)
          } else {
            break  // Stop at first non-interaction item
          }
        }
        return filteredItems
      }
    }
  }

  /**
   * Count total items at each memory level
   */
  static countByLevel(items: ChatHistoryItem[]): Record<MemoryLevel, number> {
    return items.reduce(
      (acc, item) => {
        if ('memoryLevel' in item) {
          acc[item.memoryLevel]++
        }
        return acc
      },
      { interaction: 0, session: 0, global: 0 }
    )
  }

  /**
   * Get most recent N items regardless of level
   */
  static getMostRecent(items: ChatHistoryItem[], count: number): ChatHistoryItem[] {
    return items.slice(-count)
  }
}
```

#### Step 3: Memory transition manager

**File: `/templates/agent/shared/memory/MemoryTransitionManager.ts`** (new)

```typescript
import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { ChatHistoryMemoryTransitionItem, MemoryLevel } from '../types'
import { uniqueId } from '@tldraw/utils'
import { HistoryCompressor } from './HistoryCompressor'

export class MemoryTransitionManager {
  constructor(private agent: TldrawAgent) {}

  /**
   * Check if a transition is needed after a request completes
   */
  shouldTransitionToSession(): boolean {
    const history = this.agent.$chatHistory.get()
    const interactionItems = history.filter((item) =>
      'memoryLevel' in item ? item.memoryLevel === 'interaction' : false
    )

    // Transition if we have too many interaction items
    if (interactionItems.length > 20) return true

    // Transition if significant work was done (many actions)
    const recentActions = interactionItems.filter((item) => item.type === 'action')
    if (recentActions.length > 10) return true

    return false
  }

  /**
   * Check if session should be archived
   */
  shouldArchiveSession(): boolean {
    const history = this.agent.$chatHistory.get()
    const sessionItems = history.filter((item) =>
      'memoryLevel' in item ? item.memoryLevel === 'session' : false
    )

    // Archive if session history is too large
    if (sessionItems.length > 50) return true

    // Archive if session metadata indicates long session
    const metadata = this.agent.$sessionMetadata.get()
    if (metadata.requestCount > 30) return true

    // Archive if last activity was over 1 hour ago
    const timeSinceActivity = Date.now() - metadata.lastActivity
    if (timeSinceActivity > 60 * 60 * 1000) return true

    return false
  }

  /**
   * Execute transition from interaction to session level
   */
  async transitionToSession(): Promise<void> {
    const history = this.agent.$chatHistory.get()

    // Get all interaction-level items
    const interactionItems = history.filter((item) =>
      'memoryLevel' in item ? item.memoryLevel === 'interaction' : false
    )

    // Compress/summarize interaction items
    const summary = await HistoryCompressor.summarizeInteraction(
      interactionItems,
      this.agent
    )

    // Create memory transition item
    const transition: ChatHistoryMemoryTransitionItem = {
      id: uniqueId(),
      time: Date.now(),
      type: 'memory-transition',
      memoryLevel: 'session',
      reason: 'request-complete',
      agentFacingMessage: `[INTERACTION SUMMARY]: ${summary}`,
      userFacingMessage: null,
    }

    // Update memory levels of old items
    const updatedHistory = history.map((item) => {
      if ('memoryLevel' in item && item.memoryLevel === 'interaction') {
        return { ...item, memoryLevel: 'session' as MemoryLevel }
      }
      return item
    })

    // Add transition and update history
    this.agent.$chatHistory.set([...updatedHistory, transition])

    // Reset current memory level to interaction for next request
    this.agent.$memoryLevel.set('interaction')
  }

  /**
   * Execute session archival
   */
  async archiveSession(): Promise<void> {
    const history = this.agent.$chatHistory.get()
    const metadata = this.agent.$sessionMetadata.get()

    // Get all session-level items
    const sessionItems = history.filter((item) =>
      'memoryLevel' in item ? item.memoryLevel === 'session' : false
    )

    // Create session summary
    const summary = await HistoryCompressor.summarizeSession(sessionItems, this.agent)

    // Extract key milestones
    const keyMilestones = await HistoryCompressor.extractMilestones(
      sessionItems,
      this.agent
    )

    // Extract important shape IDs
    const importantShapeIds = this.extractImportantShapeIds(sessionItems)

    // Create archived session record
    const archivedSession = {
      metadata: {
        ...metadata,
        endTime: Date.now(),
      },
      summary,
      keyMilestones,
      importantShapeIds,
    }

    // Add to archived sessions
    this.agent.$archivedSessions.update((prev) => [...prev, archivedSession])

    // Create memory transition item
    const transition: ChatHistoryMemoryTransitionItem = {
      id: uniqueId(),
      time: Date.now(),
      type: 'memory-transition',
      memoryLevel: 'global',
      reason: 'session-end',
      agentFacingMessage: `[SESSION SUMMARY]: ${summary}`,
      userFacingMessage: 'Session archived',
    }

    // Update memory levels of old items to global
    const updatedHistory = history.map((item) => {
      if ('memoryLevel' in item && item.memoryLevel === 'session') {
        return { ...item, memoryLevel: 'global' as MemoryLevel }
      }
      return item
    })

    // Add transition and update history
    this.agent.$chatHistory.set([...updatedHistory, transition])

    // Reset session metadata
    this.agent.$sessionMetadata.set({
      id: uniqueId(),
      startTime: Date.now(),
      requestCount: 0,
      actionCount: 0,
      lastActivity: Date.now(),
    })

    // Reset to interaction level
    this.agent.$memoryLevel.set('interaction')
  }

  /**
   * Extract important shape IDs from session history
   */
  private extractImportantShapeIds(items: ChatHistoryItem[]): TLShapeId[] {
    const shapeIds = new Set<TLShapeId>()

    for (const item of items) {
      if (item.type === 'action') {
        const action = item.action

        // Extract shape IDs from various action types
        if ('shapeId' in action) shapeIds.add(action.shapeId)
        if ('shapeIds' in action) action.shapeIds.forEach((id) => shapeIds.add(id))
      }
    }

    return Array.from(shapeIds)
  }
}
```

#### Step 4: History compression/summarization

**File: `/templates/agent/shared/memory/HistoryCompressor.ts`** (new)

```typescript
import { ChatHistoryItem } from '../types'
import { TldrawAgent } from '../../client/agent/TldrawAgent'

export class HistoryCompressor {
  /**
   * Summarize interaction items into a brief description.
   * Uses the model itself to generate summaries.
   */
  static async summarizeInteraction(
    items: ChatHistoryItem[],
    agent: TldrawAgent
  ): Promise<string> {
    // If few items, just concatenate
    if (items.length <= 5) {
      return items
        .map((item) => {
          if (item.type === 'prompt') return `User: ${item.input}`
          if (item.type === 'action') return `Action: ${item.action._type}`
          return ''
        })
        .filter(Boolean)
        .join('; ')
    }

    // For many items, use pattern similar to fairies
    const actionTypes = items
      .filter((item) => item.type === 'action')
      .map((item) => (item as any).action._type)

    const uniqueActions = Array.from(new Set(actionTypes))

    return `[ACTIONS]: <${items.length} interaction items filtered for brevity. Agent performed: ${uniqueActions.join(', ')}>`
  }

  /**
   * Summarize session items into a comprehensive description
   */
  static async summarizeSession(
    items: ChatHistoryItem[],
    agent: TldrawAgent
  ): Promise<string> {
    // Count action types
    const actionCounts: Record<string, number> = {}
    const prompts: string[] = []

    for (const item of items) {
      if (item.type === 'action') {
        const actionType = item.action._type
        actionCounts[actionType] = (actionCounts[actionType] || 0) + 1
      } else if (item.type === 'prompt') {
        prompts.push(item.input)
      }
    }

    // Build summary
    const actionSummary = Object.entries(actionCounts)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ')

    const requestSummary = `${prompts.length} requests`

    return `Session: ${requestSummary}. Actions: ${actionSummary}.`
  }

  /**
   * Extract key milestones from session history
   */
  static async extractMilestones(
    items: ChatHistoryItem[],
    agent: TldrawAgent
  ): Promise<string[]> {
    const milestones: string[] = []

    // Look for significant events
    for (const item of items) {
      if (item.type === 'memory-transition') {
        if (item.userFacingMessage) {
          milestones.push(item.userFacingMessage)
        }
      }
    }

    // TODO: Could use model to identify other key milestones
    // For now, just return transitions
    return milestones
  }

  /**
   * Compress user action history by removing redundant changes
   */
  static compressUserActionHistory(
    history: ChatHistoryItem[],
    keepRecent: number = 10
  ): ChatHistoryItem[] {
    // Keep recent N items unchanged
    const recentItems = history.slice(-keepRecent)
    const oldItems = history.slice(0, -keepRecent)

    // For old items, remove action details but keep prompts
    const compressedOld = oldItems.map((item) => {
      if (item.type === 'prompt') {
        // Remove detailed user action history from old prompts
        return {
          ...item,
          userActionHistory: undefined,
          contextItems: undefined,
        }
      }
      return item
    })

    return [...compressedOld, ...recentItems]
  }
}
```

#### Step 5: Modify TldrawAgent

**File: `/templates/agent/client/agent/TldrawAgent.ts`** (modify)

```typescript
import { atom } from '@tldraw/state'
import { MemoryLevel, SessionMetadata, ArchivedSession } from '../../shared/types/MemoryLevel'
import { MemoryTransitionManager } from '../../shared/memory/MemoryTransitionManager'

export class TldrawAgent {
  // ... existing atoms ...

  // NEW: Memory management atoms
  readonly $memoryLevel = atom<MemoryLevel>('memoryLevel', 'interaction')
  readonly $sessionMetadata = atom<SessionMetadata>('sessionMetadata', {
    id: uniqueId(),
    startTime: Date.now(),
    requestCount: 0,
    actionCount: 0,
    lastActivity: Date.now(),
  })
  readonly $archivedSessions = atom<ArchivedSession[]>('archivedSessions', [])

  // NEW: Memory transition manager
  private memoryTransitionManager: MemoryTransitionManager

  constructor(/* ... */) {
    // ... existing initialization ...

    // Initialize memory manager
    this.memoryTransitionManager = new MemoryTransitionManager(this)

    // Persist memory atoms
    persistAtomInLocalStorage(this.$memoryLevel, `${id}:memory-level`)
    persistAtomInLocalStorage(this.$sessionMetadata, `${id}:session-metadata`)
    persistAtomInLocalStorage(this.$archivedSessions, `${id}:archived-sessions`)
  }

  // MODIFY: Request method to include memory transitions
  async request(input: string, type: RequestType = 'user'): Promise<void> {
    // Check if we need to transition before starting new request
    if (this.memoryTransitionManager.shouldArchiveSession()) {
      await this.memoryTransitionManager.archiveSession()
    } else if (this.memoryTransitionManager.shouldTransitionToSession()) {
      await this.memoryTransitionManager.transitionToSession()
    }

    // Set memory level to interaction for this request
    this.$memoryLevel.set('interaction')

    // Update session metadata
    this.$sessionMetadata.update((prev) => ({
      ...prev,
      requestCount: prev.requestCount + 1,
      lastActivity: Date.now(),
    }))

    // ... existing request logic ...

    // After request completes, check if transition needed
    if (this.memoryTransitionManager.shouldTransitionToSession()) {
      await this.memoryTransitionManager.transitionToSession()
    }
  }

  // NEW: Manual session archival
  async archiveCurrentSession(): Promise<void> {
    await this.memoryTransitionManager.archiveSession()
  }

  // NEW: Get current memory level config
  getMemoryLevelConfig(): MemoryLevelConfig {
    return MEMORY_LEVEL_CONFIGS[this.$memoryLevel.get()]
  }
}
```

#### Step 6: Modify ChatHistoryPartUtil

**File: `/templates/agent/shared/parts/ChatHistoryPartUtil.ts`** (modify)

```typescript
import { HistoryFilterer } from '../memory/HistoryFilterer'

export class ChatHistoryPartUtil extends PromptPartUtil {
  override async getPart(_request: AgentRequest) {
    // Get all history items
    const allItems = structuredClone(this.agent.$chatHistory.get())

    // Get current memory level
    const memoryLevel = this.agent.$memoryLevel.get()

    // Filter history based on memory level (NEW)
    const filteredItems = HistoryFilterer.filter(allItems, memoryLevel)

    return {
      type: 'chatHistory' as const,
      items: filteredItems,
    }
  }

  override buildContent(part: ReturnType<typeof this.getPart>) {
    // Existing buildContent implementation remains the same
    // It receives already-filtered items
  }
}
```

#### Step 7: Memory metrics tracking

**File: `/templates/agent/shared/memory/MemoryMetrics.ts`** (new)

```typescript
import { ChatHistoryItem } from '../types'

export class MemoryMetrics {
  /**
   * Estimate token count for history items
   * Rough approximation: 1 token ≈ 4 characters
   */
  static estimateTokens(items: ChatHistoryItem[]): number {
    let charCount = 0

    for (const item of items) {
      if (item.type === 'prompt') {
        charCount += item.input.length
        if (item.userActionHistory) {
          charCount += JSON.stringify(item.userActionHistory).length
        }
      } else if (item.type === 'action') {
        charCount += JSON.stringify(item.action).length
      } else if (item.type === 'memory-transition') {
        charCount += item.agentFacingMessage.length
      }
    }

    return Math.ceil(charCount / 4)
  }

  /**
   * Get size of history in bytes
   */
  static getSizeBytes(items: ChatHistoryItem[]): number {
    return new Blob([JSON.stringify(items)]).size
  }

  /**
   * Check if we're approaching context limit
   */
  static isApproachingLimit(
    items: ChatHistoryItem[],
    maxTokens: number = 100000
  ): boolean {
    const tokens = this.estimateTokens(items)
    return tokens > maxTokens * 0.8  // 80% threshold
  }

  /**
   * Get metrics summary
   */
  static getSummary(items: ChatHistoryItem[]) {
    return {
      totalItems: items.length,
      estimatedTokens: this.estimateTokens(items),
      sizeBytes: this.getSizeBytes(items),
      itemsByType: items.reduce(
        (acc, item) => {
          acc[item.type] = (acc[item.type] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
    }
  }
}
```

#### Step 8: UI components for memory management

**File: `/templates/agent/client/ui/MemoryLevelIndicator.tsx`** (new)

```typescript
import { useValue } from '@tldraw/state-react'
import { TldrawAgent } from '../agent/TldrawAgent'

export function MemoryLevelIndicator({ agent }: { agent: TldrawAgent }) {
  const memoryLevel = useValue('memory level', () => agent.$memoryLevel.get(), [agent])
  const metadata = useValue('session metadata', () => agent.$sessionMetadata.get(), [agent])

  const levelInfo = {
    interaction: { icon: '⚡', label: 'Interaction', color: '#00ff00' },
    session: { icon: '📊', label: 'Session', color: '#ffaa00' },
    global: { icon: '🌐', label: 'Global', color: '#00aaff' },
  }

  const info = levelInfo[memoryLevel]

  return (
    <div className="memory-level-indicator">
      <span style={{ color: info.color }}>{info.icon}</span>
      <span>{info.label}</span>
      <span className="session-stats">
        {metadata.requestCount} requests, {metadata.actionCount} actions
      </span>
      <button onClick={() => agent.archiveCurrentSession()}>Archive session</button>
    </div>
  )
}
```

**File: `/templates/agent/client/ui/ChatHistoryItem.tsx`** (modify to show transitions)

```typescript
// Add rendering for memory transitions
function ChatHistoryMemoryTransition({ item }: { item: ChatHistoryMemoryTransitionItem }) {
  if (!item.userFacingMessage) return null

  return (
    <div className="chat-history-memory-transition">
      <div className="transition-icon">🚩</div>
      <div className="transition-message">{item.userFacingMessage}</div>
      <div className="transition-reason">{item.reason}</div>
    </div>
  )
}

// In main ChatHistoryItem component, add case:
export function ChatHistoryItem({ item }: { item: ChatHistoryItem }) {
  if (item.type === 'memory-transition') {
    return <ChatHistoryMemoryTransition item={item} />
  }

  // ... existing cases ...
}
```

### 3.5 Integration checklist

Implementation should proceed in this order:

- [ ] **Phase 1: Foundation**
  - [ ] Create type definitions (`MemoryLevel.ts`, update `ChatHistoryItem.ts`)
  - [ ] Add memory atoms to `TldrawAgent`
  - [ ] Implement `HistoryFilterer` utility
  - [ ] Test filtering logic with mock data

- [ ] **Phase 2: Transition detection**
  - [ ] Implement `MemoryMetrics` for size/token tracking
  - [ ] Implement `MemoryTransitionManager` with transition detection
  - [ ] Add transition triggers to request pipeline
  - [ ] Test transition detection logic

- [ ] **Phase 3: Compression**
  - [ ] Implement `HistoryCompressor` with summarization
  - [ ] Add compression to transition execution
  - [ ] Test compression preserves key information

- [ ] **Phase 4: Integration**
  - [ ] Modify `ChatHistoryPartUtil` to use filtering
  - [ ] Update `UserActionHistoryPartUtil` with compression
  - [ ] Add memory level to all new history items
  - [ ] Test end-to-end request flow with memory levels

- [ ] **Phase 5: UI**
  - [ ] Create `MemoryLevelIndicator` component
  - [ ] Add memory transition rendering
  - [ ] Add manual archival button
  - [ ] Test UI updates correctly

- [ ] **Phase 6: Persistence**
  - [ ] Extend localStorage persistence for new atoms
  - [ ] Add compression for large stored histories
  - [ ] Test session restoration after reload

- [ ] **Phase 7: Testing & refinement**
  - [ ] Write unit tests for filtering logic
  - [ ] Write integration tests for transitions
  - [ ] Test with real model interactions
  - [ ] Tune transition thresholds based on usage

### 3.6 Testing strategy

**Unit tests**:
```typescript
// Test filtering
describe('HistoryFilterer', () => {
  it('filters interaction level correctly', () => {
    const items = [
      { type: 'prompt', memoryLevel: 'interaction', ... },
      { type: 'action', memoryLevel: 'interaction', ... },
      { type: 'prompt', memoryLevel: 'session', ... },
    ]
    const filtered = HistoryFilterer.filter(items, 'interaction')
    expect(filtered).toHaveLength(2)
  })

  it('stops at memory boundaries', () => { ... })
})

// Test transition detection
describe('MemoryTransitionManager', () => {
  it('triggers transition when item count exceeds threshold', () => { ... })
  it('triggers archival when session is too old', () => { ... })
})

// Test compression
describe('HistoryCompressor', () => {
  it('summarizes interaction items', async () => { ... })
  it('preserves key milestones', async () => { ... })
})
```

**Integration tests**:
```typescript
describe('Memory system integration', () => {
  it('automatically transitions after large request', async () => {
    const agent = createTestAgent()

    // Simulate large request with many actions
    await agent.request('Create 20 shapes')

    // Check that transition occurred
    const history = agent.$chatHistory.get()
    const transitions = history.filter(item => item.type === 'memory-transition')
    expect(transitions).toHaveLength(1)
  })

  it('archives session when threshold exceeded', async () => { ... })
})
```

---

## Part 4: Key architectural decisions

### 4.1 Why three levels?

**Rationale**: Mirrors fairies' proven approach while adapting to agent starter's use case.

- **Interaction level**: Maps to individual requests (similar to fairies' task level)
- **Session level**: Maps to working sessions (similar to fairies' project level)
- **Global level**: Maps to persistent agent memory (similar to fairies' fairy level)

**Alternative considered**: Two levels (session/global), but three levels provides finer control and clearer separation of concerns.

### 4.2 When to trigger transitions?

**Decision**: Automatic transitions based on heuristics (size, time, action count).

**Rationale**:
- Reduces cognitive load on users
- Prevents context window overflow
- Matches fairies' automatic approach

**Trade-off**: May archive too aggressively or not aggressively enough. Solution: Make thresholds configurable.

### 4.3 How to summarize history?

**Decision**: Use pattern-based summarization initially, with option to use model-based summarization later.

**Rationale**:
- Pattern-based is fast and deterministic
- Model-based provides better quality but requires additional API calls
- Fairies uses pattern `[ACTIONS]: <filtered for brevity>` successfully

**Implementation**:
- Phase 1: Pattern-based (`HistoryCompressor` with simple logic)
- Phase 2: Add optional model-based summarization for better quality

### 4.4 Where to store archived sessions?

**Decision**: Store in `$archivedSessions` atom with localStorage persistence.

**Rationale**:
- Consistent with existing agent starter persistence pattern
- Easy to implement and debug
- Allows retrieval if user wants to "remember" old work

**Trade-off**: localStorage has size limits (~5-10MB). Solution: Implement compression and pruning of very old sessions.

### 4.5 Should users control memory levels manually?

**Decision**: Automatic by default, with manual override available.

**Rationale**:
- Most users won't understand memory levels
- Power users can manually archive if needed
- Matches fairies' approach (mode determines level automatically)

**UI**: Show current level indicator, allow manual "Archive session" button.

### 4.6 How to handle shape data at different levels?

**Decision**: Include full shape data at interaction level only, summarize at higher levels.

| Level | Shape data |
|-------|------------|
| Interaction | Full `SimpleShape` objects with all properties |
| Session | Only shape IDs and types |
| Global | Aggregate statistics (e.g., "15 rectangles created") |

**Rationale**: Shape details are only needed for immediate editing, not for long-term context.

---

## Part 5: Migration path

### 5.1 Backwards compatibility

**Existing chat history items**: Need to add `memoryLevel` field.

**Migration strategy**:
```typescript
// When loading from localStorage
function migrateHistoryItems(items: any[]): ChatHistoryItem[] {
  return items.map((item) => {
    // Add memoryLevel if missing
    if (!('memoryLevel' in item)) {
      return { ...item, memoryLevel: 'interaction' as MemoryLevel }
    }
    return item
  })
}
```

### 5.2 Gradual rollout

1. **Week 1**: Implement types and filtering (no behavior change)
2. **Week 2**: Add transition detection (logged but not executed)
3. **Week 3**: Enable transitions with conservative thresholds
4. **Week 4**: Tune thresholds based on real usage
5. **Week 5**: Add UI indicators and manual controls

### 5.3 Feature flags

```typescript
// Allow disabling memory system if issues arise
const ENABLE_MEMORY_LEVELS = localStorage.getItem('agent:memory-levels') !== 'false'

if (ENABLE_MEMORY_LEVELS) {
  // Use memory filtering
} else {
  // Use old behavior (all history)
}
```

---

## Part 6: Open questions and future work

### 6.1 Open questions

1. **Optimal transition thresholds**: What are the right values for item counts, time limits, etc.?
   - **Action**: Instrument with telemetry, tune based on real usage

2. **Model-based vs pattern-based summarization**: Which provides better results?
   - **Action**: A/B test both approaches

3. **Should screenshots be compressed?**: Images are large—how to handle them at session/global levels?
   - **Action**: Drop screenshots entirely at session+, or compress aggressively

4. **How to surface archived sessions to users?**: Should users be able to browse/restore old sessions?
   - **Action**: Add "Session history" UI panel

5. **Should memory level affect model selection?**: Use smaller models for interaction-level, larger for session/global?
   - **Action**: Experiment with model routing based on memory level

### 6.2 Future enhancements

1. **Smart milestone detection**: Use model to identify key moments ("Created logo", "Fixed bug")

2. **Semantic search across archived sessions**: Allow agent to query "What did I do with the login form?"

3. **Session branching**: Allow users to fork sessions for experimentation

4. **Collaborative session sharing**: Share session memories between multiple agents

5. **Adaptive thresholds**: Learn optimal transition points per user

6. **Visual memory**: Compress canvas states as annotated screenshots for quick context restoration

---

## Part 7: Conclusion

The fairies memory system provides a robust, battle-tested approach to managing hierarchical context in multi-turn agent interactions. By implementing a similar three-level hierarchy (interaction/session/global) with automatic transitions and history filtering, the agent starter can:

1. **Scale to longer sessions** without context overflow
2. **Maintain relevant context** through intelligent filtering
3. **Preserve important history** via summarization and archival
4. **Provide transparent behavior** through memory level indicators

The implementation path is straightforward and incremental, leveraging the agent starter's existing modular architecture. The proposed utilities (`HistoryFilterer`, `MemoryTransitionManager`, `HistoryCompressor`) integrate cleanly with minimal changes to core agent logic.

**Recommendation**: Begin implementation with Phase 1 (foundation types and filtering), validate with testing, then proceed through subsequent phases. Total implementation estimated at 3-4 weeks for full feature parity with fairies' memory system.

---

## Appendix A: File structure

```
templates/agent/
├── client/
│   ├── agent/
│   │   └── TldrawAgent.ts              [MODIFY] Add memory atoms
│   └── ui/
│       ├── MemoryLevelIndicator.tsx    [NEW] Show current level
│       └── ChatHistoryItem.tsx         [MODIFY] Render transitions
│
├── shared/
│   ├── types/
│   │   ├── MemoryLevel.ts              [NEW] Type definitions
│   │   └── ChatHistoryItem.ts          [MODIFY] Add memory transition type
│   │
│   ├── memory/
│   │   ├── HistoryFilterer.ts          [NEW] Filtering logic
│   │   ├── MemoryTransitionManager.ts  [NEW] Transition detection/execution
│   │   ├── HistoryCompressor.ts        [NEW] Summarization
│   │   └── MemoryMetrics.ts            [NEW] Size/token tracking
│   │
│   └── parts/
│       ├── ChatHistoryPartUtil.ts      [MODIFY] Use filtering
│       └── UserActionHistoryPartUtil.ts [MODIFY] Use compression
│
└── README.md                            [UPDATE] Document memory system
```

---

## Appendix B: Configuration reference

```typescript
// Recommended default values
const DEFAULT_THRESHOLDS = {
  interaction: {
    maxItems: 20,              // Transition to session after 20 items
    maxActions: 10,            // Or 10 actions
  },
  session: {
    maxItems: 50,              // Archive after 50 items
    maxRequests: 30,           // Or 30 requests
    maxInactivityMs: 3600000,  // Or 1 hour inactivity
  },
  global: {
    maxArchivedSessions: 10,   // Keep last 10 archived sessions
    maxTotalSizeMb: 5,         // Max 5MB total localStorage usage
  },
}

// Memory level configs
const MEMORY_CONFIGS = {
  interaction: {
    includeFullShapes: true,
    includeScreenshots: true,
    includeUserActions: true,
    compressionLevel: 0,
  },
  session: {
    includeFullShapes: false,  // Only IDs
    includeScreenshots: false,
    includeUserActions: true,
    compressionLevel: 1,
  },
  global: {
    includeFullShapes: false,
    includeScreenshots: false,
    includeUserActions: false,
    compressionLevel: 2,       // Aggressive
  },
}
```

---

**End of research report**
