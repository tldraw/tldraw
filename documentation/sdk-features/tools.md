---
title: Tools
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - tools
  - StateNode
  - state machine
  - events
  - interaction
status: published
date: 12/20/2024
order: 31
---

Tools in tldraw define how the editor responds to user input. Each tool handles a specific interaction mode like selecting shapes, drawing, or panning the canvas. Tools are implemented as state machines using the `StateNode` class, which provides a structured way to manage complex interactions through a hierarchy of states. The editor maintains a single active tool at any time and routes all input events through it. When you click the hand icon in the toolbar, the editor transitions from the select tool to the hand tool, changing how the canvas responds to mouse movements and clicks.

The state machine architecture enables tools to handle multi-step interactions cleanly. For example, when using the select tool to resize a shape, the tool transitions through multiple states: idle, pointing the resize handle, and actively resizing. Each state handles different events and can transition to other states based on user input. This pattern keeps tool logic organized and makes complex interactions manageable.

## How it works

Tools are organized in a hierarchical state machine where each node can handle events and contain child states. The editor creates a root state that contains all tools as children. When an input event occurs, it flows down from the root through the currently active tool and its active child state.

The `StateNode` class provides the foundation for this system. Each state node has an id, optional children, and methods for handling events. State nodes come in three types: root nodes that contain tools, branch nodes that have child states, and leaf nodes that perform actual work. Tools themselves are typically branch nodes with child states representing different phases of an interaction.

When a state becomes active, its `onEnter` method runs. When it becomes inactive, its `onExit` method runs. Between these lifecycle events, the state handles input through event methods like `onPointerDown`, `onPointerMove`, and `onKeyDown`. If a state doesn't handle an event, it passes through without effect. Child states receive events after their parent, allowing both to respond.

Transitions between states happen explicitly through the `transition` method. When the select tool's idle state detects a pointer down on a shape, it calls `this.parent.transition('pointing_shape', info)` to move to the pointing state. The transition triggers the appropriate exit and enter handlers, maintaining clean state boundaries.

## Key concepts

### State hierarchy

Tools exist in a tree structure starting from a root node. The root contains all available tools like select, hand, eraser, and draw. Each tool can contain child states for different phases of its interaction. For example, the select tool has children including idle, pointing, translating, resizing, and rotating. When the select tool is active and the user starts dragging a shape, the active path becomes `select.translating`.

The hierarchy allows tools to share common behavior at higher levels while specializing at lower levels. The select tool handles keyboard shortcuts at its top level, while child states handle specific mouse interactions. This organization prevents duplicate logic across related states.

### Event handling

State nodes implement event handler methods that match input event types. The handlers receive an info object containing event details like pointer position, keyboard modifiers, and the event target. Common handlers include `onPointerDown`, `onPointerMove`, `onPointerUp`, `onKeyDown`, and `onTick` for animation frame updates.

Events flow through the state hierarchy. When a pointer move occurs, the root receives it first, then the current tool, then the tool's active child state. Each node can handle the event by implementing the corresponding method. The hand tool's dragging state implements `onPointerMove` to update the camera position as the user drags.

### State transitions

The `transition` method moves between states by id. You can transition to a direct child using just its id, or to deeper descendants using dot notation like `'crop.pointing_crop_handle'`. Transitions are atomic - the old state's `onExit` runs, the new state's `onEnter` runs, and the state is updated.

Transitions carry information through their second parameter. When transitioning from idle to pointing, the pointer event info passes along so the pointing state knows where the interaction started. This data is available in both the exit handler of the old state and the enter handler of the new state.

### Tool registration

Tools are registered with the editor through the root state. The `@tldraw/editor` package provides only the root state with no tools. The `@tldraw/tldraw` package extends this with a full suite of tools. Custom tools are added by creating a custom root state that includes them as children.

The editor's `setCurrentTool` method transitions the root state to a different tool by id. The `getCurrentTool` method returns the currently active tool state node. These methods provide the public API for tool management while the state machine handles the internal transitions.

### Event target detection

Event info objects include a target property indicating what the user interacted with. Possible targets include canvas, shape, handle, and selection. The select tool's idle state uses this to determine which child state to transition to. A pointer down on a shape transitions to pointing_shape, while a pointer down on the canvas transitions to pointing_canvas.

Target detection happens before events reach tools, using the editor's geometry system to determine what's under the pointer. This separation means tools can focus on interaction logic without implementing hit testing.

## Creating custom tools

To create a custom tool, extend the `StateNode` class and implement the required static properties and event handlers. The minimal implementation specifies an id and initial child state if the tool has children.

```typescript
import { StateNode, TLPointerEventInfo } from '@tldraw/editor'

export class StampTool extends StateNode {
	static override id = 'stamp'
	static override initial = 'idle'
	static override children() {
		return [StampIdle, StampPointing]
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}
}
```

For a simple tool without child states, implement event handlers directly on the tool class:

```typescript
export class MeasureTool extends StateNode {
	static override id = 'measure'

	override onPointerDown(info: TLPointerEventInfo) {
		const { currentPagePoint } = this.editor.inputs
		// Start measuring from this point
	}

	override onPointerMove(info: TLPointerEventInfo) {
		// Update measurement as pointer moves
	}

	override onPointerUp(info: TLPointerEventInfo) {
		// Finalize measurement and return to select tool
		this.editor.setCurrentTool('select')
	}
}
```

Child states follow the same pattern but focus on specific phases of the interaction. A drawing tool might have idle, pointing, and drawing states. The pointing state waits to see if the user is clicking or starting a drag, then transitions accordingly:

```typescript
export class DrawingPointing extends StateNode {
	static override id = 'pointing'

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('drawing', info)
		}
	}

	override onPointerUp(info: TLPointerEventInfo) {
		this.parent.transition('idle', info)
	}
}
```

Access the editor through `this.editor` to read input state, manipulate shapes, or transition tools. Access the parent state through `this.parent` to transition between sibling states. The editor instance provides the full API for querying and modifying the document.

To register a custom tool, create a custom root state that includes it:

```typescript
import { RootState } from '@tldraw/editor'

export class CustomRootState extends RootState {
	static override initial = 'select'
	static override children() {
		return [...super.children(), StampTool, MeasureTool]
	}
}
```

Then pass the custom root when creating the editor. In the `@tldraw/tldraw` package, use the `tools` prop to add tools to the existing set.

## Examples

- **[Custom tool (sticker)](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/custom-tool)** - A simple custom tool that adds a heart emoji sticker to the canvas when you click, demonstrating the basics of extending StateNode.
- **[Custom tool with child states](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/tool-with-child-states)** - Expands on the sticker tool to show how to create a tool with complex interactions using child states in the state machine.
- **[Screenshot tool](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/screenshot-tool)** - A custom tool that takes a screenshot of a specific area of the canvas, demonstrating how to handle multi-step interactions.
- **[Lasso select tool](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/lasso-select-tool)** - A custom selection tool that uses freehand drawing to select shapes, showing how to build alternative selection tools with reactive atoms and overlays.
- **[Add a tool to the toolbar](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/add-tool-to-toolbar)** - Shows how to make your custom tool icon appear on tldraw's toolbar by overriding the toolbar component and providing custom assets.
- **[Dynamic tools with setTool and removeTool](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/dynamic-tools)** - Demonstrates how to dynamically add and remove tools from the editor's state chart after initialization, useful for conditional tool availability.
