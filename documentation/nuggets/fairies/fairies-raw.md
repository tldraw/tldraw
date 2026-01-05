---
title: Fairies - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - fairies
status: published
date: 12/21/2025
order: 3
---

# Fairies: raw notes

Internal research notes for the fairies.md article.

## Roles and orchestration modes

**Project role system:**
From `packages/fairy-shared/src/types/FairyProject.ts`:

```typescript
export type FairyProjectRole = 'orchestrator' | 'duo-orchestrator' | 'drone'
```

**Three distinct roles:**

1. **Orchestrator** - Project coordinator
   - Coordinates work, assigns tasks, reviews progress
   - Cannot be interrupted while managing a project
   - Does NOT edit the canvas directly
   - Views the entire project scope
   - Creates and manages the project plan

2. **Duo-orchestrator** - Collaborative leader
   - Leads a duo project (two-fairy collaboration)
   - Unlike regular orchestrators, CAN work on tasks themselves
   - Coordinates with one partner fairy
   - Can work in parallel or sequentially with their partner

3. **Drone** - Task executor
   - Executes assigned tasks autonomously
   - Reports completion to orchestrator
   - Works independently within task bounds
   - Cannot see outside their assigned task area

**Orchestration modes:**
From `packages/fairy-shared/src/schema/FairyModeDefinition.ts:231-369`:

**orchestrating-active:**

```typescript
{
  name: 'orchestrating-active',
  memory: 'project',
  // Available actions:
  // - start-project
  // - create-project-task
  // - direct-to-start-project-task
  // - await-tasks-completion
  // - end-project
  // - abort-project
  // - message, think, fly-to-bounds
}
```

Orchestrator actively managing project, creating and assigning tasks.

**orchestrating-waiting:**

```typescript
{
  name: 'orchestrating-waiting',
  // Passive waiting state while drones work
  // No active actions available
}
```

Orchestrator waiting for drones to complete tasks.

**duo-orchestrating-active:**

```typescript
{
  name: 'duo-orchestrating-active',
  memory: 'project',
  // Available actions include orchestrating-active plus:
  // - start-duo-project
  // - create-duo-task
  // - direct-to-start-duo-task (assign to partner)
  // - start-duo-task (work on it yourself!)
  // - await-duo-tasks-completion
  // - end-duo-project
}
```

Key difference: Duo-orchestrator can both assign tasks AND work on tasks themselves.

**duo-orchestrating-waiting:**

```typescript
{
  name: 'duo-orchestrating-waiting',
  // Waiting state in duo projects
}
```

**working-orchestrator:**

```typescript
{
  name: 'working-orchestrator',
  memory: 'task',
  // Full canvas manipulation:
  // - create, update, delete, move, rotate, resize
  // - align, distribute, stack, place
  // - label, pen, clear
  // Only sees task bounds, not full canvas
}
```

When duo-orchestrator is actively working on a task (not just coordinating).

**working-drone:**
Similar to working-orchestrator but for drone role.

**Architecture: Two-level manager system**
From `apps/dotcom/client/src/fairy/CONTEXT.md`:

**Application Level (FairyApp):**

- `FairyAppProjectsManager` - Project CRUD, member management, resume logic
- `FairyAppTaskListManager` - Task CRUD, status tracking, notifications
- `FairyAppWaitManager` - Inter-agent coordination and wake-up system

**Agent Level (FairyAgent):**

- Individual fairy behavior and mode state machine
- Specialized managers for actions, chat, positioning

**Why the project management system was built:**

1. **Complex multi-step tasks** - Enable decomposition of large work into manageable pieces
2. **Parallel work** - Multiple agents work simultaneously on different canvas areas
3. **Spatial task boundaries** - Agents don't interfere with each other's work
4. **Intelligent progress tracking** - Review cycles and quality control
5. **Flexible coordination** - Both hierarchical (orchestrator + drones) and peer (duo) collaboration

**Task division workflow:**
From `apps/dotcom/fairy-worker/src/prompt/sections/orchestration-mode.ts`:

**Planning phase:**

```
1. Orchestrator creates project plan describing:
   - High-level tasks
   - Spatial positioning on canvas (where tasks will be situated)
   - Order of execution
   - Which tasks can run in parallel
   - Notes on when to start certain tasks
```

**Key principles:**

```
- Tasks should be positioned and sized so agents can complete them coherently
- Agents only see within their task bounds
- If task outputs should overlap, task bounds should overlap
- Fully overlapping tasks shouldn't be worked on concurrently
- Moderate overlap is fine for concurrent tasks
```

**Execution phase:**

```
1. Orchestrator creates all planned tasks
2. Uses direct-to-start-project-task to start tasks in planned order
3. Uses await-tasks-completion to wait for completion notifications
4. Reviews completed tasks before proceeding
5. Can add more tasks mid-project to fix issues
6. Final integration phase to ensure coherence
```

**Task structure:**
From `packages/fairy-shared/src/types/FairyTask.ts`:

```typescript
export interface FairyTask {
	id: TaskId
	title: string
	text: string
	projectId: ProjectId | null
	assignedTo: AgentId | null
	status: 'todo' | 'in-progress' | 'done'
	x: number // Spatial bounds on canvas
	y: number
	w: number // Width of task area
	h: number // Height of task area
	pageId?: string
}
```

Tasks have explicit spatial boundaries defining what area of the canvas the agent can see and modify.

**Worker constraints:**
From `apps/dotcom/fairy-worker/src/prompt/sections/working-mode.ts`:

```
Workers:
- Can only see within task bounds
- Cannot see the entire canvas
- Have access to personal todo list for planning
- Mark tasks done when complete
- May see work from other agents appear in their space
```

**Mode state machine:**
From `apps/dotcom/client/src/fairy/CONTEXT.md:92-122`:

Each mode has lifecycle hooks:

- `onEnter` - Setup when entering the mode
- `onExit` - Cleanup when leaving the mode
- `onPromptStart` - Handle new prompt initiation
- `onPromptEnd` - Determine next action after prompt completes
- `onPromptCancel` - Handle cancellation (some modes prohibit cancellation)

**Example mode flow - Solo work:**

```
1. Fairy in 'soloing' mode receives request
2. Creates tasks for itself
3. Switches to 'working-solo' mode
4. Completes task
5. Returns to 'soloing' to check for more tasks
```

**Example mode flow - Orchestration:**

```
1. Orchestrator in 'orchestrating-active' mode
2. Assigns tasks to drones
3. Switches to 'orchestrating-waiting' (or 'standing-by')
4. Wakes up when tasks complete
5. Returns to 'orchestrating-active' to review
```

**Example mode flow - Duo project:**

```
1. Start in 'duo-orchestrating-active'
2. Can either:
   - Direct partner to work: partner enters 'working-drone'
   - Work yourself: you enter 'working-orchestrator'
3. Both can work in parallel
4. Coordinate via await-duo-tasks-completion
```

**Wait and notification system:**
From `apps/dotcom/client/src/fairy/CONTEXT.md:414-433`:

**FairyAppWaitManager (app level):**

- Central event dispatcher for broadcasting events
- `notifyTaskCompleted()` - Wakes waiting orchestrators
- `notifyAgentModeTransition()` - Broadcasts mode changes

**FairyAgentWaitManager (agent level):**

- `waitForAll()` - Set wait conditions
- `getWaitingFor()` - Check current wait state
- `notifyWaitConditionFulfilled()` - Wake agent with notification

## Memory levels: context management

**The challenge:**

- Chat history grows very long during complex projects
- A project with 3 tasks × 20 shape manipulations = 60+ detailed actions
- Including all granular task actions in every prompt wastes tokens
- Models have finite context windows (Claude 3.5 Sonnet: 200k tokens)
- Irrelevant details distract the model from current goal

**Example scenario:**

- Orchestrator creates project with 3 tasks
- Each task involves 20 shape manipulations
- Without filtering: orchestrator sees all 70 actions
- With memory levels: orchestrator sees ~10 project actions + 3 summaries
- Token savings: ~85% reduction

### Three-tier memory hierarchy

**Type definition:**
From `packages/fairy-shared/src/types/FairyMemoryLevel.ts:1`:

```typescript
export type FairyMemoryLevel = 'fairy' | 'project' | 'task'
```

**Three levels:**

1. **'fairy'** - Global, long-term memory
   - Persists across all projects and tasks
   - Core personality traits and global instructions
   - Used in modes: `idling`, `sleeping`, `one-shotting`, `soloing`

2. **'project'** - Medium-term, project-scoped memory
   - Persists across tasks within a project
   - Project-level instructions, goals, milestones
   - Cleared when project ends
   - Used in modes: `standing-by`, `orchestrating-active`, `orchestrating-waiting`, `duo-orchestrating-active`, `duo-orchestrating-waiting`

3. **'task'** - Short-term, task-scoped memory
   - High-detail, immediate context for current task
   - Granular actions and feedback
   - Cleared when task completes
   - Used in modes: `working-drone`, `working-solo`, `working-orchestrator`

### Chat history item structure

**Every chat history item includes memoryLevel:**
From `packages/fairy-shared/src/types/ChatHistoryItem.ts`:

**Prompt items:**

```typescript
export interface ChatHistoryPromptItem {
	id?: string
	type: 'prompt'
	promptSource: AgentRequestSource
	agentFacingMessage: string
	userFacingMessage: string | null
	memoryLevel: FairyMemoryLevel // <-- KEY FIELD
}
```

**Action items:**

```typescript
export interface ChatHistoryActionItem {
	id?: string
	type: 'action'
	action: Streaming<AgentAction>
	diff: RecordsDiff<TLRecord>
	acceptance: 'pending' | 'accepted' | 'rejected'
	memoryLevel: FairyMemoryLevel // <-- KEY FIELD
	timestamp?: number
}
```

**Memory transition items:**

```typescript
export interface ChatHistoryMemoryTransitionItem {
	id?: string
	type: 'memory-transition'
	memoryLevel: FairyMemoryLevel // <-- KEY FIELD
	agentFacingMessage: string
	userFacingMessage: string | null
}
```

### Core filtering logic

**The filtering function:**
From `apps/dotcom/client/src/fairy/fairy-ui/chat/filterChatHistoryByMode.ts:1-44`:

```typescript
/**
 * Filters chat history items based on the agent's current mode memory level.
 *
 * - 'fairy': Returns all items with memory level 'fairy'
 * - 'project': Returns items with memory level 'project', stopping at 'fairy' level items
 * - 'task': Returns items with memory level 'task', stopping at any other level
 */
export function filterChatHistoryByMode(
	allItems: ChatHistoryItem[],
	memoryLevel: FairyMemoryLevel
): ChatHistoryItem[] {
	switch (memoryLevel) {
		case 'fairy':
			return allItems.filter((item) => item.memoryLevel === 'fairy')
		case 'project': {
			const filteredItems: ChatHistoryItem[] = []
			for (let i = allItems.length - 1; i >= 0; i--) {
				const item = allItems[i]
				if (item.memoryLevel === 'project') {
					filteredItems.unshift(item)
				} else if (item.memoryLevel === 'task') {
					continue // Skip task-level items
				} else if (item.memoryLevel === 'fairy') {
					break // Stop at fairy-level boundary
				}
			}
			return filteredItems
		}
		case 'task': {
			const filteredItems: ChatHistoryItem[] = []
			for (let i = allItems.length - 1; i >= 0; i--) {
				const item = allItems[i]
				if (item.memoryLevel === 'task') {
					filteredItems.unshift(item)
				} else {
					break // Stop at any other level boundary
				}
			}
			return filteredItems
		}
	}
}
```

**Key behaviors:**

1. **'fairy' mode:** Shows ONLY fairy-level items (simple filter)
2. **'project' mode:** Shows project-level items, skips task items, stops at fairy boundaries
3. **'task' mode:** Shows ONLY most recent task items, stops at first non-task item

### Prompt building integration

**How filtering is applied:**
From `apps/dotcom/client/src/fairy/fairy-part-utils/ChatHistoryPartUtil.ts:1-23`:

```typescript
export class ChatHistoryPartUtil extends PromptPartUtil<ChatHistoryPart> {
	static override type = 'chatHistory' as const

	override async getPart(_request: AgentRequest) {
		const allItems = structuredClone(this.agent.chat.getHistory())

		// Get the current mode's memory level
		const modeDefinition = getFairyModeDefinition(this.agent.mode.getMode())
		const { memoryLevel } = modeDefinition

		const filteredItems = filterChatHistoryByMode(allItems, memoryLevel)

		return {
			type: 'chatHistory' as const,
			items: filteredItems,
		}
	}
}
```

Process:

1. Get all chat history items
2. Get current mode's memory level
3. Filter items based on memory level
4. Return filtered items for prompt

### Memory level assignment

**Prompts get memory level when created:**
From `apps/dotcom/client/src/fairy/fairy-agent/FairyAgent.ts:890-901`:

```typescript
const promptHistoryItem: ChatHistoryPromptItem = {
	id: uniqueId(),
	type: 'prompt',
	promptSource: request.source,
	agentFacingMessage,
	userFacingMessage,
	memoryLevel: mode.memoryLevel, // <-- From current mode
}
agent.chat.push(promptHistoryItem)
```

**Actions get memory level when executed:**
From `apps/dotcom/client/src/fairy/fairy-agent/managers/FairyAgentActionManager.ts:146-155`:

```typescript
if (util.savesToHistory()) {
	const historyItem: ChatHistoryItem = {
		id: uniqueId(),
		type: 'action',
		action,
		diff,
		acceptance: 'pending',
		memoryLevel: modeDefinition.memoryLevel, // <-- From current mode
		timestamp: action.complete ? Date.now() : undefined,
	}
	// ...
}
```

### Memory transitions

**Special chat items marking memory boundaries:**

**Task completion transition:**
From `apps/dotcom/client/src/fairy/fairy-actions/MarkSoloTaskDoneActionUtil.ts:41-57`:

```typescript
this.agent.chat.push(
	{
		id: uniqueId(),
		type: 'memory-transition',
		memoryLevel: 'fairy', // Transition back to fairy level
		agentFacingMessage: `[ACTIONS]: <Task actions filtered for brevity>`,
		userFacingMessage: null,
	},
	{
		id: uniqueId(),
		type: 'prompt',
		promptSource: 'self',
		memoryLevel: 'fairy', // Now at fairy level
		agentFacingMessage: `I just finished the task.\nID: "${currentTaskId}"\nTitle: "${currentTask.title}"\nDescription: "${currentTask.text}".`,
		userFacingMessage: null,
	}
)
```

**Project completion transition:**
From `apps/dotcom/client/src/fairy/fairy-actions/EndCurrentProjectActionUtil.ts:48-64`:

```typescript
memberAgent.chat.push(
	{
		id: uniqueId(),
		type: 'memory-transition',
		memoryLevel: 'fairy',
		agentFacingMessage: `[ACTIONS]: <Project actions filtered for brevity>`,
		userFacingMessage: null,
	},
	{
		id: uniqueId(),
		type: 'prompt',
		promptSource: 'self',
		memoryLevel: 'fairy',
		agentFacingMessage: `I led and completed the "${project.title}" project with ${otherMemberIds.length} other fairy(s): ${otherMemberIds.join(', ')}`,
		userFacingMessage: null,
	}
)
```

### What each level sees

**Task-level agent (working-drone):**

```
✓ Current task description
✓ Recent shape creation/update actions
✓ Immediate feedback on actions
✗ Other tasks in the project
✗ Project-level planning discussion
✗ Orchestrator coordination messages
✗ Sibling agent's task actions
```

**Project-level orchestrator:**

```
✓ User's initial request
✓ Project planning discussion
✓ Task creation actions
✓ Task assignment actions
✓ High-level status updates
✗ Individual shape manipulation details
✗ Internal task execution steps
✗ Fine-grained position adjustments
```

**Fairy-level agent (idling/soloing):**

```
✓ Items marked as 'fairy' level
✓ Summaries of completed projects
✓ Global instructions and personality
✗ Detailed project execution
✗ Task-specific work
✗ Temporary project state
```

### Complete memory level pipeline

1. **Agent enters mode** → Mode definition specifies `memoryLevel`

2. **User prompts agent** → Prompt item created with `memoryLevel` from current mode

3. **Agent executes actions** → Each action saved with `memoryLevel` from current mode

4. **Prompt building begins** → `ChatHistoryPartUtil.getPart()` called

5. **Filtering applied** → `filterChatHistoryByMode()` returns only relevant items

6. **Prompt sent to worker** → Filtered chat history included in `AgentPrompt`

7. **Worker builds messages** → `buildMessages()` converts chat history to model messages

8. **Model receives context** → Only sees filtered, relevant chat history

### Mode transitions and memory changes

**Example: Solo work completing a task**

1. Agent in `working-solo` mode (`memoryLevel: 'task'`)
2. Executes task actions (saved with `task` level)
3. Marks task done via `MarkSoloTaskDoneActionUtil`
4. Action util adds:
   - Memory transition item (`memoryLevel: 'fairy'`)
   - New prompt item (`memoryLevel: 'fairy'`)
5. Agent transitions to `soloing` mode (`memoryLevel: 'fairy'`)
6. Next prompt only sees fairy-level items
7. Task-level actions are now hidden

### Why memory levels exist

**Five reasons for memory levels:**

1. **Context window management** - Stay within model token limits
2. **Token efficiency** - 80-90% reduction in chat history tokens
3. **Cognitive focus** - Show only contextually appropriate information
4. **Hierarchical scoping** - Projects contain tasks, each with their own conversation
5. **Model performance** - Irrelevant details distract from current goal

## Multi-modal context: hybrid approach

**The vision problem:**

- Screenshots provide visual context: layout, colors, text content
- Screenshots alone cannot provide exact coordinates for manipulation
- Models struggle to read pixel-precise coordinates from images
- Shapes outside viewport are invisible in screenshots

**Solution: Hybrid screenshot + JSON**
Located in prompt parts system: `templates/agent/shared/parts/`

**Screenshot generation:**
From `ScreenshotPartUtil.ts:17-51`:

```typescript
override async getPart(request: AgentRequest): Promise<ScreenshotPart> {
    const contextBounds = request.bounds
    const contextBoundsBox = Box.From(contextBounds)

    // Only shapes that fit in viewport
    const shapes = editor.getCurrentPageShapesSorted().filter((shape) => {
        const bounds = editor.getShapeMaskedPageBounds(shape)
        return contextBoundsBox.includes(bounds)
    })

    const largestDimension = Math.max(request.bounds.w, request.bounds.h)
    const scale = largestDimension > 8000 ? 8000 / largestDimension : 1

    const result = await editor.toImage(shapes, {
        format: 'jpeg',
        background: true,
        bounds: Box.From(request.bounds),
        padding: 0,
        pixelRatio: 1,
        scale,
    })
}
```

**Screenshot scaling:**

- Maximum dimension: 8000px
- Scale factor calculated: `scale = largestDimension > 8000 ? 8000 / largestDimension : 1`
- Format: JPEG (compression for token efficiency)
- Background: true (includes canvas background)

## Three-tier shape format

**Format definitions:**
From `templates/agent/shared/format/`

**BlurryShape (minimal ~6 fields):**
From `BlurryShape.ts:3-11`:

```typescript
export interface BlurryShape {
	shapeId: string
	text?: string
	type: SimpleShape['_type']
	x: number
	y: number
	w: number
	h: number
}
```

**SimpleShape (full detail ~40 fields):**
From `SimpleShape.ts:10-128`:

```typescript
// Geo shapes (rectangles, ellipses, clouds, etc)
const SimpleGeoShape = z.object({
	_type: SimpleGeoShapeTypeSchema,
	color: SimpleColor,
	fill: SimpleFillSchema,
	h: z.number(),
	note: z.string(),
	shapeId: SimpleShapeIdSchema,
	text: SimpleLabel.optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})

// Text shapes
const SimpleTextShape = z.object({
	_type: z.literal('text'),
	color: SimpleColor,
	fontSize: SimpleFontSize.optional(),
	note: z.string(),
	shapeId: SimpleShapeIdSchema,
	text: SimpleLabel,
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	width: z.number().optional(),
	wrap: z.boolean().optional(),
	x: z.number(),
	y: z.number(),
})

// Arrow shapes
const SimpleArrowShape = z.object({
	_type: z.literal('arrow'),
	color: SimpleColor,
	fromId: SimpleShapeIdSchema.nullable(),
	note: z.string(),
	shapeId: SimpleShapeIdSchema,
	text: z.string().optional(),
	toId: SimpleShapeIdSchema.nullable(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
	bend: z.number().optional(),
})
```

**PeripheralShapeCluster (clustered ~5 fields):**
From `PeripheralShapesCluster.ts:1-6`:

```typescript
export interface PeripheralShapeCluster {
	bounds: BoxModel
	numberOfShapes: number
}
```

**When each format is used:**

- BlurryShape: Shapes in viewport (enough to reference by ID)
- SimpleShape: Shapes being actively edited (full properties needed)
- PeripheralShapeCluster: Shapes outside viewport (spatial awareness only)

**Clustering algorithm:**
From `convertTldrawShapesToPeripheralShapes.ts:4-54`:

```typescript
export function convertTldrawShapesToPeripheralShapes(
	editor: Editor,
	shapes: TLShape[],
	{ padding = 75 }: { padding?: number } = {}
): PeripheralShapeCluster[] {
	const expandedBounds = shapes.map((shape) => {
		return {
			shape,
			bounds: editor.getShapeMaskedPageBounds(shape)!.clone().expandBy(padding),
		}
	})

	for (let i = 0; i < expandedBounds.length; i++) {
		const item = expandedBounds[i]
		for (const group of groups) {
			if (group.bounds.includes(item.bounds)) {
				group.shapes.push(item.shape)
				group.bounds.expand(item.bounds)
				group.numberOfShapes++
				didLand = true
				break
			}
		}
		if (!didLand) {
			groups.push({
				shapes: [item.shape],
				bounds: item.bounds,
				numberOfShapes: 1,
			})
		}
	}
}
```

**Padding value:** 75px - shapes within 75px of each other are grouped together

## Coordinate offsetting system

**Chat origin tracking:**
From `TldrawAgent.ts:84-87`:

```typescript
/**
 * An atom containing the position on the page where the current chat
 * started.
 */
$chatOrigin = atom<VecModel>('chatOrigin', { x: 0, y: 0 })
```

**Origin initialization:**
From `TldrawAgent.ts:569-571`:

```typescript
reset() {
    const viewport = this.editor.getViewportPageBounds()
    this.$chatOrigin.set({ x: viewport.x, y: viewport.y })
}
```

Chat origin is set to viewport position when chat resets.

**Offset calculation:**
From `AgentHelpers.ts:35-43`:

```typescript
constructor(agent: TldrawAgent) {
    this.agent = agent
    this.editor = agent.editor
    const origin = agent.$chatOrigin.get()
    this.offset = {
        x: -origin.x,
        y: -origin.y,
    }
}
```

**Applying offset (to model):**
From `AgentHelpers.ts:65-70`:

```typescript
applyOffsetToVec(position: VecModel): VecModel {
    return {
        x: position.x + this.offset.x,
        y: position.y + this.offset.y,
    }
}
```

**Removing offset (from model):**
From `AgentHelpers.ts:75-80`:

```typescript
removeOffsetFromVec(position: VecModel): VecModel {
    return {
        x: position.x - this.offset.x,
        y: position.y - this.offset.y,
    }
}
```

**Offset for shapes:**
From `AgentHelpers.ts:109-127`:

```typescript
applyOffsetToShape(shape: SimpleShape): SimpleShape {
    if ('x1' in shape) {
        return {
            ...shape,
            x1: shape.x1 + this.offset.x,
            y1: shape.y1 + this.offset.y,
            x2: shape.x2 + this.offset.x,
            y2: shape.y2 + this.offset.y,
        }
    }
    if ('x' in shape) {
        return {
            ...shape,
            x: shape.x + this.offset.x,
            y: shape.y + this.offset.y,
        }
    }
    return shape
}
```

Handles both point-based shapes (x, y) and line-based shapes (x1, y1, x2, y2).

## Coordinate rounding system

**Rounding shapes before sending to model:**
From `AgentHelpers.ts:296-313`:

```typescript
roundShape(shape: SimpleShape): SimpleShape {
    if ('x1' in shape) {
        shape = this.roundProperty(shape, 'x1')
        shape = this.roundProperty(shape, 'y1')
        shape = this.roundProperty(shape, 'x2')
        shape = this.roundProperty(shape, 'y2')
    } else if ('x' in shape) {
        shape = this.roundProperty(shape, 'x')
        shape = this.roundProperty(shape, 'y')
    }

    if ('w' in shape) {
        shape = this.roundProperty(shape, 'w')
        shape = this.roundProperty(shape, 'h')
    }

    return shape
}
```

**Tracking rounding diffs:**
From `AgentHelpers.ts:360-365`:

```typescript
roundAndSaveNumber(number: number, key: string): number {
    const roundedNumber = Math.round(number)
    const diff = roundedNumber - number
    this.roundingDiffMap.set(key, diff)
    return roundedNumber
}
```

**Restoring original precision:**
From `AgentHelpers.ts:373-377`:

```typescript
unroundAndRestoreNumber(number: number, key: string): number {
    const diff = this.roundingDiffMap.get(key)
    if (diff === undefined) return number
    return number + diff
}
```

**Storage map:**
From `AgentHelpers.ts:60`:

```typescript
roundingDiffMap = new Map<string, number>()
```

Key format: `${shape.shapeId}_${property}` (e.g., "rectangle-1_x")

**Why rounding matters:**
Models perform better with small integers than large decimals. Coordinates like (47, 109) are easier for models than (12847.2341, -3291.8472).

## Utility architecture

**Two parallel systems:**

1. Prompt parts - What the model sees
2. Action utilities - What the model can do

**Prompt part registration:**
From `AgentUtils.ts:54-80`:

```typescript
export const PROMPT_PART_UTILS = [
	// Model
	SystemPromptPartUtil,
	ModelNamePartUtil,

	// Request
	MessagesPartUtil,
	DataPartUtil,
	ContextItemsPartUtil,

	// Viewport
	ScreenshotPartUtil,
	ViewportBoundsPartUtil,

	// Shapes
	BlurryShapesPartUtil,
	PeripheralShapesPartUtil,
	SelectedShapesPartUtil,

	// History
	ChatHistoryPartUtil,
	UserActionHistoryPartUtil,
	TodoListPartUtil,

	// Metadata
	TimePartUtil,
]
```

**Action utility registration:**
From `AgentUtils.ts:88-127`:

```typescript
export const AGENT_ACTION_UTILS = [
	// Communication
	MessageActionUtil,

	// Planning
	ThinkActionUtil,
	ReviewActionUtil,
	AddDetailActionUtil,
	TodoListActionUtil,
	SetMyViewActionUtil,

	// Individual shapes
	CreateActionUtil,
	DeleteActionUtil,
	UpdateActionUtil,
	LabelActionUtil,
	MoveActionUtil,

	// Groups of shapes
	PlaceActionUtil,
	BringToFrontActionUtil,
	SendToBackActionUtil,
	RotateActionUtil,
	ResizeActionUtil,
	AlignActionUtil,
	DistributeActionUtil,
	StackActionUtil,
	ClearActionUtil,

	// Drawing
	PenActionUtil,

	// External APIs
	RandomWikipediaArticleActionUtil,
	CountryInfoActionUtil,
	CountShapesActionUtil,

	// Internal (required)
	UnknownActionUtil,
]
```

**PromptPartUtil base class:**
From `PromptPartUtil.ts:9-93`:

```typescript
export abstract class PromptPartUtil<T extends BasePromptPart = BasePromptPart> {
	static type: string

	protected agent?: TldrawAgent
	protected editor?: Editor

	/**
	 * Get some data to add to the prompt.
	 */
	abstract getPart(request: AgentRequest, helpers: AgentHelpers): Promise<T> | T

	/**
	 * Get priority for this prompt part to determine its position in the prompt.
	 * Lower numbers have higher priority.
	 */
	getPriority(_part: T): number {
		return 0
	}

	/**
	 * Build an array of text or image content for this prompt part.
	 */
	buildContent(_part: T): string[] {
		return []
	}

	/**
	 * Build an array of messages to send to the model.
	 */
	buildMessages(part: T): AgentMessage[] {
		// Converts content to messages with appropriate type (text/image)
	}

	/**
	 * Build a system message that gets concatenated with the other system messages.
	 */
	buildSystemPrompt(_part: T): string | null {
		return null
	}
}
```

**AgentActionUtil base class:**
From `AgentActionUtil.ts:9-68`:

```typescript
export abstract class AgentActionUtil<T extends BaseAgentAction = BaseAgentAction> {
	static type: string

	protected agent?: TldrawAgent
	protected editor?: Editor

	/**
	 * Get a schema to use for the model's response.
	 */
	getSchema(): z.ZodType<T> | null {
		return null
	}

	/**
	 * Get information about the action to display within the chat history UI.
	 */
	getInfo(_action: Streaming<T>): Partial<ChatHistoryInfo> | null {
		return {}
	}

	/**
	 * Transforms the action before saving it to chat history.
	 * Useful for sanitizing or correcting actions.
	 * @returns The transformed action, or null to reject the action
	 */
	sanitizeAction(action: Streaming<T>, _helpers: AgentHelpers): Streaming<T> | null {
		return action
	}

	/**
	 * Apply the action to the editor.
	 * Any changes that happen during this function will be displayed as a diff.
	 */
	applyAction(_action: Streaming<T>, _helpers: AgentHelpers): Promise<void> | void {
		// Do nothing by default
	}

	/**
	 * Whether the action gets saved to history.
	 */
	savesToHistory(): boolean {
		return true
	}

	/**
	 * Build a system message that gets concatenated with the other system messages.
	 */
	buildSystemPrompt(): string | null {
		return null
	}
}
```

**Example: BlurryShapesPartUtil:**
From `BlurryShapesPartUtil.ts:20-66`:

```typescript
override getPart(request: AgentRequest, helpers: AgentHelpers): BlurryShapesPart {
    const shapes = editor.getCurrentPageShapesSorted()
    const contextBoundsBox = Box.From(request.bounds)

    // Get all shapes within the agent's viewport
    const shapesInBounds = shapes.filter((shape) => {
        const bounds = editor.getShapeMaskedPageBounds(shape)
        return contextBoundsBox.includes(bounds)
    })

    // Convert the shapes to the blurry shape format
    const blurryShapes = shapesInBounds
        .map((shape) => convertTldrawShapeToBlurryShape(editor, shape))
        .filter((s) => s !== null)

    // Apply the offset and round the blurry shapes
    const normalizedBlurryShapes = blurryShapes.map((shape) => {
        const bounds = helpers.roundBox(
            helpers.applyOffsetToBox({
                x: shape.x,
                y: shape.y,
                w: shape.w,
                h: shape.h,
            })
        )
        return { ...shape, x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h }
    })

    return {
        type: 'blurryShapes',
        shapes: normalizedBlurryShapes,
    }
}

override buildContent({ shapes }: BlurryShapesPart): string[] {
    if (!shapes || shapes.length === 0) return ['There are no shapes in your view at the moment.']
    return [`These are the shapes you can currently see:`, JSON.stringify(shapes)]
}
```

## Sanitization layer

**Purpose:** Catch and correct model errors before they affect the canvas

**Sanitization methods in AgentHelpers:**
From `AgentHelpers.ts`:

```typescript
// Ensure shape ID is unique by incrementing numbers
ensureShapeIdIsUnique(id: SimpleShapeId): SimpleShapeId {
    let newId = id
    let existingShape = editor.getShape(`shape:${newId}`)
    while (existingShape) {
        const match = /^.*(\d+)$/.exec(newId)?.[1]
        if (match) {
            newId = newId.replace(/(\d+)(?=\D?)$/, (m: string) => (+m + 1).toString())
        } else {
            newId = `${newId}-1`
        }
        existingShape = editor.getShape(`shape:${newId}`)
    }

    // Track transformation for future references
    if (id !== newId) {
        this.shapeIdMap.set(id, newId)
    }

    return newId
}

// Ensure shape ID refers to a real shape
ensureShapeIdExists(id: SimpleShapeId): SimpleShapeId | null {
    // Check transformation map first
    const existingId = this.shapeIdMap.get(id)
    if (existingId) return existingId

    // Check if shape exists
    const existingShape = editor.getShape(createShapeId(id))
    if (existingShape) return id

    // Otherwise reject
    return null
}

// Type validation
ensureValueIsNumber(value: any): number | null {
    if (typeof value === 'number') return value

    if (typeof value === 'string') {
        const parsedValue = parseFloat(value)
        if (isNaN(parsedValue)) return null
        return parsedValue
    }

    return null
}

ensureValueIsBoolean(value: any): boolean | null {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value > 0
    if (typeof value === 'string') return value !== 'false'
    return null
}
```

**Example sanitization in CreateActionUtil:**
From `CreateActionUtil.ts:36-70`:

```typescript
override sanitizeAction(action: Streaming<CreateAction>, helpers: AgentHelpers) {
    if (!action.complete) return action

    const { shape } = action

    // Ensure the created shape has a unique ID
    shape.shapeId = helpers.ensureShapeIdIsUnique(shape.shapeId)

    // If the shape is an arrow, ensure the from and to IDs are real shapes
    if (shape._type === 'arrow') {
        if (shape.fromId) {
            shape.fromId = helpers.ensureShapeIdExists(shape.fromId)
        }
        if (shape.toId) {
            shape.toId = helpers.ensureShapeIdExists(shape.toId)
        }
        if ('x1' in shape) {
            shape.x1 = helpers.ensureValueIsNumber(shape.x1) ?? 0
        }
        if ('y1' in shape) {
            shape.y1 = helpers.ensureValueIsNumber(shape.y1) ?? 0
        }
        if ('x2' in shape) {
            shape.x2 = helpers.ensureValueIsNumber(shape.x2) ?? 0
        }
        if ('y2' in shape) {
            shape.y2 = helpers.ensureValueIsNumber(shape.y2) ?? 0
        }
        if ('bend' in shape) {
            shape.bend = helpers.ensureValueIsNumber(shape.bend) ?? 0
        }
    }

    return action
}
```

**Sanitization is critical because:**

- Models reference non-existent shape IDs
- Models output strings where numbers expected
- Models provide coordinates out of bounds
- Models duplicate IDs
- Models make type errors (string vs number)

**ID transformation tracking:**
From `AgentHelpers.ts:54`:

```typescript
shapeIdMap = new Map<string, string>()
```

If model creates shape "box" but ID exists, rename to "box-1" and store mapping so model can continue referring to "box".

## Multi-turn loop system

**Core loop structure:**
From `TldrawAgent.ts:304-345`:

```typescript
async prompt(input: AgentInput) {
    const request = this.getFullRequestFromInput(input)

    // Submit the request to the agent
    await this.request(request)

    // After the request is handled, check if there are any outstanding todo items or requests
    let scheduledRequest = this.$scheduledRequest.get()
    const todoItemsRemaining = this.$todoList.get().filter((item) => item.status !== 'done')

    if (!scheduledRequest) {
        // If there are no outstanding todo items or requests, finish
        if (todoItemsRemaining.length === 0 || !this.cancelFn) {
            return
        }

        // If there are outstanding todo items, schedule a request
        scheduledRequest = {
            messages: request.messages,
            contextItems: request.contextItems,
            bounds: request.bounds,
            modelName: request.modelName,
            selectedShapes: request.selectedShapes,
            data: request.data,
            type: 'todo',
        }
    }

    // Add the scheduled request to chat history
    const resolvedData = await Promise.all(scheduledRequest.data)
    this.$chatHistory.update((prev) => [...prev, {
        type: 'continuation',
        data: resolvedData,
    }])

    // Handle the scheduled request (recursive)
    this.$scheduledRequest.set(null)
    await this.prompt(scheduledRequest)
}
```

**Three continuation mechanisms:**

**1. Scheduled requests:**
From `TldrawAgent.ts:407-431`:

```typescript
schedule(input: AgentInput) {
    const scheduledRequest = this.$scheduledRequest.get()

    // If there's no request scheduled yet, schedule one
    if (!scheduledRequest) {
        this.setScheduledRequest(input)
        return
    }

    const request = this.getPartialRequestFromInput(input)

    this.setScheduledRequest({
        type: 'schedule',

        // Append to properties where possible
        messages: [...scheduledRequest.messages, ...(request.messages ?? [])],
        contextItems: [...scheduledRequest.contextItems, ...(request.contextItems ?? [])],
        selectedShapes: [...scheduledRequest.selectedShapes, ...(request.selectedShapes ?? [])],
        data: [...scheduledRequest.data, ...(request.data ?? [])],

        // Override specific properties
        bounds: request.bounds ?? scheduledRequest.bounds,
        modelName: request.modelName ?? scheduledRequest.modelName,
    })
}
```

**2. Todo list:**
From `TodoListActionUtil.ts:31-49`:

```typescript
override applyAction(action: Streaming<TodoListAction>) {
    if (!action.complete) return
    if (!this.agent) return

    const todoItem = {
        id: action.id,
        status: action.status,
        text: action.text,
    }

    this.agent.$todoList.update((todoItems) => {
        const index = todoItems.findIndex((item) => item.id === action.id)
        if (index !== -1) {
            return [...todoItems.slice(0, index), todoItem, ...todoItems.slice(index + 1)]
        } else {
            return [...todoItems, todoItem]
        }
    })
}
```

**3. Data passing:**
From `RandomWikipediaArticleActionUtil.ts:34-44`:

```typescript
override async applyAction(
    action: Streaming<RandomWikipediaArticleAction>,
    _helpers: AgentHelpers
) {
    // Wait until the action has finished streaming
    if (!action.complete) return
    if (!this.agent) return

    const article = await fetchRandomWikipediaArticle()
    this.agent.schedule({ data: [article] })
}
```

**Loop termination conditions:**

1. No scheduled request AND
2. No incomplete todo items

## Streaming and real-time feedback

**Streaming from worker:**
From `AgentService.ts:50-152`:

```typescript
async function* streamActions(
	model: LanguageModel,
	prompt: AgentPrompt
): AsyncGenerator<Streaming<AgentAction>> {
	messages.push({
		role: 'assistant',
		content: '{"actions": [{"_type":',
	})

	const { textStream } = streamText({
		model,
		system: systemPrompt,
		messages,
		maxOutputTokens: 8192,
		temperature: 0,
	})

	let buffer = canForceResponseStart ? '{"actions": [{"_type":' : ''
	let cursor = 0
	let maybeIncompleteAction: AgentAction | null = null

	for await (const text of textStream) {
		buffer += text

		const partialObject = closeAndParseJson(buffer)
		if (!partialObject) continue

		const actions = partialObject.actions
		if (!Array.isArray(actions)) continue
		if (actions.length === 0) continue

		// If the events list is ahead of the cursor, we know we've completed the current event
		if (actions.length > cursor) {
			const action = actions[cursor - 1]
			if (action) {
				yield {
					...action,
					complete: true,
					time: Date.now() - startTime,
				}
				maybeIncompleteAction = null
			}
			cursor++
		}

		// Now let's check the (potentially new) current event
		const action = actions[cursor - 1]
		if (action) {
			if (!maybeIncompleteAction) {
				startTime = Date.now()
			}

			maybeIncompleteAction = action

			// Yield the potentially incomplete event
			yield {
				...action,
				complete: false,
				time: Date.now() - startTime,
			}
		}
	}

	// Complete final action if incomplete
	if (maybeIncompleteAction) {
		yield {
			...maybeIncompleteAction,
			complete: true,
			time: Date.now() - startTime,
		}
	}
}
```

**JSON parsing for incomplete streams:**
From `closeAndParseJson.ts:1-72`:

```typescript
/**
 * JSON helper. Given a potentially incomplete JSON string, return the parsed object.
 * The string might be missing closing braces, brackets, or other characters like quotation marks.
 */
export function closeAndParseJson(string: string) {
	const stackOfOpenings = []

	// Track openings and closings
	let i = 0
	while (i < string.length) {
		const char = string[i]
		const lastOpening = stackOfOpenings.at(-1)

		if (char === '"') {
			// Check if this quote is escaped
			if (i > 0 && string[i - 1] === '\\') {
				i++
				continue
			}

			if (lastOpening === '"') {
				stackOfOpenings.pop()
			} else {
				stackOfOpenings.push('"')
			}
		}

		if (lastOpening === '"') {
			i++
			continue
		}

		if (char === '{' || char === '[') {
			stackOfOpenings.push(char)
		}

		if (char === '}' && lastOpening === '{') {
			stackOfOpenings.pop()
		}

		if (char === ']' && lastOpening === '[') {
			stackOfOpenings.pop()
		}

		i++
	}

	// Now close all unclosed openings
	for (let i = stackOfOpenings.length - 1; i >= 0; i--) {
		const opening = stackOfOpenings[i]
		if (opening === '{') string += '}'
		if (opening === '[') string += ']'
		if (opening === '"') string += '"'
	}

	try {
		return JSON.parse(string)
	} catch (_e) {
		return null
	}
}
```

**Action yielding pattern:**
Each action is yielded twice:

1. First time: `complete: false` (still streaming, partial data)
2. Second time: `complete: true` (fully received)

**Reverting incomplete actions:**
From `TldrawAgent.ts:746-763`:

```typescript
for await (const action of streamAgent({ prompt, signal })) {
	editor.run(() => {
		const actionUtil = agent.getAgentActionUtil(action._type)

		// Sanitize the agent's action
		const transformedAction = actionUtil.sanitizeAction(action, helpers)
		if (!transformedAction) {
			incompleteDiff = null
			return
		}

		// If there was a diff from an incomplete action, revert it
		if (incompleteDiff) {
			const inversePrevDiff = reverseRecordsDiff(incompleteDiff)
			editor.store.applyDiff(inversePrevDiff)
		}

		// Apply the action to the app and editor
		const { diff, promise } = agent.act(transformedAction, helpers)

		// Save diff if action is incomplete
		if (transformedAction.complete) {
			incompleteDiff = null
		} else {
			incompleteDiff = diff
		}
	})
}
```

## Architecture patterns

**Reactive state management:**
From `TldrawAgent.ts:70-115`:

```typescript
/**
 * An atom containing the currently active request.
 */
$activeRequest = atom<AgentRequest | null>('activeRequest', null)

/**
 * An atom containing the next request that the agent has scheduled for itself.
 */
$scheduledRequest = atom<AgentRequest | null>('scheduledRequest', null)

/**
 * An atom containing the agent's chat history.
 */
$chatHistory = atom<ChatHistoryItem[]>('chatHistory', [])

/**
 * An atom containing the position on the page where the current chat started.
 */
$chatOrigin = atom<VecModel>('chatOrigin', { x: 0, y: 0 })

/**
 * An atom containing the agent's todo list.
 */
$todoList = atom<TodoItem[]>('todoList', [])

/**
 * An atom containing document changes made by the user since the previous request.
 */
$userActionHistory = atom<RecordsDiff<TLRecord>[]>('userActionHistory', [])

/**
 * An atom containing currently selected context items.
 */
$contextItems = atom<ContextItem[]>('contextItems', [])

/**
 * An atom containing the model name that the user has selected.
 */
$modelName = atom<AgentModelName>('modelName', DEFAULT_MODEL_NAME)
```

All state stored in reactive atoms from `@tldraw/state`.

**Persistence:**
From `TldrawAgent.ts:131-135`:

```typescript
persistAtomInLocalStorage(this.$chatHistory, `${id}:chat-history`)
persistAtomInLocalStorage(this.$chatOrigin, `${id}:chat-origin`)
persistAtomInLocalStorage(this.$modelName, `${id}:model-name`)
persistAtomInLocalStorage(this.$todoList, `${id}:todo-items`)
persistAtomInLocalStorage(this.$contextItems, `${id}:context-items`)
```

**User action tracking:**
From `TldrawAgent.ts:591-636`:

```typescript
private startRecordingUserActions() {
    const cleanUpCreate = editor.sideEffects.registerAfterCreateHandler(
        'shape',
        (shape, source) => {
            if (source !== 'user') return
            if (this.isActing) return
            const change = {
                added: { [shape.id]: shape },
                updated: {},
                removed: {},
            }
            this.$userActionHistory.update((prev) => [...prev, change])
        }
    )

    const cleanUpDelete = editor.sideEffects.registerAfterDeleteHandler(
        'shape',
        (shape, source) => {
            if (source !== 'user') return
            if (this.isActing) return
            const change = {
                added: {},
                updated: {},
                removed: { [shape.id]: shape },
            }
            this.$userActionHistory.update((prev) => [...prev, change])
        }
    )

    const cleanUpChange = editor.sideEffects.registerAfterChangeHandler(
        'shape',
        (prev, next, source) => {
            if (source !== 'user') return
            if (this.isActing) return
            const change = {
                added: {},
                updated: { [prev.id]: [prev, next] },
                removed: {},
            }
            this.$userActionHistory.update((prev) => [...prev, change])
        }
    )
}
```

Tracks user edits between agent turns so model can see what changed.

**isActing flag:**
From `TldrawAgent.ts:585`:

```typescript
/**
 * Whether the agent is currently acting on the editor or not.
 * This flag is used to prevent agent actions from being recorded as user actions.
 */
private isActing = false
```

Prevents agent's own actions from being recorded as user actions.

## Performance and token optimization

**Screenshot constraints:**

- Maximum dimension: 8000px
- Format: JPEG (lossy compression)
- No shapes = no screenshot sent

**Token savings from three-tier format:**

- BlurryShape: ~6 fields × 20 shapes = ~120 fields
- SimpleShape: ~40 fields × 20 shapes = ~800 fields
- Saving: ~85% reduction for viewport shapes

**Peripheral clustering:**

- Padding: 75px
- Single cluster can represent hundreds of shapes
- Example: "47 shapes to the north" vs sending all 47 shapes

**Coordinate rounding:**

- Reduces decimal noise: `12847.234` → `12847`
- Smaller JSON payloads
- Easier for model to process

**Integer offsetting benefits:**

- Large coordinate: (12847, -3291) - harder for model
- Offset coordinate: (47, 109) - easier for model
- Model accuracy improvement (not quantified in code)

## Edge cases and error handling

**Cancellation:**
From `TldrawAgent.ts:722-800`:

```typescript
const controller = new AbortController()
const signal = controller.signal

const cancel = () => {
	cancelled = true
	controller.abort('Cancelled by user')
}
```

Uses AbortController to cancel in-flight requests.

**Error boundaries:**
From `TldrawAgent.ts:786-791`:

```typescript
catch (e) {
    if (e === 'Cancelled by user' || (e instanceof Error && e.name === 'AbortError')) {
        return
    }
    agent.onError(e)
}
```

**Shape lock handling:**
From `TldrawAgent.ts:779-782`:

```typescript
editor.run(
	() => {
		// action execution
	},
	{
		ignoreShapeLock: false,
		history: 'ignore',
	}
)
```

Respects shape locks, doesn't add to undo/redo history.

**Incomplete action handling:**
If model stops mid-action or changes direction, incomplete diff is reverted before applying new action.

**Shape ID collision:**
Auto-increment numeric suffix until unique ID found, track mapping for future references.

## Interrupt system

**Purpose:** Allow immediate control flow changes in agent behavior - stop current work, switch modes, and optionally start new work.

**Core interrupt method:**
From `FairyAgent.ts:642-651`:

```typescript
interrupt({ input, mode }: { input: AgentInput | null; mode?: FairyModeDefinition['type'] }) {
    this.requests.cancel()

    if (mode) {
        this.mode.setMode(mode)
    }
    if (input !== null) {
        this.schedule(input)
    }
}
```

**Three operations in sequence:**

1. **Cancel active request:** `this.requests.cancel()` stops any in-flight generation
2. **Switch mode (optional):** `this.mode.setMode(mode)` transitions to new mode
3. **Schedule new work (optional):** `this.schedule(input)` queues new request

**When input is null:**
Used to cancel current work without starting new work. Agent stops generating and returns to current mode.

**Key use cases:**

**1. User sends new message:**
From `FairySingleChatInput.tsx:43-50`:

```typescript
agent.interrupt({
	input: {
		agentMessages: [value],
		userMessages: [value],
		bounds: fairyVision,
		source: 'user',
	},
})
```

Whenever user sends a message, it interrupts current work (if any) and starts new work. No mode switch needed - fairy handles new request in current mode context.

**2. Task completion:**
From `MarkSoloTaskDoneActionUtil.ts:62-72`:

```typescript
this.agent.interrupt({
	mode: 'soloing',
	input: {
		bounds: {
			x: currentTask.x ?? currentBounds.x,
			y: currentTask.y ?? currentBounds.y,
			w: currentTask.w ?? currentBounds.w,
			h: currentTask.h ?? currentBounds.h,
		},
	},
})
```

When fairy finishes a solo task, interrupt switches from `working-solo` back to `soloing` mode and continues in task bounds to check for more work.

**3. Error correction:**
From `DirectToStartTaskActionUtil.ts:53-57`:

```typescript
if (otherFairyId === this.agent.id) {
	this.agent.interrupt({
		input: 'You cannot direct yourself to do a task. Please direct another fairy to do the task.',
	})
	return
}
```

When fairy makes an error (like trying to assign task to itself), interrupt provides corrective feedback without mode change.

**4. Cross-fairy coordination:**
From `DirectToStartTaskActionUtil.ts:96-99`:

```typescript
otherFairy.interrupt({
	mode: 'working-drone',
	input: otherFairyInput,
})
```

Orchestrator interrupts another fairy, switches them to `working-drone` mode, and gives them task instructions.

**5. Drone task completion:**
From `MarkDroneTaskDoneActionUtil.ts:63`:

```typescript
this.agent.interrupt({ mode: 'standing-by', input: null })
```

Drone finishes task and switches to `standing-by` mode without new input - waits for orchestrator's next instruction.

**Interrupt vs schedule:**

- **interrupt:** Cancels current work, optionally switches mode, starts new work
- **schedule:** Adds work to queue without cancelling current generation

**Request cancellation mechanism:**
Interrupt calls `this.requests.cancel()` which:

1. Sets `cancelled = true` flag
2. Calls `controller.abort('Cancelled by user')` on AbortController
3. Stops streaming from worker
4. Clears active and scheduled requests

**Mode lifecycle during interrupt:**

1. Current mode's `onExit()` hook called
2. Mode switched to new mode
3. New mode's `onEnter()` hook called
4. If input provided, scheduled request processed

**Interrupt cannot be prevented:**
Unlike some actions that check mode restrictions, interrupt always succeeds. This ensures fairies can always be stopped by users or by system logic.

**Project context and interrupts:**

When disbanding projects, all members interrupted simultaneously:
From `FairyAppProjectsManager.ts:236`:

```typescript
memberAgent.interrupt({ mode: 'idling', input: null })
```

All project members returned to `idling` with no new input, clearing their work state.

**Orchestrator protection:**
Orchestrators typically cannot be interrupted by user while managing a project. UI prevents interaction. However, orchestrators CAN interrupt themselves or be interrupted by system actions (like project disband).

## Constants and configuration

**Peripheral shape clustering:**

- Padding: 75px (from `PeripheralShapesPartUtil.ts:40`)

**Screenshot scaling:**

- Max dimension: 8000px (from `ScreenshotPartUtil.ts:37`)

**Model settings:**
From `AgentService.ts:72-73`:

- maxOutputTokens: 8192
- temperature: 0 (deterministic)

**Action streaming:**

- Format: Server-Sent Events (SSE)
- Prefix: `data: ` (from worker streaming)
- Complete actions yield twice (incomplete + complete)

## Prompt engineering patterns (research)

**Reference:** Anthropic's Applied AI team on effective context engineering:

> "System prompts should be extremely clear and use simple, direct language that presents ideas at the right altitude for the agent … The optimal altitude strikes a balance: specific enough to guide behavior effectively, yet flexible enough to provide the agent with strong heuristics to guide behavior."

The fairy system demonstrates sophisticated prompt engineering across multiple dimensions:

### 1. Altitude control via dynamic flags

**Pattern:** Conditional prompt sections based on available actions and context
From `getSystemPromptFlags.ts:1-126`:

```typescript
export function getSystemPromptFlags(
	mode: ActiveFairyModeDefinition['type'],
	actions: AgentAction['_type'][],
	parts: PromptPart['type'][]
) {
	return {
		// Mode flags
		isOneshotting: mode === 'one-shotting',
		isSoloing: mode === 'soloing',
		isWorking:
			mode === 'working-drone' || mode === 'working-solo' || mode === 'working-orchestrator',

		// Action flags
		hasCreate: actions.includes('create'),
		hasMove: actions.includes('move'),
		hasReview: actions.includes('review'),

		// Context flags
		hasScreenshotPart: parts.includes('screenshot'),
		hasBlurryShapesPart: parts.includes('blurryShapes'),
		// ... 40+ flags total
	}
}
```

**Usage in prompts:**
From `rules-section.ts:69-77`:

```typescript
${flagged(
	flags.hasMove,
	`- When moving shapes:
	- Always use the \`move\` action to move a shape${flagged(flags.hasUpdate, ', never the `update` action')}.`
)}
```

**Why this works:**

- Prompts only include relevant instructions for available capabilities
- Reduces token waste and cognitive load
- Prevents model from attempting unavailable actions
- Enables progressive feature disclosure

**Examples of altitude adjustment:**

- Workers see task-focused instructions, orchestrators see project management instructions
- When `hasScreenshotPart` is true, references to "your view" and "the image" appear
- Arrow creation instructions only appear when `hasCreate` is true
- Review guidance only appears when `hasReview` is true

### 2. Clear role definition through mode-specific sections

**Pattern:** Separate prompt sections for each mode with distinct responsibilities

**Orchestrator prompt (orchestration-mode.ts:4-26):**

```
"You are in charge of orchestrating a project. Here is how you should do that.
- First, you must first start the project. This involes creating a brief project plan...
- Once you've created the project plan. Create every task...
- Then, direct the agents to start their tasks in the order you've planned...
- You cannot edit the canvas. As the recruits work on the project, the state is ever changing..."
```

**Worker prompt (working-mode.ts:4-5):**

```
"What you should do now is carry out the task you're assigned to. You have a set of tools you can use...
You're only able to see within the bounds of the task; you cannot see the entire canvas.
Once you've finished the task, mark it as done."
```

**Solo prompt (soloing-mode.ts:4-11):**

```
"What you should do now is plan how you're going to respond to the user's request.
Depending on the request you should either respond to the user, start a task assigned to you,
or create some tasks yourself and then start the first one."
```

**Why this works:**

- Each role gets crisp, focused instructions
- No cognitive overhead from irrelevant guidance
- Clear boundaries of responsibility
- Prevents mode confusion and role drift

### 3. Concrete examples and edge case coverage

**Pattern:** Specific guidance with edge cases explicitly called out

**Arrow bend direction (rules-section.ts:97-108):**

```
"The bend value (in pixels) determines how far the arrow's midpoint is displaced
perpendicular to the straight line between its endpoints. To determine the correct sign:
- Calculate the arrow's direction vector: (dx = x2 - x1, dy = y2 - y1)
- The perpendicular direction (90° counterclockwise) is: (-dy, dx)
- Positive bend displaces the midpoint in the direction of (-dy, dx)
- Examples:
	- Arrow going RIGHT (dx > 0, dy = 0): positive bend curves DOWN
	- Arrow going LEFT (dx < 0, dy = 0): positive bend curves UP
	- Arrow going DOWN (dx = 0, dy > 0): positive bend curves RIGHT
	- Arrow going UP (dx = 0, dy < 0): positive bend curves LEFT
- Or simply: positive bend rotates the perpendicular 90° counterclockwise from the arrow's direction.
- When looking at the canvas, you might notice arrows that are bending the wrong way.
  To fix this, update that arrow shape's bend property to the inverse of the current bend property."
```

**Text shape sizing (rules-section.ts:112-120):**

```
"When creating a text shape, you must take into account how much space the text will take up...
- By default, the width of text shapes will grow to fit the text content.
- The easiest way to make sure text fits within an area is to set the `maxWidth` property.
- The font size of a text shape is the height of the text.
- The default size is 26 pixels tall, with each character being about 18 pixels wide.
- Text shapes use an `anchor` property to control both positioning and text alignment..."
```

**Why this works:**

- Models struggle with spatial reasoning - explicit formulas help
- Concrete numbers (26px, 18px) ground the model's understanding
- Edge cases prevent common mistakes
- "Or simply:" provides mental model shortcut

### 4. Strong heuristics embedded in rules

**Pattern:** Direct, imperative guidance on decision-making

**From rules-section.ts:122-123:**

```
"Be careful with labels. Did the user ask for labels on their shapes?
Did the user ask for a format where labels would be appropriate? If yes, add labels to shapes.
If not, do not add labels to shapes.
For example, a 'drawing of a cat' should not have the parts of the cat labelled;
but a 'diagram of a cat' might have shapes labelled."
```

**From orchestration-mode.ts:8-14:**

```
"Projects should be coherent. Agents are only able to see and work within the bounds of current task.
Therefore, tasks should be positioned and sized in a way that allows them to be completed in a coherent way.
If you're drawing a picture, the task to add a background should obviously overlap a task to, say,
add an object to the foreground. The logic of what should go where should rule how you position and size tasks."
```

**From rules-section.ts:148:**

```
"Don't offer to help the user. You can help them if you like, but you are not a helpful assistant."
```

**Why this works:**

- Clear decision trees for common questions
- Prevents over-helpful behavior that breaks character
- Spatial reasoning heuristics encoded explicitly
- Concrete examples of good vs bad choices

### 5. Schema-first design with structured outputs

**Pattern:** JSON schema defines agent capabilities, enforced at runtime

**From buildSystemPrompt.ts:75-81:**

```typescript
function buildSchemaPromptSection(actions: AgentAction['_type'][]) {
	return `## JSON schema

This is the JSON schema for the events you can return. You must conform to this schema.
You must only return things in this format, otherwise your response will error.
Remember, do NOT wrap any response in a code block using \`\`\`json. Output ONLY the json itself

${JSON.stringify(buildResponseSchema(actions), null, 2)}`
}
```

**Action schema example (from create action):**

```typescript
const SimpleGeoShape = z.object({
	_type: SimpleGeoShapeTypeSchema,
	color: SimpleColor,
	fill: SimpleFillSchema,
	h: z.number(),
	note: z.string(),
	shapeId: SimpleShapeIdSchema,
	text: SimpleLabel.optional(),
	// ... full type definition
})
```

**Why this works:**

- Schema acts as ground truth for available actions
- Type safety at the prompt level
- Clear contract between model and system
- Prevents hallucinated action types

### 6. Contextual composability through modular sections

**Pattern:** System prompt assembled from reusable sections based on mode

**From buildSystemPrompt.ts:24-53:**

```typescript
export function buildSystemPrompt(prompt: AgentPrompt, opts: { withSchema: boolean }) {
	const { mode, work } = prompt.mode

	const modeDefinition = getActiveFairyModeDefinition(mode)
	const availableActions = modeDefinition.actions(work)
	const availableParts = modeDefinition.parts(work)
	const flags = getSystemPromptFlags(mode, availableActions, availableParts)

	const lines = [
		buildIntroPromptSection(flags), // Who you are
		buildRulesPromptSection(flags), // What you can do
		buildModePromptSection(flags), // What you should do
	]

	if (withSchema) {
		lines.push(buildSchemaPromptSection(availableActions))
	}

	return normalizeNewlines(lines.join('\n'))
}
```

**Why this works:**

- Maximizes prompt caching efficiency (shared sections)
- Mode-specific behavior emerges from composition
- Easy to maintain and update individual sections
- Clear separation of concerns

### 7. Progressive disclosure of information

**Pattern:** Show only relevant shapes and context based on viewport and mode

**Three-tier shape format:**

- **BlurryShape** (~6 fields): Shapes in viewport - just enough to reference
- **SimpleShape** (~40 fields): Shapes being edited - full detail
- **PeripheralShapeCluster** (~5 fields): Shapes outside viewport - spatial awareness only

**Memory levels from mode definitions:**

- `'project'` memory: Orchestrators see entire canvas and project context
- `'task'` memory: Workers see only their assigned task bounds
- No memory level: Minimal context

**Why this works:**

- Reduces token usage by 85% for viewport shapes
- Prevents context window overflow
- Focuses model attention on relevant information
- Maintains spatial awareness without overwhelming detail

### 8. Sanitization layer catches model errors

**Pattern:** Validate and correct actions before applying to canvas

**From AgentHelpers.ts sanitization methods:**

```typescript
// Ensure shape ID is unique by incrementing numbers
ensureShapeIdIsUnique(id: SimpleShapeId): SimpleShapeId {
	let newId = id
	while (editor.getShape(`shape:${newId}`)) {
		newId = newId.replace(/(\d+)(?=\D?)$/, (m: string) => (+m + 1).toString())
	}
	// Track transformation for future references
	if (id !== newId) {
		this.shapeIdMap.set(id, newId)
	}
	return newId
}

// Ensure shape ID refers to a real shape
ensureShapeIdExists(id: SimpleShapeId): SimpleShapeId | null {
	const existingId = this.shapeIdMap.get(id)
	if (existingId) return existingId

	const existingShape = editor.getShape(createShapeId(id))
	if (existingShape) return id

	return null // Reject invalid references
}
```

**Why this works:**

- Models make systematic errors (duplicate IDs, invalid references, type mistakes)
- Sanitization maintains consistency without requiring perfect model behavior
- ID mapping allows model to continue using original names
- Graceful degradation instead of hard failures

### 9. Multi-modal context optimization

**Pattern:** Hybrid screenshot + JSON for complementary information

**From fairies-raw.md multi-modal section:**

```
The vision problem:
- Screenshots provide visual context: layout, colors, text content
- Screenshots alone cannot provide exact coordinates for manipulation
- Models struggle to read pixel-precise coordinates from images
- Shapes outside viewport are invisible in screenshots

Solution: Hybrid screenshot + JSON
```

**Screenshot constraints:**

- Maximum dimension: 8000px (scaling for token efficiency)
- Format: JPEG (lossy compression)
- Only shapes in viewport included
- Coordinate system aligned with JSON data

**Why this works:**

- Screenshot provides visual verification and layout understanding
- JSON provides precise manipulation coordinates
- Complementary strengths of vision and structured data
- Token-efficient representation of visual information

### 10. Coordinate space simplification

**Pattern:** Offset coordinates to small integers for model comprehension

**From AgentHelpers.ts:35-43:**

```typescript
constructor(agent: TldrawAgent) {
	const origin = agent.$chatOrigin.get()
	this.offset = {
		x: -origin.x,
		y: -origin.y,
	}
}
```

**Rounding system:**

```typescript
roundAndSaveNumber(number: number, key: string): number {
	const roundedNumber = Math.round(number)
	const diff = roundedNumber - number
	this.roundingDiffMap.set(key, diff)  // Save for later restoration
	return roundedNumber
}
```

**Why this works:**

- Large coordinates like (12847.234, -3291.872) are hard for models
- Offset coordinates like (47, 109) are easier to process
- Rounding removes decimal noise without losing precision
- Original precision restored when converting back

### Summary: Key prompt engineering principles demonstrated

1. **Contextual adaptation**: Prompts adjust dynamically to mode, available actions, and context
2. **Cognitive load management**: Show only relevant information, hide irrelevant complexity
3. **Concrete over abstract**: Specific examples and measurements instead of vague guidance
4. **Strong constraints**: JSON schema + sanitization creates guardrails for model behavior
5. **Multi-modal synergy**: Combine vision and structured data for complementary strengths
6. **Error tolerance**: Graceful handling of systematic model mistakes through sanitization
7. **Clear roles**: Mode-specific prompts eliminate ambiguity about responsibilities
8. **Spatial grounding**: Explicit formulas and examples for geometric reasoning
9. **Progressive complexity**: Simple base prompts with conditional elaboration
10. **Token efficiency**: Three-tier formats, clustering, and compression throughout

The fairy system achieves the "goldilocks zone" described by Anthropic:

- **Specific enough**: Concrete examples, edge cases, formulas for spatial reasoning
- **Flexible enough**: Strong heuristics guide behavior without over-constraining
- **Right altitude**: Each mode gets appropriately detailed instructions for its scope

This is sophisticated prompt engineering that handles the challenges of spatial AI agents:

- Coordinate system complexity → Offsetting and rounding
- Visual understanding limitations → Hybrid screenshot + JSON
- Attention management → Three-tier shape formats and progressive disclosure
- Role ambiguity → Mode-specific prompt sections
- Systematic errors → Sanitization layer with ID mapping
- Token efficiency → Dynamic flags and contextual composition
