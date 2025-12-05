# Fairy system context

## Overview

The fairy system is an AI agent framework for tldraw.com that provides intelligent canvas assistants. Fairies are visual AI agents with sprite avatars that can interact with the canvas, perform tasks, and collaborate with users and other fairies. They appear as small animated sprites that move around the canvas as they work.

## Architecture

The fairy system uses a two-level manager architecture:

1. **Application level** (`FairyApp`): Manages global fairy state, agent lifecycle, projects, tasks, and coordination
2. **Agent level** (`FairyAgent`): Manages individual fairy behavior, mode state machine, chat, and canvas actions

### Application layer (`fairy-app/`)

**FairyApp** (`fairy-app/FairyApp.ts`)

The central coordinator for the fairy system. One instance per editor.

- Manages global state (isApplyingAction, debugFlags, modelSelection)
- Coordinates all app-level managers
- Handles state persistence (load/save/auto-save)
- Provides React context via `FairyAppProvider`

**App managers** (`fairy-app/managers/`)

All app managers extend `BaseFairyAppManager` with `reset()` and `dispose()` methods:

- **FairyAppAgentsManager**: Agent lifecycle - creation, sync with configs, disposal
- **FairyAppFollowingManager**: Camera following - tracks which fairy to follow, zoom behavior
- **FairyAppPersistenceManager**: State persistence - load, save, auto-save with throttling
- **FairyAppProjectsManager**: Project CRUD, disband, resume, member management
- **FairyAppTaskListManager**: Task CRUD, assignment, status updates, notifications
- **FairyAppWaitManager**: Wait/notification system for inter-agent coordination

**FairyAppProvider** (`fairy-app/FairyAppProvider.tsx`)

React provider that:

- Creates `FairyApp` instance on mount
- Syncs agents with user's fairy configs
- Loads/saves persisted state
- Provides `useFairyApp()` hook for context access

### Agent layer (`fairy-agent/`)

**FairyAgent** (`fairy-agent/FairyAgent.ts`)

- Main agent class that orchestrates AI interactions
- References `FairyApp` for app-level operations
- Delegates functionality to specialized manager classes
- Coordinates with the AI backend for generation
- Contains computed state for fairy entity and configuration
- Handles prompt preparation, request management, and scheduling

**Agent managers** (`fairy-agent/managers/`)

FairyAgent uses a manager pattern to organize functionality into focused classes that all extend `BaseFairyAgentManager`:

- **FairyAgentActionManager**: Action utils, action execution, and action info retrieval
- **FairyAgentChatManager**: Chat history storage and updates
- **FairyAgentChatOriginManager**: Chat origin point tracking for coordinate offset calculations
- **FairyAgentGestureManager**: Temporary visual gestures and poses
- **FairyAgentModeManager**: Mode state machine transitions
- **FairyAgentPositionManager**: Fairy positioning, spawning, following, and summon behavior
- **FairyAgentRequestManager**: Active/scheduled request management and prompt state
- **FairyAgentTodoManager**: Personal todo item management
- **FairyAgentUsageTracker**: Token usage and cost tracking
- **FairyAgentUserActionTracker**: Recording user actions on canvas
- **FairyAgentWaitManager**: Wait conditions and wake-up logic

Each manager has a `reset()` method and optional `dispose()` for cleanup.

**FairyEntity** (from `@tldraw/fairy-shared`)

- Data structure representing a fairy's state
- Includes position, selection state, personality, pose
- Tracks fairy mode, project membership, and flip orientation
- Persisted across sessions

**Fairy component** (`Fairy.tsx`)

- React component that renders the fairy sprite on canvas
- Size: 60px base with variable clickable areas (50px default, 60px selected)
- Handles selection via brush tool (shift-key for multi-select)
- Context menu interactions on right-click
- Responds to throw tool and drag interactions
- Collision detection using bounding box intersection

### Agent modes

Fairies operate in different modes defined by a state machine (`FairyModeNode.ts`):

**Basic modes**

- **sleeping**: Initial dormant state, fairy is not active
- **idling**: Default awake state, waiting for input, clears todo list and action history on enter
- **soloing**: Working independently on user requests, continues until all assigned tasks complete
- **standing-by**: Waiting state (passive)

**Solo work modes**

- **working-solo**: Working on a solo task, maintains todo list, auto-continues until task marked done
- **working-drone**: Working as drone in a project, cannot be cancelled mid-project
- **working-orchestrator**: Duo orchestrator working on their own task

**Orchestration modes**

- **orchestrating-active**: Actively coordinating a project, deploying drones and reviewing progress
- **orchestrating-waiting**: Waiting for drones to complete their tasks before resuming
- **duo-orchestrating-active**: Leading a duo project with another fairy
- **duo-orchestrating-waiting**: Waiting in duo project for partner to complete work

Each mode has lifecycle hooks:

- `onEnter`: Setup when entering the mode
- `onExit`: Cleanup when leaving the mode
- `onPromptStart`: Handle new prompt initiation
- `onPromptEnd`: Determine next action after prompt completes
- `onPromptCancel`: Handle cancellation (some modes prohibit cancellation)

### Prompt composition system

The prompt composition system is responsible for gathering context from the client, sending it to the worker, and assembling it into a structured prompt for the AI model.

**1. Gathering context (client-side)**

When `agent.prompt()` is called, `FairyAgent` collects information using **Prompt Part Utils** (`PromptPartUtil`). Each util corresponds to a specific type of context (e.g., `selectedShapes`, `chatHistory`).

- **Role**: Extract raw data from the editor/store.
- **Output**: A JSON-serializable `PromptPart` object.

```typescript
// Example: SelectedShapesPartUtil
class SelectedShapesPartUtil extends PromptPartUtil<SelectedShapesPart> {
	getPart(request) {
		return {
			type: 'selectedShapes',
			shapes: this.editor.getSelectedShapes().map(/* ... */),
		}
	}
}
```

**2. Prompt construction (worker-side)**

The worker receives the `AgentPrompt` (a collection of parts) and builds the final system prompt using `buildSystemPrompt`.

- **Flags**: `getSystemPromptFlags` analyzes the active mode, available actions, and present prompt parts to generate boolean flags (e.g., `isSoloing`, `hasSelectedShapesPart`).
- **Sections**: These flags drive the inclusion of specific prompt sections:
  - `intro-section`: Base identity and high-level goals.
  - `rules-section`: Dynamic rules based on capabilities (e.g., "You can create shapes...").
  - `mode-section`: Mode-specific instructions (e.g., "You are currently orchestrating...").

**3. Message building**

The worker converts prompt parts into a list of messages (`ModelMessage[]`) for the LLM.

- `buildMessages`: Iterates through parts and calls their `buildContent` method (defined in `PromptPartDefinitions` or `PromptPartUtil`).
- **Prioritization**: Parts have priority levels. For example, `SystemPrompt` is high priority, while `PeripheralShapes` might be lower.

**4. Schema generation**

The JSON schema for the model's response is dynamically generated based on the **allowed actions** for the current mode.

- If `mode: 'soloing'` allows `CreateAction`, the schema will include the definition for creating shapes.
- If `mode: 'idling'` allows fewer actions, the schema is restricted accordingly.

### Interrupt system

The interrupt system allows for immediate control flow changes in the agent's behavior. It is primarily handled by the `interrupt` method in `FairyAgent`.

**Key functions**

- **Cancel current work**: Aborts any currently running prompt or action stream.
- **Clear schedule**: Removes any pending scheduled requests.
- **Mode switching**: Optionally transitions the agent to a new mode.
- **New instruction**: Optionally provides a new prompt or input to start immediately.

**Usage**

```typescript
agent.interrupt({
	mode: 'idling', // Switch to idling mode
	input: {
		// Optional: Provide new input
		message: 'Stop what you are doing',
		source: 'user',
	},
})
```

**Common use cases**

- **User cancellation**: When a user sends a new message while the agent is working.
- **Task completion**: When an agent finishes a task and needs to report back or switch roles (e.g. `MarkSoloTaskDoneActionUtil`).
- **Mode transitions**: When changing from solo work to collaboration or orchestration.

**Implementation details**

- Clears active and scheduled requests via `requestManager`.
- Calls the underlying `AbortController` to stop network requests.
- Triggers `onExit` of the current mode and `onEnter` of the new mode.

### Action execution pipeline

The agent processes actions streamed from the AI model through a rigorous pipeline to ensure safety and consistency.

**Pipeline steps**

1. **Streaming**: Actions arrive via `_streamActions` from the worker as Server-Sent Events (SSE).
2. **Validation**: The system checks if the action type is allowed in the current mode.
3. **Sanitization**: `sanitizeAction` (in `AgentActionUtil`) transforms the action before execution (e.g. correcting IDs, validating bounds).
4. **Execution**:
   - The agent enters an "acting" state (`isActing = true`) to prevent recording its own actions as user actions.
   - `editor.store.extractingChanges` captures all state changes made during the action.
   - `applyAction` modifies the canvas (creating shapes, moving elements, etc.).
5. **Partial execution handling**:
   - If an action comes in chunks, `incompleteDiff` tracks partial changes.
   - Previous partial changes are reverted before applying the new, more complete version of the action.
6. **Page synchronization**:
   - `ensureFairyIsOnCorrectPage` ensures the fairy is on the same page as shapes being manipulated.
   - For create actions, syncs fairy to current editor page.
7. **History & persistence**:
   - `savesToHistory()` determines if the action appears in the chat log.
   - Chat history is updated with the action and its resulting diff.

**Key methods in FairyAgentActionManager**

- `act(action)`: Core method to execute a single action and capture its diff.
- `getAgentActionUtil(type)`: Get the util for an action type.
- `getActionInfo(action)`: Get display info for UI rendering.

### Chat history system

The chat history system maintains a persistent record of interactions, actions, and memory transitions. It serves as the agent's "memory," allowing it to recall past instructions and actions within specific contexts.

**Data structure**

Chat history is stored as an array of `ChatHistoryItem` objects managed by `FairyAgentChatManager`.

```typescript
type ChatHistoryItem =
	| { type: 'prompt'; agentFacingMessage: string; userFacingMessage: string; promptSource: string; ... }
	| { type: 'action'; action: AgentAction; diff: RecordsDiff; acceptance: string; ... }
	| { type: 'continuation'; data: any[]; ... }
	| { type: 'memory-transition'; agentFacingMessage: string; userFacingMessage: string | null; ... }
```

**Memory levels**

To manage context window size and relevance, the system implements a tiered memory model:

1. **Task level** (`memoryLevel: 'task'`): High-detail, short-term memory. Contains immediate actions and granular feedback for the current task. Cleared when the task is completed.
2. **Project level** (`memoryLevel: 'project'`): Medium-term memory. Contains key milestones and instructions relevant to the entire project. Persists across individual tasks but cleared when the project ends.
3. **Fairy level** (`memoryLevel: 'fairy'`): Long-term memory. Contains core personality traits and global instructions. Persists across projects.

**Filtering mechanism**

The `ChatHistoryPartUtil` uses `filterChatHistoryByMode` to send only relevant history to the AI model based on the current mode's required memory level.

- **Task mode**: Sees only current task history (stops at previous task boundaries).
- **Project mode**: Sees project-level history (stops at fairy-level boundaries).
- **Fairy mode**: Sees only global history.

### Actions system

Actions are the operations fairies can perform on the canvas. Each action extends `AgentActionUtil` and implements:

- `getInfo()`: Returns UI display information (icon, description, pose)
- `sanitizeAction()`: Transforms/validates actions before execution
- `applyAction()`: Executes the action on the canvas
- `savesToHistory()`: Whether to persist in chat history

**Canvas manipulation**

- `CreateActionUtil`: Create shapes with unique ID management and arrow bindings
- `UpdateActionUtil`: Modify existing shapes with property updates
- `DeleteActionUtil`: Remove shapes from canvas
- `MoveActionUtil`: Reposition elements with offset calculations
- `MovePositionActionUtil`: Move fairy position
- `ResizeActionUtil`: Change shape dimensions
- `RotateActionUtil`: Rotate shapes around their center
- `LabelActionUtil`: Add or update text labels on shapes
- `OffsetActionUtil`: Offset shapes by a delta

**Organization**

- `AlignActionUtil`: Align multiple shapes (left, center, right, top, middle, bottom)
- `DistributeActionUtil`: Distribute shapes evenly (horizontal, vertical)
- `StackActionUtil`: Stack shapes in organized layouts
- `PlaceActionUtil`: Position groups of shapes strategically
- `BringToFrontActionUtil`: Move shapes to front layer
- `SendToBackActionUtil`: Move shapes to back layer

**Drawing**

- `PenActionUtil`: Freehand drawing with pen tool

**Navigation**

- `ChangePageActionUtil`: Switch between document pages
- `CreatePageActionUtil`: Create new pages
- `FlyToBoundsActionUtil`: Navigate viewport to specific bounds

**Solo task management**

- `CreateSoloTaskActionUtil`: Create individual tasks
- `StartSoloTaskActionUtil`: Begin working on solo tasks
- `MarkSoloTaskDoneActionUtil`: Mark solo tasks as complete
- `ClaimTodoItemActionUtil`: Claim personal todo items
- `UpsertPersonalTodoItemActionUtil`: Manage personal todo list
- `DeletePersonalTodoItemsActionUtil`: Delete todo items

**Project task management (orchestrator)**

- `StartProjectActionUtil`: Initialize a new project
- `CreateProjectTaskActionUtil`: Create tasks within a project
- `DeleteProjectTaskActionUtil`: Delete project tasks
- `DirectToStartTaskActionUtil`: Direct drones to start tasks
- `EndCurrentProjectActionUtil`: Complete and close current project
- `AwaitTasksCompletionActionUtil`: Wait for task completion

**Duo project management**

- `StartDuoProjectActionUtil`: Initialize duo collaboration
- `CreateDuoTaskActionUtil`: Create duo tasks
- `DirectToStartDuoTaskActionUtil`: Direct partner to start task
- `StartDuoTaskActionUtil`: Begin duo task execution
- `EndDuoProjectActionUtil`: Complete duo project
- `AwaitDuoTasksCompletionActionUtil`: Wait for duo task completion
- `MarkDuoTaskDoneActionUtil`: Mark duo tasks complete

**Drone actions**

- `MarkDroneTaskDoneActionUtil`: Complete tasks as a drone

**Communication & planning**

- `MessageActionUtil`: Send messages to users
- `ThinkActionUtil`: Display thinking process
- `ReviewActionUtil`: Review and analyze canvas content

**System**

- `UnknownActionUtil`: Handle unrecognized actions (required)

### Prompt parts system

Prompt parts provide context to the AI model:

**Canvas context**

- `SelectedShapesPartUtil`: Currently selected shapes
- `PeripheralShapesPartUtil`: Nearby shapes
- `BlurryShapesPartUtil`: Distant/background shapes
- `ScreenshotPartUtil`: Visual canvas representation
- `DataPartUtil`: Shape data and properties
- `CanvasLintsPartUtil`: Canvas lint warnings

**User context**

- `UserViewportBoundsPartUtil`: User's visible area
- `UserActionHistoryPartUtil`: Recent user actions
- `MessagesPartUtil`: User messages and requests

**Agent context**

- `AgentViewportBoundsPartUtil`: Fairy's visible area
- `ChatHistoryPartUtil`: Conversation history
- `SignPartUtil`: Fairy's astrological sign
- `ModelNamePartUtil`: AI model being used

**Task context**

- `SoloTasksPartUtil`: Individual tasks
- `WorkingTasksPartUtil`: In-progress tasks
- `PersonalTodoListPartUtil`: Personal todo items
- `CurrentProjectOrchestratorPartUtil`: Project orchestration
- `CurrentProjectDronePartUtil`: Drone role in projects

**Environment context**

- `PagesPartUtil`: Document pages
- `TimePartUtil`: Temporal context
- `ModePartUtil`: Current agent mode
- `OtherFairiesPartUtil`: Other fairies present
- `DebugPartUtil`: Debug information when enabled

### Helper system

**AgentHelpers** (`fairy-agent/AgentHelpers.ts`)

Transformation utilities used during request processing:

**Coordinate transformations**

- `applyOffsetToVec/removeOffsetFromVec`: Adjust positions relative to chat origin
- `applyOffsetToBox/removeOffsetFromBox`: Transform bounding boxes
- `applyOffsetToShape/removeOffsetFromShape`: Transform entire shapes
- Helps keep numbers small for better AI model comprehension

**ID management**

- `ensureShapeIdIsUnique`: Prevent ID collisions when creating shapes
- `ensureShapeIdExists`: Validate shape references in actions
- `shapeIdMap`: Track ID transformations for consistency across actions

**Numeric precision**

- `roundingDiffMap`: Store rounding differences for restoration
- Maintains precision while simplifying numbers for AI

### Wait and notification system

**FairyAppWaitManager** (app level)

Central event dispatcher for broadcasting events to waiting agents:

- `notifyWaitingAgents()`: Central event dispatcher
- `notifyTaskCompleted()`: Broadcast when tasks complete
- `notifyAgentModeTransition()`: Broadcast mode changes
- `createTaskWaitCondition()`: Create wait condition for specific task
- `createAgentModeTransitionWaitCondition()`: Create wait condition for mode change

**FairyAgentWaitManager** (agent level)

Per-agent wait condition management:

- `waitForAll()`: Set wait conditions for an agent
- `getWaitingFor()`: Get current wait conditions
- `notifyWaitConditionFulfilled()`: Wake agent with notification message

### Collaborative features

**Projects system** (`FairyAppProjectsManager`)

- Multi-fairy collaboration on complex tasks
- Project roles:
  - **Orchestrator**: Coordinates work, assigns tasks, reviews progress, cannot be interrupted
  - **Duo-orchestrator**: Leads a duo project, can also work on tasks themselves
  - **Drone**: Executes assigned tasks, reports completion, works autonomously
- Duo projects for paired fairy collaboration
- Project state tracked globally with member lists and task assignments
- Projects have unique IDs and color coding

**Project resumption**

Projects can be resumed after interruption with intelligent state recovery:

- **State 1**: All tasks done → Resume orchestrator to review/end project
- **State 2**: Tasks in progress → Resume working drones, orchestrator waits
- **State 3**: Mix of done/todo → Resume orchestrator to continue leading
- **State 4**: No tasks exist → Resume orchestrator to finish planning
- **State 5**: All tasks todo → Resume orchestrator to direct drones

**Project lifecycle**

- `addProject()`: Register new project
- `disbandProject()`: Cancel project, interrupt members, add cancellation memory
- `disbandAllProjects()`: Cleanup all projects
- `resumeProject()`: Intelligently resume interrupted projects
- `deleteProjectAndAssociatedTasks()`: Clean removal with task cleanup

**Task management** (`FairyAppTaskListManager`)

- Shared task lists for projects
- Task states: `todo`, `in-progress`, `done`
- Tasks include:
  - Unique ID for tracking
  - Text description
  - Assignment to specific fairy
  - Completion status
  - Project association
  - Optional spatial bounds

**Inter-fairy communication**

- Fairies aware of each other through `OtherFairiesPartUtil`
- Coordinate actions to avoid conflicts
- Share project context for collaboration
- Wait conditions enable synchronization
- Mode transitions broadcast to waiting fairies

### UI components

**Main components** (`fairy-ui/`)

- `FairyHUD`: Main heads-up display container
- `FairyHUDTeaser`: Teaser/preview UI

**Chat components** (`fairy-ui/chat/`)

- `FairyChatHistory`: Full conversation display
- `FairyChatHistorySection`: Grouped history display
- `FairyChatHistoryAction`: Individual action rendering
- `FairyChatHistoryGroup`: Grouped action rendering
- `FairyProjectChatContent`: Project-specific chat content
- `filterChatHistoryByMode`: History filtering logic

**Input components** (`fairy-ui/hud/`)

- `FairySingleChatInput`: Single fairy chat input
- `FairyHUDHeader`: Header with controls
- `useFairySelection`: Selection state hook
- `useIdlingFairies`: Hook for available fairies
- `useMobilePositioning`: Mobile-specific positioning

**Menu components** (`fairy-ui/menus/`)

- `FairyContextMenuContent`: Right-click menu options
- `FairyMenuContent`: Main menu interface

**Sidebar components** (`fairy-ui/sidebar/`)

- `FairySidebarButton`: Sidebar toggle button
- `FairyListSidebar`: Fairy list in sidebar

**Other UI** (`fairy-ui/`)

- `FairyDebugDialog`: Debug interface (`fairy-ui/debug/`)
- `FairyProjectView`: Project view component (`fairy-ui/project/`)
- `FairyManualPanel`: User guide/manual panel (`fairy-ui/manual/`)

**Hooks** (`fairy-ui/hooks/`)

- `useFairyAgentChatHistory`: Chat history access
- `useFairyAgentChatOrigin`: Chat origin access

### Sprite system

**FairySprite** (`fairy-sprite/FairySprite.tsx`)

- Visual representation of fairies on canvas
- Animated sprites with multiple poses and keyframe animation
- SVG-based rendering at 108x108 viewBox

**Poses** (`FairyPose` type)

- `idle`: Default standing pose
- `active`: Active but not working
- `reading`: Reading documents
- `writing`: Writing/creating
- `thinking`: Deep thought pose
- `working`: Actively working on task
- `sleeping`: Dormant state
- `waiting`: Waiting for something
- `reviewing`: Reviewing work
- `panicking`: Error/panic state
- `poof`: Spawn/despawn animation

**Sprite parts** (`fairy-sprite/sprites/parts/`)

- `FairyBodySpritePart`: Main body
- `FairyFaceSpritePart`: Face expressions
- `FairyHatSpritePart`: Hat accessories
- `FairyLegsSpritePart`: Legs

**Wing sprites** (`fairy-sprite/sprites/WingsSprite.tsx`)

- `RaisedWingsSprite1/2/3`: High wing positions for active poses
- `LoweredWingsSprite1/2/3`: Low wing positions for passive poses
- Wing colors indicate project membership and role

**Other sprites**

- `IdleSprite`, `SleepingSprite`, `ThinkingSprite`
- `WorkingSprite1/2/3`: Working animation frames
- `ReadingSprite1/2/3`: Reading animation frames
- `WritingSprite1/2`: Writing animation frames
- `WaitingSprite/ReviewingSprite1/2/3`: Waiting states
- `PanickingSprite1/2`: Error animations
- `PoofSprite1/2/3/4`: Spawn/despawn effects
- `FairyReticleSprite`: Selection reticle
- `Avatar`: Avatar display component

**Animation**

- Frame durations vary by pose (65ms-160ms)
- `useKeyframe` hook manages animation timing
- Faster animation when generating (0.75x duration)

**Customization**

- Hat colors map to hat types (top, pointy, bald, antenna, etc.)
- Project color shown on wings
- Orchestrators have colored bottom wings
- `flipX` prop for directional facing

### Canvas UI components

**Canvas components** (`fairy-canvas-ui/`)

- `Fairies`: Container rendering all local fairies
- `RemoteFairies`: Handles fairies from other users
- `DebugFairyVision`: Debug overlay for fairy vision bounds

### Special tools

**FairyThrowTool** (`FairyThrowTool.tsx`)

- Allows throwing/moving fairies on canvas
- Integrated with select tool

### Helpers

**Name generation** (`fairy-helpers/getRandomFairyName.ts`)

- Generates unique fairy names

**Sign generation** (`fairy-helpers/getRandomFairySign.ts`)

- Creates fairy astrological signs

**Project colors** (`fairy-helpers/getProjectColor.ts`)

- Color coding for projects

**No-input messages** (`fairy-helpers/getRandomNoInputMessage.ts`)

- Messages when fairy has no input

### State management

**FairyApp state**

App-level state managed by `FairyApp`:

- `$isApplyingAction`: Whether any fairy is currently applying an action
- `$debugFlags`: Debug feature toggles (showTaskBounds)
- `$modelSelection`: Currently selected AI model

**App managers state**

Each app manager maintains its own reactive state, accessed via unified API:

- `fairyApp.agents.$agents`: List of all fairy agents
- `fairyApp.following.$followingFairyId`: ID of followed fairy
- `fairyApp.projects.$projects`: Active projects list
- `fairyApp.tasks.$tasks`: Shared task list

**Agent state**

Per-agent state managed by `FairyAgent`:

- `$fairyEntity`: Position, pose, selection, page
- `$fairyConfig`: Name, outfit, sign (from user settings)
- `$debugFlags`: Per-agent debug toggles
- `$useOneShottingMode`: Solo prompting behavior

**Persistence**

- Fairy state serialized via `fairyApp.persistence.serializeState()`
- Includes: all agent states, task list, projects
- Agent state includes: fairyEntity, chatHistory, chatOrigin, personalTodoList, waitingFor
- Restored via `fairyApp.persistence.loadState()`
- Auto-save via reactive watchers (throttled to 2 seconds)
- Configuration stored in user profile as `fairies` JSON

### Debug capabilities

**Debug flags**

- `logSystemPrompt`: Log system prompt to console
- `logMessages`: Log messages to console
- `logResponseTime`: Track AI response performance
- `showTaskBounds`: Display task bounds on canvas

**Debug dialog** (`FairyDebugDialog.tsx`)

- View internal fairy state
- Monitor active requests
- Inspect chat history
- Track mode transitions
- Performance metrics

### Internationalization

**Messages** (`fairy-messages.ts`)

Uses `defineMessages` for i18n support:

- Toolbar labels (fairies, select, deselect, close)
- Menu labels (go to, summon, follow, sleep, wake)
- Input placeholders (speak to fairy, enter message)
- Action labels (stop, send, clear)

### Backend integration

- Communicates with `FAIRY_WORKER` endpoint
- Authentication via `getToken`
- Streaming responses for real-time generation via SSE
- Model selection support

## Usage patterns

### Creating the fairy app

```typescript
// Via React provider (recommended)
<FairyAppProvider fileId={fileId} onMount={handleMount} onUnmount={handleUnmount}>
	<FairyHUD />
</FairyAppProvider>

// Access via hook
const fairyApp = useFairyApp()
```

### Creating a fairy agent

Agents are created automatically by `FairyAppAgentsManager.syncAgentsWithConfigs()` based on user's fairy configs. Manual creation:

```typescript
const fairy = new FairyAgent({
	id: uniqueId,
	fairyApp: fairyApp,
	editor: editor,
	onError: handleError,
	getToken: authTokenProvider,
})
```

### Prompting a fairy

```typescript
// Basic prompt
fairy.prompt({
	message: 'Draw a flowchart',
})

// With spatial bounds
fairy.prompt({
	message: 'Work in this area',
	bounds: { x: 100, y: 100, w: 500, h: 500 },
})
```

### Scheduling follow-up work

```typescript
// Add an instruction
fairy.schedule('Continue working on the diagram')

// Schedule with specific data
fairy.schedule({
	message: 'Review changes',
	data: ['Shape xyz was modified'],
})
```

### Interrupting a fairy

```typescript
// Cancel and switch mode
fairy.interrupt({
	mode: 'idling',
	input: { message: 'Stop and wait' },
})

// Just cancel current work
fairy.interrupt({ input: null })
```

### Custom actions

```typescript
class CustomActionUtil extends AgentActionUtil<CustomAction> {
	static override type = 'custom' as const

	override getInfo(action) {
		return { icon: 'star', description: action.description, pose: 'working' }
	}

	override sanitizeAction(action, helpers) {
		// Validate and transform action
		return action
	}

	override applyAction(action, helpers) {
		// Execute action on canvas
		this.editor.createShape(/* ... */)
	}
}
```

### Custom prompt parts

```typescript
class CustomPartUtil extends PromptPartUtil<CustomPart> {
	static type = 'custom-context' as const

	getPart(request, helpers) {
		return {
			type: 'custom-context',
			data: this.editor.getSelectedShapeIds(),
		}
	}
}
```

### Working with projects

```typescript
// Projects are typically started via StartProjectActionUtil
// But can be managed programmatically via fairyApp:
fairyApp.projects.disbandProject(projectId)
fairyApp.projects.resumeProject(projectId)

// Task management
fairyApp.tasks.createTask({ id, title, projectId })
fairyApp.tasks.setTaskStatusAndNotify(taskId, 'done')
```

### Camera following

```typescript
// Start following a fairy
fairyApp.following.startFollowing(fairyId)

// Stop following
fairyApp.following.stopFollowing()

// Check if following
fairyApp.following.isFollowing()
```

## Key features

- **Visual AI agents**: Sprites that move and interact on canvas
- **Multi-modal understanding**: Process visual and text inputs
- **Collaborative work**: Multiple fairies working together on projects
- **Task management**: Create, assign, and track tasks
- **Canvas manipulation**: Full CRUD operations on shapes
- **Page navigation**: Multi-page document support
- **Personality system**: Each fairy has unique traits and sign
- **Debug tools**: Comprehensive debugging interface
- **Project resumption**: Intelligent recovery from interruptions
- **Internationalization**: Full i18n support for UI strings
- **State persistence**: Auto-save and restore fairy state per file
