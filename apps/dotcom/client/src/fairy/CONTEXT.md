# Fairy system context

## Overview

The fairy system is an AI agent framework for tldraw.com that provides intelligent canvas assistants. Fairies are visual AI agents with sprite avatars that can interact with the canvas, perform tasks, and collaborate with users and other fairies. They appear as small animated sprites that move around the canvas as they work.

## Architecture

### Core components

**FairyAgent** (`fairy-agent/agent/FairyAgent.ts`)

- Main agent class that handles AI interactions
- Manages agent state, requests, and responses
- Coordinates with the AI backend for generation
- Handles chat history, task management, and scheduling
- Tracks active requests, scheduled requests, and wait conditions
- Includes timing and performance monitoring capabilities

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

- **idling**: Default state, waiting for input, clears todo list and action history on enter
- **soloing**: Working independently on user requests, continues until all assigned tasks complete
- **standing-by**: Waiting state (passive)

**Solo work modes**

- **working-solo**: Working on a solo task, maintains todo list, auto-continues until task marked done
- **working-drone**: Working as drone in a project, cannot be cancelled mid-project

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

### Actions system

Actions are the operations fairies can perform on the canvas. Each action extends `AgentActionUtil` and implements:

- `getInfo()`: Returns UI display information (icon, description)
- `sanitizeAction()`: Transforms/validates actions before execution
- `applyAction()`: Executes the action on the canvas
- `savesToHistory()`: Whether to persist in chat history

**Canvas manipulation**

- `CreateActionUtil`: Create shapes with unique ID management and arrow bindings
- `UpdateActionUtil`: Modify existing shapes with property updates
- `DeleteActionUtil`: Remove shapes from canvas
- `MoveActionUtil`: Reposition elements with offset calculations
- `ResizeActionUtil`: Change shape dimensions
- `RotateActionUtil`: Rotate shapes around their center
- `LabelActionUtil`: Add or update text labels on shapes

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

**Project task management (orchestrator)**

- `StartProjectActionUtil`: Initialize a new project
- `CreateProjectTaskActionUtil`: Create tasks within a project
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
- `PersonalTodoListActionUtil`: Manage personal todo list

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

**User context**

- `UserViewportBoundsPartUtil`: User's visible area
- `UserActionHistoryPartUtil`: Recent user actions
- `MessagesPartUtil`: User messages and requests

**Agent context**

- `AgentViewportBoundsPartUtil`: Fairy's visible area
- `ChatHistoryPartUtil`: Conversation history
- `PersonalityPartUtil`: Fairy's personality traits
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

**AgentHelpers** (`fairy-agent/agent/AgentHelpers.ts`)

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

**Wait conditions** (`FairyWaitNotifications.ts`)

Fairies can wait for specific events:

- Task completion events
- Agent mode transitions
- Custom event types with matcher functions

**Event broadcasting**

- `notifyWaitingAgents()`: Central event dispatcher
- `notifyTaskCompleted()`: Broadcast when tasks complete
- `notifyAgentModeTransition()`: Broadcast mode changes
- Automatic wake-up with contextual messages

**Creating wait conditions**

```typescript
// Wait for specific task
createTaskWaitCondition(taskId)

// Wait for mode change
createAgentModeTransitionWaitCondition(agentId, mode)

// Custom wait condition
{
  eventType: 'custom-event',
  matcher: (event) => event.someProperty === expectedValue
}
```

### Collaborative features

**Projects system** (`FairyProjects.ts`)

- Multi-fairy collaboration on complex tasks
- Project roles:
  - **Orchestrator**: Coordinates work, assigns tasks, reviews progress, cannot be interrupted
  - **Drone**: Executes assigned tasks, reports completion, works autonomously
- Duo projects for paired fairy collaboration
- Project state tracked globally with member lists and task assignments
- Projects have unique IDs and color coding

**Task management** (`FairyTaskList.ts`)

- Shared task lists visible on canvas via `InCanvasTaskList`
- Drag-and-drop task assignment using `FairyTaskDragTool`
- Task states: pending, active, done
- Tasks include:
  - Unique ID for tracking
  - Text description
  - Assignment to specific fairy
  - Completion status
  - Optional spatial bounds
- Global task visibility toggle with `$showCanvasFairyTasks`

**Inter-fairy communication**

- Fairies aware of each other through `OtherFairiesPartUtil`
- Coordinate actions to avoid conflicts
- Share project context for collaboration
- Wait conditions enable synchronization
- Mode transitions broadcast to waiting fairies

### UI components

**Main components**

- `FairyApp`: Root component managing fairy instances
- `Fairies`: Container for multiple fairies
- `RemoteFairies`: Handles fairies from other users

**Interaction components**

- `FairySpriteComponent`: Visual sprite representation
- `FairyContextMenuContent`: Right-click menu options
- `FairyDropdownContent`: Dropdown menu items
- `FairyMenuContent`: Main menu interface

**Task UI**

- `FairyTaskListInline`: Inline task display
- `InCanvasTaskList`: Canvas-embedded task list
- `FairyTaskDragTool`: Drag tool for task assignment

**Configuration**

- `FairyConfigDialog`: Settings dialog
- `FairyDebugDialog`: Debug interface
- `FairyModelSelection`: Model selection UI

**Input/chat**

- `FairyBasicInput`: Input interface
- `FairyChatHistory`: Conversation display
- `FairyGroupChat`: Multi-fairy chat

### Special tools

**FairyThrowTool** (`FairyThrowTool.tsx`)

- Allows throwing/moving fairies on canvas
- Integrated with select tool

**FairyTaskDragTool** (`FairyTaskDragTool.tsx`)

- Drag tasks to assign to fairies

### Utilities

**Name generation** (`getRandomFairyName.ts`)

- Generates unique fairy names

**Personality** (`getRandomFairyPersonality.ts`)

- Creates fairy personality traits

**Project colors** (`getProjectColor.ts`)

- Color coding for projects

**Vision system** (`FairyVision.tsx`)

- Visual perception capabilities
- Fixed dimensions from `FAIRY_VISION_DIMENSIONS`

### Sprite system

**FairySprite** (`fairy-sprite/FairySprite.tsx`)

- Visual representation of fairies on canvas
- Animated sprites with multiple poses and expressions
- Customizable appearance:
  - Hat styles (top, pointy, bald, antenna, spiky, hair, ears, propeller)
  - Body colors based on project assignment
  - Flip orientation for movement direction
- Poses include idle, working, thinking, celebrating
- Size scales with canvas zoom level

### State management

**Atoms**

- `$fairyAgentsAtom`: Global fairy agents registry
- `$fairyTasks`: Task list state
- `$fairyProjects`: Active projects
- `$fairyIsApplyingAction`: Action application state
- `$showCanvasFairyTasks`: Task visibility toggle
- `$fairyDebugFlags`: Debug settings

**Persistence**

- Fairy state saved to user profile as `PersistedFairyState`
- Chat history maintained across sessions
- Task lists persisted
- Configuration stored as `PersistedFairyConfigs`

### Debug capabilities

**Debug flags** (`FairyDebugFlags.ts`)

- `showTaskBounds`: Visualize task spatial boundaries
- `logResponseTime`: Track AI response performance

**Debug dialog** (`FairyDebugDialog.tsx`)

- View internal fairy state
- Monitor active requests
- Inspect chat history
- Track mode transitions
- Performance metrics

### Backend integration

- Communicates with `FAIRY_WORKER` endpoint
- Authentication via `getToken`
- Streaming responses for real-time generation
- Model selection (Claude, GPT variants)

## Usage patterns

### Creating a fairy

```typescript
const fairy = new FairyAgent({
	id: uniqueId,
	app: tldrawApp,
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

// With specific context parts
fairy.prompt({
	message: 'Organize these shapes',
	parts: ['screenshot', 'selected-shapes', 'peripheral-shapes'],
})

// With spatial bounds
fairy.prompt({
	message: 'Work in this area',
	bounds: { x: 100, y: 100, w: 500, h: 500 },
})
```

### Scheduling follow-up work

```typescript
// Schedule next action
fairy.schedule('Continue working on the diagram')

// Schedule with specific data
fairy.schedule({
	message: 'Review changes',
	data: ['Shape xyz was modified'],
})
```

### Custom actions

```typescript
class CustomActionUtil extends AgentActionUtil<CustomAction> {
	static override type = 'custom' as const

	override getInfo(action) {
		return { icon: 'star', description: action.description }
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
// Start a project
fairy.startProject({
	members: [fairy1.id, fairy2.id],
	role: 'orchestrator',
})

// Create and assign tasks
fairy.createProjectTask({
	text: 'Design header',
	assignTo: fairy2.id,
})

// Wait for completion
fairy.waitFor(createTaskWaitCondition(taskId))
```

## Key features

- **Visual AI agents**: Sprites that move and interact on canvas
- **Multi-modal understanding**: Process visual and text inputs
- **Collaborative work**: Multiple fairies working together
- **Task management**: Create, assign, and track tasks
- **Canvas manipulation**: Full CRUD operations on shapes
- **Page navigation**: Multi-page document support
- **Personality system**: Each fairy has unique traits
- **Debug tools**: Comprehensive debugging interface
